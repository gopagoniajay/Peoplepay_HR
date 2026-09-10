import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../../components/Common/DataTable';
import { Clock, Calendar, CheckCircle2, AlertTriangle, Plus, X, LogIn, LogOut, Filter } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function AttendancePage() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole(['SUPER_ADMIN', 'HR_MANAGER']);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterEmployeeId = searchParams.get('employeeId');
  const filterEmployeeName = searchParams.get('employeeName');

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [todayPunch, setTodayPunch] = useState(null);
  const [punchLoading, setPunchLoading] = useState(false);

  const [correctionData, setCorrectionData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '17:30',
    remarks: 'Manual biometric adjustment'
  });

  const fetchTodayPunch = async () => {
    try {
      const { data } = await api.get('/attendance/my-today');
      setTodayPunch(data.data);
    } catch (e) {
      // Optional if not punched today
    }
  };

  const handlePunch = async (action) => {
    setPunchLoading(true);
    try {
      await api.post(`/attendance/${action}`);
      toast.success(action === 'check-in' ? 'Clocked in successfully!' : 'Clocked out successfully!');
      fetchTodayPunch();
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Action failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance?pageSize=500');
      const raw = data.data?.items || (Array.isArray(data.data) ? data.data : []);
      const mapped = raw.map(item => {
        let hrs = item.workedHours ?? item.totalHours;
        if ((hrs === null || hrs === undefined) && item.checkIn && item.checkOut) {
          const diffMs = new Date(item.checkOut) - new Date(item.checkIn);
          if (diffMs > 0) {
            hrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
          }
        }
        return {
          ...item,
          workedHours: hrs !== null && hrs !== undefined ? Number(hrs) : null,
          totalHours: hrs !== null && hrs !== undefined ? Number(hrs) : null,
          employee: {
            ...item.employee,
            code: item.employee?.employeeCode || item.employee?.code,
            employeeCode: item.employee?.employeeCode || item.employee?.code,
          }
        };
      });
      setLogs(mapped);
    } catch (err) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!isManager) return;
    try {
      const { data } = await api.get('/employees?pageSize=500');
      setEmployees(data.data?.items || (Array.isArray(data.data) ? data.data : []));
    } catch (e) {}
  };

  useEffect(() => {
    fetchAttendance();
    fetchTodayPunch();
    if (isManager) fetchEmployees();
  }, [isManager]);

  const handleManualAdjustment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/attendance/manual-entry', correctionData);
      toast.success('Attendance record recorded successfully');
      setIsModalOpen(false);
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to record attendance');
    }
  };

  // Feature Filters for Attendance
  const attendanceFilters = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      options: [
        { label: 'Present', value: 'PRESENT' },
        { label: 'Late', value: 'LATE' },
        { label: 'Half Day', value: 'HALF_DAY' },
        { label: 'Absent', value: 'ABSENT' },
      ],
      getValue: (row) => row.status || 'PRESENT'
    }
  ], []);

  // Sort Options for Attendance
  const attendanceSortOptions = useMemo(() => [
    { label: 'Date (Newest)', field: 'date' },
    { label: 'Hours Worked', field: 'workedHours' },
    { label: 'Employee Name', field: 'employee.firstName' },
    { label: 'Status', field: 'status' },
  ], []);

  // Kanban View for Attendance
  const attendanceKanbanConfig = useMemo(() => ({
    groupBy: 'status',
    columns: [
      { id: 'PRESENT', title: 'On Time / Present', color: '#10b981', bg: '#ecfdf5' },
      { id: 'LATE', title: 'Late Arrivals', color: '#f59e0b', bg: '#fffbeb' },
      { id: 'HALF_DAY', title: 'Half Day Logged', color: '#6366f1', bg: '#eff6ff' },
      { id: 'ABSENT', title: 'Marked Absent', color: '#ef4444', bg: '#fef2f2' },
    ],
    renderCard: (att) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
              {att.employee?.firstName} {att.employee?.lastName}
            </div>
            <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#6366f1', fontWeight: 600 }}>
              {att.employee?.employeeCode || att.employee?.code || 'EMP-XXXX'}
            </span>
          </div>
          <span className={`badge ${att.status === 'PRESENT' ? 'badge-success' : att.status === 'LATE' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
            ● {att.status}
          </span>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div><strong>Date:</strong> {new Date(att.date).toLocaleDateString()}</div>
          <div>
            <strong>Check In:</strong> {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            {' | '}
            <strong>Check Out:</strong> {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
          </div>
          {att.workedHours && (
            <div style={{ fontWeight: 700, color: '#4338ca', marginTop: '2px' }}>
              Logged: {parseFloat(att.workedHours).toFixed(2)} hrs
            </div>
          )}
        </div>
      </div>
    )
  }), []);

  const columns = [
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
      key: 'date',
      sortKey: 'date',
      label: 'Date',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString()
    },
    {
      key: 'checkIn',
      label: 'Check In',
      render: (val) => val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
    },
    {
      key: 'checkOut',
      label: 'Check Out',
      render: (val) => val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
        <span style={{ color: '#10b981', fontStyle: 'italic', fontSize: '0.8rem', fontWeight: 600 }}>Clocked In</span>
      )
    },
    {
      key: 'workedHours',
      label: 'Hours Worked',
      sortable: true,
      render: (val, row) => {
        let hrs = val ?? row.workedHours ?? row.totalHours;
        if ((hrs === null || hrs === undefined || hrs === '') && row.checkIn && row.checkOut) {
          const diffMs = new Date(row.checkOut) - new Date(row.checkIn);
          if (diffMs > 0) {
            hrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
          }
        }
        if (hrs !== null && hrs !== undefined && hrs !== '') {
          return (
            <span style={{
              fontWeight: 700,
              color: '#4338ca',
              backgroundColor: '#eef2ff',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid #c7d2fe',
              fontSize: '0.82rem',
              display: 'inline-block'
            }}>
              {parseFloat(hrs).toFixed(2)} hrs
            </span>
          );
        }
        if (row.checkIn && !row.checkOut) {
          return <span style={{ color: '#059669', fontStyle: 'italic', fontSize: '0.78rem', fontWeight: 600 }}>Active shift</span>;
        }
        return '—';
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        let cls = 'badge-success';
        if (val === 'LATE') cls = 'badge-warning';
        if (val === 'ABSENT') cls = 'badge-danger';
        if (val === 'ON_LEAVE') cls = 'badge-info';
        return <span className={`badge ${cls}`}>{val}</span>;
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
        background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 50%, #eff6ff 100%)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isManager ? 'Workforce Attendance' : 'My Attendance & Shift Punches'}
            </h1>
            <span className="badge badge-green">Live Tracking</span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.88rem', marginTop: '4px' }}>
            {isManager
              ? 'Daily check-in logs, biometric punches, hours tracked, and punch regularization.'
              : 'View your personal daily shift records, clock in/out, and verify your logged working hours.'}
          </p>
        </div>

        {/* Action: Manual Entry for Managers, or Live Punch for Employees */}
        {isManager ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            <span>Manual Entry</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!todayPunch?.checkIn || todayPunch?.checkOut ? (
              <button
                onClick={() => handlePunch('check-in')}
                disabled={punchLoading}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}
              >
                <LogIn size={16} />
                <span>{todayPunch?.checkOut ? 'Clock In (Resume)' : 'Clock In Now'}</span>
              </button>
            ) : (
              <button
                onClick={() => handlePunch('check-out')}
                disabled={punchLoading}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
              >
                <LogOut size={16} />
                <span>Clock Out</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Today Punch Status Bar for Employees */}
      {!isManager && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          backgroundColor: todayPunch?.checkIn && !todayPunch?.checkOut ? '#ecfdf5' : '#f8fafc',
          border: todayPunch?.checkIn && !todayPunch?.checkOut ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
          borderRadius: '12px',
          fontSize: '0.86rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color={todayPunch?.checkIn && !todayPunch?.checkOut ? '#059669' : '#64748b'} />
            <div>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Today's Shift Status: </span>
              {todayPunch?.checkIn && !todayPunch?.checkOut ? (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  Active Shift (Clocked in at {new Date(todayPunch.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              ) : todayPunch?.checkOut ? (
                <span style={{ color: '#475569' }}>
                  Shift Completed ({todayPunch.workedHours} hrs logged, clocked out at {new Date(todayPunch.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>Not clocked in today</span>
              )}
            </div>
          </div>
          <span className={`badge ${todayPunch?.checkIn && !todayPunch?.checkOut ? 'badge-success' : 'badge-blue'}`}>
            {todayPunch?.status || 'PENDING'}
          </span>
        </div>
      )}

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
            <span>Filtering punches for staff member: <strong>{filterEmployeeName || 'Selected Employee'}</strong></span>
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

      <DataTable
        columns={columns}
        data={logs.filter(l => !filterEmployeeId || l.employeeId === filterEmployeeId || l.employee?.id === filterEmployeeId)}
        searchPlaceholder="Search attendance by employee name or code..."
        filters={attendanceFilters}
        sortOptions={attendanceSortOptions}
        kanbanConfig={attendanceKanbanConfig}
      />

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Record Manual Attendance</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Employee *</label>
                <select
                  required
                  value={correctionData.employeeId}
                  onChange={(e) => setCorrectionData({ ...correctionData, employeeId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Date *</label>
                <input
                  type="date"
                  required
                  value={correctionData.date}
                  onChange={(e) => setCorrectionData({ ...correctionData, date: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Punch In</label>
                  <input
                    type="time"
                    required
                    value={correctionData.checkIn}
                    onChange={(e) => setCorrectionData({ ...correctionData, checkIn: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Punch Out</label>
                  <input
                    type="time"
                    required
                    value={correctionData.checkOut}
                    onChange={(e) => setCorrectionData({ ...correctionData, checkOut: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Reason / Remarks</label>
                <input
                  type="text"
                  value={correctionData.remarks}
                  onChange={(e) => setCorrectionData({ ...correctionData, remarks: e.target.value })}
                  placeholder="e.g. Card scanner mismatch"
                  className="form-input"
                />
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
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
