import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, Users, Calculator, UserCheck, Receipt, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@peoplepay360.com');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getDestination = (role) => {
    const attempted = location.state?.from?.pathname;
    if (attempted && attempted !== '/login') {
      const adminOnlyRoutes = ['/payroll', '/contracts', '/salary-structures'];
      if (role === 'EMPLOYEE' && adminOnlyRoutes.some(r => attempted.startsWith(r))) {
        return '/portal';
      }
      return attempted;
    }
    return role === 'EMPLOYEE' ? '/portal' : '/dashboard';
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDestination(user?.role), { replace: true });
    }
  }, [isAuthenticated, user?.role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('Please enter both your email address (or username) and password.');
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const userData = await login(cleanEmail, cleanPass);
      toast.success('Signed in successfully');
      const target = getDestination(userData?.role);
      navigate(target, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      let msg = 'Invalid email or password. Please try again.';
      if (!err.response) {
        msg = 'Unable to connect to backend server. Please check your connection.';
      } else if (err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 35%, #fdf2f8 70%, #fefce8 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Floating Soft Pastel Orbs */}
      <div style={{
        position: 'absolute',
        width: '520px',
        height: '520px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(167, 243, 208, 0.45) 0%, rgba(199, 210, 254, 0.2) 50%, transparent 70%)',
        top: '-160px',
        right: '-100px',
        pointerEvents: 'none',
        filter: 'blur(30px)',
        animation: 'floatOrb 10s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        width: '460px',
        height: '460px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(253, 230, 138, 0.45) 0%, rgba(254, 205, 211, 0.3) 50%, transparent 70%)',
        bottom: '-120px',
        left: '-100px',
        pointerEvents: 'none',
        filter: 'blur(30px)',
        animation: 'floatOrb 14s ease-in-out infinite reverse'
      }} />

      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '22px',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 20px 45px -10px rgba(148, 163, 184, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.8)',
        padding: '38px 32px',
        position: 'relative',
        zIndex: 1,
        animation: 'springUp 300ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '22px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            letterSpacing: '-0.02em'
          }}>
            P3
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: 0 }}>
            PeoplePay<span style={{ color: '#6366f1' }}>360</span>
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '6px' }}>
            Enterprise HR & Automated Payroll Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {errorMessage && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#be123c',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 6px rgba(225, 29, 72, 0.08)'
            }}>
              <AlertCircle size={18} color="#e11d48" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 500 }}>{errorMessage}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '7px' }}>
              Corporate Email or Username
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="login-email"
                name="email"
                autoComplete="username"
                type="text"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errorMessage) setErrorMessage(null); }}
                placeholder="name@peoplepay360.com or admin"
                className="form-input"
                style={{ paddingLeft: '42px', height: '46px', fontSize: '0.92rem' }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
              <label htmlFor="login-password" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.78rem',
                  color: '#6366f1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 500
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="login-password"
                name="password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errorMessage) setErrorMessage(null); }}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '42px', paddingRight: '40px', height: '46px', fontSize: '0.92rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              height: '46px',
              width: '100%',
              fontSize: '0.95rem',
              fontWeight: 700,
              marginTop: '6px'
            }}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign In to PeoplePay360</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Demo Roles Quick Fill */}
        <div style={{ marginTop: '26px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{
            fontSize: '0.74rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748b',
            marginBottom: '12px',
            textAlign: 'center',
            fontWeight: 700
          }}>
            1-Click Demo Profiles
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@peoplepay360.com', 'Password@123')}
              style={{
                padding: '9px 11px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#991b1b',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <ShieldCheck size={15} color="#dc2626" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('hr.manager@peoplepay360.com', 'Password@123')}
              style={{
                padding: '9px 11px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                color: '#1e40af',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Users size={15} color="#2563eb" />
              <span>HR Manager</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('payroll.user@peoplepay360.com', 'Password@123')}
              style={{
                padding: '9px 11px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                color: '#15803d',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Receipt size={15} color="#16a34a" />
              <span>HR Payroll User</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('payroll.manager@peoplepay360.com', 'Password@123')}
              style={{
                padding: '9px 11px',
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: '10px',
                color: '#6b21a8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Calculator size={15} color="#9333ea" />
              <span>HR Payroll Mgr</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('aisha.verma@peoplepay360.com', 'Password@123')}
              style={{
                gridColumn: 'span 2',
                padding: '9px 11px',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 116, 139, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <UserCheck size={15} color="#475569" />
              <span>Employee Portal (Aisha Verma)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
