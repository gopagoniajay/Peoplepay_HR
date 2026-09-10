import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import DataTable from '../../components/Common/DataTable';
import {
  Plus, User, Mail, Building, Briefcase, Eye, CheckCircle2, X, Search, Filter, Phone, Calendar,
  Edit2, Trash2, LayoutGrid, List, FileText, Clock, CalendarCheck, Receipt, ArrowUpRight
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// Curated avatar gradient palette for realistic human feel
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #f59e0b, #b45309)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #06b6d4, #0e7490)',
  'linear-gradient(135deg, #6366f1, #4338ca)',
];

function getAvatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  if (user?.role === 'EMPLOYEE') {
    return <Navigate to="/portal" replace />;
  }
  const canManage = hasRole(['SUPER_ADMIN', 'HR_MANAGER']);
  const canDelete = hasRole(['SUPER_ADMIN']);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Edit employee state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    departmentId: '',
    jobPositionId: '',
    managerId: '',
    workingScheduleId: '',
    employmentStatus: 'ACTIVE',
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departmentId: '',
    jobPositionId: '',
    managerId: '',
    workingScheduleId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/employees?pageSize=500');
      const items = data.data?.items || (Array.isArray(data.data) ? data.data : (data.data?.data || []));
      setEmployees(items);
    } catch (err) {
      toast.error('Failed to load employees from server');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [deptRes, posRes, schedRes] = await Promise.allSettled([
        api.get('/departments'),
        api.get('/job-positions'),
        api.get('/working-schedules')
      ]);
      const depts = deptRes.status === 'fulfilled' ? (Array.isArray(deptRes.value.data.data) ? deptRes.value.data.data : (deptRes.value.data.data?.items || [])) : [];
      const poses = posRes.status === 'fulfilled' ? (Array.isArray(posRes.value.data.data) ? posRes.value.data.data : (posRes.value.data.data?.items || [])) : [];
      const scheds = schedRes.status === 'fulfilled' ? (Array.isArray(schedRes.value.data.data) ? schedRes.value.data.data : (schedRes.value.data.data?.items || [])) : [];
      setDepartments(depts);
      setPositions(poses);
      setSchedules(scheds);
    } catch (e) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchMeta();
  }, []);

  const handleInspect = async (emp) => {
    setSelectedEmployee(emp);
    setIsDetailOpen(true);
    try {
      const { data } = await api.get(`/employees/${emp.id}`);
      if (data.data) {
        setSelectedEmployee(data.data);
      }
    } catch (e) {
      // Keep existing
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        phone: formData.phone || null,
        departmentId: formData.departmentId || null,
        jobPositionId: formData.jobPositionId || null,
        managerId: formData.managerId || null,
        workingScheduleId: formData.workingScheduleId || null,
      };
      await api.post('/employees', payload);
      toast.success('Employee onboarded successfully');
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        departmentId: '',
        jobPositionId: '',
        managerId: '',
        workingScheduleId: '',
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
      });
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create employee');
    }
  };

  const handleEditClick = (emp) => {
    setEditingEmployee(emp);
    setEditFormData({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      phone: emp.phone || '',
      departmentId: emp.departmentId || emp.department?.id || '',
      jobPositionId: emp.jobPositionId || emp.jobPosition?.id || '',
      managerId: emp.managerId || emp.manager?.id || '',
      workingScheduleId: emp.workingScheduleId || emp.workingSchedule?.id || '',
      employmentStatus: emp.employmentStatus || emp.status || 'ACTIVE',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        phone: editFormData.phone || null,
        departmentId: editFormData.departmentId || null,
        jobPositionId: editFormData.jobPositionId || null,
        managerId: editFormData.managerId || null,
        workingScheduleId: editFormData.workingScheduleId || null,
        employmentStatus: editFormData.employmentStatus,
      };
      await api.put(`/employees/${editingEmployee.id}`, payload);
      toast.success('Employee updated successfully');
      setIsEditModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (emp) => {
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode;
    if (!window.confirm(`Are you sure you want to terminate employee ${fullName}?`)) {
      return;
    }
    try {
      await api.delete(`/employees/${emp.id}`);
      toast.success(`Employee ${fullName} terminated successfully`);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to terminate employee');
    }
  };

  const handleQuickChangeDepartment = async (empId, newDeptId) => {
    try {
      await api.put(`/employees/${empId}`, { departmentId: newDeptId || null });
      toast.success('Department updated successfully');
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update department');
    }
  };

  const handleOpenOnboardWithDept = (deptId) => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      departmentId: deptId || '',
      jobPositionId: '',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Dynamically derive all active departments from backend + employee records
  const allDepartmentNames = useMemo(() => {
    const set = new Set();
    departments.forEach(d => { if (d.name) set.add(d.name); });
    employees.forEach(e => {
      if (e.department?.name) set.add(e.department.name);
    });
    if (set.size === 0) {
      ['Engineering', 'Sales', 'HR & Admin'].forEach(d => set.add(d));
    }
    const list = Array.from(set);
    if (employees.some(e => !e.department || !e.department?.name)) {
      list.push('Unassigned');
    }
    return list;
  }, [departments, employees]);

  // Feature-based Filters for Employee Directory
  const employeeFilters = useMemo(() => [
    {
      id: 'department',
      label: 'Department',
      options: allDepartmentNames.map(d => ({ label: d, value: d })),
      getValue: (row) => row.department?.name || 'Unassigned',
      match: (rowVal, selectedVal) => {
        if (selectedVal === 'ALL') return true;
        if (selectedVal === 'Unassigned') return !rowVal || rowVal === 'Unassigned';
        return String(rowVal || '').toLowerCase() === String(selectedVal).toLowerCase();
      }
    },
    {
      id: 'employmentStatus',
      label: 'Status',
      options: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'On Leave', value: 'ON_LEAVE' },
        { label: 'Suspended', value: 'SUSPENDED' },
        { label: 'Terminated', value: 'TERMINATED' },
      ],
      getValue: (row) => row.employmentStatus || row.status || 'ACTIVE'
    },
    {
      id: 'employmentType',
      label: 'Type',
      options: [
        { label: 'Full Time', value: 'FULL_TIME' },
        { label: 'Part Time', value: 'PART_TIME' },
        { label: 'Contract', value: 'CONTRACT' },
        { label: 'Intern', value: 'INTERN' },
      ],
      getValue: (row) => row.employmentType || 'FULL_TIME'
    }
  ], [allDepartmentNames]);

  // Feature-based Sort Options
  const employeeSortOptions = useMemo(() => [
    { label: 'First Name (A-Z)', field: 'firstName' },
    { label: 'Last Name', field: 'lastName' },
    { label: 'Staff Code', field: 'employeeCode' },
    { label: 'Department', field: 'department.name' },
    { label: 'Designation', field: 'jobPosition.title' },
    { label: 'Joining Date', field: 'joiningDate' },
  ], []);

  // Kanban Board Configuration
  const employeeKanbanConfig = useMemo(() => ({
    groupBy: (row) => row.department?.name || 'Unassigned',
    columns: allDepartmentNames.map((deptName) => ({
      id: deptName,
      title: deptName,
      color: deptName.includes('Engineering') ? '#3b82f6' : deptName.includes('Sales') ? '#10b981' : deptName.includes('HR') ? '#8b5cf6' : '#64748b',
      bg: deptName.includes('Engineering') ? '#eff6ff' : deptName.includes('Sales') ? '#f0fdf4' : deptName.includes('HR') ? '#f5f3ff' : '#f8fafc',
      match: (val, item) => {
        if (deptName === 'Unassigned') return !item.department || !item.department?.name;
        return item.department?.name === deptName;
      }
    })),
    renderCard: (emp) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: getAvatarGradient(emp.firstName),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.88rem',
            flexShrink: 0
          }}>
            {emp.firstName?.[0]}{emp.lastName?.[0]}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {emp.firstName} {emp.lastName}
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#6366f1', fontWeight: 600 }}>
              {emp.employeeCode || emp.code}
            </span>
          </div>
          <span className={`badge ${emp.employmentStatus === 'ON_LEAVE' ? 'badge-warning' : emp.employmentStatus === 'TERMINATED' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
            ● {emp.employmentStatus || emp.status || 'ACTIVE'}
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase size={13} color="#94a3b8" />
            <span>{emp.jobPosition?.title || 'Staff Member'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={13} color="#94a3b8" />
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{emp.email}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <Building size={13} color="#94a3b8" />
            <select
              value={emp.departmentId || emp.department?.id || ''}
              onChange={(e) => handleQuickChangeDepartment(emp.id, e.target.value)}
              style={{
                fontSize: '0.74rem',
                padding: '3px 6px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                fontWeight: 500,
                cursor: 'pointer',
                width: '100%'
              }}
              title="Reassign Department"
            >
              <option value="">(Unassigned)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => handleInspect(emp)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Inspect profile"
          >
            <Eye size={12} /> View
          </button>
          {canManage && (
            <button
              onClick={() => handleEditClick(emp)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#4f46e5' }}
              title="Edit employee details"
            >
              <Edit2 size={12} /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteEmployee(emp)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#e11d48' }}
              title="Terminate employee"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      </div>
    )
  }), [allDepartmentNames, departments, canManage, canDelete]);

  const columns = [
    {
      key: 'name',
      label: 'Employee Name & Email',
      sortable: true,
      render: (_, row) => {
        const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim();
        const initials = `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: getAvatarGradient(fullName),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}>
              {initials || 'EM'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                {fullName}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                {row.email}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'employeeCode',
      label: 'Staff ID',
      sortable: true,
      render: (val, row) => (
        <span style={{
          fontFamily: 'monospace',
          color: '#6366f1',
          fontSize: '0.8rem',
          fontWeight: 700,
          backgroundColor: '#eef2ff',
          border: '1px solid #c7d2fe',
          padding: '2px 8px',
          borderRadius: '5px'
        }}>
          {val || row.code || 'EMP-XXXX'}
        </span>
      )
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (val, row) => {
        const deptName = row.department?.name || 'General';
        let badgeClass = 'badge-blue';
        if (deptName.includes('Sales')) badgeClass = 'badge-success';
        if (deptName.includes('HR')) badgeClass = 'badge-purple';
        return <span className={`badge ${badgeClass}`}>{deptName}</span>;
      }
    },
    {
      key: 'jobPosition',
      label: 'Designation',
      sortable: true,
      render: (val, row) => row.jobPosition?.title || 'Staff Member'
    },
    {
      key: 'employmentStatus',
      label: 'Status',
      sortable: true,
      render: (val, row) => {
        const status = val || row.status || 'ACTIVE';
        let badgeCls = 'badge-success';
        if (status === 'ON_LEAVE') badgeCls = 'badge-warning';
        if (status === 'TERMINATED' || status === 'SUSPENDED') badgeCls = 'badge-danger';
        return (
          <span className={`badge ${badgeCls}`}>
            ● {status}
          </span>
        );
      }
    },
    {
      key: 'joiningDate',
      label: 'Start Date',
      sortable: true,
      render: (val) => (
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
          {val ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleInspect(row)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Inspect profile"
          >
            <Eye size={13} /> View
          </button>
          {canManage && (
            <button
              onClick={() => handleEditClick(row)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4f46e5' }}
              title="Edit employee details"
            >
              <Edit2 size={13} /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteEmployee(row)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#e11d48' }}
              title="Terminate employee"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '22px 26px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 50%, #eff6ff 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Employee Directory
            </h1>
            <span className="badge badge-purple">{employees.length} Staff Enrolled</span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.88rem', marginTop: '4px' }}>
            Manage staff profiles, departmental allocations, and work engagements in MySQL.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Onboard Employee</span>
          </button>
        )}
      </div>

      {/* Universal List and Kanban View with Feature Filters & Multi-Field Sorting */}
      <DataTable
        columns={columns}
        data={employees}
        loading={loading}
        searchPlaceholder="Search employees by name, email, or staff code..."
        filters={employeeFilters}
        sortOptions={employeeSortOptions}
        kanbanConfig={employeeKanbanConfig}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Onboard Employee Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '560px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Onboard New Employee</h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Saves employee to MySQL and initializes user portal access</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Liam"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Vance"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                    placeholder="name@peoplepay360.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Phone Contact</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91-9876543210"
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Job Position</label>
                  <select
                    value={formData.jobPositionId}
                    onChange={(e) => setFormData({ ...formData, jobPositionId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Position...</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Reporting Manager</label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">No Manager (Direct / None)</option>
                    {employees.slice(0, 100).map((e) => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode || e.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Working Schedule</label>
                  <select
                    value={formData.workingScheduleId}
                    onChange={(e) => setFormData({ ...formData, workingScheduleId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Standard Schedule</option>
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.totalWeeklyHours || 40}h/wk)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Confirm Onboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Edit Employee</h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{editingEmployee?.employeeCode} &bull; {editingEmployee?.email}</span>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Phone Contact</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="+91-9876543210"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Department</label>
                  <select
                    value={editFormData.departmentId}
                    onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Job Position</label>
                  <select
                    value={editFormData.jobPositionId}
                    onChange={(e) => setEditFormData({ ...editFormData, jobPositionId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select Position...</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Reporting Manager</label>
                  <select
                    value={editFormData.managerId}
                    onChange={(e) => setEditFormData({ ...editFormData, managerId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">No Manager (Direct / None)</option>
                    {employees.filter(e => e.id !== editingEmployee?.id).slice(0, 100).map((e) => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode || e.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Working Schedule</label>
                  <select
                    value={editFormData.workingScheduleId}
                    onChange={(e) => setEditFormData({ ...editFormData, workingScheduleId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Standard Schedule</option>
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.totalWeeklyHours || 40}h/wk)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Employment Status</label>
                <select
                  value={editFormData.employmentStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, employmentStatus: e.target.value })}
                  className="form-select"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Profile Modal */}
      {isDetailOpen && selectedEmployee && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Staff Verification Profile</h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: getAvatarGradient(selectedEmployee.firstName),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
              }}>
                {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h3>
                <span style={{ fontFamily: 'monospace', color: '#6366f1', fontSize: '0.82rem', fontWeight: 600 }}>
                  {selectedEmployee.employeeCode || selectedEmployee.code}
                </span>
              </div>
            </div>

            {/* Smart-Buttons Navigation Bar (A1, B2) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '20px',
              padding: '8px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  const name = `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || selectedEmployee.employeeCode;
                  navigate(`/contracts?employeeId=${selectedEmployee.id}&employeeName=${encodeURIComponent(name)}`);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={15} color="#0284c7" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>Contracts</span>
                <span className="badge badge-blue" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                  {selectedEmployee._count?.contracts ?? 1} Record{(selectedEmployee._count?.contracts === 1) ? '' : 's'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  const name = `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || selectedEmployee.employeeCode;
                  navigate(`/attendance?employeeId=${selectedEmployee.id}&employeeName=${encodeURIComponent(name)}`);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={15} color="#059669" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>Attendance</span>
                <span className="badge badge-success" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                  {selectedEmployee._count?.attendance ?? 0} Punches
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  const name = `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || selectedEmployee.employeeCode;
                  navigate(`/leave?employeeId=${selectedEmployee.id}&employeeName=${encodeURIComponent(name)}`);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <CalendarCheck size={15} color="#d97706" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>Time Off</span>
                <span className="badge badge-warning" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                  {selectedEmployee._count?.leaveRequests ?? 0} Requests
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  const name = `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || selectedEmployee.employeeCode;
                  navigate(`/payslips?employeeId=${selectedEmployee.id}&employeeName=${encodeURIComponent(name)}`);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Receipt size={15} color="#7c3aed" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>Payslips</span>
                <span className="badge badge-purple" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                  {selectedEmployee._count?.payslips ?? 0} Slips
                </span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                <div style={{ color: '#0f172a', marginTop: '3px', wordBreak: 'break-all', fontWeight: 500 }}>{selectedEmployee.email}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                <div style={{ marginTop: '3px' }}>
                  <span className="badge badge-success">● {selectedEmployee.employmentStatus || selectedEmployee.status || 'ACTIVE'}</span>
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</span>
                <div style={{ color: '#0f172a', marginTop: '3px', fontWeight: 500 }}>{selectedEmployee.department?.name || 'Engineering'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Title</span>
                <div style={{ color: '#0f172a', marginTop: '3px', fontWeight: 500 }}>{selectedEmployee.jobPosition?.title || 'Staff'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reporting Manager</span>
                <div style={{ color: '#0f172a', marginTop: '3px', fontWeight: 600 }}>
                  {selectedEmployee.manager ? `${selectedEmployee.manager.firstName} ${selectedEmployee.manager.lastName}` : 'Direct Executive Report'}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working Schedule</span>
                <div style={{ color: '#0f172a', marginTop: '3px', fontWeight: 600 }}>
                  {selectedEmployee.workingSchedule?.name || 'Standard 9-to-6 Shift'}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</span>
                <div style={{ color: '#0f172a', marginTop: '3px', fontWeight: 500 }}>
                  {selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="btn btn-secondary"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
