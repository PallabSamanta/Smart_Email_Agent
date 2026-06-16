const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./db');
const routes = require('./routes');
const emailService = require('./emailService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite development
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Register API Routes
app.use(routes);

// Default Route
app.get('/', (req, res) => {
  res.json({ message: 'Smart Email Agent API running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred' });
});

// ----------------------------------------------------
// AUTO-PURGE SCHEDULER (Space Saving Management)
// ----------------------------------------------------
async function runAutoPurge() {
  console.log('Running daily database auto-purge routine in MongoDB...');
  try {
    // 1. Delete spam older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const spamResult = await db.Email.deleteMany({
      category: 'spam',
      createdAt: { $lt: sevenDaysAgo }
    });
    
    // 2. Delete promotions and social older than 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const promoSocialResult = await db.Email.deleteMany({
      category: { $in: ['promotions', 'social'] },
      createdAt: { $lt: fourteenDaysAgo }
    });
    
    // 3. Strip plain-text body for normal/urgent emails older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const bodyStripResult = await db.Email.updateMany({
      category: { $in: ['normal', 'urgent'] },
      createdAt: { $lt: thirtyDaysAgo },
      body: { $ne: null }
    }, {
      $set: { body: null }
    });

    console.log(`Auto-purge completed. Results:
    - Deleted Spam: ${spamResult.deletedCount}
    - Deleted Promo/Social: ${promoSocialResult.deletedCount}
    - Stripped Older Email Bodies: ${bodyStripResult.modifiedCount}`);
  } catch (err) {
    console.error('Error executing MongoDB auto-purge routine:', err);
  }
}

// Initialize server and database
async function startServer() {
  try {
    await db.initDB();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      
      // Run auto-purge immediately on startup, then every 24 hours
      runAutoPurge();
      setInterval(runAutoPurge, 24 * 60 * 60 * 1000);

      // Run auto-sync immediately on startup, then at configured interval
      // Configure interval via env var `AUTO_SYNC_INTERVAL_MS` (default 5 minutes)
      const defaultInterval = 5 * 60 * 1000; // 5 minutes
      const intervalMs = Number(process.env.AUTO_SYNC_INTERVAL_MS) || defaultInterval;

      async function runAutoSync() {
        console.log('Running auto-sync for connected mail accounts...');
        try {
          const accounts = await db.MailAccount.find({});
          let totalSynced = 0;
          for (const account of accounts) {
            try {
              const result = await emailService.syncMailbox(account);
              totalSynced += result && result.syncedCount ? result.syncedCount : 0;
            } catch (syncErr) {
              console.error(`Auto-sync failed for mailbox ${account.email}:`, syncErr);
            }
          }
          console.log(`Auto-sync completed. Total emails synced: ${totalSynced}`);
        } catch (err) {
          console.error('Error during auto-sync routine:', err);
        }
      }

      // Start the auto-sync loop
      runAutoSync();
      setInterval(runAutoSync, intervalMs);
    });
  } catch (err) {
    console.error('Failed to initialize MongoDB or start server:', err);
    process.exit(1);
  }
}

startServer();
