import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import theme from './theme';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CompleteProfile from './pages/CompleteProfile';
import EmployeeProfile from './pages/EmployeeProfile';
import Timesheet from './pages/Timesheet';
import LeaveManagement from './pages/LeaveManagement';
import NationalHolidays from './pages/NationalHolidays';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route
              path="/profile/complete"
              element={
                <ProtectedRoute>
                  <CompleteProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute requireProfileComplete>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute requireProfileComplete>
                  <EmployeeProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/timesheet"
              element={
                <ProtectedRoute requireProfileComplete>
                  <Timesheet />
                </ProtectedRoute>
              }
            />

            <Route
              path="/leaves"
              element={
                <ProtectedRoute requireProfileComplete>
                  <LeaveManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/holidays"
              element={
                <ProtectedRoute requireProfileComplete>
                  <NationalHolidays />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredRoles={['Administrator']} requireProfileComplete>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/manager/*"
              element={
                <ProtectedRoute requiredRoles={['Manager', 'Administrator']} requireProfileComplete>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
