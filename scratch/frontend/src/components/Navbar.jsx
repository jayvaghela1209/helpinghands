import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Activity, Award, Briefcase, Shield } from 'lucide-react';

export const Navbar = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-brand-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left Section: Branding */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-brand-primary">HelpingHands</span>
            <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 bg-brand-secondary border border-brand-border text-brand-primary rounded-md">
              Compliance Portal
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="text-gray-600 hover:text-brand-accent transition-colors">Home</Link>
            <Link to="/about" className="text-gray-600 hover:text-brand-accent transition-colors">About Us</Link>
            <Link to="/contact" className="text-gray-600 hover:text-brand-accent transition-colors">Contact</Link>
            
            {profile && <span className="text-brand-border">|</span>}
            
            {profile && profile.role === 'volunteer' && (
              <>
                <Link to="/volunteer-dashboard" className="text-brand-primary hover:text-brand-accent transition-colors">Dashboard</Link>
                <span className="text-brand-border">|</span>
                <Link to="/browse-opportunities" className="text-gray-600 hover:text-brand-accent transition-colors">Find Opportunities</Link>
                <span className="text-brand-border">|</span>
                <Link to="/my-applications" className="text-gray-600 hover:text-brand-accent transition-colors">My Applications</Link>
                <span className="text-brand-border">|</span>
                <Link to="/volunteer/certificates" className="text-gray-600 hover:text-brand-accent transition-colors">Certificates</Link>
              </>
            )}
            {profile && profile.role === 'ngo' && (
              <>
                <Link to="/ngo-dashboard" className="text-brand-primary hover:text-brand-accent transition-colors">NGO Dashboard</Link>
                <span className="text-brand-border">|</span>
                <span className="text-gray-400 cursor-not-allowed">Create Need</span>
                <span className="text-gray-400 cursor-not-allowed">My Volunteers</span>
              </>
            )}
            {profile && profile.role === 'corporate' && (
              <>
                <Link to="/corporate-dashboard" className="text-brand-primary hover:text-brand-accent transition-colors">Corporate Dashboard</Link>
                <span className="text-brand-border">|</span>
                <span className="text-gray-400 cursor-not-allowed">CSR Claims</span>
                <span className="text-gray-400 cursor-not-allowed">Pledges</span>
              </>
            )}
            {profile && profile.role === 'admin' && (
              <>
                <Link to="/admin-dashboard" className="text-brand-primary hover:text-brand-accent transition-colors">Admin Dashboard</Link>
                <span className="text-brand-border">|</span>
                <span className="text-gray-400 cursor-not-allowed">Verify Entities</span>
                <span className="text-gray-400 cursor-not-allowed">Audit Logs</span>
              </>
            )}
          </nav>
        </div>

        {/* Right Section: User Info / Authentication CTAs */}
        <div className={`flex items-center space-x-6 ${profile ? 'border-l border-brand-border pl-6 ml-4' : ''}`}>
          {profile ? (
            <>
              <div className="text-right">
                <p className="text-xs font-semibold text-brand-dark">{profile.name}</p>
                <p className="text-[10px] text-gray-500 font-mono flex items-center justify-end space-x-1 mt-0.5">
                  {profile.role === 'volunteer' && <Activity className="w-3 h-3 text-brand-accent inline" />}
                  {profile.role === 'ngo' && <Award className="w-3 h-3 text-brand-primary inline" />}
                  {profile.role === 'corporate' && <Briefcase className="w-3 h-3 text-brand-primary inline" />}
                  {profile.role === 'admin' && <Shield className="w-3 h-3 text-brand-error inline" />}
                  <span className="capitalize">{profile.role}</span>
                </p>
              </div>

              <span className="h-8 w-px bg-brand-border hidden sm:block"></span>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-xs font-medium bg-brand-secondary border border-brand-border text-brand-dark hover:bg-gray-100 hover:text-brand-error transition-all px-3 py-2 rounded-md"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <Link 
                to="/login" 
                className="text-xs font-medium text-brand-primary hover:text-brand-accent transition-colors px-3 py-2"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="text-xs font-medium bg-brand-primary text-white border border-brand-primary hover:bg-opacity-90 hover:border-opacity-90 transition-all px-3.5 py-2 rounded-md"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
export default Navbar;
