import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Activity, ArrowRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const sevColor = {
  CRITICAL: { bg: 'var(--critical-soft)', color: 'var(--critical)', label: 'CRITICAL' },
  HIGH:     { bg: 'var(--danger-soft)',   color: 'var(--danger)',   label: 'HIGH' },
  MEDIUM:   { bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'MEDIUM' },
  LOW:      { bg: 'var(--success-soft)', color: 'var(--success)',  label: 'LOW' },
};

function StatCard({ title, value, icon: Icon, iconBg, iconColor, sub, trend }) {
  return (
    <div className="stat-card animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="stat-icon-wrap" style={{ background: iconBg }}>
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.75rem', fontWeight: 600, color: trend > 0 ? 'var(--danger)' : 'var(--success)' }}>
            <TrendingUp style={{ width: 11, height: 11 }} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ repoCount: 0, criticalCount: 0, highCount: 0, openCount: 0, recentActivity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));

    const token = localStorage.getItem('ls_token');
    const backendUrl = window.location.hostname.includes('vercel.app') 
      ? 'https://leakshield-pkgi.onrender.com' 
      : '';
    const esUrl = token ? `${backendUrl}/api/events?token=${token}` : `${backendUrl}/api/events`;
    const es = new EventSource(esUrl);
    es.addEventListener('finding_detected', (e) => {
      const f = JSON.parse(e.data);
      setStats(prev => ({
        ...prev,
        criticalCount: prev.criticalCount + (f.severity === 'CRITICAL' ? 1 : 0),
        highCount:     prev.highCount     + (f.severity === 'HIGH' ? 1 : 0),
        openCount:     prev.openCount + 1,
        recentActivity: [{ id: f.id, repositoryId: f.repositoryId, secretType: f.secretType, severity: f.severity, filePath: f.filePath, createdAt: new Date().toISOString() }, ...prev.recentActivity].slice(0, 8),
      }));
    });
    return () => es.close();
  }, []);

  const cards = [
    { title: 'Monitored Repos',   value: stats.repoCount,    icon: ShieldCheck,  iconBg: 'var(--accent-soft)',  iconColor: 'var(--accent)', sub: 'Connected via webhook' },
    { title: 'Critical Findings', value: stats.criticalCount, icon: ShieldAlert,  iconBg: 'var(--critical-soft)',iconColor: 'var(--critical)', sub: 'Needs immediate action', trend: 12 },
    { title: 'High Risk',         value: stats.highCount,    icon: AlertTriangle, iconBg: 'var(--danger-soft)',  iconColor: 'var(--danger)',  sub: 'Review recommended', trend: 5 },
    { title: 'Total Open Issues', value: stats.openCount,    icon: Activity,      iconBg: 'var(--amber-soft)',   iconColor: 'var(--amber)',   sub: 'Across all repositories' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="animate-in">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Security Overview</h1>
            <p className="page-subtitle">Real-time secrets detection across all your repositories.</p>
          </div>
          <Link to="/app/findings" className="btn btn-secondary btn-sm" style={{ borderRadius: 8 }}>
            View all findings <ArrowRight style={{ width: 13, height: 13 }} />
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4 delay-1">
        {cards.map((c, i) => (
          <div key={i} className="animate-in" style={{ animationDelay: `${i * 0.07}s` }}>
            <StatCard {...c} />
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="animate-in delay-2">
        <div className="table-wrap">
          <div className="table-header">
            <h2 className="table-title">Recent Activity</h2>
            <Link to="/app/findings" className="section-action">See all →</Link>
          </div>

          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
            </div>
          ) : stats.recentActivity.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><ShieldCheck style={{ width: 22, height: 22 }} /></div>
              <div className="empty-title">No findings yet</div>
              <div className="empty-text">Trigger a scan using the button in the top bar or via GitHub webhook push.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Secret Type</th>
                  <th>Repository</th>
                  <th>File</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentActivity.map(a => {
                  const sev = sevColor[a.severity] || sevColor.LOW;
                  return (
                    <tr key={a.id}>
                      <td>
                        <span className="badge" style={{ background: sev.bg, color: sev.color }}>{sev.label}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{a.secretType}</td>
                      <td style={{ color: 'var(--text-2)' }}>{a.repositoryId}</td>
                      <td><code style={{ fontSize: '.8rem', color: 'var(--text-2)', background: 'var(--cream-dark)', padding: '2px 6px', borderRadius: 4 }}>{a.filePath}</code></td>
                      <td style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>{new Date(a.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="animate-in delay-3">
        <div className="section-head">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="grid-3" style={{ gap: 12 }}>
          {[
            { title: 'Connect Repository', desc: 'Add a new GitHub repo to scan', path: '/app/repositories', color: 'var(--accent)', bg: 'var(--accent-soft)' },
            { title: 'View Findings',      desc: 'Review all detected secrets',   path: '/app/findings',    color: 'var(--danger)', bg: 'var(--danger-soft)' },
            { title: 'Configure Alerts',   desc: 'Set up Slack notifications',    path: '/app/settings',    color: 'var(--amber)',  bg: 'var(--amber-soft)' },
          ].map((a, i) => (
            <Link key={i} to={a.path} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '18px 20px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <ArrowRight style={{ width: 16, height: 16, color: a.color }} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{a.title}</div>
              <div style={{ fontSize: '.8125rem', color: 'var(--text-3)' }}>{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
