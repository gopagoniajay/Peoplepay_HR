import { useState, useEffect } from 'react';
import DataTable from '../../components/Common/DataTable';
import StatCard from '../../components/Common/StatCard';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Key,
  Trash2,
  CheckCircle2,
  X,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    roleId: '',
    employeeId: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, empRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
        api.get('/employees?pageSize=100').catch(() => ({ data: { data: { items: [] } } })),
      ]);

      setUsers(usersRes.data?.data?.items || []);
      setRoles(rolesRes.data?.data || []);
      setEmployees(empRes.data?.data?.items || empRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.roleId) {
      toast.error('Please fill in email, password, and select a role');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/users', formData);
      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      setFormData({ email: '', password: '', roleId: '', employeeId: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      await api.put(`/users/${userId}/role`, { roleId: newRoleId });
      toast.success('User role updated');
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          const roleObj = roles.find(r => r.id === newRoleId);
          return { ...u, roleId: newRoleId, role: roleObj || u.role };
        }
        return u;
      }));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update role');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setActionLoading(true);
    try {
      await api.put(`/users/${selectedUser.id}/password`, { newPassword });
      toast.success(`Password reset for ${selectedUser.email}`);
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted');
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  // Metrics
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role?.name === 'SUPER_ADMIN').length;
  const hrCount = users.filter(u => u.role?.name === 'HR_MANAGER').length;
  const payrollCount = users.filter(u => u.role?.name === 'PAYROLL_MANAGER' || u.role?.name === 'PAYROLL_USER').length;
  const employeeCount = users.filter(u => u.role?.name === 'EMPLOYEE').length;

  const getRoleBadgeStyle = (roleName) => {
    switch (roleName) {
      case 'SUPER_ADMIN':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Admin' };
      case 'HR_MANAGER':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'HR Manager' };
      case 'PAYROLL_MANAGER':
        return { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', label: 'HR Payroll Manager' };
      case 'PAYROLL_USER':
        return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: 'HR Payroll User' };
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', label: 'Employee' };
    }
  };

  const columns = [
    {
      header: 'User Account',
      accessor: 'email',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {val ? val[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              ID: {row.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      accessor: 'role',
      render: (val, row) => {
        const badge = getRoleBadgeStyle(val?.name);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontSize: '0.74rem',
              fontWeight: 700,
              backgroundColor: badge.bg,
              color: badge.text,
              border: `1px solid ${badge.border}`
            }}>
              {badge.label}
            </span>
            <select
              value={row.roleId}
              onChange={(e) => handleRoleChange(row.id, e.target.value)}
              style={{
                fontSize: '0.75rem',
                padding: '3px 6px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
              title="Quick re-assign role"
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        );
      },
    },
    {
      header: 'Linked Employee',
      accessor: 'employee',
      render: (val) => val ? (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {val.firstName} {val.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {val.employeeCode} {val.department?.name ? `• ${val.department.name}` : ''}
          </div>
        </div>
      ) : (
        <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>
          Unlinked Account
        </span>
      ),
    },
    {
      header: 'Created On',
      accessor: 'createdAt',
      render: (val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => {
              setSelectedUser(row);
              setIsPasswordModalOpen(true);
            }}
            className="btn btn-secondary btn-sm"
            style={{ padding: '5px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Reset Password"
          >
            <Key size={13} /> Reset
          </button>
          <button
            onClick={() => handleDeleteUser(row)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '5px 8px', fontSize: '0.75rem', color: '#e11d48', borderColor: '#fecdd3' }}
            title="Delete User"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            User & Role Administration
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
            Full platform authority: Manage credentials, assign RBAC permissions, and oversee platform access.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserPlus size={16} /> Add New User
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Total User Accounts"
          value={totalUsers}
          icon={Users}
          color="#4f46e5"
          bg="#eef2ff"
        />
        <StatCard
          title="Platform Admins"
          value={adminCount}
          icon={ShieldCheck}
          color="#dc2626"
          bg="#fef2f2"
        />
        <StatCard
          title="HR Managers"
          value={hrCount}
          icon={UserCheck}
          color="#2563eb"
          bg="#eff6ff"
        />
        <StatCard
          title="Payroll Officers"
          value={payrollCount}
          icon={Key}
          color="#9333ea"
          bg="#faf5ff"
        />
      </div>

      {/* Role Hierarchy Reference Card */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
          Role Permission Architecture Reference:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '0.78rem', color: '#475569' }}>
          <div><strong>👑 Admin:</strong> Full access to all platform models, user & role administration.</div>
          <div><strong>💼 HR Manager:</strong> Full CRUD on Employees, Attendance, Contracts, Schedules & Leave. No payroll access.</div>
          <div><strong>📊 HR Payroll User:</strong> All HR Manager permissions + Payruns/Payslips CRU + Salary Read-Only.</div>
          <div><strong>⚡ HR Payroll Manager:</strong> All HR Payroll User permissions + full CRUD on Payruns, Payslips & Salary Rules.</div>
          <div><strong>👤 Employee:</strong> Self-Service portal, own profile, punch clock & leave requests.</div>
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        title="System Users Directory"
        searchable={true}
        searchPlaceholder="Search by email, name, or employee code..."
      />

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="#4f46e5" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Create New User Account
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. employee@peoplepay360.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Assigned Platform Role *
                </label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="">-- Select Role --</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name === 'SUPER_ADMIN' ? 'Admin (SUPER_ADMIN)' :
                       r.name === 'PAYROLL_MANAGER' ? 'HR Payroll Manager' :
                       r.name === 'PAYROLL_USER' ? 'HR Payroll User' :
                       r.name === 'HR_MANAGER' ? 'HR Manager' :
                       r.name === 'EMPLOYEE' ? 'Employee' : r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Link to Existing Employee Profile (Optional)
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="">-- None (Standalone Account) --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isPasswordModalOpen && selectedUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#ea580c" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Reset User Password
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setSelectedUser(null);
                }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Resetting password for: <strong>{selectedUser.email}</strong>
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  {actionLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
