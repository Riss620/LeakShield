import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle } from 'lucide-react';

/**
 * /auth/callback — receives ?token=JWT or ?error=msg from backend OAuth routes.
 * Stores token in localStorage and redirects to /app.
 */
export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [msg,    setMsg]    = useState('');

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      setStatus('error');
      setMsg(decodeURIComponent(error));
      setTimeout(() => navigate('/login'), 3500);
      return;
    }

    if (token) {
      // Store token
      localStorage.setItem('ls_token', token);
      // Decode and store user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        localStorage.setItem('ls_user', JSON.stringify(payload));
      } catch { /* ignore decode errors */ }

      setStatus('success');
      setMsg('Signed in successfully! Redirecting…');
      setTimeout(() => navigate('/app'), 1200);
      return;
    }

    setStatus('error');
    setMsg('No token received. Please try again.');
    setTimeout(() => navigate('/login'), 3000);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Logo */}
        <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Shield style={{ width: 24, height: 24, color: '#fff' }} />
        </div>

        {status === 'loading' && (
          <>
            <div style={{ width: 32, height: 32, border: '3px solid var(--accent-soft)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <p style={{ color: 'var(--text-2)', fontWeight: 500 }}>Signing you in…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle style={{ width: 40, height: 40, color: 'var(--success)' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-1)' }}>{msg}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle style={{ width: 40, height: 40, color: 'var(--danger)' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-1)' }}>Sign-in failed</p>
            <p style={{ fontSize: '.875rem', color: 'var(--danger)', maxWidth: 360, lineHeight: 1.5 }}>{msg}</p>
            <p style={{ fontSize: '.8125rem', color: 'var(--text-3)' }}>Redirecting to login…</p>
          </>
        )}
      </div>
    </div>
  );
}
