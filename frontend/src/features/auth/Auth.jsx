import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, GitBranch } from 'lucide-react';

function AuthInput({ label, type = 'text', placeholder, icon: Icon, value, onChange }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="label">{label}</label>
      <div className="input-wrap">
        {Icon && <Icon className="input-icon" style={{ width: 15, height: 15 }} />}
        <input
          type={isPassword && !show ? 'password' : 'text'}
          className={`input ${Icon ? 'input-with-icon' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingRight: isPassword ? 40 : 14 }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 0 }}
          >
            {show ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    navigate('/app');
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="auth-logo-mark"><Shield style={{ width: 18, height: 18, color: '#fff' }} /></div>
          <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-.02em' }}>LeakShield</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your LeakShield account</p>



        <form onSubmit={handleSubmit} className="auth-form">
          <AuthInput label="Email address" type="email" placeholder="you@company.com" icon={Mail} value={email} onChange={setEmail} />
          <AuthInput label="Password"      type="password" placeholder="Your password"   icon={Lock} value={password} onChange={setPassword} />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <a href="#" style={{ fontSize: '.8125rem', color: 'var(--accent)' }}>Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ borderRadius: 10, padding: '11px 18px' }}>
            {loading ? <span className="spinner" /> : <>Sign in <ArrowRight style={{ width: 15, height: 15 }} /></>}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Create one →</Link>
        </p>
      </div>
    </div>
  );
}

export function Signup() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    navigate('/app');
  };

  const perks = ['Free forever plan', 'No credit card needed', 'Set up in 3 minutes'];

  return (
    <div className="auth-page">
      <div className="auth-box" style={{ maxWidth: 420 }}>
        <div className="auth-logo">
          <div className="auth-logo-mark"><Shield style={{ width: 18, height: 18, color: '#fff' }} /></div>
          <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-.02em' }}>LeakShield</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Start scanning your repos in minutes</p>

        {/* Perks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {perks.map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.8125rem', color: 'var(--text-2)' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check style={{ width: 11, height: 11, color: 'var(--success)' }} />
              </div>
              {p}
            </div>
          ))}
        </div>



        <form onSubmit={handleSubmit} className="auth-form">
          <AuthInput label="Full name"     placeholder="Rishav Kumar"       icon={User} value={name}     onChange={setName} />
          <AuthInput label="Work email"    placeholder="you@company.com"    icon={Mail} value={email}    onChange={setEmail} />
          <AuthInput label="Password"      placeholder="Min. 8 characters"  icon={Lock} type="password" value={password} onChange={setPassword} />

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ borderRadius: 10, padding: '11px 18px' }}>
            {loading ? <span className="spinner" /> : <>Create account <ArrowRight style={{ width: 15, height: 15 }} /></>}
          </button>
        </form>

        <p style={{ fontSize: '.75rem', color: 'var(--text-4)', textAlign: 'center', marginTop: 14 }}>
          By signing up you agree to our <a href="#" style={{ color: 'var(--accent)' }}>Terms</a> and <a href="#" style={{ color: 'var(--accent)' }}>Privacy Policy</a>.
        </p>

        <p className="auth-footer" style={{ marginTop: 12 }}>
          Already have an account? <Link to="/login">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
