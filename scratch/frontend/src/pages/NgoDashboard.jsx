import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Users, Star, ClipboardList, Plus, MapPin, Calendar, Edit, Building2 } from 'lucide-react';

export const NgoDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [requirements, setRequirements] = useState([]);
  const [ngoProfile, setNgoProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch requirements and NGO profile in parallel
        const [reqRes, profRes] = await Promise.all([
          fetch(`${apiUrl}/api/requirements/ngo`, { headers }),
          fetch(`${apiUrl}/api/ngo/profile`, { headers })
        ]);

        if (!reqRes.ok) {
          throw new Error('Failed to fetch NGO requirements');
        }
        const reqData = await reqRes.json();
        setRequirements(reqData);

        if (profRes.ok) {
          const profData = await profRes.json();
          setNgoProfile(profData);
        }

      } catch (err) {
        setError(err.message || 'Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeNeedsCount = requirements.filter(r => r.status === 'open').length;
  const totalFilledSeats = requirements.reduce((acc, r) => acc + (r.seats_filled || 0), 0);

  const orgName = ngoProfile?.has_profile ? ngoProfile.organization_name : (profile?.name || 'NGO Partner');
  const verificationStatus = ngoProfile?.has_profile ? ngoProfile.verification_status : 'pending';

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">NGO Operations Panel</h1>
            <p className="text-sm text-gray-500">Post community requirements, manage volunteer applications, and coordinate check-ins.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/ngo-onboarding"
              className="flex items-center space-x-1.5 text-xs font-bold text-brand-dark bg-white border border-brand-border hover:bg-gray-50 px-4 py-2.5 rounded-md transition-all shadow-sm"
            >
              <Building2 className="w-4 h-4 text-brand-primary" />
              <span>{ngoProfile?.has_profile ? 'Edit Profile' : 'Complete Onboarding'}</span>
            </Link>
            <Link
              to="/ngo/manage-requirements"
              className="flex items-center space-x-1.5 text-xs font-bold text-brand-dark bg-white border border-brand-border hover:bg-gray-50 px-4 py-2.5 rounded-md transition-all shadow-sm"
            >
              <Briefcase className="w-4 h-4 text-brand-primary" />
              <span>Manage Requirements</span>
            </Link>
            <button
              onClick={() => navigate('/post-requirement')}
              className="flex items-center space-x-2 text-xs font-bold text-white bg-brand-primary hover:bg-opacity-90 px-4 py-2.5 rounded-md transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Requirement</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Active Needs</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">{activeNeedsCount} Posts</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Briefcase className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Current open opportunities</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Registered Volunteers</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">{totalFilledSeats}</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Users className="w-5 h-5 text-brand-primary" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Seats filled across posts</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Requirements</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">{requirements.length}</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <ClipboardList className="w-5 h-5 text-brand-accent" />
              </div>
            </div>
            <p className="text-xs text-brand-success mt-4">● Total created opportunities</p>
          </div>

          <div className="bg-white p-6 border border-brand-border rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Trust Rating</p>
                <p className="text-2xl font-bold text-brand-dark mt-2">No ratings yet</p>
              </div>
              <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">Ratings appear after verified events</p>
          </div>

        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Left: Requirements List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-sm font-bold text-brand-dark uppercase">Requirements List</h2>
                <span className="text-xs text-gray-400 font-mono">{requirements.length} Requirements</span>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-md h-6 w-6 border-2 border-brand-primary border-t-transparent mx-auto"></div>
                  <p className="text-xs text-gray-400 mt-2">Loading requirements...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-xs text-brand-error">
                  {error}
                </div>
              ) : requirements.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">You haven't posted any requirements yet.</p>
                  <button
                    onClick={() => navigate('/post-requirement')}
                    className="mt-4 text-xs font-semibold text-white bg-brand-primary hover:bg-opacity-90 px-4 py-2 rounded-md transition-all cursor-pointer"
                  >
                    Post New Requirement
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-brand-border">
                  {requirements.map((req) => (
                    <div key={req.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-brand-dark">{req.title}</h3>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-sm ${req.status === 'open'
                              ? 'bg-green-50 border-brand-success text-brand-success'
                              : 'bg-gray-50 border-gray-300 text-gray-500'
                            }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 text-gray-400 mr-1" />
                            {req.location_name || 'N/A'}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 text-gray-400 mr-1" />
                            {req.event_date}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Seats: <strong className="text-brand-dark">{req.seats_filled || 0} / {req.seats_total}</strong> filled
                        </p>
                      </div>

                      <Link
                        to={`/ngo/requirements/${req.id}/verify`}
                        className="py-2 px-4 border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white rounded-md text-xs font-bold transition-all text-center"
                      >
                        Manage & Verify
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Right: NGO Details */}
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md p-6">
              <div className="flex justify-between items-center border-b border-brand-border pb-3 mb-4">
                <h2 className="text-sm font-bold text-brand-dark uppercase">NGO Profile Details</h2>
                <Link to="/ngo-onboarding" className="text-xs text-brand-primary hover:underline font-semibold flex items-center">
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Link>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Organization Name</span>
                  <span className="text-brand-dark font-medium text-sm">{orgName}</span>
                </div>

                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Registered Email</span>
                  <span className="text-brand-dark font-medium text-sm">{profile?.email}</span>
                </div>

                {ngoProfile?.registration_number && (
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold">Registration Number</span>
                    <span className="text-brand-dark font-medium">{ngoProfile.registration_number}</span>
                  </div>
                )}

                {ngoProfile?.focus_areas && ngoProfile.focus_areas.length > 0 && (
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold mb-1">Focus Areas</span>
                    <div className="flex flex-wrap gap-1">
                      {ngoProfile.focus_areas.map((fa, i) => (
                        <span key={i} className="text-[10px] bg-brand-secondary border border-brand-border px-2 py-0.5 rounded-sm text-brand-dark font-medium">
                          {fa}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-gray-400 block uppercase font-semibold">Verification Status</span>
                  <span className={`inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-md ${verificationStatus === 'approved' || verificationStatus === 'verified'
                      ? 'border-brand-success text-brand-success bg-green-50'
                      : 'border-yellow-500 text-yellow-600 bg-yellow-50'
                    }`}>
                    {verificationStatus}
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
export default NgoDashboard;
