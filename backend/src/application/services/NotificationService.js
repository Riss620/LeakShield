const { query } = require('../../infrastructure/persistence/database');

class NotificationService {
  /**
   * Send a Slack alert when CRITICAL secrets are found.
   * Accepts userId to look up the user's Slack webhook from the DB.
   */
  async sendSlackAlert({ scanId, repositoryName, commitSha, findingsCount, criticalCount, userId }) {
    const appUrl = process.env.APP_URL || `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` || 'https://leakshield.onrender.com';

    // Get user's Slack webhook from DB if userId provided, fallback to env
    let slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    if (userId) {
      try {
        const row = (await query('SELECT config_json FROM settings WHERE user_id = $1', [userId]))[0];
        if (row) {
          const config = JSON.parse(row.config_json || '{}');
          slackWebhookUrl = config.SLACK_WEBHOOK_URL || slackWebhookUrl;
        }
      } catch (e) {
        console.error('[Notifications] Failed to fetch user Slack config:', e.message);
      }
    }

    if (!slackWebhookUrl) {
      console.log('[Notifications] No SLACK_WEBHOOK_URL configured — skipping Slack alert.');
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
              url: `${appUrl}/app/findings`
            }
          ]
        }
      ]
    };

    try {
      const res = await fetch(slackWebhookUrl, {
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
