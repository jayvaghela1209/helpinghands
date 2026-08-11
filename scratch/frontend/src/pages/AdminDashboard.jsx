import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, ShieldAlert, Key } from 'lucide-react';

export const AdminDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-dark">System Administrator Console</h1>
          <p className="text-sm text-gray-500">Approve organizations (NGOs, Corporates), audit CSR compliance logs, and view security records.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Pending Verifications</p>
                <p className="text-2xl font-bold text-brand-error mt-2">0</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <ShieldAlert className="w-5 h-5 text-brand-error" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">NGOs and Corporates awaiting audit</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Verified Entities</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">0</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <ShieldCheck className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Successfully approved entities</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Total System Users</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">1</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <UserCheck className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Including volunteers & staff</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Audit Key Logs</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">Secure</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Key className="w-5 h-5 text-brand-accent" />
              </div>
            </div>
            <p className="text-xs text-brand-success mt-4">● System integrity status check</p>
          </div>

        </div>

        {/* Dashboard Content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Left: Tasks */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-sm font-bold text-brand-dark uppercase">Verification Backlog</h2>
                <span className="text-xs text-gray-400 font-mono">0 Pending</span>
              </div>
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">There are no pending verifications at this moment.</p>
              </div>
            </div>
          </div>

          {/* Sidebar Right: Admin Info */}
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md p-6">
              <h2 className="text-sm font-bold text-brand-dark uppercase border-b border-brand-border pb-3 mb-4">Admin Account</h2>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">User Principal</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Registered Email</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Access Level</span>
                  <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-brand-error text-brand-error bg-brand-secondary rounded-md">
                    Full Root Administrator
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};
export default AdminDashboard;
