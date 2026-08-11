import React, { useState, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { UserCheck, UserX, Calendar, MapPin, Users, Flame, CheckCircle, AlertCircle, Search, ArrowLeft, Download } from 'lucide-react';
import { formatWorkedHours } from '../lib/format';

const BrowseOpportunities = () => {
  const { user } = useAuth();
  
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [appliedRequirementIds, setAppliedRequirementIds] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const categories = ['All', 'Education', 'Environment', 'Health', 'Disasters', 'Animal Welfare', 'Senior Support', 'Others'];

  const fetchOpportunities = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/requirements?ts=${Date.now()}`);
      if (!response.ok) throw new Error(`Failed to load opportunities (status ${response.status})`);

      const data = await response.json();
      console.log('Fetched opportunities response:', data);
      const opportunitiesArray = Array.isArray(data) ? data : (data.requirements || []);
      setOpportunities(opportunitiesArray);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      
      const response = await fetch(`${apiUrl}/api/volunteers/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mapping = {};
        data.forEach(app => {
            mapping[app.requirement_id] = {
              appId: app.id,
              status: app.status,
              attendance_status: app.attendance_status
            };
        });
        setAppliedRequirementIds(mapping);
      }
    } catch (err) {
      console.error('Error fetching applications status:', err);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    if (user) {
      fetchMyApplications();
      const interval = setInterval(fetchMyApplications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleApply = async (reqId) => {
    setActionLoadingId(reqId);
    setErrorMsg('');
    setActionSuccessMsg('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const response = await fetch(`${apiUrl}/api/requirements/${reqId}/apply`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Application failed.');
      }

      setActionSuccessMsg('Applied successfully! NGO will review your application.');
      await fetchMyApplications();

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWithdraw = async (appId) => {
    setActionLoadingId(appId);
    setErrorMsg('');
    setActionSuccessMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const response = await fetch(`${apiUrl}/api/applications/${appId}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Withdraw failed');
      }
      setActionSuccessMsg('Application withdrawn successfully');
      await fetchMyApplications();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadCert = async (appId, reqId) => {
    setActionLoadingId(appId);
    setErrorMsg('');
    setActionSuccessMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const res = await fetch(`${apiUrl}/api/applications/${appId}/certificate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to download certificate');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HelpingHands_Certificate_${reqId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setActionSuccessMsg('Certificate downloaded successfully!');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter logic: Only requirements with status === 'open' are shown
  const filtered = opportunities.filter(opp => {
    const isOpen = opp.status === 'open';
    const matchesSearch = 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (opp.location_name && opp.location_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || opp.category === selectedCategory;

    return isOpen && matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-brand-secondary">

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Back to Dashboard link */}
        {user && user.role === 'volunteer' && (
          <div className="mb-4">
            <Link to="/volunteer-dashboard" className="inline-flex items-center text-xs font-semibold text-brand-primary hover:underline">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Volunteer Opportunities</h1>
            <p className="text-sm text-gray-500">Find verified social assignments, perform geo-checkins and earn credit points.</p>
          </div>

          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search by title, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none bg-white focus:ring-1 focus:ring-brand-primary"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionSuccessMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-brand-success rounded-md text-brand-success text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-brand-error rounded-md text-brand-error text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Categories filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'bg-white border-brand-border text-brand-dark hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* List of Opportunities */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
            <p className="text-xs text-gray-500 mt-4">Loading active opportunities...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-brand-border rounded-md p-16 text-center">
            <p className="text-sm text-gray-500">No active opportunities match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(opp => {
              const appInfo = appliedRequirementIds[opp.id];
              const isApplied = !!appInfo;
              const isFull = opp.seats_filled >= opp.seats_total;
              const status = appInfo ? appInfo.status : null;
              const attendanceStatus = appInfo ? appInfo.attendance_status : 'none';

              return (
                <div key={opp.id} className="bg-white border border-brand-border rounded-md p-6 flex flex-col justify-between hover:border-gray-400 transition-all relative">
                  
                  {opp.is_urgent && (
                    <span className="absolute top-4 right-4 flex items-center text-[10px] uppercase font-bold text-brand-error bg-red-50 border border-brand-error px-2 py-0.5 rounded-sm">
                      <Flame className="w-3 h-3 mr-1 inline" /> Urgent
                    </span>
                  )}

                  <div>
                    <span className="inline-block text-[10px] font-bold text-brand-primary bg-brand-secondary border border-brand-border px-2 py-0.5 rounded-sm uppercase tracking-wider mb-3">
                      {opp.category}
                    </span>
                      <h3 className="font-bold text-brand-dark text-base line-clamp-1 mb-2 pr-12">
                        <Link to={`/requirement/${opp.id}`} className="hover:underline">{opp.title}</Link>
                      </h3>
                    <p className="text-xs text-gray-500 line-clamp-3 mb-6">{opp.description}</p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-brand-border text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>Event Date: <strong>{opp.event_date}</strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {(() => {
                          // Show the stored location name if present and non-empty.
                          // For legacy coordinate-only requirements (sentinel 0,0 or real coords
                          // but no name), show the coordinate pair.
                          // Only show "Virtual Opportunity" when there is genuinely no location
                          // data at all — no name, no usable coordinates.
                          const name = opp.location_name?.trim();
                          if (name) return name;
                          const lat = opp.event_latitude != null ? parseFloat(opp.event_latitude) : null;
                          const lon = opp.event_longitude != null ? parseFloat(opp.event_longitude) : null;
                          const hasRealCoords =
                            lat !== null &&
                            lon !== null &&
                            !(lat === 0.0 && lon === 0.0);
                          if (hasRealCoords) return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
                          return 'Virtual Opportunity';
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>Seats filled: <strong>{opp.seats_filled} / {opp.seats_total}</strong></span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4">
                    {isApplied ? (
                      <div className="flex flex-col space-y-2">
                        <button
                          disabled
                          className="w-full py-2 bg-brand-secondary border border-brand-border text-brand-primary font-bold text-xs rounded-md cursor-not-allowed text-center capitalize"
                        >
                          ✓ {status} {attendanceStatus !== 'none' ? `(${attendanceStatus})` : ''}
                        </button>
                        {/* Allow withdraw ONLY before check-in (not checked_in or verified) */}
                        {(status === 'pending' || status === 'accepted') &&
                          (attendanceStatus !== 'checked_in' && attendanceStatus !== 'verified') && (
                            <button
                              onClick={() => handleWithdraw(appInfo.appId)}
                              disabled={actionLoadingId === appInfo.appId}
                              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition-all cursor-pointer"
                            >
                              {actionLoadingId === appInfo.appId ? 'Withdrawing...' : 'Withdraw'}
                            </button>
                          )}
                        {/* Download Certificate action if verified */}
                        {attendanceStatus === 'verified' && (
                          <button
                            onClick={() => handleDownloadCert(appInfo.appId, opp.id)}
                            disabled={actionLoadingId === appInfo.appId}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-md transition-all cursor-pointer flex items-center justify-center space-x-1"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            <span>
                              {actionLoadingId === appInfo.appId
                                ? 'Processing...'
                                : (appInfo.has_certificate ? 'Download Certificate' : 'Generate Certificate')
                              }
                            </span>
                          </button>
                        )}
                      </div>
                    ) : isFull ? (
                      <button
                        disabled
                        className="w-full py-2 bg-brand-secondary border border-brand-border text-gray-400 font-bold text-xs rounded-md cursor-not-allowed text-center"
                      >
                        Seats Filled
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApply(opp.id)}
                        disabled={actionLoadingId === opp.id}
                        className="w-full py-2 bg-brand-primary hover:bg-opacity-95 text-white font-bold text-xs rounded-md transition-all cursor-pointer text-center"
                      >
                        {actionLoadingId === opp.id ? 'Applying...' : 'Apply Now'}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
};
export default BrowseOpportunities;
