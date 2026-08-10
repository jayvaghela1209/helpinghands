import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Activity, Award, Briefcase, Shield,
  Home, Info, Phone, LayoutDashboard, Search,
  FileText, Medal, Users, ClipboardList, Menu, X,
  Building2, UserCircle
} from 'lucide-react';
import logo from '../assets/image.png';

export const Sidebar = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Display name: org name for NGO, company name for corporate, else full name
  const displayName = profile?.role === 'ngo'
    ? (profile.organization_name || profile.name)
    : profile?.role === 'corporate'
    ? (profile.company_name || profile.name)
    : profile?.name;

  // Human-readable role label
  const roleDisplay = profile?.role === 'ngo'
    ? 'NGO'
    : profile?.role === 'corporate'
    ? 'Corporate'
    : profile?.role === 'volunteer'
    ? 'Volunteer'
    : profile?.role === 'admin'
    ? 'Admin'
    : profile?.role;

  // Role icon
  const RoleIcon = profile?.role === 'volunteer' ? Activity
    : profile?.role === 'ngo' ? Award
    : profile?.role === 'corporate' ? Briefcase
    : profile?.role === 'admin' ? Shield
    : UserCircle;

  // Build nav items based on role
  const navItems = [
    { label: 'Home', to: '/', icon: Home, always: true },
    { label: 'About Us', to: '/about', icon: Info, always: true },
    { label: 'Contact', to: '/contact', icon: Phone, always: true },
  ];

  if (profile?.role === 'volunteer') {
    navItems.push(
      { label: 'Dashboard', to: '/volunteer-dashboard', icon: LayoutDashboard },
      { label: 'Find Opportunities', to: '/browse-opportunities', icon: Search },
      { label: 'My Applications', to: '/my-applications', icon: FileText },
      { label: 'Certificates', to: '/volunteer/certificates', icon: Medal },
    );
  } else if (profile?.role === 'ngo') {
    navItems.push(
      { label: 'NGO Dashboard', to: '/ngo-dashboard', icon: LayoutDashboard },
      { label: 'Post Requirement', to: '/post-requirement', icon: ClipboardList },
      { label: 'Manage Posts', to: '/ngo/manage-requirements', icon: FileText },
    );
  } else if (profile?.role === 'corporate') {
    navItems.push(
      { label: 'Dashboard', to: '/corporate-dashboard', icon: LayoutDashboard },
      { label: 'Browse NGOs', to: '/browse-ngos', icon: Building2 },
      { label: 'CSR Report', to: '/csr-report', icon: Award },
    );
  } else if (profile?.role === 'admin') {
    navItems.push(
      { label: 'Admin Dashboard', to: '/admin-dashboard', icon: LayoutDashboard },
    );
  }

  // Check if a nav item is active
  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo + Compliance Portal badge */}
      <div className="px-4 pt-5 pb-4 border-b border-brand-border">
        <Link to="/" className="flex items-center space-x-2" onClick={() => setMobileOpen(false)}>
          <img src={logo} alt="HelpingHands" className="h-10 w-auto object-contain flex-shrink-0" />
        </Link>
        <div className="mt-2">
          <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-1 bg-brand-secondary border border-brand-border text-brand-primary rounded-md">
            Compliance Portal
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
              isActive(to)
                ? 'bg-brand-primary text-white'
                : 'text-gray-600 hover:bg-brand-secondary hover:text-brand-primary'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* User info + Logout — pinned to bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-brand-border space-y-2">
        {profile ? (
          <>
            {/* User info card */}
            <div className="flex items-center space-x-3 px-3 py-2.5 bg-brand-secondary rounded-md border border-brand-border">
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                <RoleIcon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-dark truncate">{displayName}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{roleDisplay}</p>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-brand-error rounded-md border border-brand-border transition-all"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Log Out</span>
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center text-xs font-semibold px-3 py-2 border border-brand-border rounded-md text-brand-primary hover:bg-brand-secondary transition-all"
            >
              Login
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center text-xs font-semibold px-3 py-2 bg-brand-primary text-white rounded-md hover:bg-opacity-90 transition-all"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-white border-r border-brand-border fixed top-0 left-0 h-screen z-40">
        <SidebarContent />
      </aside>

      {/* ── Mobile: hamburger button ── */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 bg-white border border-brand-border rounded-md shadow-sm text-brand-primary"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile: overlay + drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="md:hidden fixed top-0 left-0 h-screen w-56 bg-white border-r border-brand-border z-50 flex flex-col">
            {/* Close button inside drawer */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-brand-secondary text-gray-500"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
