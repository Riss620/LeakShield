const crypto = require('crypto');
const ruleRegistry = require('../rules/registry');

class RegexDetector {
  detect(fileContent, context) {
    const findings = [];
    const enabledRules = ruleRegistry.getEnabledRules();
    const lines = fileContent.split('\n');

    for (const rule of enabledRules) {
      const regex = new RegExp(rule.pattern, 'gi');
      
      lines.forEach((line, index) => {
        let match;
        while ((match = regex.exec(line)) !== null) {
          const secretValue = match[0];
          
          // Hash secret for fingerprinting, DO NOT store raw secret
          const fingerprint = crypto.createHash('sha256').update(secretValue).digest('hex');

          findings.push({
            ruleId: rule.id,
            secretType: rule.secretType,
            provider: rule.provider,
            severity: rule.severity,
            confidence: rule.confidence,
            detector: 'RegexDetector',
            filePath: context.filePath,
            lineStart: index + 1,
            lineEnd: index + 1,
            fingerprint,
            context: line.substring(Math.max(0, match.index - 20), Math.min(line.length, match.index + secretValue.length + 20)) 
            // Save a snippet of code (masked later) for UI context
          });
        }
      });
    }

    return findings;
  }
}

module.exports = RegexDetector;
