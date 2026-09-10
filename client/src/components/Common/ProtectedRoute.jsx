import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app, #f8fafc)',
        color: 'var(--text-secondary, #475569)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '42px',
            height: '42px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px auto'
          }} />
          <p style={{ fontWeight: 600, color: '#64748b' }}>Loading PeoplePay360...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const ROLE_ALIASES = {
    ADMIN: 'SUPER_ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
    HR_PAYROLL_MANAGER: 'PAYROLL_MANAGER',
    PAYROLL_MANAGER: 'PAYROLL_MANAGER',
    HR_PAYROLL_USER: 'PAYROLL_USER',
    PAYROLL_USER: 'PAYROLL_USER',
    HR_MANAGER: 'HR_MANAGER',
    HR_STAFF: 'HR_STAFF',
    EMPLOYEE: 'EMPLOYEE',
  };

  const userRole = ROLE_ALIASES[user?.role] || user?.role;
  const normalizedAllowed = allowedRoles?.map(r => ROLE_ALIASES[r] || r);

  if (normalizedAllowed && normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole)) {
    if (user?.role === 'EMPLOYEE') {
      return <Navigate to="/portal" replace />;
    }
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            margin: '0 auto 20px auto'
          }}>
            🚫
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '24px' }}>
            Your role (<span className="badge badge-warning">{user?.role}</span>) does not have permission to access this page.
          </p>
          <Link
            to={user?.role === 'EMPLOYEE' ? '/portal' : '/dashboard'}
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            {user?.role === 'EMPLOYEE' ? 'Return to Staff Portal' : 'Return to Dashboard'}
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
