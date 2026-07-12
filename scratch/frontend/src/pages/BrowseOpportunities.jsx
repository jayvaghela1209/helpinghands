import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Calendar, Users, AlertCircle, CheckCircle, Flame } from 'lucide-react';

export const BrowseOpportunities = () => {
  const { user } = useAuth();
  
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [appliedRequirementIds, setAppliedRequirementIds] = useState(new Set());
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const categories = ['All', 'Education', 'Environment', 'Health', 'Disasters', 'Animal Welfare', 'Senior Support', 'Others'];

  const fetchOpportunities = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/requirements`);
      if (!response.ok) throw new Error('Failed to load opportunities');
      
      const data = await response.json();
      setOpportunities(data);
    } catch (err) {
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
        const ids = new Set(data.map(app => app.requirement_id));
        setAppliedRequirementIds(ids);
      }
    } catch (err) {
      console.error('Error fetching applications status:', err);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    if (user) {
      fetchMyApplications();
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
      setAppliedRequirementIds(prev => new Set([...prev, reqId]));
      
      // Update local state seat count
      setOpportunities(prev =>
        prev.map(opp => opp.id === reqId ? { ...opp, seats_filled: opp.seats_filled } : opp)
      );

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter logic
  const filtered = opportunities.filter(opp => {
    const matchesSearch = 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (opp.location_name && opp.location_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || opp.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-brand-secondary">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        
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
              const isApplied = appliedRequirementIds.has(opp.id);
              const isFull = opp.seats_filled >= opp.seats_total;

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
                    <h3 className="font-bold text-brand-dark text-base line-clamp-1 mb-2 pr-12">{opp.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-3 mb-6">{opp.description}</p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-brand-border text-xs text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>Event Date: <strong>{opp.event_date}</strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="line-clamp-1">{opp.location_name || 'Virtual Opportunity'}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>Seats filled: <strong>{opp.seats_filled} / {opp.seats_total}</strong></span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4">
                    {isApplied ? (
                      <button
                        disabled
                        className="w-full py-2 bg-brand-secondary border border-brand-border text-brand-primary font-bold text-xs rounded-md cursor-not-allowed text-center"
                      >
                        ✓ Applied
                      </button>
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
