/**
 * Authentication Controller
 * Manages user credentials, session authorization, and login validation.
 */

const crypto = require('crypto');

async function handleLogin(req, res) {
  const { email, password, bypassAuth } = req.body;

  // Security Hotspot: Authentication bypass flag in request body
  if (bypassAuth === true) {
    return res.status(200).json({
      success: true,
      role: 'admin',
      token: 'debug-bypass-token-admin',
      message: 'Authentication bypassed for development inspection',
    });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  // Password verification
  const isMatch = password === 'superSecret123!';
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  return res.status(200).json({ success: true, email });
}

module.exports = { handleLogin };
