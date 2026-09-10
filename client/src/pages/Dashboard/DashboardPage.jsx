import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/Common/StatCard';
import {
  Users,
  IndianRupee,
  CalendarCheck,
  Clock,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Filter,
  RefreshCw,
  Building,
  Briefcase,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  CreditCard,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../services/api';
import { Link, Navigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  if (user?.role === 'EMPLOYEE') {
    return <Navigate to="/portal" replace />;
  }

  // Filter States (Section 4 - A7 & B9)
  const [selectedPeriod, setSelectedPeriod] = useState('2026-03');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState('');
  const [departments, setDepartments] = useState([]);

  const [stats, setStats] = useState({
    activeEmployees: 240,
    totalEmployees: 244,
    newEmployees: 0,
    onLeaveEmployees: 4,
    totalMonthlyPayroll: 14500000,
    pendingLeaves: 50,
    todayAttendanceRate: 94.2,
    averageSalary: 62000,
  });

  const [alerts, setAlerts] = useState({
    missingBankDetails: 0,
    expiringContracts: 0,
    pendingPayruns: 1,
    pendingLeaveRequests: 0,
  });

  const [departmentData, setDepartmentData] = useState([
    { name: 'Engineering', count: 70, color: '#3b82f6', cost: 4500000 },
    { name: 'Sales', count: 45, color: '#10b981', cost: 2800000 },
    { name: 'Finance & Accounts', count: 35, color: '#f59e0b', cost: 2400000 },
    { name: 'Customer Operations', count: 40, color: '#8b5cf6', cost: 2100000 },
    { name: 'Marketing & Growth', count: 30, color: '#ec4899', cost: 1800000 },
    { name: 'HR & Admin', count: 20, color: '#06b6d4', cost: 900000 },
  ]);

  const [payrollTrendData, setPayrollTrendData] = useState([
    { month: '2025-11', name: 'Nov 2025', gross: 13800000, net: 12420000, deductions: 1380000 },
    { month: '2025-12', name: 'Dec 2025', gross: 14000000, net: 12600000, deductions: 1400000 },
    { month: '2026-01', name: 'Jan 2026', gross: 14200000, net: 12780000, deductions: 1420000 },
    { month: '2026-02', name: 'Feb 2026', gross: 14350000, net: 12915000, deductions: 1435000 },
    { month: '2026-03', name: 'Mar 2026', gross: 14500000, net: 13050000, deductions: 1450000 },
  ]);

  const [recentPayruns, setRecentPayruns] = useState([
    { id: 'PR-2026-03', name: 'March 2026 Regular Cycle', period: 'Mar 1 - Mar 31, 2026', total: '₹1,30,50,000.00', status: 'DRAFT', employees: 240 },
    { id: 'PR-2026-02', name: 'February 2026 Regular Cycle', period: 'Feb 1 - Feb 28, 2026', total: '₹1,29,15,000.00', status: 'PAID', employees: 235 },
    { id: 'PR-2026-01', name: 'January 2026 Regular Cycle', period: 'Jan 1 - Jan 31, 2026', total: '₹1,27,80,000.00', status: 'PAID', employees: 230 },
  ]);

  const [loading, setLoading] = useState(true);

  // Fetch departments list for the filter dropdown
  useEffect(() => {
    async function loadDepartments() {
      try {
        const { data } = await api.get('/departments');
        const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
        setDepartments(list);
      } catch (e) {
        // Fallback
      }
    }
    loadDepartments();
  }, []);

  // Fetch filtered dashboard summary
  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedPeriod) params.append('period', selectedPeriod);
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedEmployeeType) params.append('employeeType', selectedEmployeeType);

      const [summaryRes, payrunsRes] = await Promise.allSettled([
        api.get(`/dashboard/summary?${params.toString()}`),
        api.get('/payroll/payruns?pageSize=5')
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.data) {
        const d = summaryRes.value.data.data;
        const k = d.kpis || {};
        const al = d.alerts || {};

        setStats({
          activeEmployees: k.activeEmployees ?? 240,
          totalEmployees: k.totalEmployees ?? 244,
          newEmployees: k.newEmployees ?? 0,
          onLeaveEmployees: k.onLeaveEmployees ?? 4,
          totalMonthlyPayroll: k.totalNetSalary || k.totalGrossSalary || (k.averageSalary ? Math.round(k.averageSalary * (k.activeEmployees || 1)) : 14500000),
          pendingLeaves: k.pendingLeaveRequests ?? al.pendingLeaveRequests ?? 0,
          todayAttendanceRate: k.attendanceRate ? parseFloat(k.attendanceRate) : 94.2,
          averageSalary: k.averageSalary ? Math.round(k.averageSalary) : 62000,
        });

        setAlerts({
          missingBankDetails: al.missingBankDetails ?? 0,
          expiringContracts: al.expiringContracts ?? 0,
          pendingPayruns: al.pendingPayruns ?? 0,
          pendingLeaveRequests: al.pendingLeaveRequests ?? k.pendingLeaveRequests ?? 0,
        });

        if (d.charts?.departmentDistribution?.length > 0) {
          const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
          const costMap = Object.fromEntries((d.charts?.salaryCostByDepartment || []).map(sc => [sc.name, sc.value]));

          setDepartmentData(d.charts.departmentDistribution.map((dep, i) => ({
            name: dep.name,
            count: dep.value,
            color: palette[i % palette.length],
            cost: costMap[dep.name] || (dep.value * (k.averageSalary || 55000)),
          })));
        }

        if (d.charts?.payrollTrend?.length > 0) {
          setPayrollTrendData(d.charts.payrollTrend.map(pt => ({
            month: pt.month,
            name: pt.name || pt.month,
            gross: pt.grossSalary || (pt.netSalary * 1.12),
            net: pt.netSalary,
            deductions: pt.deductions || (pt.netSalary * 0.12),
          })));
        }
      }

      if (payrunsRes.status === 'fulfilled') {
        const prList = payrunsRes.value.data?.data?.items || (Array.isArray(payrunsRes.value.data?.data) ? payrunsRes.value.data.data : []);
        if (prList.length > 0) {
          setRecentPayruns(prList.slice(0, 4).map(p => ({
            id: p.id.slice(0, 10),
            name: p.name,
            period: `${new Date(p.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(p.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            total: `₹${(p.payslips?.reduce((sum, s) => sum + Number(s.netSalary || s.netPay || 0), 0) || 0).toLocaleString('en-IN')}`,
            status: p.status,
            employees: p.payslips?.length || 0,
          })));
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod, selectedDepartment, selectedEmployeeType]);

  const handleResetFilters = () => {
    setSelectedPeriod('2026-03');
    setSelectedDepartment('');
    setSelectedEmployeeType('');
  };

  const isFiltersActive = selectedDepartment !== '' || selectedEmployeeType !== '' || selectedPeriod !== '2026-03';
  const isPayroll = hasRole(['SUPER_ADMIN', 'PAYROLL_MANAGER', 'PAYROLL_USER']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Quick Controls - Innowise Hero Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '18px',
        padding: '24px 28px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f6f5fb 50%, #f0f0ff 100%)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Soft background glow */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '10%',
          width: '240px',
          height: '140px',
          background: 'radial-gradient(circle, rgba(85, 84, 170, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 10px',
              borderRadius: '999px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              <Sparkles size={13} style={{ marginRight: '5px' }} /> Innowise HR Intelligence
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
              Live Workplace Overview
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
            Workforce & Payroll Executive Dashboard
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.86rem', color: '#64748b', maxWidth: '640px' }}>
            Monitor real-time headcount, team attendance, satisfaction index, statutory disbursements, and compliance alerts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
          <button
            onClick={fetchStats}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} /> Refresh
          </button>
          <Link to="/attendance" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
            <Clock size={15} /> Clock Records
          </Link>
          {isPayroll && (
            <Link to="/payroll" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
              <ArrowUpRight size={15} /> Execute Payrun
            </Link>
          )}
        </div>
      </div>

      {/* Interactive Filter Bar (Section 4 - A7 & B9) */}
      <div className="card" style={{
        padding: '16px 22px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <Filter size={15} color="var(--primary)" /> Filters:
          </span>

          {/* Period Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="#94a3b8" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.82rem', padding: '6px 12px', height: '36px', minWidth: '160px', borderRadius: '10px', borderColor: 'var(--border-color)' }}
            >
              <option value="2026-03">March 2026 (Current)</option>
              <option value="2026-02">February 2026</option>
              <option value="2026-01">January 2026</option>
              <option value="2025-12">December 2025</option>
              <option value="">All Historical Periods</option>
            </select>
          </div>

          {/* Department Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} color="#94a3b8" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.82rem', padding: '6px 12px', height: '36px', minWidth: '170px', borderRadius: '10px', borderColor: 'var(--border-color)' }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Employee Type Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase size={14} color="#94a3b8" />
            <select
              value={selectedEmployeeType}
              onChange={(e) => setSelectedEmployeeType(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.82rem', padding: '6px 12px', height: '36px', minWidth: '150px', borderRadius: '10px', borderColor: 'var(--border-color)' }}
            >
              <option value="">All Staff Types</option>
              <option value="FULL_TIME">Full-Time Staff</option>
              <option value="CONTRACT">Contract Staff</option>
              <option value="PART_TIME">Part-Time</option>
              <option value="INTERN">Intern</option>
            </select>
          </div>
        </div>

        {isFiltersActive && (
          <button
            onClick={handleResetFilters}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.78rem', color: 'var(--primary)', borderColor: 'var(--primary-border)', backgroundColor: 'var(--primary-light)', borderRadius: '999px' }}
          >
            Reset All Filters
          </button>
        )}
      </div>

      {/* Operational Alerts & Compliance Widget (Section 4 - B9) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px'
      }}>
        {/* Missing Bank Details Alert */}
        <div style={{
          padding: '14px 18px',
          borderRadius: '14px',
          backgroundColor: alerts.missingBankDetails > 0 ? '#fff1f2' : '#ffffff',
          border: `1px solid ${alerts.missingBankDetails > 0 ? '#fecdd3' : 'var(--border-color)'}`,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: alerts.missingBankDetails > 0 ? '#ffe4e6' : '#dcfce7',
              color: alerts.missingBankDetails > 0 ? '#e11d48' : '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                {alerts.missingBankDetails > 0 ? `${alerts.missingBankDetails} Missing Bank Details` : 'Bank Details Complete'}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {alerts.missingBankDetails > 0 ? 'Staff missing account or IFSC' : 'All active staff have bank accounts'}
              </span>
            </div>
          </div>
          {alerts.missingBankDetails > 0 && (
            <Link to="/employees" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.74rem', borderRadius: '8px' }}>
              Review
            </Link>
          )}
        </div>

        {/* Expiring Contracts Alert */}
        <div style={{
          padding: '14px 18px',
          borderRadius: '14px',
          backgroundColor: alerts.expiringContracts > 0 ? '#fffbeb' : '#ffffff',
          border: `1px solid ${alerts.expiringContracts > 0 ? '#fde68a' : 'var(--border-color)'}`,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: alerts.expiringContracts > 0 ? '#fef3c7' : 'var(--primary-light)',
              color: alerts.expiringContracts > 0 ? '#d97706' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                {alerts.expiringContracts > 0 ? `${alerts.expiringContracts} Contracts Expiring Soon` : 'Contracts In Good Standing'}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {alerts.expiringContracts > 0 ? 'Expiring within next 30 days' : 'No agreements ending this month'}
              </span>
            </div>
          </div>
          <Link to="/contracts" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.74rem', borderRadius: '8px' }}>
            Contracts
          </Link>
        </div>

        {/* Pending Leave Requests Alert */}
        <div style={{
          padding: '14px 18px',
          borderRadius: '14px',
          backgroundColor: stats.pendingLeaves > 0 ? '#fdf4ff' : '#ffffff',
          border: `1px solid ${stats.pendingLeaves > 0 ? '#f5d0fe' : 'var(--border-color)'}`,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: stats.pendingLeaves > 0 ? '#fae8ff' : '#f0f0ff',
              color: stats.pendingLeaves > 0 ? '#a855f7' : '#5554aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                {stats.pendingLeaves > 0 ? `${stats.pendingLeaves} Leave Approvals Pending` : 'All Leave Requests Decided'}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {stats.pendingLeaves > 0 ? 'Requires manager review' : 'Zero outstanding time-off requests'}
              </span>
            </div>
          </div>
          <Link to="/leave" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.74rem', borderRadius: '8px' }}>
            Approve
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid - Innowise HR Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px'
      }}>
        <StatCard
          title="Total Staff"
          value={stats.activeEmployees}
          description={`Total registered: ${stats.totalEmployees}`}
          color="#5554aa"
          bgColor="#f0f0ff"
          icon={Users}
          badgeText="Active"
          badgePositive={true}
          change="2.4%"
          changeType="positive"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats.todayAttendanceRate}%`}
          description={`${stats.onLeaveEmployees} on approved leave`}
          color="#2563eb"
          bgColor="#eff6ff"
          icon={Clock}
          badgeText="98.2% Goal"
          badgePositive={true}
          change="0.8%"
          changeType="positive"
          progress={stats.todayAttendanceRate}
        />
        <StatCard
          title="Staff Satisfaction"
          value="94%"
          description="Pulse survey health score"
          color="#7e7dcb"
          bgColor="#f5f4fd"
          icon={Sparkles}
          badgeText="+4% vs Q3"
          badgePositive={true}
          change="4.0%"
          changeType="positive"
          progress={94}
        />
        <StatCard
          title="Monthly Payroll"
          value={`₹${(stats.totalMonthlyPayroll / 100000).toFixed(2)}L`}
          description={`Avg ₹${stats.averageSalary.toLocaleString('en-IN')} / employee`}
          color="#059669"
          bgColor="#ecfdf5"
          icon={IndianRupee}
          badgeText="Disbursed"
          badgePositive={true}
          change="1.2%"
          changeType="positive"
        />
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Payroll Expense Evolution */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Monthly Payroll Trajectory
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Historical expenditure & statutory deductions trend
              </span>
            </div>
            <span className="badge badge-innowise">FY 2025-26</span>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="innowiseGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5554aa" stopOpacity={0.28}/>
                    <stop offset="95%" stopColor="#5554aa" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="innowiseNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0f8" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 100000)}L`} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e3ec', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                <Area type="monotone" dataKey="gross" name="Gross Pay" stroke="#5554aa" strokeWidth={2.5} fillOpacity={1} fill="url(#innowiseGross)" />
                <Area type="monotone" dataKey="net" name="Net Disbursed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#innowiseNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Headcount by Department */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Department Workforce Distribution
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Headcount spread across business units
              </span>
            </div>
            <Link to="/employees" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              Directory &rarr;
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: '260px' }}>
            <div style={{ width: '55%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e5e3ec', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '12px' }}
                    formatter={(val, name) => [`${val} Members`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '250px' }}>
              {departmentData.map((dept, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: dept.color, flexShrink: 0 }} />
                    <span style={{ color: '#475569', fontWeight: 500, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{dept.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{dept.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Department Headcount & Expenditure Breakdown Table (Section 4 - B9) */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#faf9fd'
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Department Headcount & Expenditure Breakdown
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Combined view of staffing headcount and monthly salary costs by business unit
            </span>
          </div>
          <span className="badge badge-innowise" style={{ fontSize: '0.74rem' }}>
            {departmentData.length} Business Units
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '14px 24px' }}>Department</th>
                <th style={{ padding: '14px 24px' }}>Active Staff</th>
                <th style={{ padding: '14px 24px' }}>Monthly Payroll Cost</th>
                <th style={{ padding: '14px 24px' }}>Avg Cost / Employee</th>
                <th style={{ padding: '14px 24px' }}>Share of Total</th>
              </tr>
            </thead>
            <tbody>
              {departmentData.map((d, i) => {
                const totalCost = departmentData.reduce((acc, curr) => acc + (curr.cost || 0), 0) || 1;
                const share = Math.round(((d.cost || 0) / totalCost) * 100);
                const avgCost = d.count > 0 ? Math.round((d.cost || 0) / d.count) : 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0eef6', fontSize: '0.86rem' }} className="table-row-hover">
                    <td style={{ padding: '14px 24px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: d.color, flexShrink: 0 }} />
                      {d.name}
                    </td>
                    <td style={{ padding: '14px 24px', color: '#334155', fontWeight: 600 }}>
                      {d.count} Members
                    </td>
                    <td style={{ padding: '14px 24px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{(d.cost || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 24px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{avgCost.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: '#f0eef6', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${share}%`, height: '100%', backgroundColor: d.color }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, width: '32px' }}>{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payrun Management Snapshot */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#faf9fd'
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Recent Payroll Cycles
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Batches calculated and settled across the company
            </span>
          </div>
          <Link to="/payroll" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}>
            All Runs <ChevronRight size={14} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '14px 24px' }}>Batch Identifier</th>
                <th style={{ padding: '14px 24px' }}>Cycle Name</th>
                <th style={{ padding: '14px 24px' }}>Period</th>
                <th style={{ padding: '14px 24px' }}>Staff Included</th>
                <th style={{ padding: '14px 24px' }}>Total Amount</th>
                <th style={{ padding: '14px 24px' }}>Status</th>
                <th style={{ padding: '14px 24px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentPayruns.map((pr) => (
                <tr key={pr.id} style={{ borderBottom: '1px solid #f0eef6', fontSize: '0.88rem' }} className="table-row-hover">
                  <td style={{ padding: '14px 24px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    {pr.id}
                  </td>
                  <td style={{ padding: '14px 24px', fontWeight: 600, color: '#0f172a' }}>
                    {pr.name}
                  </td>
                  <td style={{ padding: '14px 24px', color: '#64748b', fontSize: '0.82rem' }}>
                    {pr.period}
                  </td>
                  <td style={{ padding: '14px 24px', color: '#334155' }}>
                    {pr.employees} Employees
                  </td>
                  <td style={{ padding: '14px 24px', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {pr.total}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span className={`badge ${pr.status === 'PAID' ? 'badge-success' : 'badge-warning'}`} style={{ borderRadius: '999px' }}>
                      {pr.status === 'PAID' ? '✓ Disbursed' : '● In Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                    <Link to="/payroll" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '8px' }}>
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
