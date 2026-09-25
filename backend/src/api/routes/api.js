const express = require('express');
const { query, run } = require('../../infrastructure/persistence/database');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = () => process.env.JWT_SECRET || 'leakshield_jwt_secret';

const requireAuth = (req, res, next) => {
  let token = '';
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET());
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const repoCount = (await query('SELECT COUNT(*) as c FROM repositories WHERE user_id = $1', [userId]))[0].c;
    const criticalCount = (await query('SELECT COUNT(*) as c FROM findings WHERE severity = $1 AND status = $2 AND repository_id IN (SELECT id FROM repositories WHERE user_id = $3)', ['CRITICAL', 'OPEN', userId]))[0].c;
    const highCount = (await query('SELECT COUNT(*) as c FROM findings WHERE severity = $1 AND status = $2 AND repository_id IN (SELECT id FROM repositories WHERE user_id = $3)', ['HIGH', 'OPEN', userId]))[0].c;
    const openCount = (await query('SELECT COUNT(*) as c FROM findings WHERE status = $1 AND repository_id IN (SELECT id FROM repositories WHERE user_id = $2)', ['OPEN', userId]))[0].c;
    
    const recentActivity = await query('SELECT * FROM findings WHERE repository_id IN (SELECT id FROM repositories WHERE user_id = $1) ORDER BY created_at DESC LIMIT 5', [userId]);

    // Postgres returns count as string usually, ensure they are numbers
    const mappedActivity = recentActivity.map(act => ({
      id: act.id,
      repositoryId: act.repository_id,
      secretType: act.secret_type,
      severity: act.severity,
      filePath: act.file_path,
      createdAt: act.created_at
    }));

    res.json({ 
      repoCount: parseInt(repoCount), 
      criticalCount: parseInt(criticalCount), 
      highCount: parseInt(highCount), 
      openCount: parseInt(openCount), 
      recentActivity: mappedActivity 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/findings', async (req, res) => {
  try {
    const userId = req.user.id;
    const findings = await query('SELECT * FROM findings WHERE repository_id IN (SELECT id FROM repositories WHERE user_id = $1) ORDER BY created_at DESC', [userId]);
    const mapped = findings.map(f => ({
      id: f.id,
      repositoryId: f.repository_id,
      secretType: f.secret_type,
      severity: f.severity,
      filePath: f.file_path,
      lineStart: f.line_start,
      status: f.status,
      createdAt: f.created_at
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/repositories', async (req, res) => {
  try {
    const userId = req.user.id;
    const repos = await query(`
      SELECT 
        r.*,
        (SELECT COUNT(*) FROM findings WHERE repository_id = r.id AND severity = 'CRITICAL') as critical_count,
        (SELECT COUNT(*) FROM findings WHERE repository_id = r.id AND severity = 'HIGH') as high_count
      FROM repositories r 
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);
    
    const formatted = repos.map(repo => ({
      ...repo,
      findings: {
        critical: parseInt(repo.critical_count) || 0,
        high: parseInt(repo.high_count) || 0
      }
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/repositories — Connect a real GitHub repository
router.post('/repositories', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Parse the GitHub URL to extract owner/repo
    const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid GitHub URL. Use: https://github.com/owner/repo' });

    const owner = match[1];
    const repoName = match[2].replace(/\.git$/, '');
    const userId = req.user.id;
    const repoId = `${userId}-${owner}-${repoName}`;
    const fullName = `${owner}/${repoName}`;
    const cleanUrl = `https://github.com/${fullName}`;

    // Validate repo exists via GitHub API using this user's saved token
    const userConfigRow = (await query('SELECT config_json FROM settings WHERE user_id = $1', [userId]))[0];
    const userConfig = userConfigRow ? JSON.parse(userConfigRow.config_json || '{}') : {};
    const GITHUB_TOKEN = userConfig.GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
    let repoData = null;
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${fullName}`, {
        headers: {
          ...(GITHUB_TOKEN ? { 'Authorization': `Bearer ${GITHUB_TOKEN}` } : {}),
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'LeakShield-Scanner'
        }
      });
      if (ghRes.ok) {
        repoData = await ghRes.json();
      }
    } catch (e) {
      // GitHub validation failed, continue anyway with user-provided URL
    }

    const finalUrl = repoData?.html_url || cleanUrl;
    const description = repoData?.description || null;

    // Upsert into database
    await run(
      `INSERT INTO repositories (id, name, url, status, user_id) VALUES ($1, $2, $3, 'active', $4)
       ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, status = 'active'`,
      [repoId, fullName, finalUrl, userId]
    );

    const saved = (await query('SELECT * FROM repositories WHERE id = $1', [repoId]))[0];
    res.status(201).json({
      ...saved,
      findings: { critical: 0, high: 0 },
      description,
      message: `Repository ${fullName} connected successfully! Webhooks will trigger automatic scans.`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/repositories/:id — Remove a repository
router.delete('/repositories/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    await run('DELETE FROM repositories WHERE id = $1 AND user_id = $2', [req.params.id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/repositories/:id/scan — Manually trigger scan using user's stored GitHub token
router.post('/repositories/:id/scan', async (req, res) => {
  try {
    const userId = req.user.id;
    const repo = (await query('SELECT * FROM repositories WHERE id = $1 AND user_id = $2', [req.params.id, userId]))[0];
    if (!repo) return res.status(404).json({ error: 'Repository not found' });

    // Get user's GitHub token from DB
    const configRow = (await query('SELECT config_json FROM settings WHERE user_id = $1', [userId]))[0];
    const config = configRow ? JSON.parse(configRow.config_json || '{}') : {};
    const githubToken = config.GITHUB_TOKEN || '';

    // Parse owner/name from stored repo name (e.g. "Riss620/LeakShield")
    const [owner, repoName] = repo.name.split('/');
    if (!owner || !repoName) return res.status(400).json({ error: 'Invalid repository name format' });

    // Fetch latest commit using the user's token
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/commits?per_page=1`, {
      headers: {
        ...(githubToken ? { 'Authorization': `Bearer ${githubToken}` } : {}),
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'LeakShield-Scanner'
      }
    });

    if (!ghRes.ok) {
      const errBody = await ghRes.json().catch(() => ({}));
      return res.status(400).json({ error: errBody.message || `GitHub API error: ${ghRes.status}` });
    }

    const commits = await ghRes.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      return res.status(400).json({ error: 'No commits found in this repository.' });
    }

    const sha = commits[0].sha;

    // Forward as a fake push event to the webhook handler logic
    const webhookPayload = {
      repository: { name: repoName, full_name: repo.name, html_url: repo.url, owner: { login: owner } },
      pusher: { name: owner },
      commits: [{ id: sha, message: 'Manual scan', author: { name: owner } }]
    };

    // Directly call the internal webhook URL
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
    const webhookRes = await fetch(`${backendUrl}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': `manual-${Date.now()}`
      },
      body: JSON.stringify(webhookPayload)
    });

    const webhookData = await webhookRes.json();
    res.json({ message: `Scan triggered for ${repo.name} at commit ${sha.slice(0, 8)}`, ...webhookData });
  } catch (error) {
    console.error('Manual scan error:', error);
    res.status(500).json({ error: error.message });
  }
});


router.patch('/findings/:id/resolve', async (req, res) => {
  try {
    const userId = req.user.id;
    await run('UPDATE findings SET status = $1 WHERE id = $2 AND repository_id IN (SELECT id FROM repositories WHERE user_id = $3)', ['RESOLVED', req.params.id, userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/findings/:id/remediate', async (req, res) => {
  try {
    const userId = req.user.id;
    const finding = (await query('SELECT * FROM findings WHERE id = $1 AND repository_id IN (SELECT id FROM repositories WHERE user_id = $2)', [req.params.id, userId]))[0];
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    
    const prompt = `You are a security expert. A ${finding.secret_type} was leaked in ${finding.file_path}.
Here is the code context:
\`\`\`
${finding.context}
\`\`\`
Provide a concise, 2-3 sentence explanation of how to remediate this securely (e.g. using process.env, environment variables, or a Secrets Manager) and provide a code snippet showing the fixed code. Provide only the helpful text and the code block.`;

    let suggestion = '';
    
    const configRow = (await query('SELECT config_json FROM settings WHERE user_id = $1', [userId]))[0];
    const config = configRow ? JSON.parse(configRow.config_json || '{}') : {};
    
    if (!config.GEMINI_API_KEY && !config.GROQ_API_KEY) {
      return res.status(503).json({ error: 'No AI API keys configured. Go to Settings → API Keys to add your Gemini or Groq key.' });
    }
    
    try {
      if (!config.GEMINI_API_KEY) throw new Error('Gemini key not set');
      // Try Gemini (AI Studio)
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await geminiRes.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        suggestion = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Gemini failed or returned empty response');
      }
    } catch (geminiError) {
      console.log('Gemini failed, falling back to Groq...', geminiError.message);
      // Fallback to Groq
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await groqRes.json();
      if (data.choices && data.choices[0].message.content) {
        suggestion = data.choices[0].message.content;
      } else {
        throw new Error('Both AI providers failed.');
      }
    }
    
    res.json({ suggestion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
