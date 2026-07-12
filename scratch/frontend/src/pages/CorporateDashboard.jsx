import React from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Landmark, Timer, Clipboard, Award } from 'lucide-react';

export const CorporateDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-brand-secondary">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-dark">Corporate CSR Portal</h1>
          <p className="text-sm text-gray-500">Track company CSR spending, verified hours, employee participation, and generate compliance reports.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Pledges Value</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">₹0.00</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Landmark className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Total committed capital</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Employee Hours</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">0.0 hrs</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Timer className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Verified volunteer contributions</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Active Partners</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">0 NGOs</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Award className="w-5 h-5 text-brand-accent" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Signed agreements</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Compliance Reports</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">0 Reports</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Clipboard className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-brand-success mt-4">● All verified by auditors</p>
          </div>

        </div>

        {/* Dashboard Content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Left: Tasks */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-sm font-bold text-brand-dark uppercase">CSR Pledges</h2>
                <span className="text-xs text-gray-400 font-mono">0 Pledges</span>
              </div>
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No active CSR pledges found.</p>
                <button className="mt-4 text-xs font-semibold text-white bg-brand-primary hover:bg-opacity-90 px-4 py-2 rounded-md transition-all">
                  Register CSR Pledge
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Right: Corp Details */}
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md p-6">
              <h2 className="text-sm font-bold text-brand-dark uppercase border-b border-brand-border pb-3 mb-4">Corporate Info</h2>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Company Name</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Registered Email</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Verification Status</span>
                  <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-brand-accent text-brand-accent bg-brand-secondary rounded-md">
                    Pending Admin Approval
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
export default CorporateDashboard;
