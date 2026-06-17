const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const db = require('./db');
const authMiddleware = require('./authMiddleware');
const imapService = require('./imapService');
const emailService = require('./emailService');
const geminiService = require('./geminiService');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';

// ----------------------------------------------------
// LOCAL USER AUTHENTICATION
// ----------------------------------------------------

// Sign Up
router.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if user exists
    const existing = await db.User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await db.User.create({
      email,
      password_hash: passwordHash
    });

    // Create token
    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ 
      message: 'User created successfully', 
      user: { id: newUser._id, email: newUser.email } 
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Get user
    const user = await db.User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      message: 'Logged in successfully', 
      user: { id: user._id, email: user.email } 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Check Auth Status / Get Current User
router.get('/auth/me', async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.User.findById(decoded.userId);
    if (!user) {
      res.clearCookie('token');
      return res.json({ authenticated: false });
    }
    res.json({ 
      authenticated: true, 
      user: { id: user._id, email: user.email } 
    });
  } catch (err) {
    res.clearCookie('token');
    res.json({ authenticated: false });
  }
});

// Sign In/Up with Demo Sandbox Account
router.post('/auth/demo', async (req, res) => {
  const email = 'sandbox@ai-demo.com';
  try {
    let user = await db.User.findOne({ email });
    if (!user) {
      // Create user
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('sandbox_demo_123', salt);
      user = await db.User.create({
        email,
        password_hash: passwordHash
      });
    }

    // Auto-connect sandbox mailbox for the demo user
    await db.MailAccount.findOneAndUpdate(
      { user_id: user._id, email },
      {
        provider: 'sandbox',
        imap_host: 'sandbox.mail.local',
        imap_port: 993,
        imap_user: 'sandbox',
        imap_password: db.encryptPassword('sandbox_password')
      },
      { upsert: true, new: true }
    );

    // Create token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      message: 'Logged in as Demo User', 
      user: { id: user._id, email: user.email } 
    });
  } catch (err) {
    console.error('Demo Login error:', err);
    res.status(500).json({ error: 'Failed to initiate sandbox demo session' });
  }
});

// ----------------------------------------------------
// MAILBOX CONNECTIONS (PROTECTED ROUTES)
// ----------------------------------------------------

// List connected mail accounts
router.get('/api/mail-accounts', authMiddleware, async (req, res) => {
  try {
    const accounts = await db.MailAccount.find({ user_id: req.userId });
    const formatted = accounts.map(a => ({
      id: a._id,
      email: a.email,
      provider: a.provider,
      created_at: a.createdAt
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mail accounts' });
  }
});

// Connect Demo Sandbox Mailbox
router.post('/api/mail-accounts/sandbox', authMiddleware, async (req, res) => {
  try {
    await db.MailAccount.findOneAndUpdate(
      { user_id: req.userId, email: 'sandbox@ai-demo.com' },
      {
        provider: 'sandbox',
        imap_host: 'sandbox.mail.local',
        imap_port: 993,
        imap_user: 'sandbox',
        imap_password: db.encryptPassword('sandbox_password')
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Demo sandbox mailbox connected successfully!' });
  } catch (err) {
    console.error('Sandbox Connect error:', err);
    res.status(500).json({ error: 'Failed to connect sandbox mailbox' });
  }
});

// Connect IMAP Mailbox
router.post('/api/mail-accounts/imap', authMiddleware, async (req, res) => {
  const { email, host, port, username, password } = req.body;
  if (!email || !host || !port || !username || !password) {
    return res.status(400).json({ error: 'All IMAP fields are required' });
  }

  try {
    // 1. Verify Ownership / Connection
    const testConfig = { host, port, user: username, pass: password };
    const testResult = await imapService.testConnection(testConfig);
    
    if (!testResult.success) {
      return res.status(400).json({ error: `Connection failed: ${testResult.error}` });
    }

    // 2. Encrypt password
    const encryptedPassword = db.encryptPassword(password);

    // 3. Save to Database (Mongoose upsert)
    await db.MailAccount.findOneAndUpdate(
      { user_id: req.userId, email },
      {
        provider: 'imap',
        imap_host: host,
        imap_port: port,
        imap_user: username,
        imap_password: encryptedPassword
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'IMAP mailbox connected and verified successfully' });
  } catch (err) {
    console.error('IMAP Connect error:', err);
    res.status(500).json({ error: 'Failed to save mailbox connection details' });
  }
});

// Get Google OAuth URL
router.get('/api/mail-accounts/google/url', authMiddleware, async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    // Pass the userId in state so we can link them back on callback
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: String(req.userId)
    });

    res.json({ url });
  } catch (err) {
    console.error('Failed to generate OAuth URL:', err);
    res.status(500).json({ error: 'OAuth setup error' });
  }
});

// Google OAuth Callback (Accessed by browser after google consent screen)
router.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = state; // We stored the userId in the state parameter

  if (!code || !userId) {
    return res.status(400).send('OAuth callback failed: Missing code or session user.');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's email address from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email;

    if (!googleEmail) {
      return res.status(400).send('Failed to retrieve user email from Google.');
    }

    // Save mail account
    await db.MailAccount.findOneAndUpdate(
      { user_id: userId, email: googleEmail },
      {
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date
      },
      { upsert: true, new: true }
    );

    // Redirect user back to the frontend dashboard
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?connected=google&email=${googleEmail}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.status(500).send('Authentication failed during Google OAuth process.');
  }
});

// Disconnect mailbox
router.delete('/api/mail-accounts/:id', authMiddleware, async (req, res) => {
  try {
    // Delete mailbox
    const account = await db.MailAccount.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.userId 
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Mail account not found or unauthorized' });
    }

    // Programmatic Cascading Deletion
    await db.Email.deleteMany({ mail_account_id: req.params.id });
    await db.CalendarEvent.deleteMany({ mail_account_id: req.params.id });

    res.json({ message: 'Mailbox disconnected and all synced emails deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database delete failed' });
  }
});

// ----------------------------------------------------
// EMAILS & SYNC (PROTECTED ROUTES)
// ----------------------------------------------------

// Get emails
router.get('/api/emails', authMiddleware, async (req, res) => {
  const { category, mailAccountId } = req.query;
  
  try {
    const filter = { user_id: req.userId };

    if (category) {
      filter.category = category;
    }
    if (mailAccountId) {
      filter.mail_account_id = mailAccountId;
    }

    const emails = await db.Email.find(filter).sort({ received_at: -1 });
    
    const formatted = emails.map(e => ({
      id: e._id,
      mail_account_id: e.mail_account_id,
      subject: e.subject,
      from_address: e.from_address,
      snippet: e.snippet,
      category: e.category,
      summary: e.summary,
      important_topics: e.important_topics,
      received_at: e.received_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to get emails:', err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Search emails (full-text and fallback regex)
router.get('/api/search', authMiddleware, async (req, res) => {
  const { q, mailAccountId, category, limit } = req.query;
  if (!q || String(q).trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter `q` is required' });
  }

  try {
    const filter = { user_id: req.userId };
    if (mailAccountId) filter.mail_account_id = mailAccountId;
    if (category) filter.category = category;

    const max = Math.min(parseInt(limit) || 50, 200);

    // Prefer text search if available
    let results = [];
    try {
      results = await db.Email.find({
        ...filter,
        $text: { $search: q }
      }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, received_at: -1 })
      .limit(max);
    } catch (textErr) {
      // Text search may fail if text index isn't created; swallow and fallback to regex
      results = [];
    }

    // Fallback to case-insensitive regex search across common fields
    if (!results || results.length === 0) {
      const safe = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'i');
      results = await db.Email.find({
        ...filter,
        $or: [
          { subject: regex },
          { from_address: regex },
          { snippet: regex },
          { body: regex }
        ]
      }).sort({ received_at: -1 }).limit(max);
    }

    const formatted = results.map(e => ({
      id: e._id,
      mail_account_id: e.mail_account_id,
      subject: e.subject,
      from_address: e.from_address,
      snippet: e.snippet,
      category: e.category,
      summary: e.summary,
      important_topics: e.important_topics,
      received_at: e.received_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Search API error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get single email details (including full body)
router.get('/api/emails/:id', authMiddleware, async (req, res) => {
  try {
    const email = await db.Email.findOne({ 
      _id: req.params.id, 
      user_id: req.userId 
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({
      id: email._id,
      user_id: email.user_id,
      mail_account_id: email.mail_account_id,
      email_uid: email.email_uid,
      subject: email.subject,
      from_address: email.from_address,
      body: email.body,
      snippet: email.snippet,
      category: email.category,
      summary: email.summary,
      important_topics: email.important_topics,
      received_at: email.received_at,
      created_at: email.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch email details' });
  }
});

// Trigger manual sync
router.post('/api/sync', authMiddleware, async (req, res) => {
  const { mailAccountId, limit } = req.body;

  try {
    const filter = { user_id: req.userId };
    if (mailAccountId) {
      filter._id = mailAccountId;
    }

    const accounts = await db.MailAccount.find(filter);
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'No connected mail accounts found to sync' });
    }

    let totalSynced = 0;
    const fetchLimit = limit ? parseInt(limit) : undefined;

    for (const account of accounts) {
      try {
        const result = await emailService.syncMailbox(account, fetchLimit);
        totalSynced += result.syncedCount;
      } catch (syncErr) {
        console.error(`Sync failed for mailbox ${account.email}:`, syncErr);
      }
    }

    res.json({ message: 'Sync completed', syncedCount: totalSynced });
  } catch (err) {
    console.error('Sync trigger error:', err);
    res.status(500).json({ error: 'Synchronizing process failed' });
  }
});

// Send Email
router.post('/api/send-email', authMiddleware, async (req, res) => {
  const { mail_account_id, to, cc, bcc, subject, body } = req.body;

  if (!mail_account_id || !to || !subject || !body) {
    return res.status(400).json({ error: 'mail_account_id, to, subject, and body are required' });
  }

  try {
    // Verify ownership of mail account
    const account = await db.MailAccount.findOne({
      _id: mail_account_id,
      user_id: req.userId
    });

    if (!account) {
      return res.status(404).json({ error: 'Mail account not found or unauthorized' });
    }

    // Send email using the emailService
    const result = await emailService.sendEmail(account, {
      to,
      cc,
      bcc,
      subject,
      body
    });

    if (!result.success) {
      return res.status(500).json({ error: `Failed to send email: ${result.error}` });
    }

    res.json({ message: 'Email sent successfully', result });
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({ error: 'Failed to send email: ' + err.message });
  }
});

// ----------------------------------------------------
// CALENDAR & NOTIFICATIONS (PROTECTED ROUTES)
// ----------------------------------------------------

// Fetch all calendar events
router.get('/api/calendar', authMiddleware, async (req, res) => {
  try {
    const events = await db.CalendarEvent.find({ user_id: req.userId })
      .populate('email_id')
      .sort({ start_time: 1 });

    const formatted = events.map(ce => ({
      id: ce._id,
      user_id: ce.user_id,
      mail_account_id: ce.mail_account_id,
      email_id: ce.email_id ? ce.email_id._id : null,
      title: ce.title,
      description: ce.description,
      start_time: ce.start_time,
      end_time: ce.end_time,
      is_notified: ce.is_notified,
      subject: ce.email_id ? ce.email_id.subject : 'No Subject',
      from_address: ce.email_id ? ce.email_id.from_address : 'Unknown'
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Failed to get calendar:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// Fetch unnotified events and mark them as notified
router.get('/api/notifications/unread', authMiddleware, async (req, res) => {
  try {
    const events = await db.CalendarEvent.find({ 
      user_id: req.userId, 
      is_notified: false 
    });

    if (events.length > 0) {
      const ids = events.map(e => e._id);
      await db.CalendarEvent.updateMany(
        { _id: { $in: ids } }, 
        { is_notified: true }
      );
    }

    res.json(events.map(e => ({
      id: e._id,
      title: e.title,
      start_time: e.start_time
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ----------------------------------------------------
// AI SERVICES & DELETE EMAIL
// ----------------------------------------------------

// AI Suggest Draft Reply
router.post('/api/ai/draft-reply', authMiddleware, async (req, res) => {
  const { emailId, userPrompt } = req.body;
  if (!emailId) {
    return res.status(400).json({ error: 'emailId is required' });
  }
  try {
    const email = await db.Email.findOne({ _id: emailId, user_id: req.userId });
    if (!email) {
      return res.status(404).json({ error: 'Email not found or unauthorized' });
    }
    const draftText = await geminiService.generateReplyDraft(email.subject, email.body || email.snippet, userPrompt);
    res.json({ draft: draftText });
  } catch (err) {
    console.error('API Draft Reply Error:', err);
    res.status(500).json({ error: 'Failed to generate draft: ' + err.message });
  }
});

// AI Generate New Email
router.post('/api/ai/generate-email', authMiddleware, async (req, res) => {
  const { subjectPrompt, bodyPrompt } = req.body;
  if (!bodyPrompt) {
    return res.status(400).json({ error: 'bodyPrompt is required' });
  }
  try {
    const draft = await geminiService.generateNewEmail(subjectPrompt, bodyPrompt);
    res.json(draft);
  } catch (err) {
    console.error('API Generate Email Error:', err);
    res.status(500).json({ error: 'Failed to generate email draft: ' + err.message });
  }
});

// Delete single email
router.delete('/api/emails/:id', authMiddleware, async (req, res) => {
  try {
    const email = await db.Email.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.userId 
    });
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found or unauthorized' });
    }

    // Cascading delete calendar events linked to this email
    await db.CalendarEvent.deleteMany({ email_id: req.params.id });

    res.json({ message: 'Email deleted successfully' });
  } catch (err) {
    console.error('Failed to delete email:', err);
    res.status(500).json({ error: 'Database delete failed' });
  }
});

module.exports = router;
