const RegexDetector = require('../../infrastructure/detection/regex/RegexDetector');
const TreeSitterDetector = require('../../infrastructure/detection/treesitter/TreeSitterDetector');

class DetectionEngine {
  constructor() {
    this.regexDetector = new RegexDetector();
    this.treeSitterDetector = new TreeSitterDetector();
  }

  /**
   * Scans a single file's content
   * @param {string} fileContent 
   * @param {object} context { filePath, language }
   * @returns {Array} List of findings
   */
  scanFile(fileContent, context) {
    // 1. Initial Detection (Regex)
    let findings = this.regexDetector.detect(fileContent, context);

    if (findings.length === 0) {
      return [];
    }

    // 2. Contextual Enrichment (Tree-sitter)
    // We pass language (e.g. 'javascript') to decide parsing
    findings = this.treeSitterDetector.analyzeContext(findings, fileContent, context.language);

    // 3. Finding Normalization (Mask the context string to prevent raw secret exposure)
    findings = findings.map(finding => {
      // Find the secret in the context and mask it
      // Since we don't have the raw secret anymore (only fingerprint), 
      // we'd normally just mask anything resembling the pattern in the context string,
      // or we handle it during the regex matching step.
      // For safety, let's just create a generic masking.
      const maskedContext = finding.context.replace(/[A-Za-z0-9_-]{16,}/g, '****************');
      
      return {
        ...finding,
        context: maskedContext, // Only save masked context to the DB
      };
    });

    return findings;
  }
}

module.exports = new DetectionEngine();
