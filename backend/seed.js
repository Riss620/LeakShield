const { db } = require('./src/infrastructure/persistence/database');
const crypto = require('crypto');

db.serialize(() => {
  // Add some repositories
  db.run("INSERT OR REPLACE INTO repositories (id, name, url, status) VALUES ('repo-1', 'payment-service', 'https://github.com/org/payment-service', 'ACTIVE')");
  db.run("INSERT OR REPLACE INTO repositories (id, name, url, status) VALUES ('repo-2', 'user-auth-api', 'https://github.com/org/user-auth-api', 'ACTIVE')");
  db.run("INSERT OR REPLACE INTO repositories (id, name, url, status) VALUES ('repo-3', 'legacy-webapp', 'https://github.com/org/legacy-webapp', 'PAUSED')");

  // Add some scans
  db.run("INSERT OR REPLACE INTO scans (id, repositoryId, commitSha, status) VALUES ('scan-1', 'repo-1', 'a1b2c3d4', 'COMPLETED')");
  db.run("INSERT OR REPLACE INTO scans (id, repositoryId, commitSha, status) VALUES ('scan-2', 'repo-2', 'e5f6g7h8', 'COMPLETED')");
  db.run("INSERT OR REPLACE INTO scans (id, repositoryId, commitSha, status) VALUES ('scan-3', 'repo-3', 'i9j0k1l2', 'COMPLETED')");

  // Add some findings
  const findings = [
    {
      id: 'find-1', repoId: 'repo-1', scanId: 'scan-1', filePath: 'config/aws.js', start: 10, end: 10,
      type: 'AWS Access Key', severity: 'CRITICAL', score: 95, status: 'OPEN'
    },
    {
      id: 'find-2', repoId: 'repo-1', scanId: 'scan-1', filePath: 'src/services/stripe.js', start: 42, end: 42,
      type: 'Stripe Secret Key', severity: 'HIGH', score: 80, status: 'OPEN'
    },
    {
      id: 'find-3', repoId: 'repo-2', scanId: 'scan-2', filePath: 'tests/auth.spec.js', start: 105, end: 105,
      type: 'JWT Secret', severity: 'MEDIUM', score: 50, status: 'OPEN'
    },
    {
      id: 'find-4', repoId: 'repo-3', scanId: 'scan-3', filePath: 'application.properties', start: 5, end: 5,
      type: 'Database Password', severity: 'CRITICAL', score: 99, status: 'OPEN'
    },
    {
      id: 'find-5', repoId: 'repo-3', scanId: 'scan-3', filePath: 'src/main/resources/slack.json', start: 2, end: 2,
      type: 'Slack Bot Token', severity: 'HIGH', score: 85, status: 'RESOLVED'
    }
  ];

  findings.forEach(f => {
    db.run(
      "INSERT OR REPLACE INTO findings (id, repositoryId, scanId, commitSha, filePath, lineStart, lineEnd, secretType, severity, riskScore, confidence, status) VALUES (?, ?, ?, 'dummySha', ?, ?, ?, ?, ?, ?, 0.99, ?)",
      [f.id, f.repoId, f.scanId, f.filePath, f.start, f.end, f.type, f.severity, f.score, f.status]
    );
  });

  console.log("Database seeded with realistic mock data!");
});
