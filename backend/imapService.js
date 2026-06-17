const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

/**
 * Test credentials to verify ownership of the mailbox
 * @param {object} config - IMAP configuration (host, port, user, pass)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function testConnection(config) {
  const client = new ImapFlow({
    host: config.host,
    port: parseInt(config.port) || 993,
    secure: true,
    auth: {
      user: config.user,
      pass: config.pass
    },
    logger: false,
    connectionTimeout: 8000,
    greetingTimeout: 8000
  });

  try {
    await client.connect();
    await client.logout();
    return { success: true };
  } catch (err) {
    console.error('IMAP Test Connection Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch latest emails from the INBOX
 * @param {object} config - IMAP configuration (host, port, user, pass)
 * @param {number} limit - Maximum number of emails to fetch
 * @returns {Promise<Array<{uid: string, subject: string, from: string, date: Date, body: string, snippet: string}>>}
 */
async function fetchEmails(config, limit = 50, skip = 0) {
  const client = new ImapFlow({
    host: config.host,
    port: parseInt(config.port) || 993,
    secure: true,
    auth: {
      user: config.user,
      pass: config.pass
    },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 15000
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  
  try {
    const status = await client.status('INBOX', { messages: true });
    const total = status.messages;
    
    if (total === 0) {
      return [];
    }

    // Fetch the most recent messages excluding the skipped ones
    const endRange = total - skip;
    if (endRange <= 0) {
      return [];
    }
    const startRange = Math.max(1, endRange - limit + 1);
    const range = `${startRange}:${endRange}`;
    
    const emails = [];
    
    for await (let message of client.fetch(range, { uid: true, envelope: true, internalDate: true, source: true })) {
      let parsed = null;
      try {
        parsed = await simpleParser(message.source);
      } catch (parseErr) {
        console.error(`Failed to parse raw IMAP mail source for UID ${message.uid}:`, parseErr);
      }

      let bodyText = parsed ? (parsed.text || '') : '';
      if (!bodyText && parsed && parsed.html) {
        bodyText = parsed.html;
      }
      // Extract plain text for snippet (strip HTML for preview)
      const plainText = bodyText && parsed && parsed.html && bodyText === parsed.html
        ? bodyText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        : bodyText;
      const snippetText = plainText 
        ? plainText.substring(0, 200).trim()
        : (message.envelope.subject || '');

      emails.push({
        uid: String(message.uid),
        subject: message.envelope.subject || 'No Subject',
        from: message.envelope.from && message.envelope.from[0]
          ? `${message.envelope.from[0].name || ''} <${message.envelope.from[0].address}>`.trim()
          : 'Unknown Sender',
        date: message.internalDate || message.envelope.date || new Date(),
        body: bodyText,
        snippet: snippetText
      });
    }
    
    // Return sorted newest first
    emails.sort((a, b) => new Date(b.date) - new Date(a.date));
    return emails;
  } finally {
    lock.release();
    await client.logout();
  }
}

module.exports = {
  testConnection,
  fetchEmails
};
