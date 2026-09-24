const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

class NotificationService {
  /**
   * Send a Slack alert when CRITICAL secrets are found.
   */
  async sendSlackAlert({ scanId, repositoryName, commitSha, findingsCount, criticalCount }) {
    if (!SLACK_WEBHOOK_URL) {
      console.log('[Notifications] No SLACK_WEBHOOK_URL set — skipping Slack alert.');
      return;
    }

    const payload = {
      text: `🚨 *LeakShield Critical Alert*`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 LeakShield: Critical Secret Detected!' }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Repository:*\n${repositoryName}` },
            { type: 'mrkdwn', text: `*Commit:*\n\`${commitSha.slice(0, 8)}\`` },
            { type: 'mrkdwn', text: `*Critical Findings:*\n${criticalCount} 🔴` },
            { type: 'mrkdwn', text: `*Total Findings:*\n${findingsCount}` }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '🔍 View Findings' },
              style: 'danger',
              url: `http://localhost:5173/findings`
            }
          ]
        }
      ]
    };

    try {
      const res = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        console.log('[Notifications] Slack alert sent successfully.');
      } else {
        console.error('[Notifications] Slack alert failed:', res.status, await res.text());
      }
    } catch (err) {
      console.error('[Notifications] Failed to send Slack alert:', err.message);
    }
  }

  /**
   * Log a notification event (could be extended to send emails via SendGrid/Nodemailer)
   */
  async logAlert(type, data) {
    console.log(`[Alert:${type}]`, JSON.stringify(data));
  }
}

module.exports = new NotificationService();
