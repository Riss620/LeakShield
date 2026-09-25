import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './features/landing/Landing';
import { Login, Signup } from './features/auth/Auth';
import OAuthCallback from './features/auth/OAuthCallback';
import Layout from './components/Layout';
import Dashboard from './features/dashboard/Dashboard';
import Findings from './features/findings/Findings';
import Repositories from './features/repositories/Repositories';
import Settings from './features/settings/Settings';
import Alerts from './features/alerts/Alerts';

// Global fetch override to auto-attach JWT token for multi-tenancy
const originalFetch = window.fetch;
window.fetch = async (url, config = {}) => {
  if (typeof url === 'string' && url.startsWith('/api')) {
    const token = localStorage.getItem('ls_token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }
  }
  return originalFetch(url, config);
};
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"       element={<Landing />} />
        <Route path="/login"  element={<Login />}   />
        <Route path="/signup" element={<Signup />}  />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* App shell */}
        <Route path="/app" element={<Layout />}>
          <Route index                   element={<Dashboard />}    />
          <Route path="findings"         element={<Findings />}     />
          <Route path="repositories"     element={<Repositories />} />
          <Route path="alerts"           element={<Alerts />}       />
          <Route path="settings"         element={<Settings />}     />
        </Route>

        {/* Legacy redirect */}
        <Route path="/findings"     element={<Navigate to="/app/findings"     replace />} />
        <Route path="/repositories" element={<Navigate to="/app/repositories" replace />} />
        <Route path="/alerts"       element={<Navigate to="/app/alerts"       replace />} />
        <Route path="/settings"     element={<Navigate to="/app/settings"     replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
