class RiskEngine {
  /**
   * Calculate a risk score and normalized severity for a finding
   * @param {Object} finding 
   */
  assessRisk(finding) {
    let riskScore = 0;
    
    // Base score from severity
    switch(finding.severity) {
      case 'CRITICAL': riskScore += 80; break;
      case 'HIGH': riskScore += 60; break;
      case 'MEDIUM': riskScore += 40; break;
      case 'LOW': riskScore += 20; break;
    }

    // Adjust based on confidence (0.0 to 1.0)
    riskScore = riskScore * finding.confidence;

    // Adjust based on Tree-sitter context
    if (finding.treeSitterContext === 'Variable Assignment / Object Property') {
      riskScore += 15; // High likelihood of being a real credential
    }

    // Cap at 100
    riskScore = Math.min(100, Math.round(riskScore));

    // Re-evaluate severity based on final risk score
    let assessedSeverity = 'LOW';
    if (riskScore >= 90) assessedSeverity = 'CRITICAL';
    else if (riskScore >= 70) assessedSeverity = 'HIGH';
    else if (riskScore >= 40) assessedSeverity = 'MEDIUM';

    return {
      riskScore,
      assessedSeverity
    };
  }
}

module.exports = new RiskEngine();
