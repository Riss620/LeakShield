const express = require('express');
const crypto = require('crypto');
const { run, query } = require('../../infrastructure/persistence/database');
const queueManager = require('../../application/services/QueueManager');
const notificationService = require('../../application/services/NotificationService');

const router = express.Router();

const getUserConfig = async (userId) => {
  const row = (await query('SELECT config_json FROM settings WHERE user_id = $1', [userId]))[0];
  return row ? JSON.parse(row.config_json || '{}') : {};
};

const getGithubToken = async (userId) => {
  const config = await getUserConfig(userId);
  return config.GITHUB_TOKEN || '';
};

const notifyClients = (app, event, data) => {
  app.emit('sse_broadcast', { event, data });
};

/**
 * Fetch actual changed files and their content from GitHub API for a given commit.
 */
async function fetchCommitFiles(owner, repo, sha, userId) {
  const token = await getGithubToken(userId);
  if (!token) {
    // Fallback to demo files if no token is configured
    console.warn('No GITHUB_TOKEN set for user — using demo files for scanning.');
    return [
      { name: 'config/aws.js', content: 'const awsKey = "AKIAIOSFODNN7EXAMPLE";\nconst secret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";' },
      { name: 'src/database.js', content: 'const dbUrl = "postgres://admin:SuperSecret123@prod-db.company.com:5432/users";\nmodule.exports = { dbUrl };' },
      { name: 'src/app.js', content: 'console.log("Starting app...");\nconst port = process.env.PORT || 3000;' }
    ];
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'LeakShield-Scanner'
      }
    });

    if (!res.ok) {
      console.error(`GitHub API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const commitData = await res.json();
    const files = commitData.files || [];

    // For each changed file, fetch its raw content
    const fileContents = await Promise.all(
      files
        .filter(f => f.status !== 'removed' && f.filename.match(/\.(js|ts|py|env|json|yaml|yml|sh|rb|php|java|go|cs|cpp|c|config|properties|xml|toml|ini)$/i))
        .map(async (file) => {
          try {
            const rawRes = await fetch(file.raw_url, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'LeakShield-Scanner'
              }
            });
            const content = await rawRes.text();
            return { name: file.filename, content, patch: file.patch || '' };
          } catch {
            return { name: file.filename, content: file.patch || '', patch: file.patch || '' };
          }
        })
    );

    return fileContents;
  } catch (err) {
    console.error('Error fetching commit files:', err.message);
    return [];
  }
}

/**
 * Set a GitHub commit status (pending/success/failure) to block dangerous commits.
 */
async function setGitHubCommitStatus(owner, repo, sha, state, description, userId) {
  const token = await getGithubToken(userId);
  if (!token) return;
  const appUrl = process.env.APP_URL || `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` || 'https://leakshield.onrender.com';
  try {
    await fetch(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'LeakShield-Scanner'
      },
      body: JSON.stringify({
        state,
        description,
        context: 'LeakShield Security Scan',
        target_url: `${appUrl}/app/findings`
      })
    });
    console.log(`GitHub commit status set to ${state} for ${sha}`);
  } catch (err) {
    console.error('Failed to set GitHub commit status:', err.message);
  }
}

router.post('/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];

  if (event !== 'push') {
    return res.status(200).json({ message: `Event '${event}' acknowledged but not scanned` });
  }

  const { repository, commits, pusher } = req.body;
  if (!repository || !commits || commits.length === 0) {
    return res.status(400).json({ error: 'Invalid push payload' });
  }

  const repoName = repository.name;
  const repoOwner = repository.owner?.login || repository.full_name?.split('/')[0] || 'unknown';
  const repoFullName = repository.full_name || `${repoOwner}/${repoName}`;
  const commitSha = commits[0]?.id || 'unknown';
  const pusherName = pusher?.name || 'unknown';

  const repos = await query('SELECT * FROM repositories WHERE name = $1', [repoFullName]);

  if (!repos || repos.length === 0) {
    return res.status(200).json({ message: 'Repository not monitored by any user, skipped.' });
  }

  // Verify webhook signature using the FIRST matching user's secret (they share the same repo)
  // The signature is the same for all users tracking this repo since GitHub sends one payload
  if (signature) {
    const firstRepo = repos[0];
    const userConfig = await getUserConfig(firstRepo.user_id);
    const secret = userConfig.GITHUB_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET || 'secret';
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    if (signature !== digest) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  // Enqueue all files to Redis for Python worker for EACH user's tracking repo
  let scansCreated = 0;
  for (const repo of repos) {
    const scanId = crypto.randomUUID();
    await run(`INSERT INTO scans (id, repository_id, commit_sha, status) VALUES ($1, $2, $3, 'QUEUED')`, [scanId, repo.id, commitSha]);
    
    // Set GitHub status to pending using this user's token
    await setGitHubCommitStatus(repoOwner, repoName, commitSha, 'pending', 'LeakShield is scanning this commit...', repo.user_id);

    notifyClients(req.app, 'scan_started', { scanId, repository: repoFullName, commitSha, pusher: pusherName, userId: repo.user_id });

    // Fetch real files from GitHub API using this user's token
    const filesToScan = await fetchCommitFiles(repoOwner, repoName, commitSha, repo.user_id);
    
    for (const file of filesToScan) {
      await queueManager.enqueueScan({
        scanId,
        repositoryId: repo.id, // the unique repoId for this user
        repositoryOwner: repoOwner,
        commitSha,
        filePath: file.name,
        content: file.content
      });
    }
    scansCreated++;
  }

  res.status(202).json({ message: 'Scan queued', scansCreated });
});

// Called by Python worker via Redis PubSub to finalize scan status
// We handle it in index.js SSE broadcast, but also provide REST endpoint
router.post('/scan-complete', async (req, res) => {
  const { scanId, repositoryOwner, repositoryName, commitSha, findingsCount, criticalCount } = req.body;
  
  await run(`UPDATE scans SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE id = $1`, [scanId]);

  // Find the repo and user to get the correct token
  const scan = (await query('SELECT repository_id FROM scans WHERE id = $1', [scanId]))[0];
  if (scan) {
    const repo = (await query('SELECT user_id FROM repositories WHERE id = $1', [scan.repository_id]))[0];
    if (repo && repo.user_id) {
      // Set GitHub commit status based on findings severity
      if (criticalCount > 0) {
        await setGitHubCommitStatus(repositoryOwner, repositoryName, commitSha, 'failure',
          `🚨 ${criticalCount} CRITICAL secret(s) detected! Review immediately.`, repo.user_id);
        await notificationService.sendSlackAlert({ scanId, repositoryName, commitSha, findingsCount, criticalCount, userId: repo.user_id });
      } else if (findingsCount > 0) {
        await setGitHubCommitStatus(repositoryOwner, repositoryName, commitSha, 'success',
          `⚠️ ${findingsCount} low-risk finding(s). Review recommended.`, repo.user_id);
      } else {
        await setGitHubCommitStatus(repositoryOwner, repositoryName, commitSha, 'success', '✅ No secrets detected. Clean commit!', repo.user_id);
      }
    }
  }

  res.json({ ok: true });
});

// Generic GET for tunnel health checks
router.get('/', (req, res) => res.status(200).send('LeakShield Webhook Receiver Active'));

module.exports = router;


