import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Landmark, Timer, Clipboard, Award } from 'lucide-react';

export const CorporateDashboard = () => {
  const { profile } = useAuth();

  // State for pledges fetched from backend
  const [pledges, setPledges] = useState([]);
  const [loading, setLoading] = useState(true);

  // CSR Report State
  const [reportYear, setReportYear] = useState('2026');
  const [reportData, setReportData] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  // Helper: get auth token from localStorage
  const getToken = () => {
    const directToken = localStorage.getItem('authToken');
    if (directToken) return directToken;
    try {
      const session = JSON.parse(localStorage.getItem('hh_session'));
      return session?.access_token || '';
    } catch (e) {
      return '';
    }
  };

  // Handle CSR Report generation API call
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGeneratingReport(true);
    setReportError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = getToken();
      const res = await fetch(`${apiUrl}/api/csr/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ report_year: parseInt(reportYear, 10) }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to generate report');
      }

      const data = await res.json();
      setReportData(data);
    } catch (err) {
      setReportError(err.message || 'Error generating CSR report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Fetch all pledges for this corporate user on mount
  useEffect(() => {
    const fetchPledges = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = getToken();
        const res = await fetch(`${apiUrl}/api/csr/my-pledges`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPledges(data);
        }
      } catch (e) {
        // silently fail, dashboard still usable
      } finally {
        setLoading(false);
      }
    };
    fetchPledges();
  }, []);

  // Separate general pledges (no requirement) from requirement sponsorships
  const generalPledges = pledges.filter((p) => !p.requirement_id);
  const sponsorships = pledges.filter((p) => p.requirement_id);

  // Summary stats from all pledges
  const totalAmount = pledges.reduce((sum, p) => sum + (parseFloat(p.pledged_amount) || 0), 0);
  const totalHours = pledges.reduce((sum, p) => sum + (parseFloat(p.pledged_hours) || 0), 0);

  return (
    <div className="min-h-screen bg-brand-secondary">
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
                <p className="text-2xl font-bold text-brand-dark mt-2">₹{totalAmount.toLocaleString('en-IN')}</p>
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
                <p className="text-2xl font-bold text-brand-dark mt-2">{totalHours} hrs</p>
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
                <p className="text-2xl font-bold text-brand-dark mt-2">{new Set(pledges.map(p => p.ngo_name)).size} NGOs</p>
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
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Pledges</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">{pledges.length}</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Clipboard className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-brand-success mt-4">● General + Requirement Sponsorships</p>
          </div>

        </div>

        {/* Dashboard Content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Left: Pledges & Sponsorships */}
          <div className="lg:col-span-2 space-y-6">

            {/* General CSR Pledges */}
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-sm font-bold text-brand-dark uppercase">CSR Pledges</h2>
                <span className="text-xs text-gray-400 font-mono">{generalPledges.length} Pledges</span>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-md h-6 w-6 border-2 border-brand-primary border-t-transparent mx-auto"></div>
                  <p className="text-xs text-gray-400 mt-2">Loading pledges...</p>
                </div>
              ) : generalPledges.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No general CSR pledges found.</p>
                  <div className="mt-4 flex justify-center gap-4">
                    <Link to="/browse-ngos" className="text-xs font-semibold text-brand-primary border border-brand-primary hover:bg-brand-secondary px-4 py-2 rounded-md transition-all">
                      Browse Verified NGOs
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-brand-border">
                  {generalPledges.map((pledge) => (
                    <div key={pledge.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-brand-dark">{pledge.ngo_name}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="font-bold text-green-700">₹{Number(pledge.pledged_amount).toLocaleString('en-IN')}</span>
                          <span>{pledge.pledged_hours || 0} Volunteer Hours</span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {new Date(pledge.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border bg-amber-50 text-amber-700 border-amber-200 capitalize self-start sm:self-auto">
                        {pledge.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Requirement Sponsorships */}
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-sm font-bold text-brand-dark uppercase">My Requirement Sponsorships</h2>
                <span className="text-xs text-gray-400 font-mono">{sponsorships.length} Sponsorships</span>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-md h-6 w-6 border-2 border-brand-primary border-t-transparent mx-auto"></div>
                  <p className="text-xs text-gray-400 mt-2">Loading sponsorships...</p>
                </div>
              ) : sponsorships.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No requirement sponsorships found.</p>
                  <div className="mt-4 flex justify-center gap-4">
                    <Link to="/browse-ngos" className="text-xs font-semibold text-brand-primary border border-brand-primary hover:bg-brand-secondary px-4 py-2 rounded-md transition-all">
                      Browse NGOs & Sponsor Requirements
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-brand-border">
                  {sponsorships.map((sp) => (
                    <div key={sp.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-brand-dark">{sp.ngo_name}</h3>
                        <p className="text-xs font-medium text-gray-700">
                          <span className="font-semibold text-gray-500">Requirement:</span> {sp.requirement_title}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-0.5">
                          <span className="font-bold text-green-700">₹{Number(sp.pledged_amount).toLocaleString('en-IN')}</span>
                          <span>{sp.pledged_hours || 0} Volunteer Hours</span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {new Date(sp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border bg-amber-50 text-amber-700 border-amber-200 capitalize self-start sm:self-auto">
                        {sp.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Right: Corp Details & CSR Report Generator */}
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

            {/* CSR Report Generator Card */}
            <div className="bg-white border border-brand-border rounded-md p-6">
              <h2 className="text-sm font-bold text-brand-dark uppercase border-b border-brand-border pb-3 mb-4">
                Generate CSR Report
              </h2>
              
              <form onSubmit={handleGenerateReport} className="space-y-4">
                {/* Year selection dropdown */}
                <div>
                  <label htmlFor="report-year" className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Select Report Year
                  </label>
                  <select
                    id="report-year"
                    value={reportYear}
                    onChange={(e) => setReportYear(e.target.value)}
                    className="w-full border border-brand-border rounded px-3 py-2 text-xs font-medium text-brand-dark bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>

                {/* Generate report button */}
                <button
                  type="submit"
                  disabled={generatingReport}
                  className="w-full bg-brand-primary hover:bg-opacity-90 text-white font-bold text-xs py-2.5 px-4 rounded transition-all cursor-pointer disabled:opacity-50"
                >
                  {generatingReport ? 'Generating Report...' : 'Generate Report'}
                </button>
              </form>

              {/* Error message */}
              {reportError && (
                <div className="mt-4 p-3 bg-red-50 border border-brand-error text-brand-error text-xs rounded-md">
                  {reportError}
                </div>
              )}

              {/* Results displayed inside a simple table */}
              {reportData && (
                <div className="mt-6 pt-4 border-t border-brand-border">
                  <h3 className="text-xs font-bold text-brand-dark uppercase mb-3">
                    CSR Report Summary ({reportData.report_year})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-brand-border text-xs">
                      <thead>
                        <tr className="bg-brand-secondary border-b border-brand-border">
                          <th className="p-2 font-bold text-brand-dark border-r border-brand-border">Metric</th>
                          <th className="p-2 font-bold text-brand-dark">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        <tr>
                          <td className="p-2 text-gray-600 font-medium border-r border-brand-border">Total Funding</td>
                          <td className="p-2 font-bold text-green-700">₹{Number(reportData.total_funding).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-gray-600 font-medium border-r border-brand-border">Employee Volunteer Hours</td>
                          <td className="p-2 font-bold text-brand-dark">{reportData.employee_volunteer_hours} hrs</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-gray-600 font-medium border-r border-brand-border">NGOs Supported</td>
                          <td className="p-2 font-bold text-brand-dark">{reportData.ngos_supported}</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-gray-600 font-medium border-r border-brand-border">Sponsored Requirements</td>
                          <td className="p-2 font-bold text-brand-dark">{reportData.sponsored_requirements}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};
export default CorporateDashboard;
