import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VolunteerDashboard from './pages/VolunteerDashboard';
import NgoDashboard from './pages/NgoDashboard';
import CorporateDashboard from './pages/CorporateDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Volunteer Routes */}
          <Route element={<ProtectedRoute allowedRoles={['volunteer']} />}>
            <Route path="/volunteer-dashboard" element={<VolunteerDashboard />} />
          </Route>
          
          {/* Protected NGO Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ngo']} />}>
            <Route path="/ngo-dashboard" element={<NgoDashboard />} />
          </Route>
          
          {/* Protected Corporate Routes */}
          <Route element={<ProtectedRoute allowedRoles={['corporate']} />}>
            <Route path="/corporate-dashboard" element={<CorporateDashboard />} />
          </Route>
          
          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
