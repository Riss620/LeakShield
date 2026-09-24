import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, GitBranch, Lock, Bell, Code, ArrowRight, Check } from 'lucide-react';

/* ── Nav ─────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  return (
    <nav className={`land-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="land-logo">
        <div className="land-logo-mark"><Shield style={{ width: 16, height: 16, color: '#fff' }} /></div>
        <span className="land-logo-text">LeakShield</span>
      </div>
      <div className="land-links hide-mobile">
        <a href="#features" className="land-link">Features</a>
        <a href="#how"      className="land-link">How it works</a>
        <a href="#pricing"  className="land-link">Pricing</a>
      </div>
      <div className="land-actions">
        <Link to="/login"  className="btn btn-secondary btn-sm">Sign in</Link>
        <Link to="/signup" className="btn btn-primary  btn-sm">Get started</Link>
      </div>
    </nav>
  );
}

/* ── Features data ───────────────────────────────────────── */
const FEATURES = [
  { icon: Zap,       color: '#F59340', bg: '#FEF3E7', title: 'Real-time Detection',    desc: 'Every commit scanned in under a second. Secrets caught before they ever reach production.' },
  { icon: GitBranch, color: '#6366F1', bg: '#EDEDFD', title: 'GitHub Native',          desc: 'Connects via webhooks. Zero agents to install, zero config files to manage.' },
  { icon: Lock,      color: '#16A34A', bg: '#E7F5EC', title: '60+ Pattern Rules',      desc: 'AWS, GCP, Azure, Stripe, SSH keys, JWTs, database strings and more — all covered.' },
  { icon: Code,      color: '#5856D6', bg: '#EEEDF9', title: 'AI-powered Fixes',       desc: 'One click to get a context-aware AI remediation with security best practices baked in.' },
  { icon: Bell,      color: '#DC2626', bg: '#FEECEC', title: 'Instant Alerts',         desc: 'Slack notifications and in-app alerts the moment a credential leak is detected.' },
  { icon: Shield,    color: '#0891B2', bg: '#E6F6FA', title: 'Full Audit Trail',       desc: 'Immutable history of every scan, finding, and resolution for compliance and reporting.' },
];

const STEPS = [
  { n: '1', title: 'Add the webhook', desc: 'Paste your repo URL in LeakShield, copy the webhook endpoint, add it to GitHub in seconds.' },
  { n: '2', title: 'Push your code',  desc: 'LeakShield scans every changed file automatically on each push using 60+ detection rules.' },
  { n: '3', title: 'Fix with AI',     desc: 'Get pinged the moment a leak is found. One click generates an AI-powered fix suggestion.' },
];

const STATS = [
  { v: '60+',   l: 'Detection rules' },
  { v: '<1s',   l: 'Average scan time' },
  { v: '99.9%', l: 'Uptime SLA' },
  { v: '0',     l: 'False negatives' },
];

/* ── Terminal demo ───────────────────────────────────────── */
function Terminal() {
  const lines = [
    { t: 'dim',   text: '# Scanning commit a3f8d9c in Riss620/focusflow...' },
    { t: 'green', text: '✓  12 files queued for analysis' },
    { t: 'green', text: '✓  Running 60 detection patterns' },
    { t: 'dim',   text: '   config/database.js ·····' },
    { t: 'red',   text: '⚠  CRITICAL  AWS_ACCESS_KEY_ID at line 14' },
    { t: 'amber', text: '⚠  HIGH      PostgreSQL password at line 31' },
    { t: 'dim',   text: '   src/app.js ·············· ✓ clean' },
    { t: 'dim',   text: '   utils/helpers.js ········ ✓ clean' },
    { t: 'green', text: '→  Slack alert sent to #security-alerts' },
    { t: 'blue',  text: '→  View findings: leakshield.app/findings' },
  ];
  const colors = { dim: '#6B6560', green: '#34C759', red: '#FF3B30', amber: '#F59340', blue: '#6366F1' };
  return (
    <div style={{ background: '#1A1714', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(26,23,20,.22)' }}>
      <div style={{ background: '#22201C', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
        {['#FF5F56','#FFBD2E','#27C93F'].map(c => <div key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}
        <div style={{ flex: 1, height: 20, background: '#2C2924', borderRadius: 5, marginLeft: 8 }} />
      </div>
      <div style={{ padding: '22px 24px', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.8rem', lineHeight: 2 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: colors[l.t], opacity: i === 0 ? 0.6 : 1 }}>{l.text}</div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Landing ─────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="land-page">
      <Nav />

      {/* ── Hero ── */}
      <section style={{ padding: '130px 0 72px', background: 'linear-gradient(175deg, #EDE8DF 0%, var(--cream) 60%)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>

          <div className="animate-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.18)', borderRadius: 999, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', display: 'inline-block' }} />
            <span style={{ fontSize: '.8125rem', fontWeight: 600, color: '#6366F1' }}>AI-powered secret detection</span>
          </div>

          <h1 className="animate-in delay-1" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.06, marginBottom: 20 }}>
            Stop secrets from<br />
            <span style={{ background: 'linear-gradient(135deg, #6366F1 0%, #F59340 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              leaking into production
            </span>
          </h1>

          <p className="animate-in delay-2" style={{ fontSize: '1.1rem', color: 'var(--text-2)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.65 }}>
            LeakShield scans every GitHub commit in real time, catching API keys, passwords and credentials before they cause damage.
          </p>

          <div className="animate-in delay-3" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
            <Link to="/signup" className="btn btn-primary btn-lg" style={{ gap: 8 }}>
              Start for free <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link to="/app" className="btn btn-dark btn-lg">
              Live demo
            </Link>
          </div>

          <div className="animate-in delay-4" style={{ maxWidth: 780, margin: '0 auto' }}>
            <Terminal />
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{ background: 'var(--dark)', padding: '40px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, textAlign: 'center' }}>
            {STATS.map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-.05em', color: '#fff' }}>{s.v}</div>
                <div style={{ fontSize: '.8125rem', color: 'var(--dark-muted)', marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '88px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: '.8125rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Everything built in</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: 12 }}>
              Built for engineering teams
            </h2>
            <p style={{ color: 'var(--text-2)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
              No friction, no agents to install, no config headaches. Connect your repo and you're protected.
            </p>
          </div>

          <div className="grid-3" style={{ gap: 20 }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card card-hover animate-in" style={{ animationDelay: `${i * 0.07}s`, padding: '24px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon style={{ width: 20, height: 20, color: f.color }} />
                  </div>
                  <h3 style={{ fontWeight: 700, letterSpacing: '-.015em', marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: '.875rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ background: 'var(--cream-dark)', padding: '88px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: '.8125rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Dead simple</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-.03em' }}>Up and running in 3 minutes</h2>
          </div>
          <div className="grid-3" style={{ gap: 32 }}>
            {STEPS.map((s, i) => (
              <div key={i} className="animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--dark)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>{s.n}</div>
                <h3 style={{ fontWeight: 700, letterSpacing: '-.015em', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: '.875rem', color: 'var(--text-2)', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: '88px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '.8125rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-.03em', marginBottom: 48 }}>Simple, honest pricing</h2>
          <div className="grid-3" style={{ gap: 20, maxWidth: 860, margin: '0 auto' }}>
            {[
              { name: 'Free', price: '$0', desc: 'Perfect for side projects', features: ['5 repositories', '100 scans/month', 'Email alerts', '7-day history'], cta: 'Get started', primary: false },
              { name: 'Pro', price: '$19', desc: 'For growing teams', features: ['Unlimited repos', 'Unlimited scans', 'Slack + email alerts', '90-day history', 'AI remediation', 'Priority support'], cta: 'Start free trial', primary: true },
              { name: 'Enterprise', price: 'Custom', desc: 'For large organizations', features: ['Everything in Pro', 'SSO / SAML', 'Custom rules', 'Dedicated support', 'SLA guarantee', 'On-premise option'], cta: 'Contact us', primary: false },
            ].map((plan, i) => (
              <div key={i} className="card" style={{ padding: '28px 24px', border: plan.primary ? '2px solid var(--accent)' : '1px solid var(--border-soft)', position: 'relative', boxShadow: plan.primary ? '0 8px 28px rgba(99,102,241,.18)' : 'var(--shadow-xs)' }}>
                {plan.primary && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: '.6875rem', fontWeight: 700, padding: '3px 12px', borderRadius: 999, letterSpacing: '.04em', textTransform: 'uppercase' }}>Most popular</div>}
                <p style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--text-2)', marginBottom: 4 }}>{plan.name}</p>
                <p style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-.04em', marginBottom: 4 }}>{plan.price}<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-3)' }}>{plan.price !== 'Custom' ? '/mo' : ''}</span></p>
                <p style={{ fontSize: '.8125rem', color: 'var(--text-3)', marginBottom: 20 }}>{plan.desc}</p>
                <Link to="/signup" className={`btn w-full ${plan.primary ? 'btn-primary' : 'btn-secondary'}`} style={{ marginBottom: 20, borderRadius: 10 }}>
                  {plan.cta}
                </Link>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.8125rem', color: 'var(--text-2)' }}>
                      <Check style={{ width: 14, height: 14, color: 'var(--success)', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ background: 'var(--dark)', padding: '72px 0', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: '-.04em', color: '#fff', marginBottom: 14 }}>
            Protect your codebase today
          </h2>
          <p style={{ color: 'var(--dark-muted)', fontSize: '1rem', marginBottom: 32 }}>
            Free to start. No credit card required. Set up in under 5 minutes.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-amber btn-lg">
              Get started free <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '13px 24px', borderRadius: 999, border: '1.5px solid var(--dark-4)', color: 'var(--dark-text)', fontSize: '1rem', fontWeight: 600, transition: 'all .15s' }}>
              <GitBranch style={{ width: 18, height: 18 }} /> Sign in with GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: 'var(--dark-2)', borderTop: '1px solid var(--dark-3)', padding: '28px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="land-logo">
            <div className="land-logo-mark"><Shield style={{ width: 14, height: 14, color: '#fff' }} /></div>
            <span className="land-logo-text" style={{ color: 'var(--dark-text)' }}>LeakShield</span>
          </div>
          <p style={{ fontSize: '.8125rem', color: 'var(--dark-muted)' }}>© 2024 LeakShield — Keep secrets secret.</p>
        </div>
      </footer>
    </div>
  );
}
