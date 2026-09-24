// Using web-tree-sitter or standard tree-sitter bindings.
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

class TreeSitterDetector {
  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(JavaScript);
  }

  analyzeContext(findings, fileContent, language) {
    if (language !== 'javascript') {
      // Return findings as-is if we don't have a parser for the language yet
      return findings;
    }

    const tree = this.parser.parse(fileContent);
    const enrichedFindings = [];

    for (const finding of findings) {
      // Find the node corresponding to the line
      // This is a simplified lookup; in reality we'd match the exact byte range or walk the tree
      const rootNode = tree.rootNode;
      const node = rootNode.descendantForPosition({
        row: finding.lineStart - 1,
        column: 0
      });

      let enrichedConfidence = finding.confidence;
      let nodeContext = "Unknown";

      if (node) {
        nodeContext = node.type;
        // If it's a variable declaration or assignment, confidence goes up
        if (node.type === 'string_fragment' || node.type === 'string') {
          const parent = node.parent;
          if (parent && (parent.type === 'variable_declarator' || parent.type === 'assignment_expression' || parent.type === 'pair')) {
            enrichedConfidence = Math.min(1.0, enrichedConfidence + 0.2);
            nodeContext = "Variable Assignment / Object Property";
          }
        }
      }

      enrichedFindings.push({
        ...finding,
        confidence: enrichedConfidence,
        treeSitterContext: nodeContext
      });
    }

    return enrichedFindings;
  }
}

module.exports = TreeSitterDetector;
