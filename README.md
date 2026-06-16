# Smart Email Agent: AI Categorizer, Summarizer, and In-App Calendar Scheduler

An automated full-stack application that connects to **any mail provider** (Gmail via OAuth2 or others via IMAP), classifies messages into categories (Spam, Social, Promotions, Normal, Urgent) using Gemini LLM, automatically parses event/meeting details, and plots them on an **in-app calendar**.

## Prerequisites

1. **MongoDB**: Ensure a MongoDB instance is running locally on your machine (e.g. `mongodb://127.0.0.1:27017`) or have a MongoDB Atlas connection URI.
2. **Gemini API Key**: Create an API key at [Google AI Studio](https://aistudio.google.com/).
3. **Google OAuth2 Credentials (Optional)**: If you want to connect Gmail accounts via Google OAuth, create a web OAuth2 Client ID in the [Google Cloud Console](https://console.cloud.google.com/) with:
   - Gmail API enabled
   - Authorized redirect URI set to: `http://localhost:5000/auth/google/callback`

---

## Installation & Setup

### 1. Database Configuration
The backend application automatically connects to your local MongoDB service and instantiates the collections. You do **not** need to create the database or collections manually! Simply ensure your MongoDB service is running.

### 2. Environment Variables
1. Navigate to the `backend` directory.
2. Copy the template `.env` and fill in your details:
   - Provide your `MONGODB_URI` (default: `mongodb://127.0.0.1:27017/smart_email_agent`).
   - Enter your `GEMINI_API_KEY`.
   - Add your Google OAuth credentials if using Gmail sync.
   - Enter a 32-character encryption key for securing IMAP passwords (e.g., `12345678901234567890123456789012`).

### 3. Start the Backend
From the `backend` directory, run:
```bash
npm install
npm start
```
The server will start on `http://localhost:5000` and output: `Database initialized successfully. Server is running on port 5000`.

### 4. Start the Frontend
From the `frontend` directory, run:
```bash
npm install
npm run dev
```
The Vite development server will boot on `http://localhost:5173`. Open this URL in your web browser.

---

## How to Test the Agent

1. **Register & Log In**: Create a new web app account on the landing page.
2. **Connect a Mailbox**:
   - Go to **Connected Mail** tab.
   - For Gmail, click **Connect with Gmail (OAuth)**.
   - For other services (e.g. Yahoo, custom, Outlook), click **Connect with Custom Email (IMAP)**. Provide your credentials and your provider's IMAP server address (e.g. `imap.mail.yahoo.com`). *Note: Always use an App-Specific Password instead of your primary password. Custom verification confirms mailbox ownership in real-time.*
3. **Sync Inbox**:
   - Go to the **Inbox Hub** and click **🔄 Sync Mailbox**.
   - The agent will fetch the latest 50 emails, run deletion reconciliation, pre-filter spam/promotional tags, and send primary emails to Gemini.
4. **View Results**:
   - Browse the tabs: **Urgent**, **Normal**, **Promotions**, **Social**, and **Spam** to view emails.
   - Click an email to inspect its **AI Summary** and **Important Topics** tags.
5. **View Calendar & Alerts**:
   - Send a test email to your connected mailbox with a subject or body like: *"Let's sync up tomorrow at 9:30 AM to discuss the API spec"* or *"Urgent project meeting today at 3:00 PM"*.
   - Run **🔄 Sync Mailbox**.
   - You will see a browser notification slide in, and a calendar slot will appear under the **In-App Calendar** tab for that day!
   - Clicking the calendar slot will show the meeting details and link back to the original email.
