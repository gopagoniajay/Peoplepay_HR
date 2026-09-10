import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/Common/DataTable';
import StatCard from '../../components/Common/StatCard';
import { CalendarCheck, Clock, CheckCircle2, XCircle, Plus, X, Layers, User, Calendar, ShieldCheck, Filter } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function LeavePage() {
  const { user, hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterEmployeeId = searchParams.get('employeeId');
  const filterEmployeeName = searchParams.get('employeeName');
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'allocations' | 'types'
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  const isManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER']);

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    paid: true,
    maxDaysPerYear: 18,
  });

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const [reqRes, typeRes, balRes] = await Promise.allSettled([
        api.get('/leave/requests?pageSize=500'),
        api.get('/leave/types'),
        api.get('/leave/balances?pageSize=500')
      ]);

      if (reqRes.status === 'fulfilled') {
        const reqItems = reqRes.value.data?.data?.items || (Array.isArray(reqRes.value.data?.data) ? reqRes.value.data.data : []);
        setRequests(reqItems);
      }
      if (typeRes.status === 'fulfilled') {
        const typeItems = Array.isArray(typeRes.value.data?.data) ? typeRes.value.data.data : (typeRes.value.data?.data?.items || []);
        setLeaveTypes(typeItems);
        if (typeItems.length > 0 && !formData.leaveTypeId) {
          setFormData(prev => ({ ...prev, leaveTypeId: typeItems[0].id }));
        }
      }
      if (balRes.status === 'fulfilled') {
        const balItems = balRes.value.data?.data?.items || (Array.isArray(balRes.value.data?.data) ? balRes.value.data.data : []);
        setBalances(balItems);
      }
    } catch (err) {
      // Fallback sample data
      setRequests([
        { id: 'lr1', employee: { firstName: 'Aisha', lastName: 'Verma', employeeCode: 'EMP-0001' }, leaveType: { name: 'Paid Annual Leave', paid: true }, startDate: '2026-03-10', endDate: '2026-03-12', totalDays: 3, reason: 'Family event', status: 'PENDING' },
        { id: 'lr2', employee: { firstName: 'Rohan', lastName: 'Sharma', employeeCode: 'EMP-0002' }, leaveType: { name: 'Sick Leave', paid: true }, startDate: '2026-03-02', endDate: '2026-03-03', totalDays: 2, reason: 'Flu recovery', status: 'APPROVED' },
        { id: 'lr3', employee: { firstName: 'Priya', lastName: 'Nair', employeeCode: 'EMP-0003' }, leaveType: { name: 'Unpaid Leave (LOP)', paid: false }, startDate: '2026-03-15', endDate: '2026-03-16', totalDays: 2, reason: 'Personal errands', status: 'APPROVED' },
      ]);
      setLeaveTypes([
        { id: 'lt1', name: 'Paid Annual Leave', code: 'ANNUAL', paid: true, maxDaysPerYear: 20 },
        { id: 'lt2', name: 'Sick Leave', code: 'SICK', paid: true, maxDaysPerYear: 10 },
        { id: 'lt3', name: 'Unpaid Leave (LOP)', code: 'LOP', paid: false, maxDaysPerYear: 30 },
      ]);
      setBalances([
        { id: 'lb1', employee: { firstName: 'Aisha', lastName: 'Verma', employeeCode: 'EMP-0001' }, leaveType: { name: 'Paid Annual Leave' }, allocated: 20, taken: 3, remaining: 17, validFrom: '2026-01-01' },
        { id: 'lb2', employee: { firstName: 'Rohan', lastName: 'Sharma', employeeCode: 'EMP-0002' }, leaveType: { name: 'Sick Leave' }, allocated: 10, taken: 2, remaining: 8, validFrom: '2026-01-01' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave/requests', formData);
      toast.success('Leave request submitted successfully');
      setIsModalOpen(false);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit leave request');
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave/types', {
        ...typeForm,
        code: typeForm.code || typeForm.name.toUpperCase().replace(/\s+/g, '_'),
        maxDaysPerYear: parseInt(typeForm.maxDaysPerYear) || 15
      });
      toast.success('Leave policy type configured successfully');
      setIsTypeModalOpen(false);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create leave policy');
    }
  };

  const handleAction = async (id, action) => {
    try {
      await api.patch(`/leave/requests/${id}/${action}`);
      toast.success(`Leave request ${action}ed`);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || `Failed to ${action} leave`);
    }
  };

  // Feature Filters for Leave Requests
  const leaveFilters = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      options: [
        { label: 'Pending Review', value: 'PENDING' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' },
      ],
      getValue: (row) => row.status || 'PENDING'
    },
    {
      id: 'leaveType',
      label: 'Leave Type',
      options: (leaveTypes || []).map(t => ({ label: t.name, value: t.name })),
      getValue: (row) => row.leaveType?.name
    }
  ], [leaveTypes]);

  // Sort Options for Leave Requests
  const leaveSortOptions = useMemo(() => [
    { label: 'Start Date (Newest)', field: 'startDate' },
    { label: 'Total Days', field: 'totalDays' },
    { label: 'Employee Name', field: 'employee.firstName' },
    { label: 'Status', field: 'status' },
  ], []);

  // Kanban Board for Leave Requests
  const leaveKanbanConfig = useMemo(() => ({
    groupBy: 'status',
    columns: [
      { id: 'PENDING', title: 'Pending Approval', color: '#f59e0b', bg: '#fffbeb' },
      { id: 'APPROVED', title: 'Approved Time Off', color: '#10b981', bg: '#ecfdf5' },
      { id: 'REJECTED', title: 'Rejected Requests', color: '#ef4444', bg: '#fef2f2' },
    ],
    renderCard: (req) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
              {req.employee?.firstName} {req.employee?.lastName}
            </div>
            <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
              {req.employee?.employeeCode || req.employee?.code || 'EMP-XXXX'}
            </span>
          </div>
          <span className={`badge ${req.status === 'APPROVED' ? 'badge-success' : req.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
            ● {req.status}
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div>
            <strong>Type:</strong> <span style={{ fontWeight: 600, color: '#0f172a' }}>{req.leaveType?.name}</span>
            <span style={{ color: req.leaveType?.paid ? '#059669' : '#d97706', marginLeft: '6px' }}>
              ({req.leaveType?.paid ? 'Paid' : 'Unpaid LOP'})
            </span>
          </div>
          <div><strong>Duration:</strong> {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()} ({req.totalDays} days)</div>
          {req.reason && <div style={{ fontStyle: 'italic', color: '#64748b' }}>"{req.reason}"</div>}
        </div>

        {isManager && req.status === 'PENDING' && (
          <div style={{ display: 'flex', gap: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={() => handleAction(req.id, 'approve')}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, padding: '4px', fontSize: '0.72rem', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}
            >
              Approve
            </button>
            <button
              onClick={() => handleAction(req.id, 'reject')}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, padding: '4px', fontSize: '0.72rem', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    )
  }), [isManager]);

  // 1. Requests Columns
  const requestColumns = [
    {
      key: 'employee',
      sortKey: 'employee.firstName',
      label: 'Employee',
      sortable: true,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.employee?.firstName} {row.employee?.lastName}</div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
            {row.employee?.employeeCode || row.employee?.code || 'EMP-XXXX'}
          </span>
        </div>
      )
    },
    {
      key: 'leaveType',
      sortKey: 'leaveType.name',
      label: 'Leave Type',
      sortable: true,
      render: (_, row) => (
        <div>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{row.leaveType?.name}</span>
          <span style={{ display: 'block', fontSize: '0.74rem', color: row.leaveType?.paid ? '#059669' : '#d97706', fontWeight: 500 }}>
            {row.leaveType?.paid ? '● Paid' : '● Unpaid (Loss of Pay)'}
          </span>
        </div>
      )
    },
    {
      key: 'dates',
      label: 'Duration',
      render: (_, row) => (
        <div>
          <div style={{ color: '#334155', fontSize: '0.86rem', fontWeight: 500 }}>
            {new Date(row.startDate).toLocaleDateString()} — {new Date(row.endDate).toLocaleDateString()}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            {row.totalDays} {row.totalDays === 1 ? 'day' : 'days'}
          </span>
        </div>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (val) => <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{val || '—'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        let cls = 'badge-warning';
        if (val === 'APPROVED') cls = 'badge-success';
        if (val === 'REJECTED') cls = 'badge-danger';
        return <span className={`badge ${cls}`}>{val}</span>;
      }
    },
    {
      key: 'actions',
      label: isManager ? 'Approvals' : 'Status',
      render: (_, row) => {
        if (!isManager) {
          return (
            <span className={`badge ${row.status === 'APPROVED' ? 'badge-success' : row.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
              {row.status === 'PENDING' ? 'Awaiting Review' : row.status}
            </span>
          );
        }
        if (row.status !== 'PENDING') {
          return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{row.status}</span>;
        }
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleAction(row.id, 'approve')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CheckCircle2 size={12} /> Approve
            </button>
            <button
              onClick={() => handleAction(row.id, 'reject')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <XCircle size={12} /> Reject
            </button>
          </div>
        );
      }
    }
  ];

  // 2. Allocations Columns
  const allocationColumns = [
    {
      key: 'employee',
      label: 'Employee',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.employee?.firstName} {row.employee?.lastName}</div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
            {row.employee?.employeeCode || 'EMP-XXXX'}
          </span>
        </div>
      )
    },
    {
      key: 'leaveType',
      label: 'Time Off Type',
      render: (_, row) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.leaveType?.name || 'General Leave'}</span>
    },
    {
      key: 'allocated',
      label: 'Allocated Quota',
      render: (val) => <span style={{ fontWeight: 600, color: '#334155' }}>{val || 20} Days</span>
    },
    {
      key: 'taken',
      label: 'Taken / Consumed',
      render: (val) => <span style={{ color: '#e11d48', fontWeight: 600 }}>{val || 0} Days</span>
    },
    {
      key: 'remaining',
      label: 'Available Balance',
      render: (val, row) => (
        <span style={{ color: '#059669', fontWeight: 700 }}>
          {row.remaining !== undefined ? row.remaining : (row.allocated || 20) - (row.taken || 0)} Days
        </span>
      )
    },
    {
      key: 'validity',
      label: 'Validity Period',
      render: (_, row) => (
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          {row.validFrom ? new Date(row.validFrom).toLocaleDateString() : 'Annual'}
        </span>
      )
    }
  ];

  // 3. Types Columns
  const typeColumns = [
    {
      key: 'name',
      label: 'Leave Type Name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1' }}>{row.code}</span>
        </div>
      )
    },
    {
      key: 'paid',
      label: 'Compensation Category',
      render: (val) => (
        <span className={`badge ${val ? 'badge-success' : 'badge-warning'}`}>
          {val ? 'Paid Leave' : 'Unpaid (Affects LOP)'}
        </span>
      )
    },
    {
      key: 'maxDaysPerYear',
      label: 'Annual Allocation Cap',
      render: (val) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{val || 18} Days/Year</span>
    },
    {
      key: 'status',
      label: 'Policy Status',
      render: () => <span className="badge badge-success">✓ Active Policy</span>
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
        background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 50%, #fef3c7 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Time Off & Leave Management
            </h1>
            <span className="badge badge-warning">Entitlements</span>
          </div>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.86rem', marginTop: '4px' }}>
            Manage employee time off allocations, approvals, unpaid deductions (LOP), and policy rules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isManager && (
            <button
              onClick={() => setIsTypeModalOpen(true)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Layers size={15} />
              <span>Configure Policy</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Pending Approvals"
          value={requests.filter(r => r.status === 'PENDING').length}
          description="Awaiting management review"
          color="#d97706"
          icon={Clock}
          badgeText="Action Needed"
        />
        <StatCard
          title="Approved Requests"
          value={requests.filter(r => r.status === 'APPROVED').length}
          description="Consumed in current period"
          color="#059669"
          icon={CheckCircle2}
          badgeText="Approved"
        />
        <StatCard
          title="Leave Types Configured"
          value={leaveTypes.length || 3}
          description="Paid & LOP categories"
          color="#6366f1"
          icon={CalendarCheck}
          badgeText="Policy"
        />
      </div>

      {/* Sub-Tab Navigation (A4) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'requests' ? '1px solid #d97706' : '1px solid transparent',
            backgroundColor: activeTab === 'requests' ? '#fffbeb' : 'transparent',
            color: activeTab === 'requests' ? '#b45309' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Time Off Requests ({requests.length})
        </button>

        <button
          onClick={() => setActiveTab('allocations')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'allocations' ? '1px solid #059669' : '1px solid transparent',
            backgroundColor: activeTab === 'allocations' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'allocations' ? '#047857' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Allocations & Balances ({balances.length})
        </button>

        {isManager && (
          <button
            onClick={() => setActiveTab('types')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'types' ? '1px solid #6366f1' : '1px solid transparent',
              backgroundColor: activeTab === 'types' ? '#eef2ff' : 'transparent',
              color: activeTab === 'types' ? '#4338ca' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            Time Off Policies ({leaveTypes.length})
          </button>
        )}
      </div>

      {/* Main Table for Active Tab */}
      {filterEmployeeId && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          fontSize: '0.85rem',
          color: '#1e40af',
          boxShadow: '0 1px 4px rgba(37,99,235,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="#2563eb" />
            <span>Filtering leave records for staff member: <strong>{filterEmployeeName || 'Selected Employee'}</strong></span>
          </div>
          <button
            onClick={() => setSearchParams({})}
            style={{
              background: '#ffffff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <X size={13} /> Clear Filter
          </button>
        </div>
      )}

      {activeTab === 'requests' && (
        <DataTable
          columns={requestColumns}
          data={requests.filter(r => !filterEmployeeId || r.employeeId === filterEmployeeId || r.employee?.id === filterEmployeeId)}
          loading={loading}
          searchPlaceholder="Search leave requests..."
          filters={leaveFilters}
          sortOptions={leaveSortOptions}
          kanbanConfig={leaveKanbanConfig}
        />
      )}

      {activeTab === 'allocations' && (
        <DataTable
          columns={allocationColumns}
          data={balances.filter(b => !filterEmployeeId || b.employeeId === filterEmployeeId || b.employee?.id === filterEmployeeId)}
          loading={loading}
          searchPlaceholder="Search employee leave allocations..."
        />
      )}

      {activeTab === 'types' && (
        <DataTable
          columns={typeColumns}
          data={leaveTypes}
          loading={loading}
          searchPlaceholder="Search configured leave policies..."
        />
      )}

      {/* Apply Leave Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Apply for Time Off</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Leave Type *</label>
                <select
                  required
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Leave Type...</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.paid ? 'Paid' : 'Unpaid LOP'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Reason</label>
                <textarea
                  rows="3"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="form-input"
                  placeholder="State reason for time off request..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Leave Policy Type Modal (A4) */}
      {isTypeModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Configure Leave Policy</h2>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateType} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Policy Name *</label>
                <input
                  type="text"
                  required
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="form-input"
                  placeholder="e.g. Maternity / Paternity Leave"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Annual Quota (Days)</label>
                  <input
                    type="number"
                    required
                    value={typeForm.maxDaysPerYear}
                    onChange={(e) => setTypeForm({ ...typeForm, maxDaysPerYear: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Compensation</label>
                  <select
                    value={typeForm.paid ? 'true' : 'false'}
                    onChange={(e) => setTypeForm({ ...typeForm, paid: e.target.value === 'true' })}
                    className="form-select"
                  >
                    <option value="true">Paid Leave</option>
                    <option value="false">Unpaid (Loss of Pay)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
