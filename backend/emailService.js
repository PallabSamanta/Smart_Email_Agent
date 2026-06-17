const { google } = require('googleapis');
const db = require('./db');
const imapService = require('./imapService');
const geminiService = require('./geminiService');
require('dotenv').config();

function isPromotionalText(subject, body) {
  const text = `${subject || ''} ${body || ''}`.toLowerCase();
  const promoIndicators = /\b(unsubscribe|view online|view in browser|newsletter|opt out|offer|discount|sale|coupon|limited time|special offer|daily streak|streak|reward|challenge|practice session|lesson|course|subscription|renewal|membership|price|save|deal|claim|promo|discounted)\b/i;
  return promoIndicators.test(text);
}

function hasSchedulingIntent(subject, body) {
  const text = `${subject || ''} ${body || ''}`.toLowerCase();
  
  const eventWords = /\b(meet|zoom|call|sync|schedul|appoint|calendar|invit|session|discussion|catch\s+up|appointment)\b/i;
  if (!eventWords.test(text)) return false;

  const daysOfWeek = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
  const relativeDays = /\b(today|tomorrow|tonight)\b/i;
  const months = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i;
  const timePattern = /\b\d{1,2}:\d{2}\b/i;
  const ampmPattern = /\b\d{1,2}\s*(am|pm)\b/i;
  const hasDateOrTime = daysOfWeek.test(text) || relativeDays.test(text) || months.test(text) || timePattern.test(text) || ampmPattern.test(text);
  if (!hasDateOrTime) return false;

  const promoFalsePositives = /\b(daily streak|streak|practice session|lesson|course|challenge|reward|offer|discount|sale|coupon|limited time|special offer|subscription|renewal|membership|deal|save|buy now|shop now|promo|discounted)\b/i;
  if (promoFalsePositives.test(text) && text.includes('session')) {
    return false;
  }

  const nonMeetingContext = /\b(payment due|bill|invoice|reminder|update|notification|status|report|newsletter|daily|weekly|summary|result|badge|alert|account activity)\b/i;
  if (nonMeetingContext.test(text) && !/\b(meeting|call|zoom|sync|appointment|discuss|catch\s+up)\b/i.test(text)) {
    return false;
  }

  return true;
}

// Helper to identify social email elements (social media, notifications)
function isSocialEmail(fromAddress, subject, body) {
  const sender = (fromAddress || '').toLowerCase();
  const text = `${subject || ''} ${body || ''}`.toLowerCase();
  
  const socialDomains = /reddit|facebook|linkedin|twitter|instagram|pinterest|youtube|tiktok|snapchat|discord|quora/i;
  if (socialDomains.test(sender)) return true;
  
  const socialKeywords = /linkedin|facebook|twitter|instagram|pinterest|reddit|youtube|tiktok|snapchat|discord|quora|connection request|followed you|friend request|tagged you|social network|view profile/i;
  
  if (hasSchedulingIntent(subject, body)) return false;
  return socialKeywords.test(text);
}


// Helper to extract HTML body from Gmail message payload
function getGmailBody(payload) {
  if (!payload) return '';
  
  // Try to find plain text first
  const findTextPart = (part) => {
    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
      return { type: 'text/plain', content: Buffer.from(part.body.data, 'base64').toString('utf8') };
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        const result = findTextPart(subPart);
        if (result) return result;
      }
    }
    return null;
  };

  // Fallback to HTML if plain text not found
  const findHtmlPart = (part) => {
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      const html = Buffer.from(part.body.data, 'base64').toString('utf8');
      return { type: 'text/html', content: html };
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        const result = findHtmlPart(subPart);
        if (result) return result;
      }
    }
    return null;
  };

  const textPart = findTextPart(payload);
  if (textPart) return textPart.content;

  const htmlPart = findHtmlPart(payload);
  if (htmlPart) return htmlPart.content;

  // Last fallback: if the payload itself has data
  if (payload.body && payload.body.data) {
    const content = Buffer.from(payload.body.data, 'base64').toString('utf8');
    return content;
  }

  return '';
}

/**
 * Sync email inbox for a connected mail account using MongoDB
 * @param {object} account - The Mongoose mail_account document
 * @returns {Promise<{syncedCount: number, deletedCount: number}>}
 */
async function syncMailbox(account, limit = 150, mode = 'newest') {
  const mailAccountId = account._id;
  const userId = account.user_id;
  const provider = account.provider;

  let fetchedEmails = [];

  if (provider === 'google') {
    // Gmail API Sync
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: account.token_expiry
    });

    // Handle token refresh
    auth.on('tokens', async (tokens) => {
      const updates = {
        access_token: tokens.access_token,
        token_expiry: tokens.expiry_date
      };
      if (tokens.refresh_token) {
        updates.refresh_token = tokens.refresh_token;
      }
      await db.MailAccount.findByIdAndUpdate(mailAccountId, updates);
    });

    const gmail = google.gmail({ version: 'v1', auth });

    // Fetch message list
    const currentCount = await db.Email.countDocuments({ mail_account_id: mailAccountId });
    const fetchLimit = Math.min(mode === 'older' ? currentCount + limit : limit, 500);

    let query = undefined;
    if (mode === 'older') {
      const oldestEmail = await db.Email.findOne({ mail_account_id: mailAccountId })
        .sort({ received_at: 1 });
      if (oldestEmail && oldestEmail.received_at) {
        // Gmail before: query takes epoch in seconds
        const seconds = Math.floor(new Date(oldestEmail.received_at).getTime() / 1000);
        query = `before:${seconds}`;
      }
    }

    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: fetchLimit,
      q: query
    });

    const messages = res.data.messages || [];
    const fetchedIds = messages.map(m => m.id);
    let deletedCount = 0;

    // Deletion Reconciliation (Gmail) - only for newest syncs to avoid purging older synced mails
    if (mode === 'newest' && fetchedIds.length > 0) {
      const localEmails = await db.Email.find({ mail_account_id: mailAccountId })
        .sort({ received_at: -1 })
        .limit(limit);
      
      const localIds = localEmails.map(e => e.email_uid);
      const missingIds = localIds.filter(id => !fetchedIds.includes(id));
      
      if (missingIds.length > 0) {
        // Find DB document IDs to perform programmatic cascade deletes
        const emailsToDelete = await db.Email.find({
          mail_account_id: mailAccountId,
          email_uid: { $in: missingIds }
        });
        const emailDocIds = emailsToDelete.map(e => e._id);

        // Remove from Emails and Calendar Events collections
        const result = await db.Email.deleteMany({ _id: { $in: emailDocIds } });
        await db.CalendarEvent.deleteMany({ email_id: { $in: emailDocIds } });
        
        deletedCount = result.deletedCount;
        console.log(`Reconciliation: Deleted ${deletedCount} local stale emails.`);
      }
    }

    // Now fetch details for new emails
    for (const msg of messages) {
      const existing = await db.Email.findOne({
        mail_account_id: mailAccountId,
        email_uid: msg.id
      });
      if (existing) continue;

      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id
        });

        const headers = detail.data.payload.headers || [];
        const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
        const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
        const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');
        
        const subject = subjectHeader ? subjectHeader.value : 'No Subject';
        const from = fromHeader ? fromHeader.value : 'Unknown Sender';
        const dateStr = dateHeader ? dateHeader.value : new Date().toISOString();
        const receivedAt = new Date(dateStr);

        const body = getGmailBody(detail.data.payload) || detail.data.snippet || '';
        const snippet = detail.data.snippet || subject;
        
        const labels = detail.data.labelIds || [];
        let category = null;

        if (labels.includes('SPAM')) {
          category = 'spam';
        } else if (labels.includes('CATEGORY_PROMOTIONS') || isPromotionalText(subject, body)) {
          category = 'promotions';
        } else if (labels.includes('CATEGORY_SOCIAL') || isSocialEmail(from, subject, body)) {
          category = 'social';
        }

        fetchedEmails.push({
          uid: msg.id,
          subject,
          from,
          body,
          snippet,
          receivedAt,
          preClassifiedCategory: category
        });
      } catch (err) {
        console.error(`Error fetching Gmail message detail for ID ${msg.id}:`, err);
      }
    }
  } else if (provider === 'imap') {
    // IMAP Sync
    const imapPassword = db.decryptPassword(account.imap_password);
    const imapConfig = {
      host: account.imap_host,
      port: account.imap_port,
      user: account.imap_user,
      pass: imapPassword
    };

    const currentCount = await db.Email.countDocuments({ mail_account_id: mailAccountId });
    const skip = mode === 'older' ? currentCount : 0;
    const emails = await imapService.fetchEmails(imapConfig, limit, skip);
    const fetchedUids = emails.map(e => e.uid);
    let deletedCount = 0;

    // Deletion Reconciliation (IMAP) - only for newest syncs to avoid purging older synced mails
    if (mode === 'newest' && fetchedUids.length > 0) {
      const localEmails = await db.Email.find({ mail_account_id: mailAccountId })
        .sort({ received_at: -1 })
        .limit(limit);
      
      const localUids = localEmails.map(e => e.email_uid);
      const missingUids = localUids.filter(uid => !fetchedUids.includes(uid));
      
      if (missingUids.length > 0) {
        const emailsToDelete = await db.Email.find({
          mail_account_id: mailAccountId,
          email_uid: { $in: missingUids }
        });
        const emailDocIds = emailsToDelete.map(e => e._id);

        const result = await db.Email.deleteMany({ _id: { $in: emailDocIds } });
        await db.CalendarEvent.deleteMany({ email_id: { $in: emailDocIds } });

        deletedCount = result.deletedCount;
        console.log(`Reconciliation: Deleted ${deletedCount} local stale IMAP emails.`);
      }
    }

    for (const email of emails) {
      const existing = await db.Email.findOne({
        mail_account_id: mailAccountId,
        email_uid: email.uid
      });
      if (existing) continue;

      let category = null;
      if (isPromotionalText(email.subject, email.body)) {
        category = 'promotions';
      } else if (isSocialEmail(email.from, email.subject, email.body)) {
        category = 'social';
      }

      fetchedEmails.push({
        uid: email.uid,
        subject: email.subject,
        from: email.from,
        body: email.body,
        snippet: email.snippet,
        receivedAt: email.date,
        preClassifiedCategory: category
      });
    }
  } else if (provider === 'sandbox') {
    const currentCount = await db.Email.countDocuments({ mail_account_id: mailAccountId });
    
    if (mode === 'older') {
      fetchedEmails = [];
      const startIdx = currentCount + 1;
      const endIdx = currentCount + limit;
      
      for (let i = startIdx; i <= endIdx; i++) {
        const daysAgo = 1 + Math.floor(i / 5);
        const categories = ['normal', 'promotions', 'social', 'spam', 'urgent'];
        const category = categories[i % categories.length];
        
        let subject = '';
        let body = '';
        let from = '';
        
        if (category === 'urgent') {
          subject = `URGENT: Action Required on Ticket #${1000 + i}`;
          from = 'support@ticketing-system.com';
          body = `Hello,\n\nPlease review Ticket #${1000 + i} immediately. It has been escalated.\n\nRegards,\nSupport Team`;
        } else if (category === 'promotions') {
          subject = `Special Offer: Save ${10 + (i % 5) * 10}% on Your Next Order!`;
          from = 'promo@store-deals.com';
          body = `Hi Customer,\n\nUse code GET${10 + (i % 5) * 10} at checkout to save big! Unsubscribe here.`;
        } else if (category === 'social') {
          subject = `User_${i} started following you`;
          from = 'no-reply@social-network.com';
          body = `Hi there,\n\nUser_${i} just started following your profile. check it out!`;
        } else if (category === 'spam') {
          subject = `Get Rich Quick! Guaranteed ${100 * i}% return!`;
          from = 'win-big@spam-alerts.xyz';
          body = `Hello! You have been selected for a special prize. click here to claim.`;
        } else {
          subject = `Project Update Notes - Day ${i}`;
          from = 'developer@team-projects.com';
          body = `Hi Team,\n\nHere are the notes for day ${i} of the project. Everything is on schedule.\n\nThanks,\nDev`;
        }

        fetchedEmails.push({
          uid: `sandbox-${i}`,
          subject,
          from,
          body,
          snippet: body.substring(0, 60) + '...',
          receivedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - (i % 24) * 60 * 60 * 1000),
          preClassifiedCategory: null
        });
      }
    } else {
      // mode === 'newest'
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowDateStr = tomorrow.toLocaleDateString([], { month: 'long', day: 'numeric' });
      
      fetchedEmails = [
        {
          uid: 'sandbox-1',
          subject: 'URGENT: Project Sync Meeting Tomorrow 2 PM',
          from: 'project-manager@mycompany.com',
          body: `Hi Team,\n\nWe need to sync up tomorrow (${tomorrowDateStr}) at 2:00 PM to finalize the release plan and API documentation.\n\nLet me know if you can make it.\n\nThanks,\nSarah`,
          snippet: 'We need to sync up tomorrow to finalize the release plan...',
          receivedAt: new Date(),
          preClassifiedCategory: null
        },
        {
          uid: 'sandbox-2',
          subject: 'Weekly Team Update & Report',
          from: 'ceo@mycompany.com',
          body: 'Hello All,\n\nHere is our weekly summary. Sales are up 12% and engineering has merged the new authentication module. Great job!\n\nBest,\nJohn',
          snippet: 'Here is our weekly summary. Sales are up 12%...',
          receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          preClassifiedCategory: null
        },
        {
          uid: 'sandbox-3',
          subject: 'Udemy: 90% Off All Web Development Courses Today!',
          from: 'offers@udemy-marketing.com',
          body: 'Unlock your potential. Buy courses from $9.99 today. Deal expires in 24 hours. Unsubscribe here.',
          snippet: 'Unlock your potential. Buy courses from $9.99 today...',
          receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          preClassifiedCategory: null
        },
        {
          uid: 'sandbox-4',
          subject: 'Alice sent you a connection request on LinkedIn',
          from: 'notifications@linkedin.com',
          body: "Alice Johnson wants to connect with you. View Alice's profile or accept request.",
          snippet: 'Alice Johnson wants to connect with you...',
          receivedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          preClassifiedCategory: null
        },
        {
          uid: 'sandbox-5',
          subject: 'CLAIM YOUR FREE BITCOIN CASH NOW!',
          from: 'spammer-king@scam-domain.com',
          body: 'Dear Winner, click this link to claim your 5 BTC prize. Gamble and win!',
          snippet: 'Dear Winner, click this link to claim...',
          receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          preClassifiedCategory: null
        }
      ];
    }
  }

  // Process and save all new emails in our fetched list
  let syncedCount = 0;
  for (const item of fetchedEmails) {
    const hasIntent = hasSchedulingIntent(item.subject, item.body);
    let category = item.preClassifiedCategory;
    let summary = '';
    let topics = [];
    let eventData = null;

    if (category && category !== 'urgent') {
      summary = `Pre-classified as ${category} based on system heuristics.`;
      topics = [category];
    } else {
      const result = await geminiService.classifyAndSummarize(item.subject, item.body);
      category = (result.category || 'normal').toLowerCase().trim();
      if (!['spam', 'social', 'promotions', 'normal', 'urgent'].includes(category)) {
        category = 'normal';
      }
      summary = result.summary;
      topics = result.important_topics;
    }

    const isPromo = isPromotionalText(item.subject, item.body);
    const isSocial = isSocialEmail(item.from, item.subject, item.body);

    if (isPromo) {
      category = 'promotions';
      if (!summary) summary = 'Pre-classified as promotions based on promotional content indicators.';
      if (!topics.includes('promotions')) topics.push('promotions');
    } else if (isSocial) {
      category = 'social';
      if (!summary) summary = 'Pre-classified as social based on notification/social network indicators.';
      if (!topics.includes('social')) topics.push('social');
    }

    if (hasIntent && category === 'normal') {
      const referenceTimeISO = item.receivedAt 
        ? new Date(item.receivedAt).toISOString().replace('Z', '') 
        : new Date().toISOString().replace('Z', '');

      eventData = await geminiService.extractEventDetails(item.subject, item.body, referenceTimeISO);
      if (eventData.has_event && eventData.start_time) {
        category = 'urgent';
        if (!summary) {
          summary = 'Detected scheduling event from email content.';
        }
        if (!topics.includes('meeting')) {
          topics.unshift('meeting');
        }
      }
    }

    console.log('Email Category Decision:', {
      subject: item.subject,
      from: item.from,
      preClassifiedCategory: item.preClassifiedCategory,
      hasIntent,
      isPromo,
      isSocial,
      finalCategory: category,
      summary
    });

    // Save email in MongoDB
    const newEmail = await db.Email.create({
      user_id: userId,
      mail_account_id: mailAccountId,
      email_uid: item.uid,
      subject: item.subject,
      from_address: item.from,
      body: item.body,
      snippet: item.snippet,
      category: category,
      summary: summary,
      important_topics: topics,
      received_at: item.receivedAt
    });

    syncedCount++;

    // Calendar & Notification Sync for Urgent mail with scheduling keywords
    if (category === 'urgent' && hasIntent) {
      if (!eventData) {
        const referenceTimeISO = item.receivedAt 
          ? new Date(item.receivedAt).toISOString().replace('Z', '') 
          : new Date().toISOString().replace('Z', '');
        eventData = await geminiService.extractEventDetails(item.subject, item.body, referenceTimeISO);
      }

      if (eventData && eventData.has_event && eventData.start_time) {
        const startTime = new Date(eventData.start_time);
        const endTime = eventData.end_time ? new Date(eventData.end_time) : new Date(startTime.getTime() + 60 * 60 * 1000);

        if (!isNaN(startTime.getTime())) {
          // Add in-app calendar event
          await db.CalendarEvent.create({
            user_id: userId,
            mail_account_id: mailAccountId,
            email_id: newEmail._id,
            title: eventData.title,
            description: eventData.description,
            start_time: startTime,
            end_time: isNaN(endTime.getTime()) ? new Date(startTime.getTime() + 60 * 60 * 1000) : endTime
          });
          console.log(`Scheduled meeting for email ${newEmail._id}: ${eventData.title}`);
        }
      }
    }
  }

  return { syncedCount };
}

/**
 * Send an email from a connected mail account
 * @param {object} account - The Mongoose mail_account document
 * @param {object} emailData - Email data with { to, cc, bcc, subject, body }
 * @returns {Promise<{success: boolean, error?: string, messageId?: string}>}
 */
async function sendEmail(account, emailData) {
  const { to, cc, bcc, subject, body } = emailData;
  const provider = account.provider;

  try {
    if (provider === 'google') {
      // Gmail API Send
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      auth.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.token_expiry
      });

      // Handle token refresh
      auth.on('tokens', async (tokens) => {
        const updates = {
          access_token: tokens.access_token,
          token_expiry: tokens.expiry_date
        };
        if (tokens.refresh_token) {
          updates.refresh_token = tokens.refresh_token;
        }
        await db.MailAccount.findByIdAndUpdate(account._id, updates);
      });

      const gmail = google.gmail({ version: 'v1', auth });

      // Build email message
      const emailLines = [
        `From: ${account.email}`,
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        body
      ].filter(line => line !== '').join('\n');

      const encodedMessage = Buffer.from(emailLines)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      return { success: true, messageId: result.data.id };
    } else if (provider === 'imap') {
      // IMAP Send (using nodemailer)
      const nodemailer = require('nodemailer');
      const imapPassword = db.decryptPassword(account.imap_password);

      // IMAP servers typically use SMTP on port 587 or 465
      // For IMAP providers, we derive SMTP settings
      const smtpHost = account.imap_host.replace('imap', 'smtp');
      const smtpPort = account.imap_port === 993 ? 465 : 587;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: account.imap_user,
          pass: imapPassword
        }
      });

      const mailOptions = {
        from: account.email,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        text: body
      };

      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } else if (provider === 'sandbox') {
      return { success: true, messageId: 'sandbox-sent-' + Date.now() };
    } else {
      return { success: false, error: `Unsupported provider: ${provider}` };
    }
  } catch (err) {
    console.error('Send email error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  syncMailbox,
  sendEmail
};
