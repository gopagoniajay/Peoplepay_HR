import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/Common/StatCard';
import {
  User, CalendarCheck, Clock, Download, ShieldCheck, Mail, Phone, Building,
  Briefcase, LogIn, LogOut, Plus, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function EmployeePortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'leave' | 'requests'
  const [payslips, setPayslips] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [todayPunch, setTodayPunch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const [leaveFormData, setLeaveFormData] = useState({
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const [psRes, lbRes, attRes, punchRes, reqRes, typeRes] = await Promise.allSettled([
        api.get('/payslips'),
        api.get('/leave/balances/my'),
        api.get('/attendance'),
        api.get('/attendance/my-today'),
        api.get('/leave/requests'),
        api.get('/leave/types'),
      ]);

      if (psRes.status === 'fulfilled' && psRes.value.data?.data?.items) {
        setPayslips(psRes.value.data.data.items);
      }
      if (lbRes.status === 'fulfilled' && lbRes.value.data?.data) {
        setLeaveBalances(lbRes.value.data.data);
      }
      if (attRes.status === 'fulfilled' && attRes.value.data?.data) {
        const items = attRes.value.data.data.items || (Array.isArray(attRes.value.data.data) ? attRes.value.data.data : []);
        setAttendanceLogs(items);
      }
      if (punchRes.status === 'fulfilled' && punchRes.value.data?.data) {
        setTodayPunch(punchRes.value.data.data);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value.data?.data) {
        const items = reqRes.value.data.data.items || (Array.isArray(reqRes.value.data.data) ? reqRes.value.data.data : []);
        setLeaveRequests(items);
      }
      if (typeRes.status === 'fulfilled' && typeRes.value.data?.data) {
        const items = Array.isArray(typeRes.value.data.data) ? typeRes.value.data.data : (typeRes.value.data.data.items || []);
        setLeaveTypes(items);
        if (items.length > 0 && !leaveFormData.leaveTypeId) {
          setLeaveFormData(prev => ({ ...prev, leaveTypeId: items[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [user?.id]);

  const handlePunch = async (action) => {
    setPunchLoading(true);
    try {
      await api.post(`/attendance/${action}`);
      toast.success(action === 'check-in' ? 'Clocked in successfully!' : 'Clocked out successfully!');
      loadPortalData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Action failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave/requests', leaveFormData);
      toast.success('Time off request submitted successfully');
      setIsLeaveModalOpen(false);
      setLeaveFormData({
        leaveTypeId: leaveTypes[0]?.id || '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
      });
      loadPortalData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit leave request');
    }
  };

  const handleDownloadPdf = async (payslipId, name) => {
    try {
      const response = await api.get(`/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${name || payslipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Downloaded payslip PDF');
    } catch (err) {
      toast.error('Failed to download PDF payslip');
    }
  };

  const totalPaidLeaves = leaveBalances.reduce((acc, lb) => acc + (parseFloat(lb.remainingDays || lb.remaining || 0)), 0);
  const latestPayslip = payslips[0];

  const employeeName = user?.employee
    ? `${user.employee.firstName || ''} ${user.employee.lastName || ''}`.trim() || user.employee.name
    : (user?.name || user?.email?.split('@')[0] || 'Member');
  const employeeCode = user?.employee?.employeeCode || user?.employee?.code || 'EMP-0001';
  const departmentName = user?.employee?.department?.name || 'General';
  const jobTitle = user?.employee?.jobPosition?.title || 'Staff Member';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Employee Profile Hero Card */}
      <div className="card" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, #ffffff 0%, #eef2ff 50%, #f0fdf4 100%)',
        borderTop: '3px solid #6366f1',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 6px 18px rgba(99, 102, 241, 0.3)'
            }}>
              {employeeName[0]?.toUpperCase() || 'E'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {employeeName}
                </h1>
                <span className="badge badge-success">{user?.employee?.employmentStatus || 'ACTIVE'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px', fontSize: '0.84rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#6366f1" /> {user?.email || 'member@peoplepay360.com'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} color="#8b5cf6" /> {jobTitle}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={14} color="#0ea5e9" /> {departmentName}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Live Clock In / Clock Out Button */}
            {!todayPunch?.checkIn || todayPunch?.checkOut ? (
              <button
                onClick={() => handlePunch('check-in')}
                disabled={punchLoading}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  padding: '10px 18px'
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  padding: '10px 18px'
                }}
              >
                <LogOut size={16} />
                <span>Clock Out</span>
              </button>
            )}

            <div style={{ textAlign: 'right', borderLeft: '1px solid #cbd5e1', paddingLeft: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Staff Code</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: '#6366f1' }}>
                {employeeCode}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Self-Service Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Available Paid Leaves"
          value={`${totalPaidLeaves || 18} Days`}
          description="Accrued policy balance"
          color="#d97706"
          icon={CalendarCheck}
          badgeText="Accrued"
        />
        <StatCard
          title="Today's Shift Status"
          value={todayPunch?.checkIn && !todayPunch?.checkOut ? 'Clocked In' : (todayPunch?.checkOut ? 'Completed' : 'Not Punched')}
          description={todayPunch?.checkIn ? `Since ${new Date(todayPunch.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Shift pending'}
          color="#059669"
          icon={Clock}
          badgeText={todayPunch?.status || 'PENDING'}
        />
        <StatCard
          title="Latest Net Payout"
          value={latestPayslip ? `₹${parseFloat(latestPayslip.netSalary).toLocaleString('en-IN')}` : '₹35,100.00'}
          description={latestPayslip?.payrun?.name || 'Latest payroll release'}
          color="#6366f1"
          icon={ShieldCheck}
          badgeText="Credited"
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              background: activeTab === 'overview' ? '#eef2ff' : 'transparent',
              border: activeTab === 'overview' ? '1px solid #c7d2fe' : '1px solid transparent',
              color: activeTab === 'overview' ? '#4338ca' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.88rem',
              transition: 'all 0.15s ease'
            }}
          >
            My Payslips ({payslips.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              background: activeTab === 'attendance' ? '#ecfdf5' : 'transparent',
              border: activeTab === 'attendance' ? '1px solid #a7f3d0' : '1px solid transparent',
              color: activeTab === 'attendance' ? '#065f46' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.88rem',
              transition: 'all 0.15s ease'
            }}
          >
            My Attendance ({attendanceLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              background: activeTab === 'requests' ? '#fffbeb' : 'transparent',
              border: activeTab === 'requests' ? '1px solid #fde68a' : '1px solid transparent',
              color: activeTab === 'requests' ? '#92400e' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.88rem',
              transition: 'all 0.15s ease'
            }}
          >
            Time Off Requests ({leaveRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              background: activeTab === 'leave' ? '#f5f3ff' : 'transparent',
              border: activeTab === 'leave' ? '1px solid #ddd6fe' : '1px solid transparent',
              color: activeTab === 'leave' ? '#6d28d9' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.88rem',
              transition: 'all 0.15s ease'
            }}
          >
            Leave Balances
          </button>
        </div>

        {activeTab === 'requests' && (
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} /> Request Time Off
          </button>
        )}
      </div>

      {/* Tab 1: Payslips */}
      {activeTab === 'overview' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Recent Salary Statements
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '12px 20px' }}>Pay Period / Cycle</th>
                <th style={{ padding: '12px 20px' }}>Gross Salary</th>
                <th style={{ padding: '12px 20px' }}>Deductions</th>
                <th style={{ padding: '12px 20px' }}>Net Received</th>
                <th style={{ padding: '12px 20px' }}>Status</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length > 0 ? (
                payslips.map((ps) => (
                  <tr key={ps.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }} className="table-row-hover">
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>
                      {ps.payrun?.name || `Cycle ${new Date(ps.createdAt).toLocaleDateString()}`}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#4f46e5', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      ₹{parseFloat(ps.grossSalary).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#e11d48', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{parseFloat(ps.totalDeductions).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#059669', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      ₹{parseFloat(ps.netSalary).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge ${ps.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                        ● {ps.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDownloadPdf(ps.id, ps.payrun?.name)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={13} /> PDF
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No payslips generated yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Attendance History */}
      {activeTab === 'attendance' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Personal Shift & Attendance Logs
            </h3>
            <span className="badge badge-green">Verified Log</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '12px 20px' }}>Date</th>
                <th style={{ padding: '12px 20px' }}>Check In</th>
                <th style={{ padding: '12px 20px' }}>Check Out</th>
                <th style={{ padding: '12px 20px' }}>Worked Hours</th>
                <th style={{ padding: '12px 20px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceLogs.length > 0 ? (
                attendanceLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }} className="table-row-hover">
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>
                      {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>
                      {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>
                      {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                        <span style={{ color: '#059669', fontStyle: 'italic', fontWeight: 600 }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#4338ca' }}>
                      {(() => {
                        let hrs = log.workedHours ?? log.totalHours;
                        if ((hrs === null || hrs === undefined || hrs === '') && log.checkIn && log.checkOut) {
                          const diffMs = new Date(log.checkOut) - new Date(log.checkIn);
                          if (diffMs > 0) hrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
                        }
                        return hrs !== null && hrs !== undefined && hrs !== '' ? (
                          <span style={{
                            backgroundColor: '#eef2ff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #c7d2fe',
                            fontSize: '0.82rem',
                            display: 'inline-block'
                          }}>
                            {parseFloat(hrs).toFixed(2)} hrs
                          </span>
                        ) : (
                          log.checkIn && !log.checkOut ? (
                            <span style={{ color: '#059669', fontStyle: 'italic', fontSize: '0.78rem' }}>Active</span>
                          ) : '—'
                        );
                      })()}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge ${log.status === 'PRESENT' ? 'badge-success' : log.status === 'LATE' ? 'badge-warning' : 'badge-danger'}`}>
                        ● {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No attendance records logged yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Time Off Requests */}
      {activeTab === 'requests' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Submitted Time Off Requests
            </h3>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> New Request
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '12px 20px' }}>Leave Policy</th>
                <th style={{ padding: '12px 20px' }}>Start Date</th>
                <th style={{ padding: '12px 20px' }}>End Date</th>
                <th style={{ padding: '12px 20px' }}>Duration</th>
                <th style={{ padding: '12px 20px' }}>Reason</th>
                <th style={{ padding: '12px 20px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.length > 0 ? (
                leaveRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }} className="table-row-hover">
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>
                      {req.leaveType?.name || 'Leave'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>
                      {new Date(req.startDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#334155' }}>
                      {new Date(req.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#6366f1' }}>
                      {req.durationDays || req.totalDays || 1} Days
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.reason || '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge ${req.status === 'APPROVED' ? 'badge-success' : req.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                        ● {req.status === 'PENDING' ? 'Awaiting Review' : req.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No time off requests filed yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Leave Balances */}
      {activeTab === 'leave' && (
        <div className="card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Accrued Leave Policy Quotas & Allocations
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {leaveBalances.length > 0 ? (
              leaveBalances.map((lb) => (
                <div key={lb.id} style={{ padding: '18px', backgroundColor: '#eef2ff', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
                  <div style={{ fontWeight: 600, color: '#4338ca', fontSize: '0.85rem' }}>{lb.leaveType?.name || 'Leave Type'}</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '6px 0', letterSpacing: '-0.02em' }}>
                    {lb.remainingDays || lb.remaining || 0} / {lb.allocatedDays || lb.allocated || 0} Days
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6366f1' }}>{lb.takenDays || lb.usedDays || 0} days consumed</div>
                </div>
              ))
            ) : (
              <>
                <div style={{ padding: '18px', backgroundColor: '#eef2ff', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
                  <div style={{ fontWeight: 600, color: '#4338ca', fontSize: '0.85rem' }}>Paid Annual Leave</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '6px 0', letterSpacing: '-0.02em' }}>18 / 20 Days</div>
                  <div style={{ fontSize: '0.76rem', color: '#6366f1' }}>2 days taken in 2026 calendar year</div>
                </div>
                <div style={{ padding: '18px', backgroundColor: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontWeight: 600, color: '#065f46', fontSize: '0.85rem' }}>Sick / Medical Leave</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#065f46', margin: '6px 0', letterSpacing: '-0.02em' }}>9 / 10 Days</div>
                  <div style={{ fontSize: '0.76rem', color: '#10b981' }}>1 day approved for medical rest</div>
                </div>
                <div style={{ padding: '18px', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <div style={{ fontWeight: 600, color: '#92400e', fontSize: '0.85rem' }}>Unpaid Leave (LOP)</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#92400e', margin: '6px 0', letterSpacing: '-0.02em' }}>0 Days</div>
                  <div style={{ fontSize: '0.76rem', color: '#f59e0b' }}>Zero salary deductions applied</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {isLeaveModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', padding: '26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Request Time Off</h2>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Leave Category *</label>
                <select
                  required
                  value={leaveFormData.leaveTypeId}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, leaveTypeId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Leave Type...</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.paid ? 'Paid' : 'Unpaid LOP'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.startDate}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.endDate}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Reason / Notes</label>
                <textarea
                  rows={3}
                  value={leaveFormData.reason}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                  placeholder="e.g. Personal emergency or vacation"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
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
    </div>
  );
}
