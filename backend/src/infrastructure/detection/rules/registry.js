const rules = [
  {
    id: "aws-access-key",
    provider: "AWS",
    category: "cloud",
    secretType: "AWS Access Key",
    pattern: "(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}",
    severity: "CRITICAL",
    confidence: 0.95,
    enabled: true
  },
  {
    id: "aws-secret-key",
    provider: "AWS",
    category: "cloud",
    secretType: "AWS Secret Access Key",
    pattern: "aws_secret_access_key.{0,20}['\"][0-9a-zA-Z\\/\\+]{40}['\"]",
    severity: "CRITICAL",
    confidence: 0.9,
    enabled: true
  },
  {
    id: "github-pat",
    provider: "GitHub",
    category: "vcs",
    secretType: "GitHub Personal Access Token",
    pattern: "ghp_[0-9a-zA-Z]{36}",
    severity: "CRITICAL",
    confidence: 1.0,
    enabled: true
  },
  {
    id: "github-oauth",
    provider: "GitHub",
    category: "vcs",
    secretType: "GitHub OAuth Access Token",
    pattern: "gho_[0-9a-zA-Z]{36}",
    severity: "CRITICAL",
    confidence: 1.0,
    enabled: true
  },
  {
    id: "slack-bot-token",
    provider: "Slack",
    category: "communication",
    secretType: "Slack Bot Token",
    pattern: "xoxb-[0-9]{11}-[0-9]{11}-[0-9a-zA-Z]{24}",
    severity: "CRITICAL",
    confidence: 1.0,
    enabled: true
  },
  {
    id: "generic-api-key",
    provider: "Generic",
    category: "api",
    secretType: "Generic API Key",
    pattern: "(api_key|apikey|secret|token|password)[\"\\s:=]+[\"'][0-9a-zA-Z\\-_]{16,64}[\"']",
    severity: "MEDIUM",
    confidence: 0.5,
    enabled: true
  }
];

// Note: In the full implementation, this registry would load 500+ rules from a JSON/YAML database.
class RuleRegistry {
  constructor() {
    this.rules = rules;
  }

  getEnabledRules() {
    return this.rules.filter(r => r.enabled);
  }

  getRuleById(id) {
    return this.rules.find(r => r.id === id);
  }
}

module.exports = new RuleRegistry();
