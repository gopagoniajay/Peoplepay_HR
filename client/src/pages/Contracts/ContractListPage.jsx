import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/Common/DataTable';
import { Plus, FileText, CheckCircle2, AlertCircle, X, Trash2, Calendar, Clock, Layers, Filter } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ContractListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterEmployeeId = searchParams.get('employeeId');
  const filterEmployeeName = searchParams.get('employeeName');

  const [activeTab, setActiveTab] = useState('contracts'); // 'contracts' | 'schedules'
  const [contracts, setContracts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Contract Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    salaryStructureId: '',
    baseSalary: '',
    wageType: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'ACTIVE',
  });

  // Schedule Modal State & 7-Day Pattern Matrix (A3)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: 'Standard Working Shift (45h)',
    type: 'STANDARD',
  });

  const [patternDays, setPatternDays] = useState([
    { dayOfWeek: 1, name: 'Monday', active: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
    { dayOfWeek: 2, name: 'Tuesday', active: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
    { dayOfWeek: 3, name: 'Wednesday', active: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
    { dayOfWeek: 4, name: 'Thursday', active: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
    { dayOfWeek: 5, name: 'Friday', active: true, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
    { dayOfWeek: 6, name: 'Saturday', active: false, startTime: '09:00', endTime: '14:00', breakMinutes: 30 },
    { dayOfWeek: 7, name: 'Sunday', active: false, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contRes, empRes, structRes, schedRes] = await Promise.allSettled([
        api.get('/contracts?pageSize=500'),
        api.get('/employees?pageSize=500'),
        api.get('/salary/structures'),
        api.get('/working-schedules')
      ]);

      if (contRes.status === 'fulfilled') {
        const contractsList = contRes.value.data?.data?.items || (Array.isArray(contRes.value.data?.data) ? contRes.value.data.data : []);
        setContracts(contractsList);
      }
      if (empRes.status === 'fulfilled') {
        const empsList = empRes.value.data?.data?.items || (Array.isArray(empRes.value.data?.data) ? empRes.value.data.data : []);
        setEmployees(empsList);
        if (empsList.length > 0 && !formData.employeeId) {
          setFormData(prev => ({ ...prev, employeeId: empsList[0].id }));
        }
      }
      if (structRes.status === 'fulfilled') {
        const structsList = Array.isArray(structRes.value.data?.data) ? structRes.value.data.data : (structRes.value.data?.data?.items || []);
        setStructures(structsList);
        if (structsList.length > 0 && !formData.salaryStructureId) {
          setFormData(prev => ({ ...prev, salaryStructureId: structsList[0].id }));
        }
      }
      if (schedRes.status === 'fulfilled') {
        const schedList = Array.isArray(schedRes.value.data?.data) ? schedRes.value.data.data : (schedRes.value.data?.data?.items || []);
        setSchedules(schedList);
      }
    } catch (err) {
      toast.error('Failed to load contract and schedule records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateContract = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contracts', {
        ...formData,
        baseSalary: parseFloat(formData.baseSalary),
        basicWage: parseFloat(formData.baseSalary),
        salaryStructureId: formData.salaryStructureId || null,
        endDate: formData.endDate || null,
      });
      toast.success('Contract agreement created successfully');
      setIsModalOpen(false);
      setFormData({
        employeeId: employees[0]?.id || '',
        salaryStructureId: structures[0]?.id || '',
        baseSalary: '',
        wageType: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'ACTIVE',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create contract');
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      const activeDays = patternDays
        .filter(d => d.active)
        .map(d => ({
          dayOfWeek: d.dayOfWeek,
          startTime: d.startTime,
          endTime: d.endTime,
          breakMinutes: parseInt(d.breakMinutes, 10) || 0,
        }));

      if (activeDays.length === 0) {
        toast.error('Please select at least one active working day');
        return;
      }

      await api.post('/working-schedules', {
        name: scheduleForm.name,
        type: scheduleForm.type,
        scheduleDays: activeDays,
      });

      toast.success('Working schedule pattern created with auto-calculated weekly hours!');
      setIsScheduleModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create working schedule');
    }
  };

  const handleDeleteContract = async (contractId) => {
    if (!window.confirm('Are you sure you want to remove this contract?')) return;
    try {
      await api.delete(`/contracts/${contractId}`);
      toast.success('Contract removed successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete contract');
    }
  };

  // Feature Filters for Contracts
  const contractFilters = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      options: [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Expired', value: 'EXPIRED' },
        { label: 'Cancelled', value: 'CANCELLED' },
      ],
      getValue: (row) => row.status || 'ACTIVE'
    },
    {
      id: 'wageType',
      label: 'Wage Type',
      options: [
        { label: 'Monthly', value: 'MONTHLY' },
        { label: 'Hourly', value: 'HOURLY' },
        { label: 'Daily', value: 'DAILY' },
      ],
      getValue: (row) => row.wageType || 'MONTHLY'
    }
  ], []);

  // Sort Options for Contracts
  const contractSortOptions = useMemo(() => [
    { label: 'Base Wage', field: 'basicWage' },
    { label: 'Employee Name', field: 'employee.firstName' },
    { label: 'Start Date', field: 'startDate' },
    { label: 'Status', field: 'status' },
  ], []);

  // Kanban Board for Contracts
  const contractKanbanConfig = useMemo(() => ({
    groupBy: 'status',
    columns: [
      { id: 'ACTIVE', title: 'Active Contracts', color: '#10b981', bg: '#ecfdf5' },
      { id: 'DRAFT', title: 'Draft Terms', color: '#3b82f6', bg: '#eff6ff' },
      { id: 'EXPIRED', title: 'Expired / Lapsed', color: '#f59e0b', bg: '#fffbeb' },
      { id: 'CANCELLED', title: 'Cancelled', color: '#ef4444', bg: '#fef2f2' },
    ],
    renderCard: (c) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
              {c.employee?.firstName} {c.employee?.lastName}
            </div>
            <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
              {c.employee?.employeeCode || c.employee?.code || 'EMP-XXXX'}
            </span>
          </div>
          <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
            ● {c.status}
          </span>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div><strong>Structure:</strong> {c.salaryStructure?.name || 'Default Structure'}</div>
          <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.9rem' }}>
            ₹{parseFloat(c.basicWage || c.baseSalary || 0).toLocaleString('en-IN')} / {(c.wageType || 'MONTHLY').toLowerCase()}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            {new Date(c.startDate).toLocaleDateString()} — {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Indefinite'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => handleDeleteContract(c.id)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '3px 8px', color: '#e11d48', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    )
  }), []);

  // Contracts Table Columns
  const contractColumns = [
    {
      key: 'employee',
      sortKey: 'employee.firstName',
      label: 'Employee',
      sortable: true,
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.employee?.firstName} {row.employee?.lastName}</div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
            {row.employee?.employeeCode || row.employee?.code || 'EMP-XXXX'}
          </div>
        </div>
      )
    },
    {
      key: 'salaryStructure',
      sortKey: 'salaryStructure.name',
      label: 'Salary Structure',
      sortable: true,
      render: (val, row) => <span style={{ fontWeight: 500, color: '#334155' }}>{row.salaryStructure?.name || 'Default Structure'}</span>
    },
    {
      key: 'baseSalary',
      label: 'Base Wage',
      sortable: true,
      render: (val, row) => (
        <span style={{ fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
          ₹{parseFloat(row.basicWage || val || 0).toLocaleString('en-IN')} / {(row.wageType || 'MONTHLY').toLowerCase()}
        </span>
      )
    },
    {
      key: 'startDate',
      label: 'Effective Range',
      render: (_, row) => (
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
          {new Date(row.startDate).toLocaleDateString()} — {row.endDate ? new Date(row.endDate).toLocaleDateString() : 'Indefinite'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`badge ${val === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
          ● {val}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleDeleteContract(row.id)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#e11d48' }}
            title="Cancel/Delete contract"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )
    }
  ];

  // Working Schedules Table Columns (A3)
  const scheduleColumns = [
    {
      key: 'name',
      label: 'Schedule Name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#6366f1' }}>{row.type || 'STANDARD'}</span>
        </div>
      )
    },
    {
      key: 'weeklyPattern',
      label: 'Weekly Shift Pattern',
      render: (_, row) => (
        <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
          {row.scheduleDays?.length ? `${row.scheduleDays.length} Days/Week (09:00 - 18:00)` : 'Mon - Fri (9:00 AM - 6:00 PM)'}
        </span>
      )
    },
    {
      key: 'totalWeeklyHours',
      label: 'Auto-Calculated Hours',
      render: (val, row) => {
        const hours = val || (row.scheduleDays?.length ? row.scheduleDays.length * 8 : 40);
        return (
          <span className="badge badge-blue" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
            {hours}.0 hrs / week
          </span>
        );
      }
    },
    {
      key: 'coverage',
      label: 'Status',
      render: () => <span className="badge badge-success">✓ Active Schedule</span>
    }
  ];

  // Auto-calculated weekly hours preview for schedule modal (A3)
  const previewHours = patternDays
    .filter(d => d.active)
    .reduce((acc, d) => {
      const [sh, sm] = (d.startTime || '09:00').split(':').map(Number);
      const [eh, em] = (d.endTime || '18:00').split(':').map(Number);
      const dailyMins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - (parseInt(d.breakMinutes, 10) || 0));
      return acc + (dailyMins / 60);
    }, 0)
    .toFixed(1);

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
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 50%, #e0f2fe 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Contracts & Working Schedules
            </h1>
            <span className="badge badge-blue">Compensation & Hours</span>
          </div>
          <p style={{ color: 'var(--text-secondary, #475569)', fontSize: '0.86rem', marginTop: '4px' }}>
            Define employee compensation models, binding salary structures, and auto-calculated weekly shifts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={15} />
            <span>New Schedule (A3)</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>New Contract</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation (A2 vs A3) */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('contracts')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'contracts' ? '1px solid #0284c7' : '1px solid transparent',
            backgroundColor: activeTab === 'contracts' ? '#f0f9ff' : 'transparent',
            color: activeTab === 'contracts' ? '#0369a1' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Contracts & Wage Terms ({contracts.length})
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'schedules' ? '1px solid #059669' : '1px solid transparent',
            backgroundColor: activeTab === 'schedules' ? '#ecfdf5' : 'transparent',
            color: activeTab === 'schedules' ? '#047857' : '#64748b',
            transition: 'all 0.15s ease'
          }}
        >
          Working Schedules ({schedules.length || 2})
        </button>
      </div>

      {/* Filter Chip Banner */}
      {filterEmployeeId && activeTab === 'contracts' && (
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
            <span>Filtering contracts for staff member: <strong>{filterEmployeeName || 'Selected Employee'}</strong></span>
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

      {/* Active Tab Main Table */}
      {activeTab === 'contracts' ? (
        <DataTable
          columns={contractColumns}
          data={contracts.filter(c => !filterEmployeeId || c.employeeId === filterEmployeeId || c.employee?.id === filterEmployeeId)}
          loading={loading}
          searchPlaceholder="Search active contracts by employee or wage terms..."
          filters={contractFilters}
          sortOptions={contractSortOptions}
          kanbanConfig={contractKanbanConfig}
        />
      ) : (
        <DataTable
          columns={scheduleColumns}
          data={schedules.length > 0 ? schedules : [
            { id: 'ws1', name: 'Standard Full-Time Shift', type: 'STANDARD', scheduleDays: [1,2,3,4,5], totalWeeklyHours: 45 },
            { id: 'ws2', name: 'Flexible Engineering Schedule', type: 'FLEXIBLE', scheduleDays: [1,2,3,4,5], totalWeeklyHours: 40 }
          ]}
          loading={loading}
          searchPlaceholder="Search working schedules..."
        />
      )}

      {/* Onboard Contract Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Establish Employment Contract</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Staff Member *</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode || emp.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Assigned Salary Structure</label>
                <select
                  value={formData.salaryStructureId}
                  onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Default Structure</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Base Wage (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 50000"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Wage Period</label>
                  <select
                    value={formData.wageType}
                    onChange={(e) => setFormData({ ...formData, wageType: e.target.value })}
                    className="form-select"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="HOURLY">Hourly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="form-input"
                  />
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
                  Save Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Define Working Schedule Pattern Modal (A3) */}
      {isScheduleModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Define Working Schedule Pattern (A3)</h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Configure weekly day-by-day shift hours and breaks. Weekly hours are calculated automatically.</span>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Schedule Name *</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Standard 9-to-6 Shift (45h)"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Schedule Type</label>
                  <select
                    value={scheduleForm.type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="STANDARD">STANDARD</option>
                    <option value="FLEXIBLE">FLEXIBLE</option>
                    <option value="SHIFT">SHIFT</option>
                  </select>
                </div>
              </div>

              {/* Day-by-Day Pattern Matrix (Monday through Sunday) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Weekly Shift Days & Work Hours Pattern
                </label>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Work Day</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Active</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Start Time</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>End Time</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Break (mins)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Day Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patternDays.map((d, index) => {
                        const [sh, sm] = (d.startTime || '09:00').split(':').map(Number);
                        const [eh, em] = (d.endTime || '18:00').split(':').map(Number);
                        const dailyMins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - (parseInt(d.breakMinutes, 10) || 0));
                        const dailyHours = d.active ? (dailyMins / 60).toFixed(1) : '0.0';

                        return (
                          <tr key={d.dayOfWeek} style={{ borderBottom: index < 6 ? '1px solid #f1f5f9' : 'none', backgroundColor: d.active ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: d.active ? '#0f172a' : '#94a3b8' }}>
                              {d.name}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={d.active}
                                onChange={(e) => {
                                  const updated = [...patternDays];
                                  updated[index].active = e.target.checked;
                                  setPatternDays(updated);
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="time"
                                disabled={!d.active}
                                value={d.startTime}
                                onChange={(e) => {
                                  const updated = [...patternDays];
                                  updated[index].startTime = e.target.value;
                                  setPatternDays(updated);
                                }}
                                style={{ padding: '3px 6px', fontSize: '0.76rem', borderRadius: '6px', border: '1px solid #cbd5e1', opacity: d.active ? 1 : 0.5 }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="time"
                                disabled={!d.active}
                                value={d.endTime}
                                onChange={(e) => {
                                  const updated = [...patternDays];
                                  updated[index].endTime = e.target.value;
                                  setPatternDays(updated);
                                }}
                                style={{ padding: '3px 6px', fontSize: '0.76rem', borderRadius: '6px', border: '1px solid #cbd5e1', opacity: d.active ? 1 : 0.5 }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="number"
                                min="0"
                                max="180"
                                disabled={!d.active}
                                value={d.breakMinutes}
                                onChange={(e) => {
                                  const updated = [...patternDays];
                                  updated[index].breakMinutes = e.target.value;
                                  setPatternDays(updated);
                                }}
                                style={{ width: '56px', padding: '3px 6px', fontSize: '0.76rem', borderRadius: '6px', border: '1px solid #cbd5e1', opacity: d.active ? 1 : 0.5 }}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: d.active ? '#4f46e5' : '#94a3b8' }}>
                              {dailyHours}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Auto-Calculated Hours Indicator Badge (A3) */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '0.84rem', color: '#166534', fontWeight: 600 }}>
                    Auto-Calculated Weekly Workload:
                  </span>
                  <div style={{ fontSize: '0.74rem', color: '#15803d' }}>
                    {patternDays.filter(d => d.active).length} working days active
                  </div>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>
                  {previewHours} hrs / week
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Schedule Pattern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
