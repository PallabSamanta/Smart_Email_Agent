const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');
require('dotenv').config();

// Initialize the Gemini SDK if the key is provided
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn('WARNING: GEMINI_API_KEY is not defined in .env. LLM services will run in fallback mock mode.');
}

const MODEL_CANDIDATES = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-pro'
];

let workingModelName = null;

async function getAvailableModelName(apiKey) {
  if (workingModelName) return workingModelName;
  if (!apiKey) return 'gemini-1.5-flash';

  return new Promise((resolve) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            if (result.models && result.models.length > 0) {
              const apiModels = result.models.map(m => m.name.replace('models/', ''));
              for (const candidate of MODEL_CANDIDATES) {
                if (apiModels.includes(candidate)) {
                  console.log(`Resolved Gemini model: ${candidate}`);
                  workingModelName = candidate;
                  return resolve(candidate);
                }
              }
            }
          } else {
            console.warn(`REST API ListModels returned status ${res.statusCode}: ${data}`);
          }
        } catch (e) {
          console.warn('Failed to parse listModels response:', e.message);
        }
        resolve('gemini-1.5-flash');
      });
    }).on('error', (err) => {
      console.warn('Error listing models:', err.message);
      resolve('gemini-1.5-flash');
    });
  });
}


/**
 * Classify and summarize an email
 * @param {string} subject 
 * @param {string} body 
 * @returns {Promise<{category: string, summary: string, important_topics: string[]}>}
 */
async function classifyAndSummarize(subject, body) {
  if (!genAI) {
    return mockClassifyAndSummarize(subject, body);
  }

  try {
    const modelName = await getAvailableModelName(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
You are an advanced email classification assistant. Analyze the email below and return a JSON object with classification, summary, and important topics.

Valid categories are:
- 'spam': Unsolicited commercial emails, junk, phishing, scam, advertisements, suspicious content.
- 'social': Social media notifications, updates from platforms (LinkedIn, Twitter, Facebook), newsletters, chats, personal group threads.
- 'promotions': Marketing emails, offers, discounts, deals, newsletters, subscription announcements, sales.
- 'normal': Business communications, regular personal emails, receipts, shipping confirmations, general threads that don't need immediate action today or tomorrow.
- 'urgent': High-priority emails requiring personal or business action TODAY or TOMORROW (e.g., meetings tomorrow, system outages, important custom requests, scheduling demands).

CRITICAL RULE:
Do not classify marketing, promotional, or notification emails as 'urgent' even if they use urgent marketing language like 'last chance', 'expires today', 'offer ends', 'deal', or 'streak update' (e.g. Chess.com streaks or Udemy discounts). These MUST be classified as 'promotions' or 'social'. 'Urgent' is strictly reserved for actual personal/business tasks, requests, or meetings that require your attention today or tomorrow.

Respond ONLY with a JSON object in this format:
{
  "category": "spam" | "social" | "promotions" | "normal" | "urgent",
  "summary": "A 2 to 3 sentence concise summary explaining what the email is about, who sent it, and what is requested.",
  "important_topics": ["topic1", "topic2", "topic3"]
}

EMAIL DETAILS:
Subject: ${subject}
Body:
${body.substring(0, 4000)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim();
    
    // Parse response
    const data = JSON.parse(jsonText);
    return {
      category: data.category || 'normal',
      summary: data.summary || 'No summary generated.',
      important_topics: Array.isArray(data.important_topics) ? data.important_topics : []
    };
  } catch (error) {
    console.error('Gemini Classification API Error:', error);
    return mockClassifyAndSummarize(subject, body);
  }
}

/**
 * Extract event details from an email body
 * @param {string} subject 
 * @param {string} body 
 * @param {string} currentLocalTimeISO - User's current local date/time for reference (e.g. "2026-06-14T14:08:24")
 * @returns {Promise<{has_event: boolean, title: string, description: string, start_time: string|null, end_time: string|null}>}
 */
async function extractEventDetails(subject, body, currentLocalTimeISO) {
  if (!genAI) {
    return mockExtractEventDetails(subject, body, currentLocalTimeISO);
  }

  try {
    const modelName = await getAvailableModelName(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
You are an expert event coordinator. Analyze the email details below to determine if a meeting, calendar event, appointment, or schedule task is mentioned.
If an event is mentioned, extract the details relative to the provided current local time: "${currentLocalTimeISO}".
For example, if the email says "tomorrow 9:30 am" and the current local time is "2026-06-14T14:00:00", then the start_time is "2026-06-15T09:30:00".
If no end time is mentioned, default the end_time to 1 hour after the start_time.
Format all times as "YYYY-MM-DD HH:mm:ss" or ISO timestamps in the local timezone.

Respond ONLY with a JSON object in this format:
{
  "has_event": true or false,
  "title": "Short event title (e.g., Project Sync with Alice)",
  "description": "Short description of the event containing context or links from the email.",
  "start_time": "YYYY-MM-DD HH:mm:ss" or null,
  "end_time": "YYYY-MM-DD HH:mm:ss" or null
}

EMAIL DETAILS:
Subject: ${subject}
Body:
${body.substring(0, 4000)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim();
    
    const data = JSON.parse(jsonText);
    return {
      has_event: !!data.has_event,
      title: data.title || 'Meeting Scheduled',
      description: data.description || '',
      start_time: data.start_time || null,
      end_time: data.end_time || null
    };
  } catch (error) {
    console.error('Gemini Event Extraction API Error:', error);
    return mockExtractEventDetails(subject, body, currentLocalTimeISO);
  }
}

/**
 * Fallback mock generator if Gemini API key is missing or fails
 */
function mockClassifyAndSummarize(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  
  // 1. Spam indicators
  const isSpam = /viagra|casino|lottery|crypto click|winner|free gift card|unclaimed money|gamble|jackpot/i.test(text);
  if (isSpam) {
    return {
      category: 'spam',
      summary: `Pre-classified as spam. Subject: "${subject || 'No Subject'}"`,
      important_topics: ['spam']
    };
  }

  // 2. Strong meeting/scheduling/urgent indicators (not mixed with promotions)
  const isUrgentMeeting = /meet|zoom|call|sync|schedule|appointment|calendar|invite|session|discussion|catch up/i.test(text);
  const isUrgentTime = /today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|asap|deadline|urgent/i.test(text);
  
  // Promotional indicators
  const isPromo = /sale|discount|promo|coupon|limited time|special offer|buy now|shop now|daily streak|streak|reward|challenge|lesson|course|subscription|renewal|membership|offer|deal|save|discounted/i.test(text) || text.includes('unsubscribe') || text.includes('view online') || text.includes('opt out');
  
  // Social indicators
  const isSocial = /linkedin|facebook|twitter|instagram|pinterest|reddit|youtube|tiktok|snapchat|discord|quora|\br\/|connection request|followed you|friend request|tagged you|social network|view profile/i.test(text);

  let category = 'normal';
  if (isPromo) {
    category = 'promotions';
  } else if (isSocial) {
    category = 'social';
  } else if (isUrgentMeeting && !isPromo && !isSocial) {
    category = 'urgent';
  } else if (isUrgentMeeting && isUrgentTime && !isPromo && !isSocial) {
    category = 'urgent';
  }

  // Create simple summary
  const summary = `Local Mock Summary: Email about "${subject || 'No Subject'}". Content snippet: "${body.substring(0, 60)}..."`;
  
  // Extract simple topics
  const important_topics = [];
  if (text.includes('meeting') || text.includes('call') || text.includes('sync')) important_topics.push('meeting');
  if (text.includes('project')) important_topics.push('project');
  if (text.includes('invoice') || text.includes('pay') || text.includes('billing')) important_topics.push('billing');
  if (important_topics.length === 0) important_topics.push('general');

  return { category, summary, important_topics };
}

/**
 * Smart local event extraction from email details in mock mode
 */
function mockExtractEventDetails(subject, body, currentLocalTimeISO) {
  const text = `${subject} ${body}`.toLowerCase();
  
  // Check if we have scheduling keywords. If not, return has_event: false
  const hasKeywords = /meet|zoom|call|sync|schedule|appointment|calendar|invite|session|discussion|catch up/i.test(text);
  if (!hasKeywords) {
    return { has_event: false, title: '', description: '', start_time: null, end_time: null };
  }

  const baseDate = new Date(currentLocalTimeISO);
  if (isNaN(baseDate.getTime())) {
    return { has_event: false, title: '', description: '', start_time: null, end_time: null };
  }

  let eventDate = new Date(baseDate);

  // Check relative days
  if (text.includes('tomorrow')) {
    eventDate.setDate(baseDate.getDate() + 1);
  } else if (text.includes('today') || text.includes('tonight')) {
    eventDate.setDate(baseDate.getDate());
  } else {
    // Check days of week
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let foundWeekday = -1;
    for (let i = 0; i < weekdays.length; i++) {
      if (new RegExp(`\\b${weekdays[i]}\\b`, 'i').test(text)) {
        foundWeekday = i;
        break;
      }
    }

    if (foundWeekday !== -1) {
      const currentDay = baseDate.getDay(); // 0-6
      let daysToAdd = foundWeekday - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7; // Next week's weekday
      }
      eventDate.setDate(baseDate.getDate() + daysToAdd);
    } else {
      // Check for date formats like "June 15" or "Jun 15" or "15 Jun" or "2026-06-15"
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      let foundMonth = -1;
      let dayOfMonth = -1;
      
      for (let i = 0; i < monthNames.length; i++) {
        const m = monthNames[i];
        const match = text.match(new RegExp(`\\b${m}[a-z]*\\s+(\\d{1,2})\\b`));
        if (match) {
          foundMonth = i;
          dayOfMonth = parseInt(match[1], 10);
          break;
        }
        const matchReverse = text.match(new RegExp(`\\b(\\d{1,2})\\s+${m}[a-z]*\\b`));
        if (matchReverse) {
          foundMonth = i;
          dayOfMonth = parseInt(matchReverse[1], 10);
          break;
        }
      }

      if (foundMonth !== -1 && dayOfMonth !== -1) {
        eventDate.setMonth(foundMonth);
        eventDate.setDate(dayOfMonth);
        // If the date has already passed in the current year, assume next year
        if (eventDate < baseDate) {
          eventDate.setFullYear(baseDate.getFullYear() + 1);
        }
      } else {
        // If no date found, default to tomorrow
        eventDate.setDate(baseDate.getDate() + 1);
      }
    }
  }

  // Try to extract time
  let hour = 10; // Default to 10 AM
  let minute = 0;
  
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  const matchTime = text.match(timeRegex);
  if (matchTime) {
    hour = parseInt(matchTime[1], 10);
    if (matchTime[2]) {
      minute = parseInt(matchTime[2], 10);
    }
    const ampm = matchTime[3].toLowerCase();
    if (ampm === 'pm' && hour < 12) {
      hour += 12;
    } else if (ampm === 'am' && hour === 12) {
      hour = 0;
    }
  } else {
    // Check for 24-hour time format, e.g. 14:00 or 09:30
    const time24Regex = /\b(\d{2}):(\d{2})\b/;
    const match24 = text.match(time24Regex);
    if (match24) {
      hour = parseInt(match24[1], 10);
      minute = parseInt(match24[2], 10);
    } else {
      if (text.includes('tonight')) {
        hour = 19;
      }
    }
  }

  eventDate.setHours(hour, minute, 0, 0);

  function formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }

  const start_time = formatDate(eventDate);
  const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
  const end_time = formatDate(endDate);

  let title = 'Meeting Scheduled';
  if (subject && subject.trim()) {
    title = subject.replace(/^(re|fwd|fw):\s*/i, '').trim();
  }

  return {
    has_event: true,
    title: title,
    description: `Auto-extracted via Mock Mode from email. Subject: ${subject}`,
    start_time: start_time,
    end_time: end_time
  };
}

/**
 * Generate a reply draft to an email
 * @param {string} originalSubject 
 * @param {string} originalBody 
 * @param {string} userPrompt 
 * @returns {Promise<string>}
 */
async function generateReplyDraft(originalSubject, originalBody, userPrompt = '') {
  if (!genAI) {
    return `Mock Reply: Thank you for your email regarding "${originalSubject}". We will review it shortly.`;
  }

  try {
    const modelName = await getAvailableModelName(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = `
You are an AI assistant helping a user write an email reply.
Original Subject: ${originalSubject}
Original Email Body:
${originalBody}

User's instruction for reply: ${userPrompt || 'Reply professionally and address the key points.'}

Write a complete, professional email reply. Do not include subject line, headers, or signature placeholders (like [Your Name]). Write ONLY the body text of the email reply.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini Draft Reply Error:', error);
    return `Failed to generate draft reply: ${error.message}`;
  }
}

/**
 * Generate a new email from scratch using a prompt
 * @param {string} subjectPrompt 
 * @param {string} bodyPrompt 
 * @returns {Promise<{subject: string, body: string}>}
 */
async function generateNewEmail(subjectPrompt, bodyPrompt) {
  if (!genAI) {
    return { 
      subject: subjectPrompt ? `Draft: ${subjectPrompt}` : 'New Email Draft', 
      body: `Mock draft based on prompt: ${bodyPrompt}` 
    };
  }

  try {
    const modelName = await getAvailableModelName(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const prompt = `
You are an AI assistant helping a user write a new email.
Instructions for subject: ${subjectPrompt || 'Generate a relevant professional subject line'}
Instructions for email body: ${bodyPrompt}

Respond ONLY with a JSON object in this format:
{
  "subject": "The generated email subject",
  "body": "The generated email body text"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = JSON.parse(response.text().trim());
    return {
      subject: data.subject || '',
      body: data.body || ''
    };
  } catch (error) {
    console.error('Gemini Generate New Email Error:', error);
    return { 
      subject: subjectPrompt ? `Draft: ${subjectPrompt}` : 'New Email Draft', 
      body: `Failed to generate: ${error.message}` 
    };
  }
}

module.exports = {
  classifyAndSummarize,
  extractEventDetails,
  generateReplyDraft,
  generateNewEmail
};
