import { useEffect, useState } from 'react';
import { Bell, ShieldAlert, AlertTriangle, CheckCircle, Info, X, Trash2 } from 'lucide-react';

const SEV_CFG = {
  CRITICAL: { icon: ShieldAlert,  bg: 'var(--critical-soft)', color: 'var(--critical)', border: 'rgba(127,29,29,.15)' },
  HIGH:     { icon: AlertTriangle, bg: 'var(--danger-soft)',   color: 'var(--danger)',   border: 'rgba(220,38,38,.15)' },
  MEDIUM:   { icon: Info,          bg: 'var(--warning-soft)',  color: 'var(--warning)',  border: 'rgba(217,119,6,.15)' },
  INFO:     { icon: CheckCircle,   bg: 'var(--accent-soft)',   color: 'var(--accent)',   border: 'rgba(99,102,241,.15)' },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetch('http://localhost:4000/api/findings')
      .then(r => r.json())
      .then(findings => {
        const arr = Array.isArray(findings) ? findings : (findings.findings || []);
        setAlerts(arr.map(f => ({
          id: f.id, type: f.severity,
          title: `${f.secretType} Detected`,
          message: `Found in ${f.repositoryName || f.repositoryId} — ${f.filePath}`,
          repo: f.repositoryName || f.repositoryId,
          time: f.createdAt, dismissed: false,
        })));
      })
      .catch(console.error);

    const es = new EventSource('http://localhost:4000/api/events');
    es.addEventListener('finding_detected', e => {
      const f = JSON.parse(e.data);
      setAlerts(prev => [{ id: f.id, type: f.severity, title: `${f.secretType} Detected`, message: `Found in ${f.repositoryId} — ${f.filePath}`, repo: f.repositoryId, time: new Date().toISOString(), dismissed: false }, ...prev]);
    });
    es.addEventListener('scan_started', e => {
      const d = JSON.parse(e.data);
      setAlerts(prev => [{ id: `scan-${d.scanId}`, type: 'INFO', title: 'Scan Started', message: `Scanning ${d.repository} @ ${d.commitSha?.slice(0, 8) || ''}...`, repo: d.repository, time: new Date().toISOString(), dismissed: false }, ...prev]);
    });
    return () => es.close();
  }, []);

  const dismiss  = id => setAlerts(p => p.map(a => a.id === id ? { ...a, dismissed: true } : a));
  const clearAll = () => setAlerts([]);
  const visible  = alerts.filter(a => !a.dismissed && (filter === 'ALL' || a.type === filter));
  const filters  = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'INFO'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="animate-in" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell style={{ width: 20, height: 20, color: 'var(--accent)' }} />
            Alerts
          </h1>
          <p className="page-subtitle">Real-time security alerts from all connected repositories.</p>
        </div>
        {alerts.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={clearAll} style={{ borderRadius: 8, gap: 6, color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Clear all
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="animate-in delay-1" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className="chip" style={filter === f ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-soft)' } : {}}>
            {f === 'ALL' ? `All (${alerts.filter(a => !a.dismissed).length})` : f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="animate-in delay-2">
        {visible.length === 0 ? (
          <div className="table-wrap">
            <div className="empty">
              <div className="empty-icon"><CheckCircle style={{ width: 22, height: 22 }} /></div>
              <div className="empty-title">All clear!</div>
              <div className="empty-text">No alerts for the selected filter. New alerts appear here in real time as scans run.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map(alert => {
              const cfg = SEV_CFG[alert.type] || SEV_CFG.INFO;
              const Icon = cfg.icon;
              return (
                <div key={alert.id} className="animate-in" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, transition: 'all .2s' }}>
                  {/* Icon */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 18, height: 18, color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '.6875rem', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: cfg.color }}>{alert.type}</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>·</span>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{alert.repo}</span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text-1)', marginBottom: 3 }}>{alert.title}</p>
                    <p style={{ fontSize: '.8125rem', color: 'var(--text-2)', wordBreak: 'break-all' }}>{alert.message}</p>
                    <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 6 }}>
                      {alert.time ? new Date(alert.time).toLocaleString() : 'Just now'}
                    </p>
                  </div>

                  {/* Dismiss */}
                  <button onClick={() => dismiss(alert.id)} style={{ background: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0, transition: 'all .15s' }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
