import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LogOut,
  Clock,
  Calendar,
  Search,
  Bell,
  CheckCheck,
  Check,
  CalendarCheck,
  Calculator,
  AlertCircle,
  Inbox,
  Sparkles,
  Users,
  FileText,
  CreditCard,
  Layers,
  Receipt,
  User,
  Shield,
  LayoutDashboard,
  X,
  Loader2,
  ChevronRight,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    async function checkAttendance() {
      try {
        const { data } = await api.get('/attendance/my-today');
        if (data.data) {
          setTodayAttendance(data.data);
          setClockedIn(Boolean(data.data.checkIn && !data.data.checkOut));
        }
      } catch (err) {
        // Not clocked in or non-employee account
      }
    }
    if (user) {
      checkAttendance();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      if (data?.data) {
        setNotifications(data.data.items || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  // Global keyboard shortcut (Ctrl+K or Cmd+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearchDropdown(true);
      } else if (e.key === 'Escape') {
        setShowSearchDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleSearchClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    }
    if (showSearchDropdown) {
      document.addEventListener('mousedown', handleSearchClickOutside);
      return () => document.removeEventListener('mousedown', handleSearchClickOutside);
    }
  }, [showSearchDropdown]);

  // Debounced search query execution
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(trimmed)}`);
        if (data?.data?.results) {
          setSearchResults(data.data.results);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (path) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    setSearchResults(null);
    if (path) {
      navigate(path);
    }
  };

  const getPageIcon = (iconName) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard size={15} color="#5554aa" />;
      case 'Users': return <Users size={15} color="#2563eb" />;
      case 'Clock': return <Clock size={15} color="#059669" />;
      case 'CalendarCheck': return <CalendarCheck size={15} color="#d97706" />;
      case 'FileText': return <FileText size={15} color="#7c3aed" />;
      case 'Calculator': return <Calculator size={15} color="#dc2626" />;
      case 'Layers': return <Layers size={15} color="#0891b2" />;
      case 'Receipt': return <Receipt size={15} color="#16a34a" />;
      case 'User': return <User size={15} color="#4f46e5" />;
      case 'Shield': return <Shield size={15} color="#9333ea" />;
      default: return <Sparkles size={15} color="#5554aa" />;
    }
  };

  const totalResultsCount = searchResults
    ? (searchResults.pages?.length || 0) +
      (searchResults.employees?.length || 0) +
      (searchResults.payruns?.length || 0) +
      (searchResults.payslips?.length || 0) +
      (searchResults.contracts?.length || 0) +
      (searchResults.leaves?.length || 0) +
      (searchResults.salaryStructures?.length || 0)
    : 0;

  const handleMarkAsRead = async (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Failed to mark all as read');
    }
  };

  const getNotifIcon = (type) => {
    if (type?.includes('LEAVE')) return <CalendarCheck size={16} color="#d97706" />;
    if (type?.includes('PAYROLL')) return <Calculator size={16} color="#4f46e5" />;
    if (type?.includes('ATTENDANCE')) return <Clock size={16} color="#059669" />;
    return <Sparkles size={16} color="#7c3aed" />;
  };

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleTogglePunch = async () => {
    setClockLoading(true);
    try {
      if (!clockedIn) {
        const { data } = await api.post('/attendance/check-in');
        setClockedIn(true);
        setTodayAttendance(data.data);
        toast.success(`Clocked in at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      } else {
        const { data } = await api.post('/attendance/check-out');
        setClockedIn(false);
        setTodayAttendance(data.data);
        toast.success(`Clocked out at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Attendance action failed');
    } finally {
      setClockLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return { label: 'Admin', className: 'badge-innowise' };
      case 'HR_MANAGER':
        return { label: 'HR Manager', className: 'badge-cyan' };
      case 'PAYROLL_MANAGER':
      case 'HR_PAYROLL_MANAGER':
        return { label: 'HR Payroll Manager', className: 'badge-innowise' };
      case 'PAYROLL_USER':
      case 'HR_PAYROLL_USER':
        return { label: 'HR Payroll User', className: 'badge-info' };
      case 'HR_STAFF':
        return { label: 'HR Staff', className: 'badge-warning' };
      default:
        return { label: 'Employee', className: 'badge-success' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const displayName = user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : (user?.name || user?.email?.split('@')[0] || 'Member');
  const userInitials = (user?.employee?.firstName?.[0] || user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const isShiftEnded = Boolean(todayAttendance?.checkIn && todayAttendance?.checkOut);
  const isCurrentlyWorking = Boolean(todayAttendance?.checkIn && !todayAttendance?.checkOut);

  return (
    <header style={{
      height: '66px',
      backgroundColor: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #f0eef6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 1px 4px rgba(24, 24, 55, 0.03)'
    }}>
      {/* Left: Search Bar (Innowise Style with Popover Dropdown) */}
      <div 
        ref={searchContainerRef} 
        style={{ 
          position: 'relative', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          flex: 1, 
          maxWidth: '460px' 
        }}
      >
        <div 
          onClick={() => {
            searchInputRef.current?.focus();
            setShowSearchDropdown(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: showSearchDropdown ? '#ffffff' : '#f6f5fb',
            padding: '7px 14px',
            borderRadius: '999px',
            border: showSearchDropdown ? '1px solid #5554aa' : '1px solid #e5e3ec',
            boxShadow: showSearchDropdown ? '0 0 0 3px rgba(85, 84, 170, 0.12)' : 'none',
            width: '100%',
            transition: 'all 0.18s ease'
          }}
        >
          {isSearching ? (
            <Loader2 size={15} color="#5554aa" className="animate-spin" />
          ) : (
            <Search size={15} color={showSearchDropdown ? '#5554aa' : '#6b6a8a'} />
          )}
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search staff, code, contracts, payslips, leaves, pages..."
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '0.82rem',
              color: '#181837',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                setSearchResults(null);
                searchInputRef.current?.focus();
              }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                color: '#8e8da8'
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 700,
            color: '#9b9ab5',
            backgroundColor: '#ffffff',
            padding: '2px 6px',
            borderRadius: '5px',
            border: '1px solid #e5e3ec',
            whiteSpace: 'nowrap'
          }}>
            Ctrl+K
          </span>
        </div>

        {/* Dropdown Popover */}
        {showSearchDropdown && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: '520px',
            maxWidth: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e3ec',
            boxShadow: '0 16px 40px rgba(24, 24, 55, 0.12), 0 2px 6px rgba(24, 24, 55, 0.04)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease'
          }}>
            {/* Header info */}
            <div style={{
              padding: '10px 16px',
              backgroundColor: '#fbfaff',
              borderBottom: '1px solid #f0eef6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              color: '#6b6a8a'
            }}>
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#5554aa" />
                {searchQuery.trim() ? (
                  isSearching ? 'Searching across system...' : `${totalResultsCount} result${totalResultsCount === 1 ? '' : 's'} found`
                ) : (
                  'Quick Navigation & Global Search'
                )}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#9b9ab5' }}>Press ESC to dismiss</span>
            </div>

            {/* Results scrollable container */}
            <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '8px' }}>
              {/* If empty input - show Quick Nav suggestions */}
              {!searchQuery.trim() && (
                <div>
                  <div style={{ padding: '6px 10px', fontSize: '0.68rem', fontWeight: 700, color: '#9b9ab5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Quick Navigation
                  </div>
                  {[
                    { title: 'Employee Directory', path: '/employees', icon: 'Users', desc: 'Staff directory & profiles' },
                    { title: 'Shift Attendance', path: '/attendance', icon: 'Clock', desc: 'Punch in/out & attendance logs' },
                    { title: 'Payroll Batches', path: '/payroll', icon: 'Calculator', desc: 'Process & disburse monthly payroll' },
                    { title: 'Payslip Statements', path: '/payslips', icon: 'Receipt', desc: 'Generate & download payslips' },
                    { title: 'Leave & Absences', path: '/leave', icon: 'CalendarCheck', desc: 'Request time off & track approvals' },
                    { title: 'Contracts & Shifts', path: '/contracts', icon: 'FileText', desc: 'Employment agreements & schedules' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(item.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f5fb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          backgroundColor: '#f0effa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {getPageIcon(item.icon)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#181837' }}>{item.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#8e8da8' }}>{item.desc}</div>
                        </div>
                      </div>
                      <ChevronRight size={14} color="#9b9ab5" />
                    </div>
                  ))}
                </div>
              )}

              {/* If Searching / Loading */}
              {isSearching && searchQuery.trim() && (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: '#6b6a8a' }}>
                  <Loader2 size={24} color="#5554aa" className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.78rem', fontWeight: 500 }}>Scanning all records for "{searchQuery}"...</div>
                </div>
              )}

              {/* If Searched and 0 results */}
              {!isSearching && searchQuery.trim() && totalResultsCount === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6b6a8a' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#f6f5fb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px'
                  }}>
                    <Search size={20} color="#9b9ab5" />
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#181837', marginBottom: '4px' }}>
                    No results found
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8e8da8', maxWidth: '320px', margin: '0 auto' }}>
                    No matching records for "{searchQuery}". Try searching by staff name, code (e.g. EMP-001), payslip reference, contract, or page keyword.
                  </div>
                </div>
              )}

              {/* Categorized Results */}
              {!isSearching && searchQuery.trim() && totalResultsCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Pages Section */}
                  {searchResults?.pages?.length > 0 && (
                    <div>
                      <div style={{ padding: '4px 10px', fontSize: '0.66rem', fontWeight: 700, color: '#5554aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Navigation Pages ({searchResults.pages.length})
                      </div>
                      {searchResults.pages.map((p, idx) => (
                        <div
                          key={`page-${idx}`}
                          onClick={() => handleSelectSearchResult(p.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f5fb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#f0effa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {getPageIcon(p.icon)}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#181837' }}>{p.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8e8da8' }}>{p.desc}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#5554aa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            Go <ArrowRight size={11} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Employees Section */}
                  {searchResults?.employees?.length > 0 && (
                    <div>
                      <div style={{ padding: '4px 10px', fontSize: '0.66rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Staff & Employees ({searchResults.employees.length})
                      </div>
                      {searchResults.employees.map((emp) => (
                        <div
                          key={`emp-${emp.id}`}
                          onClick={() => handleSelectSearchResult(emp.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f5fb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Users size={14} color="#2563eb" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#181837' }}>{emp.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8e8da8' }}>{emp.subtitle}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '2px 7px', borderRadius: '999px', backgroundColor: emp.status === 'ACTIVE' ? '#ecfdf5' : '#fef3c7', color: emp.status === 'ACTIVE' ? '#059669' : '#d97706' }}>
                            {emp.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payruns Section */}
                  {searchResults?.payruns?.length > 0 && (
                    <div>
                      <div style={{ padding: '4px 10px', fontSize: '0.66rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Payroll Batches ({searchResults.payruns.length})
                      </div>
                      {searchResults.payruns.map((payrun) => (
                        <div
                          key={`payrun-${payrun.id}`}
                          onClick={() => handleSelectSearchResult(payrun.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f5fb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Calculator size={14} color="#dc2626" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#181837' }}>{payrun.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8e8da8' }}>{payrun.subtitle}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '2px 7px', borderRadius: '999px', backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                            {payrun.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payslips Section */}
                  {searchResults?.payslips?.length > 0 && (
                    <div>
                      <div style={{ padding: '4px 10px', fontSize: '0.66rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Payslip Statements ({searchResults.payslips.length})
                      </div>
                      {searchResults.payslips.map((slip) => (
                        <div
                          key={`slip-${slip.id}`}
                          onClick={() => handleSelectSearchResult(slip.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f5fb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Receipt size={14} color="#16a34a" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#181837' }}>{slip.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8e8da8' }}>{slip.subtitle}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '2px 7px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#059669' }}>
                            {slip.status || 'Generated'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contracts Section */}
                  {searchResults?.contracts?.length > 0 && (
                    <div>
                      <div style={{ padding: '4px 10px', fontSize: '0.66rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Contracts & Shifts ({searchResults.contracts.length})
                      </div>
                      {searchResults.contracts.map((con) => (
                        <div
                          key={`con-${con.id}`}
                          onClick={() => handleSelectSearchResult(con.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f5fb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FileText size={14} color="#7c3aed" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#181837' }}>{con.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8e8da8' }}>{con.subtitle}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '2px 7px', borderRadius: '999px', backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                            {con.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leaves Section */}
                  {searchResults?.leaves?.length > 0 && (
                    <div>
                      <div style={{ padding: '4px 10px', fontSize: '0.66rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Leave & Absences ({searchResults.leaves.length})
                      </div>
                      {searchResults.leaves.map((leave) => (
                        <div
                          key={`leave-${leave.id}`}
                          onClick={() => handleSelectSearchResult(leave.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f5fb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CalendarCheck size={14} color="#d97706" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#181837' }}>{leave.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8e8da8' }}>{leave.subtitle}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '2px 7px', borderRadius: '999px', backgroundColor: '#fff7ed', color: '#c2410c' }}>
                            {leave.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Salary Structures Section */}
                  {searchResults?.salaryStructures?.length > 0 && (
                    <div>
                      <div style={{ padding: '4px 10px', fontSize: '0.66rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Salary Structures ({searchResults.salaryStructures.length})
                      </div>
                      {searchResults.salaryStructures.map((st) => (
                        <div
                          key={`st-${st.id}`}
                          onClick={() => handleSelectSearchResult(st.path)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f5fb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Layers size={14} color="#0891b2" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#181837' }}>{st.title}</div>
                              <div style={{ fontSize: '0.7rem', color: '#8e8da8' }}>{st.subtitle}</div>
                            </div>
                          </div>
                          <ChevronRight size={14} color="#9b9ab5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with hint */}
            <div style={{
              padding: '8px 14px',
              backgroundColor: '#faf9fc',
              borderTop: '1px solid #f0eef6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              color: '#8e8da8'
            }}>
              <span>Search staff, employee codes, payruns, payslips & leaves</span>
              <span style={{ fontWeight: 600, color: '#5554aa' }}>Innowise Enterprise</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Punch Button */}
        <button
          onClick={handleTogglePunch}
          disabled={clockLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 15px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: clockLoading ? 'not-allowed' : 'pointer',
            border: isCurrentlyWorking
              ? '1px solid #fecdd3'
              : isShiftEnded
              ? '1px solid #bae6fd'
              : '1px solid #a7f3d0',
            backgroundColor: isCurrentlyWorking
              ? '#fff1f2'
              : isShiftEnded
              ? '#f0f9ff'
              : '#ecfdf5',
            color: isCurrentlyWorking
              ? '#e11d48'
              : isShiftEnded
              ? '#0284c7'
              : '#059669',
            boxShadow: isCurrentlyWorking
              ? '0 2px 8px rgba(244, 63, 94, 0.15)'
              : '0 2px 8px rgba(16, 185, 129, 0.15)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          title={
            isCurrentlyWorking
              ? 'Click to clock out'
              : isShiftEnded
              ? 'Shift ended today. Click to resume / re-enter'
              : 'Click to clock in'
          }
        >
          <Clock size={15} />
          <span>
            {clockLoading
              ? 'Syncing...'
              : isCurrentlyWorking
              ? 'Clock Out'
              : isShiftEnded
              ? 'Shift Ended (Clock In)'
              : 'Quick Clock In'}
          </span>
        </button>

        {/* Notification Bell (Innowise Style with Popover Dropdown) */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => {
              const nextState = !showNotifications;
              setShowNotifications(nextState);
              if (nextState) fetchNotifications();
            }}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: showNotifications ? '#edeaf7' : '#f6f5fb',
              border: `1px solid ${showNotifications ? '#5554aa' : '#e5e3ec'}`,
              color: '#5554aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  backgroundColor: '#f43f5e',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(244, 63, 94, 0.45)',
                  lineHeight: 1
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                width: '380px',
                maxWidth: 'calc(100vw - 32px)',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e3ec',
                boxShadow: '0 12px 36px -4px rgba(24, 24, 55, 0.14), 0 0 1px rgba(24, 24, 55, 0.1)',
                zIndex: 1000,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out'
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f1f0f7',
                  backgroundColor: '#faf9fc'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#181837', fontSize: '14px' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: '#fef2f2',
                        color: '#f43f5e',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: '1px solid #fecdd3'
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#5554aa',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#edeaf7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div
                style={{
                  maxHeight: '380px',
                  overflowY: 'auto'
                }}
              >
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: '#94a3b8'
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#f6f5fb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}
                    >
                      <Inbox size={22} color="#757498" />
                    </div>
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '13.5px' }}>
                      No notifications yet
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      You're all caught up! Updates will appear here.
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.isRead;
                    return (
                      <div
                        key={notif.id || notif._id}
                        onClick={(e) => {
                          if (isUnread) handleMarkAsRead(notif.id || notif._id, e);
                        }}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          backgroundColor: isUnread ? '#fbfaff' : '#ffffff',
                          borderBottom: '1px solid #f6f5fb',
                          cursor: isUnread ? 'pointer' : 'default',
                          transition: 'background 0.15s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (isUnread) e.currentTarget.style.backgroundColor = '#f4f2fa';
                        }}
                        onMouseLeave={(e) => {
                          if (isUnread) e.currentTarget.style.backgroundColor = '#fbfaff';
                        }}
                      >
                        {/* Icon Avatar */}
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            backgroundColor: isUnread ? '#edeaf7' : '#f6f5fb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          {getNotifIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px'
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: isUnread ? 700 : 600,
                                color: isUnread ? '#181837' : '#475569',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {notif.title || 'System Notification'}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                flexShrink: 0
                              }}
                            >
                              {formatNotifTime(notif.createdAt)}
                            </span>
                          </div>

                          <div
                            style={{
                              fontSize: '12px',
                              color: '#64748b',
                              marginTop: '2px',
                              lineHeight: 1.4,
                              wordBreak: 'break-word'
                            }}
                          >
                            {notif.message}
                          </div>
                        </div>

                        {/* Unread indicator / mark read button */}
                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id || notif._id, e)}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#5554aa',
                              border: 'none',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              padding: 0,
                              marginTop: '6px'
                            }}
                            title="Mark as read"
                          >
                            <Check size={11} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#faf9fc',
                  borderTop: '1px solid #f1f0f7',
                  fontSize: '11.5px',
                  color: '#757498',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{notifications.length} recent notification{notifications.length !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>PeoplePay 360</span>
              </div>
            </div>
          )}
        </div>

        {/* User Monogram Pill (Innowise Style) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 12px 4px 6px',
          background: '#ffffff',
          borderRadius: '999px',
          border: '1px solid #e5e3ec',
          boxShadow: '0 1px 3px rgba(24, 24, 55, 0.03)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #5554aa 0%, #757498 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#ffffff',
            fontSize: '13px',
            boxShadow: '0 2px 8px rgba(85, 84, 170, 0.25)',
            position: 'relative'
          }}>
            {userInitials}
            <span style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '1.5px solid #ffffff'
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#181837', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
              {displayName}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#6b6a8a', fontWeight: 600, textTransform: 'capitalize' }}>
              {roleInfo.label}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
          title="Sign out of PeoplePay360"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
