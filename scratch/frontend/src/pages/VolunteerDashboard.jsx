import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Award, Clock, Star, Activity } from 'lucide-react';

export const VolunteerDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-brand-secondary">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-dark">Volunteer Portal</h1>
          <p className="text-sm text-gray-500">Track your verified volunteer hours, credentials, and digital certificates.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Verified Hours</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">0.00 hrs</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Clock className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Accrued from checked-in events</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Credit Points</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">0 pts</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Award className="w-5 h-5 text-brand-accent" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Bronze tier entry points</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Trust Score</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">100.0%</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Star className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-brand-success mt-4">● Perfect attendance rating</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Badge Level</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">Bronze</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Activity className="w-5 h-5 text-brand-accent" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Next level at 100 points</p>
          </div>

        </div>

        {/* Dashboard Content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Left: Tasks */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-sm font-bold text-brand-dark uppercase">My Applications</h2>
                <span className="text-xs text-gray-400 font-mono">0 Total</span>
              </div>
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">You haven't applied to any volunteering events yet.</p>
                <button className="mt-4 text-xs font-semibold text-white bg-brand-primary hover:bg-opacity-90 px-4 py-2 rounded-md transition-all">
                  Browse Opportunities
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Right: Profile Details */}
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md p-6">
              <h2 className="text-sm font-bold text-brand-dark uppercase border-b border-brand-border pb-3 mb-4">Credentials</h2>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Full Name</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Verified Email</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Phone Contact</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Registered City</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.city || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};
export default VolunteerDashboard;
