const express = require('express');
const { query, run } = require('../../infrastructure/persistence/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = () => process.env.JWT_SECRET || 'leakshield_jwt_secret';

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET());
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(requireAuth);

// GET current settings (masked)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const settingsRow = (await query('SELECT config_json FROM settings WHERE user_id = $1', [userId]))[0];
    const vars = settingsRow ? JSON.parse(settingsRow.config_json) : {};
    
    res.json({
      githubToken: vars.GITHUB_TOKEN ? '••••••••' + vars.GITHUB_TOKEN.slice(-4) : '',
      githubTokenSet: !!vars.GITHUB_TOKEN,
      webhookSecret: vars.GITHUB_WEBHOOK_SECRET || '',
      slackWebhook: vars.SLACK_WEBHOOK_URL ? '••••••••' : '',
      slackWebhookSet: !!vars.SLACK_WEBHOOK_URL,
      geminiKeySet: !!vars.GEMINI_API_KEY,
      groqKeySet: !!vars.GROQ_API_KEY,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST update settings
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { githubToken, webhookSecret, slackWebhook, geminiKey, groqKey } = req.body;
    
    // Fetch existing
    const settingsRow = (await query('SELECT config_json FROM settings WHERE user_id = $1', [userId]))[0];
    const vars = settingsRow ? JSON.parse(settingsRow.config_json) : {};

    if (githubToken !== undefined && !githubToken.startsWith('••')) vars.GITHUB_TOKEN = githubToken;
    if (webhookSecret !== undefined) vars.GITHUB_WEBHOOK_SECRET = webhookSecret;
    if (slackWebhook !== undefined && !slackWebhook.startsWith('••')) vars.SLACK_WEBHOOK_URL = slackWebhook;
    if (geminiKey !== undefined && !geminiKey.startsWith('••')) vars.GEMINI_API_KEY = geminiKey;
    if (groqKey !== undefined && !groqKey.startsWith('••')) vars.GROQ_API_KEY = groqKey;

    await run(
      `INSERT INTO settings (user_id, config_json) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET config_json = EXCLUDED.config_json`,
      [userId, JSON.stringify(vars)]
    );

    res.json({ success: true, message: 'Settings saved.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
