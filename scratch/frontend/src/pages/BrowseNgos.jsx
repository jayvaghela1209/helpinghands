import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Star, X, Building, MapPin, Mail, Award, Shield, FileText, Calendar, Users, DollarSign } from 'lucide-react';

const BrowseNgos = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- State Variables ---
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFocusArea, setSelectedFocusArea] = useState('All');

  // Modal / Detail States
  const [selectedNgoId, setSelectedNgoId] = useState(null);
  const [ngoDetails, setNgoDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // Automatically select NGO if ngo_id parameter is present in URL
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const paramId = query.get('ngo_id');
    if (paramId) {
      setSelectedNgoId(paramId);
    }
  }, [location.search]);

  // Allowed Focus Areas for filtering (aligned with backend lists)
  const focusAreasList = [
    'All',
    'Education',
    'Healthcare',
    'Environment & Sustainability',
    'Gender Equality',
    'Rural Development',
    'Poverty & Hunger',
    'Disaster Relief',
    'Skill Development'
  ];

  // --- Fetch Approved NGOs on Component Mount ---
  useEffect(() => {
    const fetchNgos = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const session = JSON.parse(localStorage.getItem('hh_session'));
        const token = localStorage.getItem('authToken') || session?.access_token;

        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }

        // Fetch NGOs from corporate-only endpoint
        const response = await fetch(`${apiUrl}/api/csr/ngos`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load NGOs: status ${response.status}`);
        }

        const data = await response.json();
        setNgos(data);
      } catch (err) {
        console.error('Error fetching NGOs:', err);
        setErrorMsg(err.message || 'Something went wrong while fetching NGOs.');
      } finally {
        setLoading(false);
      }
    };

    fetchNgos();
  }, []);

  // --- Fetch Single NGO Details when selected ---
  useEffect(() => {
    if (!selectedNgoId) {
      setNgoDetails(null);
      return;
    }

    const fetchNgoDetails = async () => {
      setDetailsLoading(true);
      setDetailsError('');
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const session = JSON.parse(localStorage.getItem('hh_session'));
        const token = localStorage.getItem('authToken') || session?.access_token;

        if (!token) {
          throw new Error('Authentication required.');
        }

        // Fetch detail response containing profile, requirements, and reviews
        const response = await fetch(`${apiUrl}/api/csr/ngos/${selectedNgoId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load NGO details: status ${response.status}`);
        }

        const data = await response.json();
        setNgoDetails(data);
      } catch (err) {
        console.error('Error fetching NGO details:', err);
        setDetailsError(err.message || 'Failed to load details.');
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchNgoDetails();
  }, [selectedNgoId]);

  // --- Filter and Search Logic ---
  const filteredNgos = ngos.filter(ngo => {
    // Search by NGO Name
    const matchesSearch = ngo.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by Focus Area
    const matchesFocusArea = 
      selectedFocusArea === 'All' || 
      (ngo.focus_areas && ngo.focus_areas.includes(selectedFocusArea));
    
    return matchesSearch && matchesFocusArea;
  });

  // --- Helper to Render Star Rating ---
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 fill-brand-accent text-brand-accent flex-shrink-0" />);
      } else if (i === fullStars + 1 && hasHalf) {
        stars.push(
          <div key={i} className="relative inline-block w-4 h-4">
            <Star className="w-4 h-4 text-gray-300 absolute top-0 left-0" />
            <div className="overflow-hidden w-1/2 absolute top-0 left-0">
              <Star className="w-4 h-4 fill-brand-accent text-brand-accent" />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300 flex-shrink-0" />);
      }
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Browse Verified NGOs</h1>
            <p className="text-sm text-gray-500">Explore accredited NGO partners, examine focus areas, ratings, and active requirements for CSR initiatives.</p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search NGOs by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none bg-white focus:ring-1 focus:ring-brand-primary"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Focus Area Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {focusAreasList.map(area => (
            <button
              key={area}
              onClick={() => setSelectedFocusArea(area)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                selectedFocusArea === area
                  ? 'bg-brand-primary border-brand-primary text-white'
                  : 'bg-white border-brand-border text-brand-dark hover:bg-gray-50'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* Global Loading / Error State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
            <p className="text-xs text-gray-500 mt-4 font-medium">Loading verified NGOs...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-red-50 border border-brand-error text-brand-error p-4 rounded-md text-sm mb-8">
            {errorMsg}
          </div>
        ) : filteredNgos.length === 0 ? (
          <div className="bg-white border border-brand-border rounded-md p-16 text-center shadow-xs">
            <p className="text-sm text-gray-500">No approved NGOs match your search query or focus area filter.</p>
          </div>
        ) : (
          /* NGO Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNgos.map(ngo => (
              <div 
                key={ngo.id} 
                onClick={() => setSelectedNgoId(ngo.id)}
                className="bg-white border border-brand-border rounded-md p-6 flex flex-col justify-between hover:border-brand-primary hover:shadow-md cursor-pointer transition-all duration-200"
              >
                <div>
                  {/* NGO header with logo icon */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="p-2.5 bg-brand-secondary border border-brand-border rounded-md text-brand-primary">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-dark text-base line-clamp-1 hover:text-brand-primary transition-colors">
                        {ngo.name}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mr-1" />
                        {ngo.city || 'Location unlisted'}
                      </p>
                    </div>
                  </div>

                  {/* Focus Areas Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {ngo.focus_areas && ngo.focus_areas.length > 0 ? (
                      ngo.focus_areas.slice(0, 3).map((area, idx) => (
                        <span 
                          key={idx}
                          className="text-[10px] font-bold text-brand-primary bg-brand-secondary border border-brand-border px-2 py-0.5 rounded-sm uppercase tracking-wider"
                        >
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">No focus areas specified</span>
                    )}
                    {ngo.focus_areas && ngo.focus_areas.length > 3 && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-sm">
                        +{ngo.focus_areas.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating and Active Opportunities Metrics */}
                <div className="pt-4 border-t border-brand-border flex items-center justify-between text-xs">
                  {/* Reviews Summary */}
                  <div className="flex items-center space-x-1">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 fill-brand-accent text-brand-accent mr-1" />
                      <span className="font-bold text-brand-dark">{ngo.average_rating ? ngo.average_rating : '0.0'}</span>
                    </div>
                    <span className="text-gray-400">({ngo.total_reviews} {ngo.total_reviews === 1 ? 'review' : 'reviews'})</span>
                  </div>

                  {/* Active Requirements */}
                  <div className="text-right">
                    <span className="font-bold text-brand-success bg-green-50 border border-green-100 px-2 py-1 rounded-md text-[11px]">
                      {ngo.active_requirements_count} active needs
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* NGO Details Modal */}
        {selectedNgoId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs transition-opacity duration-300">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-brand-secondary">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-brand-primary" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-primary bg-white border border-brand-border px-2 py-0.5 rounded-md">
                    Verified NGO Partner
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedNgoId(null)}
                  className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {detailsLoading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-4">Loading partner documentation and review ledger...</p>
                  </div>
                ) : detailsError ? (
                  <div className="bg-red-50 border border-brand-error text-brand-error p-4 rounded-md text-sm">
                    {detailsError}
                  </div>
                ) : ngoDetails ? (
                  <>
                    {/* NGO Details Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* NGO Base Info */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h2 className="text-2xl font-bold text-brand-dark">{ngoDetails.profile.name}</h2>
                          <button
                            onClick={() => navigate(`/csr-funding?ngo_id=${ngoDetails.profile.id}`)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-md shadow-xs text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                          >
                            <DollarSign className="w-4 h-4" />
                            <span>CSR Pledge</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ngoDetails.profile.focus_areas?.map((area, idx) => (
                            <span 
                              key={idx}
                              className="text-xs font-bold text-brand-primary bg-brand-secondary border border-brand-border px-2.5 py-1 rounded-sm uppercase tracking-wider"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>City: <strong className="text-brand-dark">{ngoDetails.profile.city || 'N/A'}</strong></span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>Email: <strong className="text-brand-dark">{ngoDetails.profile.email || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* NGO Verification & Accreditation Specs */}
                      <div className="bg-brand-secondary border border-brand-border rounded-md p-4 space-y-3 text-xs">
                        <div className="flex items-center space-x-2 text-brand-primary font-bold border-b border-brand-border pb-2 uppercase tracking-wide text-[10px]">
                          <Award className="w-4 h-4 text-brand-accent" />
                          <span>Accreditation & KYC specs</span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-gray-400 block font-semibold uppercase text-[9px]">Darpan ID</span>
                            <span className="text-brand-dark font-mono font-medium">{ngoDetails.profile.darpan_id || 'Not Provided'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold uppercase text-[9px]">Registration Number</span>
                            <span className="text-brand-dark font-mono font-medium">{ngoDetails.profile.registration_number || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block font-semibold uppercase text-[9px]">PAN number</span>
                            <span className="text-brand-dark font-mono font-medium">{ngoDetails.profile.pan_number || 'Not Provided'}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Active Opportunities Section */}
                    <div>
                      <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider border-b border-brand-border pb-2 mb-4 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-brand-primary" />
                        <span>Active Social Needs ({ngoDetails.requirements.length})</span>
                      </h3>

                      {ngoDetails.requirements.length === 0 ? (
                        <div className="bg-brand-secondary border border-brand-border p-6 text-center rounded-md text-xs text-gray-500">
                          This NGO currently has no active volunteering opportunities.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ngoDetails.requirements.map(req => (
                            <div 
                              key={req.id} 
                              className="border border-brand-border hover:border-gray-300 rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors"
                            >
                              <div className="space-y-1">
                                <h4 className="font-bold text-brand-dark text-sm">{req.title}</h4>
                                <p className="text-xs text-gray-500 line-clamp-1">{req.description}</p>
                                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-400">
                                  <span className="bg-brand-secondary px-2 py-0.5 rounded border border-brand-border text-brand-primary font-semibold uppercase tracking-wider">{req.category}</span>
                                  <span className="flex items-center"><Calendar className="w-3 h-3 mr-1 text-gray-400" /> {req.event_date}</span>
                                  <span className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-gray-400" /> {req.location_name}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 text-xs shrink-0 self-end sm:self-center">
                                <span className="text-gray-500 font-medium flex items-center">
                                  <Users className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                  {req.seats_filled} / {req.seats_total} Filled
                                </span>
                                {req.is_urgent && (
                                  <span className="text-[10px] uppercase font-bold text-brand-error bg-red-50 border border-brand-error px-2 py-0.5 rounded-sm">
                                    Urgent
                                  </span>
                                )}
                                <button
                                  onClick={() => navigate(`/sponsor-requirement?ngo_id=${ngoDetails.profile.id}&requirement_id=${req.id}`)}
                                  className="bg-brand-primary hover:bg-opacity-90 text-white font-bold text-[11px] px-3 py-1.5 rounded transition-colors cursor-pointer shrink-0"
                                >
                                  Sponsor Requirement
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Volunteer Reviews Section */}
                    <div>
                      <div className="flex items-center justify-between border-b border-brand-border pb-2 mb-4">
                        <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider flex items-center space-x-2">
                          <Star className="w-4 h-4 text-brand-accent fill-brand-accent" />
                          <span>Volunteer Review Ledger ({ngoDetails.reviews.length})</span>
                        </h3>
                        <div className="flex items-center space-x-1.5 text-xs">
                          <span className="font-bold text-brand-dark">{ngoDetails.profile.average_rating}</span>
                          <div className="flex">{renderStars(ngoDetails.profile.average_rating)}</div>
                        </div>
                      </div>

                      {ngoDetails.reviews.length === 0 ? (
                        <div className="bg-brand-secondary border border-brand-border p-6 text-center rounded-md text-xs text-gray-500">
                          No volunteer reviews recorded for this NGO yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {ngoDetails.reviews.map(review => (
                            <div key={review.id} className="border-b border-brand-border last:border-0 pb-4 last:pb-0">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-brand-dark text-xs">{review.volunteer_name}</h4>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <div className="flex">{renderStars(review.rating)}</div>
                              </div>
                              <p className="text-xs text-gray-600 italic bg-brand-secondary/50 p-3 rounded-md border border-brand-border/40 mt-1">
                                "{review.review_comment || 'No review comment provided.'}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CSR Pledges Section */}
                    <div>
                      <div className="flex items-center justify-between border-b border-brand-border pb-2 mb-4">
                        <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-brand-primary" />
                          <span>CSR Pledges ({ngoDetails.pledges ? ngoDetails.pledges.length : 0})</span>
                        </h3>
                      </div>

                      {!ngoDetails.pledges || ngoDetails.pledges.length === 0 ? (
                        <div className="bg-brand-secondary border border-brand-border p-6 text-center rounded-md text-xs text-gray-500">
                          No CSR pledges yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ngoDetails.pledges.map(pledge => (
                            <div 
                              key={pledge.id} 
                              className="border border-brand-border rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white"
                            >
                              <div className="space-y-1">
                                <h4 className="font-bold text-brand-dark text-sm">{pledge.corporate_name || 'Corporate Partner'}</h4>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                  <span className="font-semibold text-green-700">
                                    ${Number(pledge.pledged_amount).toLocaleString()}
                                  </span>
                                  <span>{pledge.pledged_hours || 0} Volunteer Hours</span>
                                  <span className="text-[11px] text-gray-400 font-mono">
                                    {new Date(pledge.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                <span className="text-xs uppercase font-bold px-2.5 py-1 rounded border tracking-wider bg-amber-50 text-amber-700 border-amber-200 capitalize">
                                  {pledge.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-brand-border flex justify-end bg-brand-secondary">
                <button
                  onClick={() => setSelectedNgoId(null)}
                  className="px-4 py-2 border border-brand-border bg-white hover:bg-gray-50 text-brand-dark font-semibold text-xs rounded-md shadow-2xs transition-all cursor-pointer"
                >
                  Close Profile
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default BrowseNgos;
