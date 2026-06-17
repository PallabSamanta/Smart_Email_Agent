import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

// DOMPurify Hook to force all links to open in a new tab
DOMPurify.addHook('afterSanitizeAttributes', function(node) {
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

const API_BASE = 'http://localhost:5000';

// Format email body helper: handles plain text escaping, newlines, and auto-linking
function formatEmailBody(body) {
  if (!body) return '<p>This email has no body content.</p>';
  
  // Simple check to see if the body is HTML
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  
  if (!isHtml) {
    // Escape HTML first to prevent XSS
    let escaped = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
      
    // Replace newlines with <br />
    escaped = escaped.replace(/\n/g, '<br />');
    
    // Auto-link URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    escaped = escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return escaped;
  }
  
  return body;
}

// Inline SVG Icon components for modern Lucide-like look
function InboxIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function ComposeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function SettingsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SyncIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M16 3h5v5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 21H3v-5" />
    </svg>
  );
}

function NotificationIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function SparklesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z" />
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" />
    </svg>
  );
}

function SendIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <line x1="22" x2="11" y1="2" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ChevronLeftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={props.style}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [user, setUser] = useState(null);
  
  // Dashboard Navigation State
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'calendar', 'compose', or 'settings'
  const [activeCategory, setActiveCategory] = useState('urgent'); // urgent, normal, promotions, social, spam
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : theme === 'cyberpunk' ? 'cyberpunk-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Data State
  const [mailAccounts, setMailAccounts] = useState([]);
  const [allEmails, setAllEmails] = useState([]); // Stores all fetched emails
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Local UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  
  // Action/Sync States
  const [syncing, setSyncing] = useState(false);
  const [fetchLimit, setFetchLimit] = useState(150);
  const listPanelRef = useRef(null);
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const [connectingMailType, setConnectingMailType] = useState(''); // '', 'imap', 'google'
  const [imapEmail, setImapEmail] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [imapUsername, setImapUsername] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  
  // Compose Email State
  const [composeToAddress, setComposeToAddress] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [selectedFromAccount, setSelectedFromAccount] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // AI Assistant States
  const [replyPrompt, setReplyPrompt] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  
  const [aiSubjectPrompt, setAiSubjectPrompt] = useState('');
  const [aiBodyPrompt, setAiBodyPrompt] = useState('');
  const [generatingNewEmailDraft, setGeneratingNewEmailDraft] = useState(false);
  
  // UI Messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Request helper with credentials
  const apiFetch = async (path, options = {}) => {
    options.credentials = 'include';
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  };

  // Debounce ref for search
  const searchDebounce = useRef(null);

  // Perform server-side search when `searchQuery` changes. If empty, fall back to full fetch.
  useEffect(() => {
    // Clear any pending debounce
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    const q = (searchQuery || '').trim();
    if (!q) {
      // No query — reload inbox for current category
      fetchEmails();
      return;
    }

    searchDebounce.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('q', q);
        if (activeCategory) params.set('category', activeCategory);
        const data = await apiFetch(`/api/search?${params.toString()}`);
        setAllEmails(data);
      } catch (err) {
        console.error('Search request failed:', err);
      }
    }, 350);

    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchQuery, activeCategory]);

  // Effect to determine if we should show the scroll/load-more arrow initially
  useEffect(() => {
    if (listPanelRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listPanelRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 45;
      setShowScrollArrow(isAtBottom);
    }
  }, [allEmails, activeCategory]);

  useEffect(() => {
    if (allEmails.length > fetchLimit) {
      setFetchLimit(allEmails.length);
    }
  }, [allEmails]);

  // Initial Auth & Data Check
  useEffect(() => {
    checkAuth();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMailAccounts();
      fetchEmails();
      fetchCalendarEvents();
      
      const interval = setInterval(checkNotifications, 10000);
      checkNotifications();
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle selected email default when active category changes
  useEffect(() => {
    if (isAuthenticated && allEmails.length > 0) {
      const activeCategoryEmails = allEmails.filter(e => e.category === activeCategory);
      if (activeCategoryEmails.length > 0) {
        fetchEmailDetail(activeCategoryEmails[0].id);
      } else {
        setSelectedEmail(null);
      }
    }
  }, [activeCategory, allEmails, isAuthenticated]);

  const checkAuth = async () => {
    try {
      const data = await apiFetch('/auth/me');
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUser(data.user);
      }
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const path = authView === 'signup' ? '/auth/signup' : '/auth/login';
    try {
      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      setUser(data.user);
      setIsAuthenticated(true);
      setAuthPassword('');
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const data = await apiFetch('/auth/demo', { method: 'POST' });
      setUser(data.user);
      setIsAuthenticated(true);
      setSuccessMessage('Demo AI account logged in! Click "Sync Mailbox" to populate the inbox with smart classified emails.');
      setActiveTab('inbox');
    } catch (err) {
      setErrorMessage('Demo login failed: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUser(null);
      setMailAccounts([]);
      setAllEmails([]);
      setSelectedEmail(null);
      setCalendarEvents([]);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const fetchMailAccounts = async () => {
    try {
      const data = await apiFetch('/api/mail-accounts');
      setMailAccounts(data);
      if (data.length > 0 && !selectedFromAccount) {
        setSelectedFromAccount(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const fetchEmails = async () => {
    try {
      const data = await apiFetch('/api/emails');
      setAllEmails(data);
    } catch (err) {
      console.error('Failed to load emails:', err);
    }
  };

  const fetchEmailDetail = async (id) => {
    try {
      const detail = await apiFetch(`/api/emails/${id}`);
      setSelectedEmail(detail);
      setAiDraft('');
      setReplyPrompt('');
    } catch (err) {
      console.error('Failed to load email details:', err);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const data = await apiFetch('/api/calendar');
      setCalendarEvents(data);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    }
  };

  const checkNotifications = async () => {
    try {
      const unread = await apiFetch('/api/notifications/unread');
      if (unread.length > 0) {
        setNotifications(prev => [...unread, ...prev]);
        
        unread.forEach(event => {
          if (Notification.permission === 'granted') {
            new Notification('Smart Email Agent', {
              body: `Meeting scheduled: ${event.title} at ${new Date(event.start_time).toLocaleString()}`,
            });
          }
        });
        
        fetchCalendarEvents();
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleSync = async (limitOverride) => {
    setSyncing(true);
    setSuccessMessage('');
    setErrorMessage('');
    const currentLimit = limitOverride || fetchLimit;
    try {
      const data = await apiFetch('/api/sync', { method: 'POST', body: JSON.stringify({ limit: currentLimit }) });
      setSuccessMessage(`Sync completed! Synced ${data.syncedCount} new emails.`);
      fetchEmails();
      fetchCalendarEvents();
      checkNotifications();
    } catch (err) {
      setErrorMessage('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleListScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Show arrow if we are close to the bottom (within 45px)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 45;
    setShowScrollArrow(isAtBottom);
  };

  const handleLoadMore = async () => {
    if (syncing) return;
    const currentCount = allEmails.length;
    const nextLimit = Math.max(fetchLimit, currentCount) + 100;
    setFetchLimit(nextLimit);
    await handleSync(nextLimit);
  };

  const handleConnectImap = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await apiFetch('/api/mail-accounts/imap', {
        method: 'POST',
        body: JSON.stringify({
          email: imapEmail,
          host: imapHost,
          port: parseInt(imapPort),
          username: imapUsername,
          password: imapPassword
        })
      });
      setSuccessMessage('Mailbox connected successfully!');
      setConnectingMailType('');
      fetchMailAccounts();
      
      setImapEmail('');
      setImapHost('');
      setImapUsername('');
      setImapPassword('');
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const data = await apiFetch('/api/mail-accounts/google/url');
      window.location.href = data.url;
    } catch (err) {
      setErrorMessage('Failed to trigger Google OAuth: ' + err.message);
    }
  };

  const handleConnectSandboxMailbox = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await apiFetch('/api/mail-accounts/sandbox', { method: 'POST' });
      setSuccessMessage('Sandbox demo mailbox connected successfully!');
      fetchMailAccounts();
    } catch (err) {
      setErrorMessage('Failed to connect sandbox: ' + err.message);
    }
  };

  const handleDisconnectMailbox = async (id) => {
    if (!confirm('Are you sure you want to disconnect this mailbox? This will delete all synced emails and local events.')) return;
    try {
      await apiFetch(`/api/mail-accounts/${id}`, { method: 'DELETE' });
      fetchMailAccounts();
      fetchEmails();
      fetchCalendarEvents();
      setSelectedEmail(null);
    } catch (err) {
      alert('Failed to disconnect mailbox: ' + err.message);
    }
  };

  const handleDeleteEmail = async (id) => {
    if (!confirm('Are you sure you want to delete this email? This will also remove any related calendar events.')) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await apiFetch(`/api/emails/${id}`, { method: 'DELETE' });
      setSuccessMessage('Email deleted successfully!');
      setSelectedEmail(null);
      fetchEmails();
      fetchCalendarEvents();
    } catch (err) {
      setErrorMessage('Failed to delete email: ' + err.message);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!selectedFromAccount) {
      setErrorMessage('Please select a mail account to send from');
      return;
    }
    if (!composeToAddress.trim()) {
      setErrorMessage('Please enter a recipient email address');
      return;
    }

    setSendingEmail(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await apiFetch('/api/send-email', {
        method: 'POST',
        body: JSON.stringify({
          mail_account_id: selectedFromAccount,
          to: composeToAddress.trim(),
          cc: composeCc.trim(),
          bcc: composeBcc.trim(),
          subject: composeSubject.trim(),
          body: composeBody.trim()
        })
      });

      setSuccessMessage('Email sent successfully!');
      setComposeToAddress('');
      setComposeCc('');
      setComposeBcc('');
      setComposeSubject('');
      setComposeBody('');
    } catch (err) {
      setErrorMessage('Failed to send email: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleGenerateDraftReply = async () => {
    if (!selectedEmail) return;
    setGeneratingDraft(true);
    setErrorMessage('');
    setAiDraft('');
    try {
      const data = await apiFetch('/api/ai/draft-reply', {
        method: 'POST',
        body: JSON.stringify({ emailId: selectedEmail.id, userPrompt: replyPrompt })
      });
      setAiDraft(data.draft);
    } catch (err) {
      setErrorMessage('Failed to generate draft reply: ' + err.message);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleInsertDraftIntoComposer = () => {
    if (!selectedEmail || !aiDraft) return;
    setComposeToAddress(selectedEmail.from_address);
    setComposeSubject(selectedEmail.subject.toLowerCase().startsWith('re:') ? selectedEmail.subject : 'Re: ' + selectedEmail.subject);
    setComposeBody(aiDraft);
    setSelectedFromAccount(selectedEmail.mail_account_id);
    setActiveTab('compose');
  };

  const handleAiGenerateEmail = async (e) => {
    e.preventDefault();
    if (!aiBodyPrompt.trim()) {
      setErrorMessage('Please describe what to cover in the email body.');
      return;
    }
    setGeneratingNewEmailDraft(true);
    setErrorMessage('');
    try {
      const data = await apiFetch('/api/ai/generate-email', {
        method: 'POST',
        body: JSON.stringify({ subjectPrompt: aiSubjectPrompt, bodyPrompt: aiBodyPrompt })
      });
      setComposeSubject(data.subject);
      setComposeBody(data.body);
      setSuccessMessage('AI email draft generated!');
      setAiSubjectPrompt('');
      setAiBodyPrompt('');
    } catch (err) {
      setErrorMessage('Failed to generate draft: ' + err.message);
    } finally {
      setGeneratingNewEmailDraft(false);
    }
  };

  const getEventsByDate = (dateStr) => {
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.start_time).toDateString();
      const compareDate = new Date(dateStr).toDateString();
      return eventDate === compareDate;
    });
  };

  const getCategoryCount = (cat) => {
    return allEmails.filter(e => e.category === cat).length;
  };

  const getFilteredEmailsList = () => {
    // When server-side search is active (searchQuery non-empty), `allEmails` already contains filtered results.
    // When empty, `allEmails` contains the full inbox and we filter by `activeCategory` here.
    if (searchQuery && searchQuery.trim() !== '') return allEmails;
    return allEmails.filter(e => e.category === activeCategory);
  };

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentCalendarDate(new Date());
  };

  const renderCalendarCells = () => {
    const today = new Date();
    const currentYear = currentCalendarDate.getFullYear();
    const currentMonth = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(currentYear, currentMonth, -startingDayOfWeek + i + 1);
      cells.push({ date: prevDate, currentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      cells.push({ date, currentMonth: true });
    }

    const totalSlots = Math.ceil(cells.length / 7) * 7;
    const remaining = totalSlots - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      cells.push({ date: nextDate, currentMonth: false });
    }

    return cells.map((cell, idx) => {
      const dateString = cell.date.toDateString();
      const isToday = dateString === today.toDateString();
      const dayEvents = getEventsByDate(cell.date);

      return (
        <div 
          key={idx} 
          className={`calendar-cell ${cell.currentMonth ? '' : 'different-month'} ${isToday ? 'today' : ''}`}
        >
          <div className="calendar-cell-number">{cell.date.getDate()}</div>
          <div style={{ flexGrow: 1, overflowY: 'auto' }}>
            {dayEvents.map(event => (
              <div 
                key={event.id} 
                className="calendar-event-pill"
                title={`${event.title} - ${new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                onClick={() => {
                  setActiveTab('inbox');
                  setActiveCategory('urgent');
                  fetchEmailDetail(event.email_id);
                }}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  // Render Authentication Portal
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '40px', width: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div className="logo-icon" style={{ margin: '0 auto 12px auto' }}>
              <SparklesIcon style={{ width: '22px', height: '22px', color: '#fff' }} />
            </div>
            <h2 className="logo-text" style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Smart Email Agent</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI Email Classification & Scheduling Dashboard</p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address</label>
              <input 
                type="email" 
                value={authEmail} 
                onChange={(e) => setAuthEmail(e.target.value)} 
                required 
                placeholder="name@domain.com"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Password</label>
              <input 
                type="password" 
                value={authPassword} 
                onChange={(e) => setAuthPassword(e.target.value)} 
                required 
                placeholder="••••••••"
              />
            </div>
            
            {errorMessage && (
              <div style={{ color: 'var(--cat-urgent)', fontSize: '0.85rem', background: 'var(--cat-urgent-bg)', padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                {errorMessage}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ marginTop: '8px', width: '100%' }}>
              {authView === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            
            <button type="button" className="btn-secondary" style={{ width: '100%', borderColor: 'var(--accent-purple)', color: 'var(--text-main)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))' }} onClick={handleDemoLogin}>
              🧪 Try with AI (Sandbox Demo)
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {authView === 'login' ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button 
              className="btn-secondary" 
              style={{ border: 'none', background: 'none', color: 'var(--accent-indigo)', padding: '0 6px', cursor: 'pointer', fontWeight: '600' }}
              onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}
            >
              {authView === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredEmailsList = getFilteredEmailsList();
  const sortedUpcomingEvents = [...calendarEvents]
    .filter(e => new Date(e.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return (
    <div className="app-container">
      {/* Sidebar Left Navigation */}
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="logo-container" style={isSidebarCollapsed ? { flexDirection: 'column', gap: '12px', paddingLeft: 0, justifyContent: 'center' } : {}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-icon">
              <SparklesIcon style={{ width: '20px', height: '20px', color: '#fff' }} />
            </div>
            {!isSidebarCollapsed && <span className="logo-text">Smart Email</span>}
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className="sidebar-toggle-btn"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            style={isSidebarCollapsed ? { margin: '0 auto' } : {}}
          >
            {isSidebarCollapsed ? <ChevronRightIcon style={{ width: '16px', height: '16px' }} /> : <ChevronLeftIcon style={{ width: '16px', height: '16px' }} />}
          </button>
        </div>

        <ul className="nav-menu">
          <li 
            className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('inbox')}
            title={isSidebarCollapsed ? "Inbox Hub" : ""}
          >
            <InboxIcon /> {!isSidebarCollapsed && "Inbox Hub"}
          </li>
          <li 
            className={`nav-item ${activeTab === 'compose' ? 'active' : ''}`}
            onClick={() => setActiveTab('compose')}
            title={isSidebarCollapsed ? "Compose Email" : ""}
          >
            <ComposeIcon /> {!isSidebarCollapsed && "Compose Email"}
          </li>
          <li 
            className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
            title={isSidebarCollapsed ? "In-App Calendar" : ""}
          >
            <CalendarIcon /> {!isSidebarCollapsed && "In-App Calendar"}
          </li>
          <li 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title={isSidebarCollapsed ? "Connected Mail" : ""}
          >
            <SettingsIcon /> {!isSidebarCollapsed && "Connected Mail"}
          </li>
          <li 
            className="nav-item theme-toggle-item"
            onClick={() => {
              if (theme === 'dark') setTheme('light');
              else if (theme === 'light') setTheme('cyberpunk');
              else setTheme('dark');
            }}
            title={isSidebarCollapsed ? `Theme: ${theme.toUpperCase()}` : ""}
            style={{ marginTop: 'auto' }}
          >
            {theme === 'light' && <MoonIcon />}
            {theme === 'cyberpunk' && <SparklesIcon style={{ color: 'var(--accent-purple)' }} />}
            {theme === 'dark' && <SunIcon />}
            {!isSidebarCollapsed && (
              <span>
                {theme === 'dark' && 'Light Mode'}
                {theme === 'light' && 'Cyberpunk Mode'}
                {theme === 'cyberpunk' && 'Dark Mode'}
              </span>
            )}
          </li>
        </ul>

        <div className="user-profile" style={isSidebarCollapsed ? { padding: '12px 0', justifyContent: 'center', flexDirection: 'column', gap: '12px' } : {}}>
          {!isSidebarCollapsed ? (
            <>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Logged in as</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button onClick={handleLogout} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Log out">
                Logout
              </button>
            </>
          ) : (
            <button onClick={handleLogout} className="btn-secondary sidebar-logout-btn" style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={`Log out (${user?.email})`}>
              <LogoutIcon style={{ width: '18px', height: '18px', color: 'var(--cat-urgent)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Right Pane */}
      <div className="workspace">
        {/* Header Row */}
        <header className="header">
          <div>
            <h1 style={{ fontSize: '1.4rem' }}>
              {activeTab === 'inbox' && 'Inbox AI Categorizer'}
              {activeTab === 'compose' && 'Compose Email'}
              {activeTab === 'calendar' && 'Meeting Schedule'}
              {activeTab === 'settings' && 'Mail Connections'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>


            {activeTab === 'inbox' && (
              <div className="search-container">
                <SearchIcon />
                <input 
                  type="text" 
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            
            {mailAccounts.length > 0 && (
              <button 
                onClick={() => handleSync()} 
                disabled={syncing}
                className="btn-primary" 
                style={{ fontSize: '0.85rem', padding: '8px 16px', marginRight: '12px' }}
              >
                <SyncIcon className={syncing ? 'spinner' : ''} style={{ width: '14px', height: '14px' }} />
                {syncing ? 'Syncing...' : 'Sync Mailbox'}
              </button>
            )}
            
            {/* Notification Icon */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn-secondary" 
                style={{ fontSize: '1rem', padding: '8px 12px' }}
              >
                <NotificationIcon style={{ width: '16px', height: '16px' }} />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--cat-urgent)', color: '#fff', fontSize: '0.6rem', borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '45px', width: '320px', zIndex: 10, padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                  <h4 style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>Meeting Alerts</h4>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No new notifications.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {notifications.map((notif, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '6px' }}>
                          <strong style={{ display: 'block', color: 'var(--text-main)' }}>{notif.title}</strong>
                          <div style={{ color: 'var(--accent-indigo)', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ClockIcon style={{ width: '12px', height: '12px' }} /> {new Date(notif.start_time).toLocaleString()}
                          </div>
                        </div>
                      ))}
                      <button className="btn-secondary" style={{ width: '100%', fontSize: '0.75rem', padding: '6px', marginTop: '4px' }} onClick={() => setNotifications([])}>Clear Alerts</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Success / Error Message Bar */}
        {(successMessage || errorMessage) && (
          <div style={{ padding: '12px 32px', display: 'flex', justifyContent: 'space-between', background: successMessage ? 'rgba(16, 185, 129, 0.08)' : 'var(--cat-urgent-bg)', borderBottom: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.85rem', color: successMessage ? 'var(--cat-social)' : 'var(--cat-urgent)', fontWeight: '500' }}>
              {successMessage || errorMessage}
            </span>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }} onClick={() => { setSuccessMessage(''); setErrorMessage(''); }}>✕</button>
          </div>
        )}

        {/* Tab Content 1: Inbox */}
        {activeTab === 'inbox' && (
          <div className="split-pane animate-fade-in">
            {/* Left Column: Email List */}
            <div 
              className="list-panel"
              ref={listPanelRef}
              onScroll={handleListScroll}
              style={{ position: 'relative' }}
            >
              {/* Category Filter Chips */}
              <div className="category-tabs" style={{ display: 'flex', gap: '8px', padding: '16px', overflowX: 'auto', borderBottom: '1px solid var(--border-glass)', flexShrink: 0 }}>
                {['urgent', 'normal', 'promotions', 'social', 'spam'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); }}
                    className={`category-tab-btn ${activeCategory === cat ? 'active ' + cat : ''}`}
                  >
                    {cat}
                    <span className="category-count">{getCategoryCount(cat)}</span>
                  </button>
                ))}
              </div>

              {/* Emails List */}
              {filteredEmailsList.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No emails in this category. Click Sync to fetch latest.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredEmailsList.map(email => (
                    <div 
                      key={email.id}
                      onClick={() => fetchEmailDetail(email.id)}
                      className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''} ${activeCategory}`}
                    >
                      <div className="email-item-border"></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px', color: selectedEmail?.id === email.id ? 'var(--text-main)' : 'var(--text-secondary)' }}>{email.subject || '(No Subject)'}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(email.received_at).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        From: {email.from_address}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                        {email.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Floating Load More Arrow Button */}
              {showScrollArrow && (
                <button
                  onClick={handleLoadMore}
                  disabled={syncing}
                  className="floating-load-more-btn pulse-effect"
                  title="Load More Emails"
                >
                  {syncing ? (
                    <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <polyline points="19 12 12 19 5 12"></polyline>
                    </svg>
                  )}
                </button>
              )}
            </div>

            {/* Right Column: Email detail View */}
            <div className="detail-panel">
              {selectedEmail ? (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-glass)', paddingBottom: '18px' }}>
                    <div>
                      <span className={`badge badge-${selectedEmail.category}`} style={{ marginBottom: '10px' }}>
                        {selectedEmail.category}
                      </span>
                      <h2 style={{ fontSize: '1.45rem', marginBottom: '8px', color: 'var(--text-main)' }}>{selectedEmail.subject || '(No Subject)'}</h2>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <strong>From:</strong> {selectedEmail.from_address} | <strong>Received:</strong> {new Date(selectedEmail.received_at).toLocaleString()}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteEmail(selectedEmail.id)}
                      className="btn-secondary" 
                      style={{ color: 'var(--cat-urgent)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                      title="Delete Email"
                    >
                      <TrashIcon style={{ width: '14px', height: '14px' }} /> Delete
                    </button>
                  </div>

                  {/* AI Summary Block */}
                  <div className="ai-summary-card">
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <SparklesIcon style={{ width: '14px', height: '14px' }} /> Gemini AI summary
                    </h4>
                    <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{selectedEmail.summary}</p>
                    
                    {selectedEmail.important_topics && selectedEmail.important_topics.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
                        {selectedEmail.important_topics.map((tag, idx) => (
                          <span key={idx} className="ai-topic-tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Reply Assistant Widget */}
                  <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-indigo)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <SparklesIcon style={{ width: '14px', height: '14px' }} /> Smart Reply Assistant
                    </h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        placeholder="Instructions for reply (e.g. 'Politely decline', 'Accept meeting for 2 PM')..." 
                        value={replyPrompt}
                        onChange={(e) => setReplyPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateDraftReply(); }}
                      />
                      <button 
                        onClick={handleGenerateDraftReply}
                        disabled={generatingDraft}
                        className="btn-primary"
                        style={{ flexShrink: 0 }}
                      >
                        {generatingDraft ? <span className="spinner"></span> : <SparklesIcon style={{ width: '14px', height: '14px' }} />}
                        Draft
                      </button>
                    </div>

                    {aiDraft && (
                      <div className="animate-fade-in" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Suggested Reply Draft:</span>
                          <button 
                            className="btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={handleInsertDraftIntoComposer}
                          >
                            Insert into Composer
                          </button>
                        </div>
                        <div className="ai-draft-output-box">{aiDraft}</div>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Email Content</h4>
                    <div 
                      className="email-body-content"
                      style={{ 
                        fontSize: '0.95rem', 
                        lineHeight: '1.6', 
                        padding: '28px', 
                        borderRadius: 'var(--radius-md)', 
                        wordBreak: 'break-word', 
                        overflowWrap: 'break-word', 
                        maxHeight: '500px', 
                        overflowY: 'auto',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(formatEmailBody(selectedEmail.body), { 
                          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'hr', 'font', 'u', 'del', 'ins'],
                          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'style'],
                          KEEP_CONTENT: true
                        })
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  Select an email to view details and AI summary.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content 2: Compose Email */}
        {activeTab === 'compose' && (
          <div className="animate-fade-in" style={{ padding: '32px', display: 'flex', gap: '24px', height: 'calc(100vh - 70px)', overflowY: 'auto' }}>
            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, maxWidth: '640px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Compose Email</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Send emails directly from your linked accounts.</p>
              </div>

              {/* From Account Selection */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>From Account</label>
                {mailAccounts.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--cat-urgent)' }}>
                    No mail accounts connected. Please <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-indigo)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveTab('settings')}>connect a mail account</button> first.
                  </div>
                ) : (
                  <select 
                    value={selectedFromAccount} 
                    onChange={(e) => setSelectedFromAccount(e.target.value)}
                    required
                  >
                    <option value="" disabled>-- Select a mail account --</option>
                    {mailAccounts.map(account => (
                      <option key={account.id} value={account.id}>{account.email}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* To */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>To</label>
                <input 
                  type="email" 
                  value={composeToAddress} 
                  onChange={(e) => setComposeToAddress(e.target.value)} 
                  placeholder="recipient@example.com"
                  required
                />
              </div>

              {/* CC and BCC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>CC</label>
                  <input 
                    type="text" 
                    value={composeCc} 
                    onChange={(e) => setComposeCc(e.target.value)} 
                    placeholder="cc1@example.com"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>BCC</label>
                  <input 
                    type="text" 
                    value={composeBcc} 
                    onChange={(e) => setComposeBcc(e.target.value)} 
                    placeholder="bcc1@example.com"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Subject</label>
                <input 
                  type="text" 
                  value={composeSubject} 
                  onChange={(e) => setComposeSubject(e.target.value)} 
                  placeholder="Email subject..."
                  required
                />
              </div>

              {/* Body */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Message</label>
                <textarea 
                  value={composeBody} 
                  onChange={(e) => setComposeBody(e.target.value)} 
                  placeholder="Write your email here..."
                  required
                  style={{ minHeight: '220px', resize: 'vertical' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={sendingEmail || mailAccounts.length === 0}
                  style={{ padding: '12px 24px' }}
                >
                  {sendingEmail ? <span className="spinner"></span> : <SendIcon style={{ width: '14px', height: '14px' }} />}
                  Send Email
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setComposeToAddress('');
                    setComposeCc('');
                    setComposeBcc('');
                    setComposeSubject('');
                    setComposeBody('');
                  }}
                  style={{ padding: '12px 24px' }}
                >
                  Clear
                </button>
              </div>
            </form>

            {/* AI Writing Assistant Side-Pane */}
            <div className="glass-panel" style={{ width: '340px', padding: '24px', border: '1px solid rgba(168, 85, 247, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px', alignSelf: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <SparklesIcon style={{ width: '16px', height: '16px' }} /> AI Writer Assistant
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Let Gemini generate a professional email draft based on your criteria.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Subject Topic (Optional)</label>
                  <input 
                    type="text" 
                    value={aiSubjectPrompt}
                    onChange={(e) => setAiSubjectPrompt(e.target.value)}
                    placeholder="e.g. Schedule Project Sync"
                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>What should the email say?</label>
                  <textarea 
                    value={aiBodyPrompt}
                    onChange={(e) => setAiBodyPrompt(e.target.value)}
                    placeholder="e.g. Ask David to send over the updated slides by Wednesday afternoon..."
                    style={{ fontSize: '0.8rem', padding: '8px 12px', minHeight: '120px', resize: 'vertical' }}
                  />
                </div>
                <button 
                  onClick={handleAiGenerateEmail}
                  disabled={generatingNewEmailDraft}
                  className="btn-primary"
                  style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))' }}
                >
                  {generatingNewEmailDraft ? <span className="spinner"></span> : <SparklesIcon style={{ width: '14px', height: '14px' }} />}
                  Write with AI
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 3: Calendar */}
        {activeTab === 'calendar' && (
          <div className="calendar-layout animate-fade-in">
            <div className="calendar-main">
              <div className="calendar-header">
                <div>
                  <h2 style={{ fontSize: '1.4rem' }}>
                    {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                    Meetings auto-extracted from Urgent category emails.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handlePrevMonth} className="btn-secondary" style={{ padding: '6px 12px' }}>
                    &larr; Prev
                  </button>
                  <button onClick={handleCurrentMonth} className="btn-secondary" style={{ padding: '6px 12px' }}>
                    Today
                  </button>
                  <button onClick={handleNextMonth} className="btn-secondary" style={{ padding: '6px 12px' }}>
                    Next &rarr;
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '10px' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="calendar-day-name">{day}</div>
                  ))}
                </div>
                
                {/* Grid cells */}
                <div className="calendar-grid">
                  {renderCalendarCells()}
                </div>
              </div>
            </div>

            {/* Upcoming Agenda Panel */}
            <div className="agenda-panel">
              <div className="agenda-header">
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockIcon style={{ width: '16px', height: '16px', color: 'var(--accent-indigo)' }} />
                  Upcoming Agenda
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>Next scheduled events</p>
              </div>
              <div className="agenda-list">
                {sortedUpcomingEvents.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '20px' }}>No upcoming events.</p>
                ) : (
                  sortedUpcomingEvents.map(event => (
                    <div 
                      key={event.id}
                      className="agenda-item"
                      onClick={() => {
                        setActiveTab('inbox');
                        setActiveCategory('urgent');
                        fetchEmailDetail(event.email_id);
                      }}
                    >
                      <div className="agenda-item-time">
                        <ClockIcon style={{ width: '12px', height: '12px' }} />
                        {new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginTop: '4px' }}>{event.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Subject: {event.subject}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 4: Settings / Connected Mail */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '900px', height: 'calc(100vh - 70px)', overflowY: 'auto' }}>
            
            {/* Linked Mailboxes list */}
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '1.15rem' }}>Your Connected Mailboxes</h3>
              {mailAccounts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No mailboxes linked yet. Connect a mailbox below to start fetching.</p>
              ) : (
                <div className="mailboxes-grid">
                  {mailAccounts.map(account => (
                    <div key={account.id} className="glass-panel mailbox-card">
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{account.email}</strong>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: account.provider === 'google' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)', color: account.provider === 'google' ? 'var(--cat-normal)' : 'var(--accent-purple)', border: '1px solid currentColor', textTransform: 'uppercase', fontWeight: '700' }}>
                            {account.provider}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                          Connected: {new Date(account.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                        <div className="status-indicator">
                          <div className="status-dot"></div> Connected
                        </div>
                        <button 
                          onClick={() => handleDisconnectMailbox(account.id)}
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', borderColor: 'rgba(244, 63, 94, 0.2)', color: 'var(--cat-urgent)', fontSize: '0.75rem' }}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Connect Mailbox UI */}
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '1.15rem' }}>Connect a New Mailbox</h3>
              
              {connectingMailType === '' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleConnectGoogle} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌐 Connect with Gmail (OAuth)
                  </button>
                  <button onClick={() => setConnectingMailType('imap')} className="btn-secondary">
                    🔑 Connect with Custom Email (IMAP)
                  </button>
                  <button onClick={handleConnectSandboxMailbox} className="btn-secondary" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)', background: 'rgba(168,85,247,0.05)' }}>
                    🧪 Try with AI (Sandbox)
                  </button>
                </div>
              )}

              {connectingMailType === 'imap' && (
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-glass-active)' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '1rem', color: 'var(--text-main)' }}>IMAP Connection Settings</h4>
                  <form onSubmit={handleConnectImap} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                      <input 
                        type="email" 
                        value={imapEmail} 
                        onChange={(e) => setImapEmail(e.target.value)} 
                        placeholder="e.g. name@yahoo.com" 
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>IMAP Host Address</label>
                      <input 
                        type="text" 
                        value={imapHost} 
                        onChange={(e) => setImapHost(e.target.value)} 
                        placeholder="e.g. imap.mail.yahoo.com" 
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>IMAP Port (SSL)</label>
                      <input 
                        type="text" 
                        value={imapPort} 
                        onChange={(e) => setImapPort(e.target.value)} 
                        placeholder="e.g. 993" 
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Username / Login Mail</label>
                      <input 
                        type="text" 
                        value={imapUsername} 
                        onChange={(e) => setImapUsername(e.target.value)} 
                        placeholder="Same as email usually" 
                        required 
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>App Password</label>
                      <input 
                        type="password" 
                        value={imapPassword} 
                        onChange={(e) => setImapPassword(e.target.value)} 
                        placeholder="Generate App Password" 
                        required 
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Do not use your account primary password. Generate a secure App-Specific Password first.</span>
                    </div>
                    
                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button type="submit" className="btn-primary">Connect Mailbox</button>
                      <button type="button" className="btn-secondary" onClick={() => setConnectingMailType('')}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}