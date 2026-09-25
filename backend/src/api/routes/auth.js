/**
 * LeakShield OAuth Routes
 * Handles GitHub and Google OAuth2 flows.
 * No passport — pure Authorization Code flow.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET    = () => process.env.JWT_SECRET    || 'leakshield_jwt_secret';
const FRONTEND_URL  = () => process.env.FRONTEND_URL  || 'http://localhost:5173';

/* ── helpers ─────────────────────────────────────────────── */
function makeToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, avatar: user.avatar, provider: user.provider },
    JWT_SECRET(),
    { expiresIn: '7d' }
  );
}

function redirectWithToken(res, token, error = null) {
  if (error) {
    return res.redirect(`${FRONTEND_URL()}/login?error=${encodeURIComponent(error)}`);
  }
  res.redirect(`${FRONTEND_URL()}/auth/callback?token=${token}`);
}

/* ══════════════════════════════════════════════════════════
   GITHUB OAuth
   ══════════════════════════════════════════════════════════ */

// Step 1 — redirect user to GitHub
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.redirect(`${FRONTEND_URL()}/login?error=${encodeURIComponent('GitHub OAuth not configured. Add GITHUB_CLIENT_ID to backend/.env')}`);
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `http://localhost:4000/auth/github/callback`,
    scope: 'user:email read:user',
    state: Math.random().toString(36).slice(2),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Step 2 — GitHub redirects back with ?code=
router.get('/github/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return redirectWithToken(res, null, error || 'GitHub auth was cancelled');
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: 'http://localhost:4000/auth/github/callback',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    const ghToken = tokenData.access_token;

    // Get user profile
    const [userRes, emailRes] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${ghToken}`, 'User-Agent': 'LeakShield' },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${ghToken}`, 'User-Agent': 'LeakShield' },
      }),
    ]);

    const ghUser  = await userRes.json();
    const emails  = await emailRes.json();
    const primary = Array.isArray(emails) ? emails.find(e => e.primary)?.email : null;

    const user = {
      id:       `github_${ghUser.id}`,
      name:     ghUser.name || ghUser.login,
      email:    primary || ghUser.email || `${ghUser.login}@github.com`,
      avatar:   ghUser.avatar_url,
      username: ghUser.login,
      provider: 'github',
    };

    const token = makeToken(user);
    redirectWithToken(res, token);
  } catch (err) {
    console.error('GitHub OAuth error:', err.message);
    redirectWithToken(res, null, err.message);
  }
});

/* ══════════════════════════════════════════════════════════
   GOOGLE OAuth
   ══════════════════════════════════════════════════════════ */

// Step 1 — redirect user to Google
router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.redirect(`${FRONTEND_URL()}/login?error=${encodeURIComponent('Google OAuth not configured. Add GOOGLE_CLIENT_ID to backend/.env')}`);
  }
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  'http://localhost:4000/auth/google/callback',
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'online',
    state:         Math.random().toString(36).slice(2),
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2 — Google redirects back with ?code=
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return redirectWithToken(res, null, error || 'Google auth was cancelled');
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  'http://localhost:4000/auth/google/callback',
        grant_type:    'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const gUser = await userRes.json();

    const user = {
      id:       `google_${gUser.sub}`,
      name:     gUser.name,
      email:    gUser.email,
      avatar:   gUser.picture,
      provider: 'google',
    };

    const token = makeToken(user);
    redirectWithToken(res, token);
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    redirectWithToken(res, null, err.message);
  }
});

/* ── Verify token (used by frontend) ─────────────────────── */
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET());
    res.json(payload);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/* ── Local Auth ──────────────────────────────────────────── */
router.post('/local/signup', (req, res) => {
  const { name, email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  // In a real app, hash password and store in DB. Here we just mock it.
  const user = {
    id: `local_${Buffer.from(email).toString('base64').slice(0, 10)}`,
    name: name || email.split('@')[0],
    email: email,
    avatar: null,
    provider: 'local'
  };
  const token = makeToken(user);
  res.json({ token, user });
});

router.post('/local/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = {
    id: `local_${Buffer.from(email).toString('base64').slice(0, 10)}`,
    name: email.split('@')[0],
    email: email,
    avatar: null,
    provider: 'local'
  };
  const token = makeToken(user);
  res.json({ token, user });
});

module.exports = router;
