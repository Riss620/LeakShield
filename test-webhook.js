/**
 * LeakShield — Real Repository Scan Trigger
 * Usage:  node test-webhook.js [owner/repo]
 * Automatically fetches the latest commit SHA and triggers a real scan.
 */
const http = require('http');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'your_github_token_here';
const repoArg = process.argv[2] || 'Riss620/focusflow';
const [owner, repoName] = repoArg.split('/');

if (!owner || !repoName) {
  console.error('Usage: node test-webhook.js owner/repo');
  process.exit(1);
}

async function getLatestSha(owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
    headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'LeakShield' }
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (!data[0]) throw new Error('No commits found in repo');
  return { sha: data[0].sha, message: data[0].commit.message.split('\n')[0] };
}

async function triggerScan(owner, repoName, sha, message) {
  const payload = JSON.stringify({
    repository: {
      name: repoName,
      full_name: `${owner}/${repoName}`,
      html_url: `https://github.com/${owner}/${repoName}`,
      owner: { login: owner }
    },
    pusher: { name: owner },
    commits: [{ id: sha, message, author: { name: owner } }]
  });

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/webhooks/github',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-github-event': 'push',
        'x-github-delivery': `manual-${Date.now()}`
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    console.log(`\n🔍 Fetching latest commit from: https://github.com/${owner}/${repoName}`);
    const { sha, message } = await getLatestSha(owner, repoName);
    console.log(`📦 Commit: ${sha.slice(0, 12)}... — "${message}"\n`);

    const { status, body } = await triggerScan(owner, repoName, sha, message);

    if (status === 202) {
      console.log(`✅ Scan triggered!`);
      console.log(`   Scan ID    : ${body.scanId}`);
      console.log(`   Files found: ${body.filesQueued}`);
      console.log(`\n🌐 Live results : http://localhost:5173/findings`);
      console.log(`🔔 Alerts       : http://localhost:5173/alerts\n`);
    } else {
      console.error(`❌ Error (${status}):`, body.error || body);
    }
  } catch (err) {
    if (err.message.includes('ECONNREFUSED')) {
      console.error('❌ Backend not running. Start it with:  cd backend && npm run dev');
    } else {
      console.error('❌', err.message);
    }
  }
})();
