import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-secondary">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent"></div>
          <span className="text-sm font-medium text-brand-dark">Loading your session...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but profile details are still loading or missing
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-secondary">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent"></div>
          <span className="text-sm font-medium text-brand-dark">Loading user profile...</span>
        </div>
      </div>
    );
  }

  // Logged in but role is not allowed -> redirect to their correct role dashboard
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'volunteer') {
      return <Navigate to="/volunteer-dashboard" replace />;
    } else if (profile.role === 'ngo') {
      return <Navigate to="/ngo-dashboard" replace />;
    } else if (profile.role === 'corporate') {
      return <Navigate to="/corporate-dashboard" replace />;
    } else if (profile.role === 'admin') {
      return <Navigate to="/admin-dashboard" replace />;
    }
    
    // Fallback: unauthorized or invalid role
    return <Navigate to="/login" replace />;
  }

  // Authenticated and authorized -> render children
  return <Outlet />;
};
export default ProtectedRoute;
