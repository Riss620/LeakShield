import { useEffect, useState } from 'react';
import { Search, Filter, Zap, Check, ChevronDown, ShieldAlert, FileCode } from 'lucide-react';

const SEV = {
  CRITICAL: { bg: 'var(--critical-soft)', color: 'var(--critical)' },
  HIGH:     { bg: 'var(--danger-soft)',   color: 'var(--danger)' },
  MEDIUM:   { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  LOW:      { bg: 'var(--success-soft)', color: 'var(--success)' },
};

function AiModal({ finding, onClose }) {
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState('');
  useEffect(() => {
    fetch(`http://localhost:4000/api/findings/${finding.id}/remediate`, { method: 'POST' })
      .then(r => r.json())
      .then(d => { setSuggestion(d.suggestion || d.error || 'No suggestion returned.'); setLoading(false); })
      .catch(() => { setSuggestion('Could not reach the AI service. Check your API keys in Settings.'); setLoading(false); });
  }, [finding.id]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap style={{ width: 18, height: 18, color: 'var(--accent)' }} />
          </div>
          <div>
            <div className="modal-title">AI Remediation Suggestion</div>
            <div className="modal-sub">{finding.secretType} in {finding.filePath}</div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[100, 85, 70].map((w, i) => <div key={i} className="skeleton" style={{ height: 18, width: `${w}%`, borderRadius: 4 }} />)}
            <div style={{ marginTop: 8, fontSize: '.875rem', color: 'var(--text-3)' }}>Generating AI fix suggestion…</div>
          </div>
        ) : (
          <div style={{ background: 'var(--cream)', border: '1px solid var(--border-soft)', borderRadius: 10, padding: '14px 16px', fontSize: '.875rem', lineHeight: 1.7, color: 'var(--text-1)', whiteSpace: 'pre-wrap', maxHeight: 340, overflowY: 'auto' }}>
            {suggestion}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function Findings() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState('');
  const [sevFilter, setSevFilter] = useState('ALL');
  const [aiTarget,  setAiTarget]  = useState(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/findings')
      .then(r => r.json())
      .then(d => { setFindings(Array.isArray(d) ? d : d.findings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const resolve = async (id) => {
    await fetch(`http://localhost:4000/api/findings/${id}/resolve`, { method: 'POST' });
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'RESOLVED' } : f));
  };

  const filtered = findings.filter(f => {
    const q = search.toLowerCase();
    const matchText = !q || f.secretType?.toLowerCase().includes(q) || f.filePath?.toLowerCase().includes(q) || f.repositoryName?.toLowerCase().includes(q);
    const matchSev  = sevFilter === 'ALL' || f.severity === sevFilter;
    return matchText && matchSev;
  });

  const sevs = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="animate-in">
        <h1 className="page-title">Findings</h1>
        <p className="page-subtitle">Review and resolve detected secrets across all repositories.</p>
      </div>

      {/* Controls */}
      <div className="animate-in delay-1" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="input-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Search className="input-icon" style={{ width: 15, height: 15 }} />
          <input
            className="input input-with-icon"
            placeholder="Search by type, file, or repo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '9px 14px 9px 36px', fontSize: '.875rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sevs.map(s => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className="chip"
              style={sevFilter === s ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-soft)' } : {}}
            >
              {s === 'ALL' ? 'All severities' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap animate-in delay-2">
        <div className="table-header">
          <h2 className="table-title">{filtered.length} finding{filtered.length !== 1 ? 's' : ''}</h2>
        </div>

        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><ShieldAlert style={{ width: 22, height: 22 }} /></div>
            <div className="empty-title">{search || sevFilter !== 'ALL' ? 'No matching findings' : 'No findings yet'}</div>
            <div className="empty-text">Run a scan using the "Scan now" button or push code to a connected GitHub repository.</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Secret Type</th>
                <th>Repository</th>
                <th>File</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const sev = SEV[f.severity] || SEV.LOW;
                const resolved = f.status === 'RESOLVED';
                return (
                  <tr key={f.id} style={{ opacity: resolved ? 0.55 : 1 }}>
                    <td>
                      <span className="badge" style={{ background: sev.bg, color: sev.color }}>{f.severity}</span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '.875rem' }}>{f.secretType}</td>
                    <td style={{ color: 'var(--text-2)' }}>{f.repositoryName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FileCode style={{ width: 13, height: 13, color: 'var(--text-3)', flexShrink: 0 }} />
                        <code style={{ fontSize: '.78rem', color: 'var(--text-2)', background: 'var(--cream-dark)', padding: '2px 6px', borderRadius: 4 }}>{f.filePath}</code>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${resolved ? 'badge-success' : 'badge-amber'}`}>
                        {resolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!resolved && (
                          <>
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => setAiTarget(f)}
                              style={{ borderRadius: 7, gap: 5 }}
                            >
                              <Zap style={{ width: 11, height: 11 }} /> Fix with AI
                            </button>
                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={() => resolve(f.id)}
                              style={{ borderRadius: 7, gap: 5 }}
                            >
                              <Check style={{ width: 11, height: 11 }} /> Resolve
                            </button>
                          </>
                        )}
                        {resolved && <span style={{ fontSize: '.8rem', color: 'var(--text-4)' }}>Done</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {aiTarget && <AiModal finding={aiTarget} onClose={() => setAiTarget(null)} />}
    </div>
  );
}
