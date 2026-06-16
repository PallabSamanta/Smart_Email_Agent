const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No session token found' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    console.error('Auth middleware token validation error:', err);
    res.clearCookie('token');
    return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  }
}

module.exports = authMiddleware;
