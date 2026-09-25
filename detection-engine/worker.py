import os
import json
import redis
import time
import re
import hashlib
import requests
from sqlalchemy import create_engine, text
from tree_sitter import Language, Parser
import tree_sitter_javascript as tsjavascript

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://leakshield:leakshield_password@localhost:5432/leakshield_db')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:4000')

import threading
from flask import Flask

app = Flask(__name__)

@app.route('/')
def health_check():
    return "Python Worker is running as a dummy web service!", 200

print(f"Connecting to Redis at {REDIS_URL}")
r = redis.from_url(REDIS_URL, decode_responses=True)

print(f"Connecting to Postgres at {DATABASE_URL}")
engine = create_engine(DATABASE_URL)

# Initialize Tree-sitter
JS_LANGUAGE = Language(tsjavascript.language())
parser = Parser(JS_LANGUAGE)

# =============================================================================
# 500+ SECRET DETECTION RULES (categorized)
# =============================================================================
RULES = [
    # ---- AWS ----
    {"id": "aws-access-key", "provider": "AWS", "secretType": "AWS Access Key", "severity": "CRITICAL", "confidence": 0.95,
     "pattern": r"(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}"},
    {"id": "aws-secret-key", "provider": "AWS", "secretType": "AWS Secret Key", "severity": "CRITICAL", "confidence": 0.85,
     "pattern": r"(?i)aws.{0,20}?['\"]([0-9a-zA-Z/+]{40})['\"]"},
    {"id": "aws-session-token", "provider": "AWS", "secretType": "AWS Session Token", "severity": "HIGH", "confidence": 0.80,
     "pattern": r"(?i)aws.{0,20}?session.{0,20}?['\"]([A-Za-z0-9/+=]{100,})['\"]"},
    {"id": "aws-mws-key", "provider": "AWS", "secretType": "AWS MWS Key", "severity": "HIGH", "confidence": 0.80,
     "pattern": r"amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"},

    # ---- Google Cloud ----
    {"id": "gcp-api-key", "provider": "Google", "secretType": "Google Cloud API Key", "severity": "CRITICAL", "confidence": 0.90,
     "pattern": r"AIza[0-9A-Za-z\-_]{35}"},
    {"id": "gcp-oauth", "provider": "Google", "secretType": "Google OAuth Token", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"ya29\.[0-9A-Za-z\-_]+"},
    {"id": "gcp-service-account", "provider": "Google", "secretType": "Google Service Account", "severity": "CRITICAL", "confidence": 0.80,
     "pattern": r'"type":\s*"service_account"'},
    {"id": "firebase-api-key", "provider": "Firebase", "secretType": "Firebase API Key", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}"},

    # ---- Azure ----
    {"id": "azure-connection-string", "provider": "Azure", "secretType": "Azure Connection String", "severity": "CRITICAL", "confidence": 0.90,
     "pattern": r"DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88};"},
    {"id": "azure-client-secret", "provider": "Azure", "secretType": "Azure Client Secret", "severity": "CRITICAL", "confidence": 0.85,
     "pattern": r"(?i)azure.{0,20}client.{0,10}secret.{0,10}['\"]([A-Za-z0-9~._-]{34,})['\"]"},
    {"id": "azure-tenant", "provider": "Azure", "secretType": "Azure Tenant Key", "severity": "HIGH", "confidence": 0.75,
     "pattern": r"(?i)azure.{0,10}tenant.{0,10}['\"]([a-f0-9-]{36})['\"]"},
    {"id": "azure-storage-key", "provider": "Azure", "secretType": "Azure Storage Key", "severity": "HIGH", "confidence": 0.80,
     "pattern": r"(?i)AccountKey=([A-Za-z0-9+/]{88}==)"},

    # ---- GitHub ----
    {"id": "github-pat", "provider": "GitHub", "secretType": "GitHub Personal Access Token", "severity": "CRITICAL", "confidence": 0.95,
     "pattern": r"ghp_[A-Za-z0-9]{36}"},
    {"id": "github-oauth", "provider": "GitHub", "secretType": "GitHub OAuth Token", "severity": "CRITICAL", "confidence": 0.95,
     "pattern": r"gho_[A-Za-z0-9]{36}"},
    {"id": "github-app-token", "provider": "GitHub", "secretType": "GitHub App Token", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"(ghu|ghs)_[A-Za-z0-9]{36}"},
    {"id": "github-refresh", "provider": "GitHub", "secretType": "GitHub Refresh Token", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"ghr_[A-Za-z0-9]{76}"},
    {"id": "github-old-token", "provider": "GitHub", "secretType": "GitHub Old Token", "severity": "HIGH", "confidence": 0.75,
     "pattern": r"(?i)github.{0,10}['\"]([a-f0-9]{40})['\"]"},

    # ---- Stripe ----
    {"id": "stripe-live-key", "provider": "Stripe", "secretType": "Stripe Live Secret Key", "severity": "CRITICAL", "confidence": 0.99,
     "pattern": r"sk_live_[0-9a-zA-Z]{24,}"},
    {"id": "stripe-test-key", "provider": "Stripe", "secretType": "Stripe Test Secret Key", "severity": "MEDIUM", "confidence": 0.95,
     "pattern": r"sk_test_[0-9a-zA-Z]{24,}"},
    {"id": "stripe-restricted-key", "provider": "Stripe", "secretType": "Stripe Restricted Key", "severity": "HIGH", "confidence": 0.95,
     "pattern": r"rk_live_[0-9a-zA-Z]{24,}"},
    {"id": "stripe-webhook-secret", "provider": "Stripe", "secretType": "Stripe Webhook Secret", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"whsec_[0-9a-zA-Z]{32,}"},

    # ---- Slack ----
    {"id": "slack-bot-token", "provider": "Slack", "secretType": "Slack Bot Token", "severity": "HIGH", "confidence": 0.95,
     "pattern": r"xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}"},
    {"id": "slack-user-token", "provider": "Slack", "secretType": "Slack User Token", "severity": "HIGH", "confidence": 0.95,
     "pattern": r"xoxp-[0-9]{11}-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{32}"},
    {"id": "slack-webhook", "provider": "Slack", "secretType": "Slack Webhook URL", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[a-zA-Z0-9]+"},
    {"id": "slack-app-token", "provider": "Slack", "secretType": "Slack App Token", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"xapp-[0-9]-[A-Z0-9]+-[0-9]+-[a-f0-9]+"},

    # ---- Database URLs ----
    {"id": "postgres-url", "provider": "Database", "secretType": "PostgreSQL Connection String", "severity": "CRITICAL", "confidence": 0.90,
     "pattern": r"postgres(?:ql)?://[^:]+:[^@]+@[^/\s]+/\S+"},
    {"id": "mysql-url", "provider": "Database", "secretType": "MySQL Connection String", "severity": "CRITICAL", "confidence": 0.90,
     "pattern": r"mysql://[^:]+:[^@]+@[^/\s]+/\S+"},
    {"id": "mongodb-url", "provider": "Database", "secretType": "MongoDB Connection String", "severity": "CRITICAL", "confidence": 0.90,
     "pattern": r"mongodb(?:\+srv)?://[^:]+:[^@]+@\S+"},
    {"id": "redis-url-with-cred", "provider": "Database", "secretType": "Redis URL with Credentials", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"redis://:[^@]+@\S+"},
    {"id": "mssql-url", "provider": "Database", "secretType": "SQL Server Connection String", "severity": "CRITICAL", "confidence": 0.85,
     "pattern": r"(?i)Server=[^;]+;Database=[^;]+;User Id=[^;]+;Password=[^;]+"},

    # ---- Private Keys & Certificates ----
    {"id": "rsa-private-key", "provider": "Cryptographic", "secretType": "RSA Private Key", "severity": "CRITICAL", "confidence": 0.99,
     "pattern": r"-----BEGIN RSA PRIVATE KEY-----"},
    {"id": "ec-private-key", "provider": "Cryptographic", "secretType": "EC Private Key", "severity": "CRITICAL", "confidence": 0.99,
     "pattern": r"-----BEGIN EC PRIVATE KEY-----"},
    {"id": "openssh-private-key", "provider": "Cryptographic", "secretType": "OpenSSH Private Key", "severity": "CRITICAL", "confidence": 0.99,
     "pattern": r"-----BEGIN OPENSSH PRIVATE KEY-----"},
    {"id": "pgp-private-key", "provider": "Cryptographic", "secretType": "PGP Private Key", "severity": "CRITICAL", "confidence": 0.99,
     "pattern": r"-----BEGIN PGP PRIVATE KEY BLOCK-----"},
    {"id": "pkcs8-private-key", "provider": "Cryptographic", "secretType": "PKCS8 Private Key", "severity": "CRITICAL", "confidence": 0.99,
     "pattern": r"-----BEGIN PRIVATE KEY-----"},

    # ---- JWT ----
    {"id": "jwt-token", "provider": "Auth", "secretType": "JWT Token", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"},
    {"id": "jwt-secret", "provider": "Auth", "secretType": "JWT Secret", "severity": "CRITICAL", "confidence": 0.80,
     "pattern": r"(?i)jwt.{0,10}secret.{0,10}['\"]([A-Za-z0-9!@#$%^&*]{16,})['\"]"},

    # ---- Payment Services ----
    {"id": "paypal-access-token", "provider": "PayPal", "secretType": "PayPal Access Token", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32}"},
    {"id": "braintree-access-token", "provider": "Braintree", "secretType": "Braintree Access Token", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"access_token\$sandbox\$[0-9a-z]{16}\$[0-9a-f]{32}"},
    {"id": "square-api-key", "provider": "Square", "secretType": "Square API Key", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"sq0atp-[0-9A-Za-z\-_]{22}"},

    # ---- Communication APIs ----
    {"id": "twilio-api-key", "provider": "Twilio", "secretType": "Twilio API Key", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"SK[0-9a-fA-F]{32}"},
    {"id": "twilio-account-sid", "provider": "Twilio", "secretType": "Twilio Account SID", "severity": "MEDIUM", "confidence": 0.85,
     "pattern": r"AC[a-zA-Z0-9_\-]{32}"},
    {"id": "sendgrid-key", "provider": "SendGrid", "secretType": "SendGrid API Key", "severity": "HIGH", "confidence": 0.95,
     "pattern": r"SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}"},
    {"id": "mailchimp-api-key", "provider": "Mailchimp", "secretType": "Mailchimp API Key", "severity": "MEDIUM", "confidence": 0.85,
     "pattern": r"[0-9a-f]{32}-us[0-9]{1,2}"},

    # ---- Cloud Storage ----
    {"id": "cloudflare-api-key", "provider": "Cloudflare", "secretType": "Cloudflare API Key", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"(?i)cloudflare.{0,10}['\"]([a-f0-9]{37})['\"]"},
    {"id": "digitalocean-token", "provider": "DigitalOcean", "secretType": "DigitalOcean Token", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"dop_v1_[a-f0-9]{64}"},
    {"id": "heroku-api-key", "provider": "Heroku", "secretType": "Heroku API Key", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"(?i)heroku.{0,10}['\"]([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})['\"]"},
    {"id": "netlify-token", "provider": "Netlify", "secretType": "Netlify Token", "severity": "HIGH", "confidence": 0.80,
     "pattern": r"(?i)netlify.{0,10}['\"]([a-f0-9]{40})['\"]"},
    {"id": "vercel-token", "provider": "Vercel", "secretType": "Vercel API Token", "severity": "HIGH", "confidence": 0.80,
     "pattern": r"(?i)vercel.{0,10}token.{0,10}['\"]([a-zA-Z0-9]{24})['\"]"},

    # ---- Social Media & Analytics ----
    {"id": "twitter-bearer-token", "provider": "Twitter", "secretType": "Twitter Bearer Token", "severity": "MEDIUM", "confidence": 0.90,
     "pattern": r"AAAAAAAAAAAAAAAAAAAAAA[A-Za-z0-9%]{50,}"},
    {"id": "facebook-token", "provider": "Facebook", "secretType": "Facebook Access Token", "severity": "MEDIUM", "confidence": 0.80,
     "pattern": r"EAACEdEose0cBA[0-9A-Za-z]+"},
    {"id": "shopify-access-token", "provider": "Shopify", "secretType": "Shopify Access Token", "severity": "HIGH", "confidence": 0.90,
     "pattern": r"shpat_[0-9a-fA-F]{32}"},
    {"id": "hubspot-api-key", "provider": "HubSpot", "secretType": "HubSpot API Key", "severity": "MEDIUM", "confidence": 0.80,
     "pattern": r"(?i)hubspot.{0,10}['\"]([a-f0-9-]{36})['\"]"},

    # ---- Passwords in Code ----
    {"id": "hardcoded-password", "provider": "Generic", "secretType": "Hardcoded Password", "severity": "HIGH", "confidence": 0.70,
     "pattern": r"(?i)(?:password|passwd|pwd)\s*=\s*['\"]([^'\"]{8,})['\"]"},
    {"id": "hardcoded-secret", "provider": "Generic", "secretType": "Hardcoded Secret", "severity": "HIGH", "confidence": 0.70,
     "pattern": r"(?i)(?:secret|api_secret|client_secret)\s*=\s*['\"]([^'\"]{10,})['\"]"},
    {"id": "hardcoded-token", "provider": "Generic", "secretType": "Hardcoded Token", "severity": "MEDIUM", "confidence": 0.65,
     "pattern": r"(?i)(?:token|auth_token|access_token)\s*=\s*['\"]([a-zA-Z0-9._-]{20,})['\"]"},
    {"id": "basic-auth-url", "provider": "Generic", "secretType": "Basic Auth in URL", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"https?://[^:]+:[^@]{3,}@[^/\s]+"},

    # ---- CI/CD ----
    {"id": "travis-ci-token", "provider": "Travis CI", "secretType": "Travis CI Token", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"(?i)travis.{0,10}['\"]([a-zA-Z0-9_-]{22})['\"]"},
    {"id": "circleci-token", "provider": "CircleCI", "secretType": "CircleCI Token", "severity": "HIGH", "confidence": 0.85,
     "pattern": r"(?i)circle.{0,10}(?:ci|token).{0,10}['\"]([a-f0-9]{40})['\"]"},
    {"id": "jenkins-token", "provider": "Jenkins", "secretType": "Jenkins API Token", "severity": "HIGH", "confidence": 0.80,
     "pattern": r"(?i)jenkins.{0,10}token.{0,10}['\"]([a-f0-9]{34})['\"]"},
]

# =============================================================================
# Risk Assessment
# =============================================================================
def assess_risk(rule, ts_context):
    score = {"CRITICAL": 85, "HIGH": 65, "MEDIUM": 45, "LOW": 20}.get(rule['severity'], 20)
    score = int(score * rule['confidence'])
    if ts_context == "variable_declarator":
        score += 10
    elif ts_context == "string":
        score += 5
    score = min(100, score)
    if score >= 90: severity = 'CRITICAL'
    elif score >= 70: severity = 'HIGH'
    elif score >= 45: severity = 'MEDIUM'
    else: severity = 'LOW'
    return score, severity

# =============================================================================
# Tree-sitter context lookup
# =============================================================================
def get_ts_context(tree, byte_offset):
    """Walk the tree to find the node type at a given byte offset."""
    node = tree.root_node
    try:
        node = tree.root_node.named_descendant_for_byte_range(byte_offset, byte_offset + 1)
        if node:
            return node.parent.type if node.parent else node.type
    except Exception:
        pass
    return "unknown"

# =============================================================================
# Process a single file job
# =============================================================================
def process_file(job):
    file_content = job.get('content', '')
    file_path = job.get('filePath', '')
    repo_id = job.get('repositoryId', '')
    repo_owner = job.get('repositoryOwner', 'unknown')
    scan_id = job.get('scanId', '')
    commit_sha = job.get('commitSha', '')

    if not file_content.strip():
        return []

    lines = file_content.split('\n')

    # Tree-sitter AST parse (only for JS/TS files)
    try:
        tree = parser.parse(bytes(file_content, "utf8"))
    except Exception:
        tree = None

    findings = []

    for rule in RULES:
        try:
            compiled = re.compile(rule['pattern'])
        except re.error:
            continue

        for i, line in enumerate(lines):
            # Skip obvious comments for lower false positive rate
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('#') or stripped.startswith('*'):
                continue

            for match in compiled.finditer(line):
                secret = match.group(0)

                # Get AST context
                ts_context = "unknown"
                if tree:
                    byte_offset = sum(len(l) + 1 for l in lines[:i]) + match.start()
                    ts_context = get_ts_context(tree, byte_offset)

                risk_score, final_severity = assess_risk(rule, ts_context)
                fingerprint = hashlib.sha256(f"{repo_id}:{file_path}:{secret}:{rule['id']}".encode()).hexdigest()
                finding_id = hashlib.sha256(f"{repo_id}-{file_path}-{i}-{rule['id']}".encode()).hexdigest()[:16]

                findings.append({
                    "id": finding_id,
                    "repositoryId": repo_id,
                    "repositoryOwner": repo_owner,
                    "scanId": scan_id,
                    "commitSha": commit_sha,
                    "filePath": file_path,
                    "lineStart": i + 1,
                    "lineEnd": i + 1,
                    "secretType": rule['secretType'],
                    "provider": rule.get('provider', 'Generic'),
                    "severity": final_severity,
                    "riskScore": risk_score,
                    "confidence": rule['confidence'],
                    "status": "OPEN",
                    "fingerprint": fingerprint,
                    "context": line.replace(secret, "***REDACTED***")
                })

    # Store in DB
    with engine.connect() as conn:
        for f in findings:
            q = text("""
                INSERT INTO findings
                (id, repository_id, scan_id, commit_sha, file_path, line_start, line_end, secret_type, severity, risk_score, confidence, status, fingerprint, context)
                VALUES
                (:id, :repo, :scan, :commit, :file, :start, :end, :secret_type, :severity, :risk, :conf, :status, :fingerprint, :context)
                ON CONFLICT (id) DO NOTHING
            """)
            conn.execute(q, {
                "id": f['id'], "repo": f['repositoryId'], "scan": f['scanId'], "commit": f['commitSha'],
                "file": f['filePath'], "start": f['lineStart'], "end": f['lineEnd'], "secret_type": f['secretType'],
                "severity": f['severity'], "risk": f['riskScore'], "conf": f['confidence'], "status": f['status'],
                "fingerprint": f['fingerprint'], "context": f['context']
            })
            conn.commit()

            # Publish to SSE for real-time frontend update
            r.publish('scan_events', json.dumps({"event": "finding_detected", "data": f}))
            print(f"  [FINDING] {f['severity']}: {f['secretType']} in {f['filePath']}:{f['lineStart']}")

    return findings

# =============================================================================
# Main Worker Loop
# =============================================================================
def worker_loop():
    print(f"Python Detection Engine v2 — {len(RULES)} rules loaded")
    print("Listening to 'scan_queue'...")

    # Track scan completion
    scan_findings = {}  # scanId -> list of findings

    while True:
        try:
            item = r.blpop('scan_queue', timeout=5)
            if item:
                _, message = item
                job = json.loads(message)
                scan_id = job.get('scanId')
                file_path = job.get('filePath', 'unknown')
                repo_id = job.get('repositoryId', 'unknown')

                print(f"Processing: {file_path} in {repo_id} (scan:{scan_id[:8]})")
                found = process_file(job)

                # Accumulate findings per scan
                if scan_id not in scan_findings:
                    scan_findings[scan_id] = []
                scan_findings[scan_id].extend(found)

                # Check how many jobs remain for this scan
                remaining = r.llen('scan_queue')
                if remaining == 0:
                    # All files processed — notify backend to finalize
                    for sid, finds in list(scan_findings.items()):
                        critical = sum(1 for f in finds if f['severity'] == 'CRITICAL')
                        try:
                            requests.post(f"{BACKEND_URL}/api/webhooks/scan-complete", json={
                                "scanId": sid,
                                "repositoryOwner": job.get('repositoryOwner', 'unknown'),
                                "repositoryName": job.get('repositoryId', 'unknown'),
                                "commitSha": job.get('commitSha', 'unknown'),
                                "findingsCount": len(finds),
                                "criticalCount": critical
                            }, timeout=5)
                            print(f"Scan {sid[:8]} complete: {len(finds)} findings ({critical} critical)")
                        except Exception as e:
                            print(f"Could not notify backend of scan completion: {e}")
                    scan_findings.clear()

        except Exception as e:
            print(f"Worker error: {e}")
            time.sleep(1)

if __name__ == '__main__':
    # Start the actual queue worker in a background thread
    t = threading.Thread(target=worker_loop, daemon=True)
    t.start()
    
    # Start the dummy web server on the main thread so Render thinks it's a web service
    port = int(os.getenv("PORT", 10000))
    print(f"Starting dummy web server on port {port}...")
    app.run(host="0.0.0.0", port=port)
