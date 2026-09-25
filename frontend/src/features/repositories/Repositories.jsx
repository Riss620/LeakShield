import { useState, useEffect } from 'react';
import { GitBranch, Plus, ExternalLink, Trash2, Play, CheckCircle, AlertCircle, X, Loader2, Shield } from 'lucide-react';

export default function Repositories() {
  const [repos, setRepos]           = useState([]);
  const [modalOpen, setModalOpen]   = useState(false);
  const [url, setUrl]               = useState('');
  const [connecting, setConnecting] = useState(false);
  const [err, setErr]               = useState('');
  const [ok, setOk]                 = useState('');

  useEffect(() => {
    fetch('/api/repositories')
      .then(r => r.json())
      .then(d => setRepos(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setConnecting(true); setErr(''); setOk('');
    try {
      const res  = await fetch('/api/repositories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed to connect.'); return; }
      setRepos(prev => [{ ...data, findings: { critical: 0, high: 0 } }, ...prev.filter(r => r.id !== data.id)]);
      setOk(data.message || 'Repository connected!');
      setUrl('');
      setTimeout(() => { setModalOpen(false); setOk(''); }, 2000);
    } catch { setErr('Cannot reach the backend. Is it running?'); }
    finally { setConnecting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this repository?')) return;
    await fetch(`/api/repositories/${id}`, { method: 'DELETE' });
    setRepos(prev => prev.filter(r => r.id !== id));
  };

  const handleScan = async (repo) => {
    try {
      const res = await fetch(`/api/repositories/${repo.id}/scan`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      alert(`✅ Scan triggered for ${repo.name}. Check Findings in a moment.`);
    } catch (e) { alert('Scan failed: ' + e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="animate-in" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Repositories</h1>
          <p className="page-subtitle">Connect and monitor GitHub repositories for secret leaks.</p>
        </div>
        <button className="btn btn-primary" style={{ borderRadius: 10, gap: 7 }} onClick={() => setModalOpen(true)}>
          <Plus style={{ width: 15, height: 15 }} /> Connect Repo
        </button>
      </div>

      {/* Cards */}
      {repos.length === 0 ? (
        <div className="table-wrap animate-in delay-1">
          <div className="empty">
            <div className="empty-icon"><GitBranch style={{ width: 22, height: 22 }} /></div>
            <div className="empty-title">No repositories connected</div>
            <div className="empty-text">Connect a GitHub repository to start scanning commits for exposed secrets.</div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8, borderRadius: 8 }} onClick={() => setModalOpen(true)}>
              <Plus style={{ width: 14, height: 14 }} /> Connect your first repo
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-in delay-1" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {repos.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
              {/* Icon */}
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GitBranch style={{ width: 18, height: 18, color: 'var(--accent)' }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '.9375rem' }}>{r.name}</span>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)' }}>
                    <ExternalLink style={{ width: 12, height: 12 }} />
                  </a>
                  <span className="badge badge-success" style={{ fontSize: '.6rem' }}>Connected</span>
                </div>
                <div style={{ fontSize: '.8125rem', color: 'var(--text-3)', marginTop: 2 }}>{r.fullName}</div>
              </div>

              {/* Severity counts */}
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }} className="hide-mobile">
                {r.findings?.critical > 0 && <span className="badge badge-critical">{r.findings.critical} critical</span>}
                {r.findings?.high    > 0 && <span className="badge badge-danger">{r.findings.high} high</span>}
                {!r.findings?.critical && !r.findings?.high && <span className="badge badge-success">Clean</span>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 8, gap: 5 }} onClick={() => handleScan(r)}>
                  <Play style={{ width: 12, height: 12 }} /> Scan
                </button>
                <button className="btn btn-secondary btn-sm" style={{ borderRadius: 8, color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => handleDelete(r.id)}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      {modalOpen && (
        <div className="overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div className="modal-title">Connect Repository</div>
                <div className="modal-sub">Paste your GitHub repository URL below</div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">GitHub Repository URL</label>
                <div className="input-wrap">
                  <GitBranch className="input-icon" style={{ width: 15, height: 15 }} />
                  <input
                    className="input input-with-icon"
                    placeholder="https://github.com/owner/repo-name"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {err && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '.875rem' }}>
                  <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> {err}
                </div>
              )}
              {ok && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--success-soft)', color: 'var(--success)', fontSize: '.875rem' }}>
                  <CheckCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> {ok}
                </div>
              )}

              <div style={{ background: 'var(--cream)', borderRadius: 10, padding: '12px 14px', fontSize: '.8rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                <strong>Next:</strong> After connecting, add a GitHub webhook:<br />
                Payload URL: <code style={{ color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 5px', borderRadius: 4 }}>{window.location.origin}/api/webhooks/github</code>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={connecting} style={{ borderRadius: 8 }}>
                  {connecting ? <><Loader2 style={{ width: 13, height: 13, animation: 'spin .7s linear infinite' }} /> Connecting…</> : <><Plus style={{ width: 13, height: 13 }} /> Connect</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
