import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VolunteerDashboard from './pages/VolunteerDashboard';
import NgoDashboard from './pages/NgoDashboard';
import PostRequirement from './pages/PostRequirement';
import VerifyAttendance from './pages/VerifyAttendance';
import ManageRequirements from './pages/ManageRequirements';
import NgoOnboarding from './pages/NgoOnboarding';
import ReviewApplicants from './pages/ReviewApplicants';
import BrowseOpportunities from './pages/BrowseOpportunities.jsx';
import RequirementDetails from './pages/RequirementDetails.jsx';
import CorporateDashboard from './pages/CorporateDashboard';
import AttendanceView from './pages/AttendanceView';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Main Layout containing Header and Footer */}
          <Route element={<Layout />}>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Volunteer Routes */}
            <Route element={<ProtectedRoute allowedRoles={['volunteer']} />}>
              <Route path="/volunteer-dashboard" element={<VolunteerDashboard />} />
                <Route path="/browse-opportunities" element={<BrowseOpportunities />} />
                <Route path="/requirement/:id" element={<RequirementDetails />} />
            </Route>
            
            {/* Protected NGO Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ngo']} />}>
              <Route path="/ngo-dashboard" element={<NgoDashboard />} />
              <Route path="/ngo-onboarding" element={<NgoOnboarding />} />
              <Route path="/post-requirement" element={<PostRequirement />} />
              <Route path="/ngo/manage-requirements" element={<ManageRequirements />} />
              <Route path="/ngo/requirements/:reqId/review" element={<ReviewApplicants />} />
              <Route path="/ngo/requirements/:reqId/verify" element={<VerifyAttendance />} />
<Route path="/ngo/requirements/:reqId/attendance" element={<AttendanceView />} />
            </Route>
            
            {/* Protected Corporate Routes */}
            <Route element={<ProtectedRoute allowedRoles={['corporate']} />}>
              <Route path="/corporate-dashboard" element={<CorporateDashboard />} />
            </Route>
            
            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
