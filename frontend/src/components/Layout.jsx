import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Search, Settings, GitBranch,
  Bell, LogOut, ChevronRight, Menu, X, Zap
} from 'lucide-react';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/app' },
  { icon: GitBranch,       label: 'Repositories', path: '/app/repositories' },
  { icon: Search,          label: 'Findings',     path: '/app/findings' },
  { icon: Bell,            label: 'Alerts',       path: '/app/alerts' },
  { icon: Settings,        label: 'Settings',     path: '/app/settings' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ls_user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      // ignore
    }
    
    // Fetch real-time critical findings count
    fetch('/api/findings')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const count = data.filter(f => f.severity === 'CRITICAL' && f.status === 'OPEN').length;
          setCriticalAlerts(count);
        }
      })
      .catch(console.error);
  }, []);

  const isActive = (path) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const SidebarInner = () => (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield style={{ width: 16, height: 16, color: '#fff' }} />
        </div>
        <span className="sidebar-logo-text">LeakShield</span>
      </div>

      {/* Nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Main</div>
        {NAV.slice(0, 4).map(({ icon: Icon, label, path }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setMobileOpen(false)}
            className={`nav-link ${isActive(path) ? 'active' : ''}`}
          >
            <Icon className="nav-link-icon" />
            {label}
            {label === 'Alerts' && criticalAlerts > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', fontSize: '.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>{criticalAlerts}</span>
            )}
          </Link>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 12 }}>Config</div>
        {NAV.slice(4).map(({ icon: Icon, label, path }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setMobileOpen(false)}
            className={`nav-link ${isActive(path) ? 'active' : ''}`}
          >
            <Icon className="nav-link-icon" />
            {label}
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="sidebar-avatar" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="sidebar-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name truncate">{user?.name || 'User'}</div>
            <div className="sidebar-user-role">Admin</div>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('ls_user');
            localStorage.removeItem('ls_token');
            navigate('/');
          }}
          className="nav-link"
          style={{ width: '100%', marginTop: 4, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <LogOut className="nav-link-icon" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 40, backdropFilter: 'blur(3px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="sidebar hide-mobile">
        <SidebarInner />
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`sidebar`} style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        <SidebarInner />
      </aside>

      {/* Main */}
      <main className="app-main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: 'none', padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-2)' }}
              className="show-mobile"
            >
              {mobileOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
            </button>

            {/* Status pill */}
            <div className="status-pill">
              <div className="ping-ring" />
              <span>System Active</span>
            </div>

            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.8125rem', color: 'var(--text-3)' }} className="hide-mobile">
              <ChevronRight style={{ width: 13, height: 13 }} />
              <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                {NAV.find(n => isActive(n.path))?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="topbar-right">


            {/* Bell */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Bell style={{ width: 18, height: 18, color: 'var(--text-2)' }} />
              {criticalAlerts > 0 && <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: 'var(--danger)', borderRadius: '50%', border: '1.5px solid var(--cream)' }} />}
            </div>

            {/* Avatar */}
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="topbar-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="topbar-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
