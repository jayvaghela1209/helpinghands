import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users, CheckCircle, XCircle, AlertCircle, ArrowLeft, Calendar, MapPin, Award } from 'lucide-react';

export const ReviewApplicants = () => {
  const { reqId } = useParams();
  const navigate = useNavigate();

  const [requirement, setRequirement] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch requirement details
      const reqRes = await fetch(`${apiUrl}/api/requirements/${reqId}/details`, { headers });
      if (!reqRes.ok) throw new Error('Failed to fetch requirement details.');
      const reqData = await reqRes.json();
      setRequirement(reqData);

      // 2. Fetch applications
      const appRes = await fetch(`${apiUrl}/api/requirements/${reqId}/applicants`, { headers });
      if (!appRes.ok) throw new Error('Failed to fetch applicants list.');
      const appData = await appRes.json();
      setApplications(appData);

    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reqId) {
      fetchData();
    }
  }, [reqId]);

  const handleDecision = async (appId, newStatus) => {
    setActionLoadingId(appId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const response = await fetch(`${apiUrl}/api/applications/${appId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Failed to set application to ${newStatus}`);
      }

      setSuccessMsg(`Application ${newStatus} successfully!`);
      // Refresh requirement and applicants list
      fetchData();

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter pending applications per user requirement specification
  const pendingApplications = applications.filter(a => a.status === 'pending');
  const acceptedApplications = applications.filter(a => a.status === 'accepted');

  const isFull = requirement ? (requirement.seats_filled || 0) >= requirement.seats_total : false;

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Navigation & Header */}
        <div className="mb-8">
          <Link to="/ngo/manage-requirements" className="text-xs text-gray-500 hover:underline flex items-center mb-3">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Manage Requirements
          </Link>
          
          {requirement && (
            <div className="bg-white border border-brand-border rounded-md p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-4 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-brand-primary text-brand-primary bg-blue-50 rounded-sm mb-2 inline-block">
                    {requirement.category || 'General'}
                  </span>
                  <h1 className="text-xl font-bold text-brand-dark">{requirement.title}</h1>
                </div>
                <div className="flex items-center space-x-3 text-xs bg-gray-50 border border-brand-border px-4 py-2.5 rounded-md">
                  <Users className="w-4 h-4 text-brand-primary" />
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Seat Occupancy</span>
                    <strong className="text-brand-dark text-sm">
                      {requirement.seats_filled || 0} / {requirement.seats_total} Seats
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1" />
                  Date: {requirement.event_date}
                </span>
                <span className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mr-1" />
                  Location: {requirement.location_name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Feedback Banners */}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-brand-success rounded-md text-brand-success text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-brand-error rounded-md text-brand-error text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isFull && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-400 rounded-md text-yellow-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>This requirement has reached maximum capacity ({requirement?.seats_total} seats filled). Additional accepts are disabled.</span>
          </div>
        )}

        {/* Pending Applicants List */}
        <div className="bg-white border border-brand-border rounded-md shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-gray-50">
            <h2 className="text-xs font-bold text-brand-dark uppercase tracking-wider">
              Pending Applications ({pendingApplications.length})
            </h2>
            <span className="text-[11px] text-gray-500">
              Review volunteer qualifications before accepting
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
              <p className="text-xs text-gray-500 mt-4">Loading applications...</p>
            </div>
          ) : pendingApplications.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              No pending applications to review for this requirement.
            </div>
          ) : (
            <div className="divide-y divide-brand-border">
              {pendingApplications.map((app) => {
                const isProcessing = actionLoadingId === app.id;
                const skillList = Array.isArray(app.skill_tags) ? app.skill_tags : [];

                return (
                  <div key={app.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    {/* Volunteer info */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-brand-dark">{app.name}</h3>
                        <span className="text-[10px] text-gray-400">({app.email})</span>
                      </div>

                      {app.phone && (
                        <p className="text-xs text-gray-500">Phone: {app.phone} {app.city ? `| ${app.city}` : ''}</p>
                      )}

                      {/* Volunteer Skills */}
                      <div>
                        <span className="text-[11px] text-gray-400 font-semibold block mb-1">Volunteer Skills:</span>
                        {skillList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {skillList.map((skill, idx) => (
                              <span key={idx} className="text-[10px] bg-brand-secondary border border-brand-border px-2 py-0.5 rounded-sm text-brand-dark font-medium flex items-center">
                                <Award className="w-2.5 h-2.5 mr-1 text-brand-primary" />
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No skills specified</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <button
                        onClick={() => handleDecision(app.id, 'rejected')}
                        disabled={isProcessing}
                        className="py-2 px-4 border border-brand-error text-brand-error bg-red-50 hover:bg-red-100 rounded-md text-xs font-bold transition-all disabled:opacity-50 flex items-center cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </button>

                      <button
                        onClick={() => handleDecision(app.id, 'accepted')}
                        disabled={isProcessing || isFull}
                        className="py-2 px-4 bg-brand-primary hover:bg-opacity-95 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 flex items-center cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {isProcessing ? 'Saving...' : 'Accept'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
          {/* Continue to Attendance */}
          {requirement && (
            <div className="flex justify-end mb-8">
              <Link to={`/ngo/requirements/${reqId}/verify`} className="py-2 px-4 bg-brand-primary text-white text-xs font-semibold rounded-md hover:bg-opacity-95">
                Continue to Attendance
              </Link>
            </div>
          )}
        {/* Accepted Volunteers List (Summary) */}
        {acceptedApplications.length > 0 && (
          <div className="bg-white border border-brand-border rounded-md shadow-sm">
            <div className="px-6 py-3 border-b border-brand-border bg-gray-50">
              <h3 className="text-xs font-bold text-brand-dark uppercase tracking-wider">
                Accepted Volunteers ({acceptedApplications.length})
              </h3>
            </div>
            <div className="p-4 divide-y divide-brand-border">
              {acceptedApplications.map((app) => (
                <div key={app.id} className="py-2 flex justify-between items-center text-xs">
                  <div>
                    <strong className="text-brand-dark">{app.name}</strong>
                    <span className="text-gray-400 ml-2">({app.email})</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 border border-brand-success text-brand-success bg-green-50 rounded-sm">
                    Accepted
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ReviewApplicants;
