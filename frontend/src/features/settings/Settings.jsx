import { useState, useEffect } from 'react';
import { Shield, Bell, Key, GitMerge, Save, Eye, EyeOff, ExternalLink, Loader2, Check, ToggleLeft, ToggleRight } from 'lucide-react';

function InputField({ label, value, onChange, placeholder, isPassword, hint, link }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="input-wrap">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          className="input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: isPassword ? 40 : 14 }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 0 }}>
            {show ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
          </button>
        )}
      </div>
      {hint && (
        <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 5 }}>
          {hint}{link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>Create one <ExternalLink style={{ width: 10, height: 10 }} /></a>}
        </p>
      )}
    </div>
  );
}

const TABS = [
  { id: 'integrations', label: 'Integrations', icon: GitMerge },
  { id: 'rules',        label: 'Detection Rules', icon: Shield },
  { id: 'notifications',label: 'Notifications', icon: Bell },
  { id: 'api',          label: 'API Keys', icon: Key },
];

const RULES = [
  { id: 'aws',      name: 'AWS Access Keys',            cat: 'Cloud' },
  { id: 'gcp',      name: 'Google Cloud API Keys',      cat: 'Cloud' },
  { id: 'azure',    name: 'Azure Connection Strings',   cat: 'Cloud' },
  { id: 'slack',    name: 'Slack Bot Tokens',           cat: 'Communication' },
  { id: 'stripe',   name: 'Stripe API Keys',            cat: 'Payments' },
  { id: 'rsa',      name: 'RSA / SSH Private Keys',     cat: 'Cryptographic' },
  { id: 'jwt',      name: 'JWT Secrets',                cat: 'Auth' },
  { id: 'postgres', name: 'PostgreSQL Connection Strings', cat: 'Databases' },
  { id: 'mongodb',  name: 'MongoDB Connection Strings', cat: 'Databases' },
  { id: 'generic',  name: 'Hardcoded Passwords',        cat: 'Generic' },
];

export default function Settings() {
  const [tab, setTab]             = useState('integrations');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');
  const [status, setStatus]       = useState({});
  const [rules, setRules]         = useState(() => Object.fromEntries(RULES.map(r => [r.id, r.id !== 'azure'])));

  const [githubToken, setGithubToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [slackWebhook, setSlackWebhook]   = useState('');
  const [geminiKey, setGeminiKey]         = useState('');
  const [groqKey, setGroqKey]             = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { setStatus(d); if (d.webhookSecret) setWebhookSecret(d.webhookSecret); })
      .catch(console.error);
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const payload = { webhookSecret };
      if (githubToken) payload.githubToken = githubToken;
      if (slackWebhook) payload.slackWebhook = slackWebhook;
      if (geminiKey) payload.geminiKey = geminiKey;
      if (groqKey) payload.groqKey = groqKey;

      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      setMsg(res.ok ? '✓ ' + d.message : '✗ ' + (d.error || 'Save failed'));
      if (res.ok) {
        const s = await fetch('/api/settings').then(r => r.json());
        setStatus(s); setGithubToken(''); setSlackWebhook(''); setGeminiKey(''); setGroqKey('');
      }
    } catch { setMsg('✗ Backend not reachable'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const StatusDot = ({ on }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.75rem', fontWeight: 600, color: on ? 'var(--success)' : 'var(--text-4)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? 'var(--success)' : 'var(--text-4)', display: 'inline-block' }} />
      {on ? 'Connected' : 'Not set'}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="animate-in">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure integrations, detection rules, and API keys.</p>
      </div>

      <div className="animate-in delay-1" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '.875rem', fontWeight: tab === t.id ? 600 : 500, background: tab === t.id ? 'var(--accent-soft)' : 'transparent', color: tab === t.id ? 'var(--accent)' : 'var(--text-2)', textAlign: 'left', transition: 'all .15s' }}>
                <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div className="card" style={{ flex: 1, minWidth: 0, padding: 28 }}>

          {/* INTEGRATIONS */}
          {tab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>GitHub Integration</h2>
                <p style={{ fontSize: '.875rem', color: 'var(--text-3)' }}>Connect LeakShield to GitHub to scan real commits and block dangerous pushes.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InputField label="GitHub Personal Access Token" value={githubToken} onChange={setGithubToken}
                  placeholder={status.githubTokenSet ? status.githubToken + ' (saved)' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                  isPassword hint="Scopes required: repo (read)" link="https://github.com/settings/tokens/new?scopes=repo&description=LeakShield" />
                <InputField label="Webhook Secret" value={webhookSecret} onChange={setWebhookSecret}
                  placeholder="leakshield_secret_2024" hint="Must match the secret in your GitHub repo Webhook settings." />
              </div>

              {/* Webhook guide */}
              <div style={{ background: 'var(--cream)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '16px 18px' }}>
                <h4 style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: 10 }}>⚙ How to Set Up GitHub Webhook</h4>
                <ol style={{ paddingLeft: 18, fontSize: '.8125rem', color: 'var(--text-2)', lineHeight: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <li>Go to your GitHub repo → <strong>Settings → Webhooks → Add webhook</strong></li>
                  <li>Set <strong>Payload URL</strong> to <code style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 4 }}>{window.location.origin}/api/webhooks/github</code></li>
                  <li>Set <strong>Content type</strong> to <code style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 4 }}>application/json</code></li>
                  <li>Enter the <strong>Webhook Secret</strong> from above, select <em>Just push events</em></li>
                </ol>
              </div>

              {/* Status cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { name: 'GitHub', desc: 'Real-time scan on push', on: status.githubTokenSet },
                  { name: 'Slack',  desc: 'Critical alerts to channel', on: status.slackWebhookSet },
                ].map(c => (
                  <div key={c.name} style={{ padding: '14px 16px', background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '.875rem' }}>{c.name}</span>
                      <StatusDot on={c.on} />
                    </div>
                    <p style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{c.desc}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ borderRadius: 8, gap: 6 }}>
                  {saving ? <span className="spinner" /> : <Save style={{ width: 13, height: 13 }} />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                {msg && <span style={{ fontSize: '.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>{msg}</span>}
              </div>
            </div>
          )}

          {/* DETECTION RULES */}
          {tab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Detection Rules</h2>
                <p style={{ fontSize: '.875rem', color: 'var(--text-3)' }}>60 active patterns. Toggle categories to include or exclude from scans.</p>
              </div>
              {RULES.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{r.name}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 2 }}>{r.cat}</div>
                  </div>
                  <button onClick={() => setRules(p => ({ ...p, [r.id]: !p[r.id] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: rules[r.id] ? 'var(--accent)' : 'var(--text-4)', display: 'flex' }}>
                    {rules[r.id] ? <ToggleRight style={{ width: 28, height: 28 }} /> : <ToggleLeft style={{ width: 28, height: 28 }} />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Slack Notifications</h2>
                <p style={{ fontSize: '.875rem', color: 'var(--text-3)' }}>Get alerted in Slack when critical secrets are found.</p>
              </div>
              <InputField label="Slack Incoming Webhook URL" value={slackWebhook} onChange={setSlackWebhook}
                placeholder={status.slackWebhookSet ? '•••••••• (saved)' : 'https://hooks.slack.com/services/T.../B.../...'}
                isPassword hint="Create a Slack app with Incoming Webhooks." link="https://api.slack.com/apps/new" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['CRITICAL severity findings', 'New repository connected', 'Scan completion summary'].map(label => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'var(--cream)' }}>
                    <span style={{ fontSize: '.875rem', color: 'var(--text-1)' }}>{label}</span>
                    <span style={{ color: 'var(--accent)' }}><ToggleRight style={{ width: 26, height: 26 }} /></span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ borderRadius: 8 }}>
                  {saving ? <span className="spinner" /> : <Save style={{ width: 13, height: 13 }} />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {msg && <span style={{ fontSize: '.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>{msg}</span>}
              </div>
            </div>
          )}

          {/* API KEYS */}
          {tab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>AI Remediation Keys</h2>
                <p style={{ fontSize: '.875rem', color: 'var(--text-3)' }}>Used to power the "Fix with AI" feature on the Findings page.</p>
              </div>
              <InputField label="Google Gemini API Key" value={geminiKey} onChange={setGeminiKey}
                placeholder={status.geminiKeySet ? 'AIza•••••••••• (saved)' : 'AIzaSy...'}
                isPassword hint="Primary AI provider." link="https://aistudio.google.com/app/apikey" />
              <InputField label="Groq API Key (Fallback)" value={groqKey} onChange={setGroqKey}
                placeholder={status.groqKeySet ? 'gsk_•••••••••• (saved)' : 'gsk_...'}
                isPassword hint="Fallback if Gemini fails." link="https://console.groq.com/keys" />

              <div style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--border-soft)' }}>
                {[{ label: 'Gemini', on: status.geminiKeySet }, { label: 'Groq', on: status.groqKeySet }].map(k => (
                  <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: k.on ? 'var(--success)' : 'var(--text-4)', display: 'inline-block' }} />
                    <span style={{ fontSize: '.8125rem', color: 'var(--text-2)', fontWeight: 500 }}>{k.label}: {k.on ? 'Active' : 'Not set'}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ borderRadius: 8 }}>
                  {saving ? <span className="spinner" /> : <Save style={{ width: 13, height: 13 }} />}
                  {saving ? 'Saving…' : 'Save API Keys'}
                </button>
                {msg && <span style={{ fontSize: '.875rem', color: msg.startsWith('✓') ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>{msg}</span>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
