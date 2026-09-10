import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  CalendarCheck,
  Calculator,
  Receipt,
  Layers,
  UserCircle,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, hasRole } = useAuth();
  const role = user?.role;
  const isEmployee = role === 'EMPLOYEE';

  const isAdmin = hasRole(['SUPER_ADMIN', 'ADMIN']);
  const isHRManager = hasRole(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER']);
  const isPayrollManager = hasRole(['SUPER_ADMIN', 'ADMIN', 'PAYROLL_MANAGER', 'HR_PAYROLL_MANAGER']);
  const isPayrollUser = hasRole(['SUPER_ADMIN', 'ADMIN', 'PAYROLL_MANAGER', 'HR_PAYROLL_MANAGER', 'PAYROLL_USER', 'HR_PAYROLL_USER']);
  const isHRStaffOrAbove = hasRole(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'HR_PAYROLL_MANAGER', 'PAYROLL_USER', 'HR_PAYROLL_USER']);

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, color: '#4f46e5', bg: '#eef2ff', show: !isEmployee },
        { path: '/portal', label: 'My Self-Service', icon: UserCircle, color: '#16a34a', bg: '#f0fdf4', show: isEmployee },
      ]
    },
    {
      title: isEmployee ? 'MY WORKSPACE' : 'CORE HR',
      items: [
        { path: '/employees', label: 'Employees Directory', icon: Users, color: '#7c3aed', bg: '#f5f3ff', show: !isEmployee && isHRStaffOrAbove },
        { path: '/contracts', label: 'Contracts & Terms', icon: FileText, color: '#0284c7', bg: '#f0f9ff', show: !isEmployee && (isHRManager || isPayrollUser) },
        { path: '/attendance', label: isEmployee ? 'My Attendance' : 'Attendance & Clock', icon: Clock, color: '#059669', bg: '#ecfdf5', show: true },
        { path: '/leave', label: isEmployee ? 'My Leaves & Requests' : 'Leave & Time Off', icon: CalendarCheck, color: '#d97706', bg: '#fffbeb', show: true },
      ]
    },
    // Payroll & Finance: Accessible only to HR Payroll User, HR Payroll Manager, and Admin. Strictly hidden from HR Manager and Employee.
    ...(isPayrollUser ? [{
      title: 'PAYROLL & FINANCE',
      items: [
        { path: '/payroll', label: 'Payroll Cycles', icon: Calculator, color: '#2563eb', bg: '#eff6ff', show: true },
        { path: '/payslips', label: 'Employee Payslips', icon: Receipt, color: '#e11d48', bg: '#fff1f2', show: true },
        { path: '/salary-structures', label: 'Salary Structures', icon: Layers, color: '#c026d3', bg: '#fdf4ff', show: true },
      ]
    }] : []),
    // Administration: Accessible strictly to Admin (SUPER_ADMIN)
    ...(isAdmin ? [{
      title: 'ADMINISTRATION',
      items: [
        { path: '/users', label: 'User & Roles Admin', icon: ShieldCheck, color: '#ea580c', bg: '#fff7ed', show: true },
      ]
    }] : []),
    ...(isEmployee ? [] : [{
      title: 'SELF SERVICE',
      items: [
        { path: '/portal', label: 'My Portal', icon: UserCircle, color: '#16a34a', bg: '#f0fdf4', show: true },
      ]
    }])
  ];

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: collapsed ? '76px' : '264px',
        transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        boxShadow: '1px 0 10px rgba(0, 0, 0, 0.02)'
      }}
    >
      {/* Brand Header */}
      <div style={{
        padding: collapsed ? '18px 12px' : '20px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid #f0eef6',
        background: 'linear-gradient(180deg, #ffffff 0%, #faf9fd 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            background: 'linear-gradient(135deg, #5554aa 0%, #757498 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(85, 84, 170, 0.25)',
            fontWeight: 800,
            color: '#ffffff',
            fontSize: '16px',
            letterSpacing: '-0.02em',
            flexShrink: 0
          }}>
            IW
          </div>
          {!collapsed && (
            <div>
              <div style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#181837',
                lineHeight: 1.2
              }}>
                PeoplePay<span style={{ color: '#5554aa' }}>360</span>
              </div>
              <div style={{
                fontSize: '0.66rem',
                color: '#6b6a8a',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: '1px'
              }}>
                Innowise HR Suite
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 10px' }}>
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx} style={{ marginBottom: '18px' }}>
              {!collapsed && (
                <div style={{
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  color: '#9b9ab5',
                  padding: '4px 12px 6px 12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  {section.title}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '11px',
                        padding: collapsed ? '10px' : '8px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        color: isActive ? '#3c3a88' : '#4a4968',
                        backgroundColor: isActive ? '#f0f0ff' : 'transparent',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.86rem',
                        transition: 'all 0.16s ease',
                        border: isActive ? '1px solid #d4d3f5' : '1px solid transparent',
                        boxShadow: isActive ? '0 2px 8px rgba(85, 84, 170, 0.08)' : 'none'
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: isActive ? '#5554aa' : '#f4f3f9',
                            color: isActive ? '#ffffff' : '#6b6a8a',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                          }}>
                            <Icon size={16} />
                          </div>
                          {!collapsed && (
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.label}
                            </span>
                          )}
                          {isActive && !collapsed && (
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#5554aa',
                              boxShadow: '0 0 6px rgba(85, 84, 170, 0.8)'
                            }} />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

        {/* Collapse Toggle / User Profile Footer (Innowise Style) */}
      <div style={{
        padding: collapsed ? '12px 8px' : '14px 16px',
        borderTop: '1px solid #f0eef6',
        backgroundColor: '#faf9fd',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {!collapsed && user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e8e6f0',
            boxShadow: '0 1px 3px rgba(24, 24, 55, 0.03)'
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #5554aa 0%, #757498 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 700,
              flexShrink: 0
            }}>
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#181837', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.employee?.name || user.email?.split('@')[0]}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                <span style={{ fontSize: '0.68rem', color: '#6b6a8a', fontWeight: 600, textTransform: 'capitalize' }}>
                  {user.role?.replace('_', ' ').toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between'
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#5554aa', display: 'inline-block' }} />
              <span style={{ fontSize: '0.7rem', color: '#6b6a8a', fontWeight: 600 }}>
                Innowise Suite v2.4
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e3ec',
              color: '#5554aa',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronRight size={14} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
