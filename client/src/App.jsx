import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/Common/ProtectedRoute';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import EmployeeListPage from './pages/Employees/EmployeeListPage';
import ContractListPage from './pages/Contracts/ContractListPage';
import AttendancePage from './pages/Attendance/AttendancePage';
import LeavePage from './pages/Leave/LeavePage';
import SalaryStructurePage from './pages/Salary/SalaryStructurePage';
import PayrollPage from './pages/Payroll/PayrollPage';
import PayslipListPage from './pages/Payslips/PayslipListPage';
import EmployeePortalPage from './pages/Portal/EmployeePortalPage';
import UserManagementPage from './pages/Admin/UserManagementPage';

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            fontSize: '0.875rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -4px rgba(15, 23, 42, 0.1)',
            fontWeight: 500,
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ecfdf5',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff1f2',
            },
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/leave" element={<LeavePage />} />
              <Route path="/portal" element={<EmployeePortalPage />} />

              {/* Employee Directory Routes - Restricted to Core HR, Payroll & Admin */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR_STAFF', 'PAYROLL_MANAGER', 'HR_PAYROLL_MANAGER', 'PAYROLL_USER', 'HR_PAYROLL_USER']} />}>
                <Route path="/employees" element={<EmployeeListPage />} />
              </Route>

              {/* Contract Management */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PAYROLL_MANAGER', 'HR_PAYROLL_MANAGER', 'PAYROLL_USER', 'HR_PAYROLL_USER']} />}>
                <Route path="/contracts" element={<ContractListPage />} />
              </Route>

              {/* Salary Structures & Rules - Accessible to Admin, HR Payroll Manager, and HR Payroll User (Read-Only) */}
              {/* Strictly restricted from HR Manager */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PAYROLL_MANAGER', 'HR_PAYROLL_MANAGER', 'PAYROLL_USER', 'HR_PAYROLL_USER']} />}>
                <Route path="/salary-structures" element={<SalaryStructurePage />} />
              </Route>

              {/* Payroll Lifecycle Engine - Restricted to Admin, HR Payroll Manager, and HR Payroll User */}
              {/* Strictly restricted from HR Manager */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PAYROLL_MANAGER', 'HR_PAYROLL_MANAGER', 'PAYROLL_USER', 'HR_PAYROLL_USER']} />}>
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/payslips" element={<PayslipListPage />} />
              </Route>

              {/* User & Role Management - Exclusively for Platform Admin */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
                <Route path="/users" element={<UserManagementPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
