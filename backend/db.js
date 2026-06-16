const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // Must be 32 bytes

const getHashedKey = () => {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
};

// Encrypt function
function encryptPassword(password) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getHashedKey(), iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt function
function decryptPassword(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedTextBuffer = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getHashedKey(), iv);
    let decrypted = decipher.update(encryptedTextBuffer, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Password decryption failed:', error);
    return null;
  }
}

// ----------------------------------------------------
// MONGOOSE SCHEMAS AND MODELS
// ----------------------------------------------------

// User Schema (App Registration Account)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// MailAccount Schema (Linked Mailbox Credentials)
const mailAccountSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  provider: { type: String, enum: ['google', 'imap'], required: true },
  // Google OAuth Credentials (for Gmail)
  access_token: String,
  refresh_token: String,
  token_expiry: Number,
  // Custom IMAP Credentials
  imap_host: String,
  imap_port: Number,
  imap_user: String,
  imap_password: String
}, { timestamps: true });

// Composite Unique constraint: A user can connect a specific mailbox only once
mailAccountSchema.index({ user_id: 1, email: 1 }, { unique: true });

const MailAccount = mongoose.model('MailAccount', mailAccountSchema);

// Email Schema
const emailSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mail_account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MailAccount', required: true },
  email_uid: { type: String, required: true },
  subject: String,
  from_address: String,
  body: String,
  snippet: String,
  category: { type: String, enum: ['spam', 'social', 'promotions', 'normal', 'urgent'], default: 'normal' },
  summary: String,
  important_topics: [String],
  received_at: Date
}, { timestamps: true });

// Composite Unique: Unique messageId/UID per mailbox connection
emailSchema.index({ mail_account_id: 1, email_uid: 1 }, { unique: true });
// Add a text index to support full-text search across common email fields
emailSchema.index({ subject: 'text', body: 'text', from_address: 'text', snippet: 'text' });

const Email = mongoose.model('Email', emailSchema);

// CalendarEvent Schema
const calendarEventSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mail_account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MailAccount', required: true },
  email_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Email', required: true },
  title: { type: String, required: true },
  description: String,
  start_time: Date,
  end_time: Date,
  is_notified: { type: Boolean, default: false }
}, { timestamps: true });

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

// Database initializer
async function initDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_email_agent';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Database initialized successfully.');
}

module.exports = {
  initDB,
  User,
  MailAccount,
  Email,
  CalendarEvent,
  encryptPassword,
  decryptPassword
};
