const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const ENV_PATH = path.join(__dirname, '../../../../.env');

function parseEnv(content) {
  const vars = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    vars[key] = val;
  });
  return vars;
}

function writeEnv(vars) {
  const lines = [];
  // Preserve comments/sections from original file
  const original = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const originalLines = original.split('\n');

  for (const line of originalLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      lines.push(line);
      continue;
    }
    const idx = trimmed.indexOf('=');
    if (idx === -1) { lines.push(line); continue; }
    const key = trimmed.slice(0, idx).trim();
    if (key in vars) {
      lines.push(`${key}=${vars[key]}`);
      delete vars[key];
    } else {
      lines.push(line);
    }
  }
  // Append any new vars not in original
  for (const [key, val] of Object.entries(vars)) {
    lines.push(`${key}=${val}`);
  }
  fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');
}

// GET current settings (masked)
router.get('/', (req, res) => {
  try {
    const content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
    const vars = parseEnv(content);
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
router.post('/', (req, res) => {
  try {
    const { githubToken, webhookSecret, slackWebhook, geminiKey, groqKey } = req.body;
    const updates = {};
    if (githubToken !== undefined && !githubToken.startsWith('••')) updates.GITHUB_TOKEN = githubToken;
    if (webhookSecret !== undefined) updates.GITHUB_WEBHOOK_SECRET = webhookSecret;
    if (slackWebhook !== undefined && !slackWebhook.startsWith('••')) updates.SLACK_WEBHOOK_URL = slackWebhook;
    if (geminiKey !== undefined && !geminiKey.startsWith('••')) updates.GEMINI_API_KEY = geminiKey;
    if (groqKey !== undefined && !groqKey.startsWith('••')) updates.GROQ_API_KEY = groqKey;

    writeEnv(updates);

    // Reload env vars in-process immediately
    for (const [key, val] of Object.entries(updates)) {
      process.env[key] = val;
    }

    res.json({ success: true, message: 'Settings saved and applied immediately.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
