import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, XCircle, Clock, Check, Star, ArrowLeft, Download } from 'lucide-react';
import { formatWorkedHours } from '../lib/format';

export const MyApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingApp, setRatingApp] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [commentValue, setCommentValue] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const data = await api.get('/api/volunteers/applications');
        setApplications(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (!user) return;
    fetchApps();
    const intervalId = setInterval(fetchApps, 15000);
    return () => clearInterval(intervalId);
  }, [user]);

  const statusBadge = (status, attendanceStatus) => {
    let color = 'bg-gray-200 text-gray-800';
    let Icon = Clock;
    let label = status;
    if (attendanceStatus === 'verified') {
      color = 'bg-indigo-100 text-indigo-800';
      Icon = CheckCircle;
      label = 'verified';
    } else if (attendanceStatus === 'checked_in') {
      color = 'bg-blue-100 text-blue-800';
      Icon = CheckCircle;
      label = 'checked-in';
    } else if (status === 'pending') { color = 'bg-yellow-100 text-yellow-800'; Icon = Clock; }
    else if (status === 'accepted') { color = 'bg-green-100 text-green-800'; Icon = CheckCircle; }
    else if (status === 'rejected') { color = 'bg-red-100 text-red-800'; Icon = XCircle; }
    else if (status === 'withdrawn') { color = 'bg-gray-100 text-gray-800'; Icon = AlertCircle; }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs capitalize ${color}`}>
        <Icon className="w-3 h-3 mr-1" />{label}
      </span>
    );
  };

  const [checkInMsg, setCheckInMsg] = useState({});

  const handleCheckIn = (appId, requirementId) => {
    if (!navigator.geolocation) {
      setCheckInMsg(prev => ({ ...prev, [appId]: 'Geolocation not supported' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Diagnostic log — GPS values from browser
        console.log('[CheckIn] GPS coords from navigator.geolocation:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Endpoint uses requirement id, NOT application id
        console.log('[CheckIn] Sending payload to POST /api/requirements/' + requirementId + '/checkin', payload);

        try {
          await api.post(`/api/requirements/${requirementId}/checkin`, payload);
          setApplications(prev => prev.map(app => app.id === appId ? { ...app, attendance_status: 'checked_in' } : app));
          setCheckInMsg(prev => ({ ...prev, [appId]: 'Checked in successfully' }));
        } catch (err) {
          setCheckInMsg(prev => ({ ...prev, [appId]: err.message || 'Check‑in failed' }));
        }
      },
      (geoErr) => {
        setCheckInMsg(prev => ({ ...prev, [appId]: geoErr.message || 'Unable to get location' }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCheckOut = (appId) => {
    if (!navigator.geolocation) {
      setCheckInMsg(prev => ({ ...prev, [appId]: 'Geolocation not supported' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post(`/api/applications/${appId}/checkout`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setApplications(prev => prev.map(app => app.id === appId ? { ...app, attendance_status: 'verified' } : app));
          setCheckInMsg(prev => ({ ...prev, [appId]: 'Checked out and verified' }));
        } catch (err) {
          setCheckInMsg(prev => ({ ...prev, [appId]: err.message || 'Check‑out failed' }));
        }
      },
      (geoErr) => {
        setCheckInMsg(prev => ({ ...prev, [appId]: geoErr.message || 'Unable to get location' }));
      }
    );
  };

  const handleDownloadCert = async (appId, reqId) => {
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
      
      // Update local state to reflect certificate existence immediately!
      setApplications(prev => prev.map(app => app.id === appId ? { ...app, has_certificate: true } : app));
    } catch (err) {
      setCheckInMsg(prev => ({ ...prev, [appId]: err.message || 'Certificate download failed' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-secondary"><Navbar /><div className="text-center py-16">Loading...</div></div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-secondary">

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link to="/volunteer-dashboard" className="inline-flex items-center text-xs font-semibold text-brand-primary hover:underline">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-brand-dark mb-4">My Applications</h1>
        {error && <p className="text-red-600">{error}</p>}
        {applications.length === 0 ? (
          <p className="text-gray-500">You have not applied to any opportunities yet.</p>
        ) : (
          <div className="space-y-4">
            {applications.map(app => {
              const attStatus = app.attendance_status || 'none';
              return (
                <div key={app.id} className="bg-white p-4 rounded border border-brand-border">
                  <div className="flex justify-between items-center mb-2">
                    <Link to={`/requirement/${app.requirement_id}`} className="text-brand-primary font-semibold hover:underline">
                      {app.title}
                    </Link>
                    {statusBadge(app.status, attStatus)}
                  </div>
                  <p className="text-sm text-gray-600">Applied on: {new Date(app.applied_at).toLocaleDateString()}</p>
                  {app.decided_at && (
                    <p className="text-sm text-gray-600">Decision on: {new Date(app.decided_at).toLocaleDateString()}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{app.category} • {app.event_date} • {app.location_name}</p>
                  {app.worked_hours > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Worked Time: <strong>{formatWorkedHours(app.worked_hours)}</strong>
                    </p>
                  )}

                  {/* Attendance Actions */}
                  {app.status === 'accepted' && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {attStatus === 'none' && (
                        <button
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 flex items-center cursor-pointer"
                          onClick={() => handleCheckIn(app.id, app.requirement_id)}
                        >
                          <Check className="w-3 h-3 mr-1" />Check‑In
                        </button>
                      )}
                      {attStatus === 'checked_in' && (
                        <button
                          className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 flex items-center cursor-pointer"
                          onClick={() => handleCheckOut(app.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />Check‑Out
                        </button>
                      )}
                      {attStatus === 'verified' && (
                        <>
                          <button
                            className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 flex items-center cursor-pointer animate-fade-in"
                            onClick={() => handleDownloadCert(app.id, app.requirement_id)}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            <span>{app.has_certificate ? 'Download Certificate' : 'Generate Certificate'}</span>
                          </button>
                          {!app.has_review && (
                            <button
                              className="px-3 py-1 bg-yellow-600 text-white text-xs font-semibold rounded hover:bg-yellow-700 flex items-center cursor-pointer"
                              onClick={() => setRatingApp(app)}
                            >
                              <Star className="w-3 h-3 mr-1" />Rate NGO
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {checkInMsg[app.id] && (
                    <p className="text-sm mt-2 text-gray-700">{checkInMsg[app.id]}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      {/* Rating Modal */}
      {ratingApp && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Rate NGO</h2>
            <p className="mb-2">Provide a rating for {ratingApp.title}</p>
            <div className="flex space-x-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRatingValue(star)}>
                  <Star className={`w-5 h-5 ${ratingValue >= star ? 'text-yellow-400' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              className="w-full border rounded p-2 mb-4"
              placeholder="Optional comment"
              value={commentValue}
              onChange={(e) => setCommentValue(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                onClick={() => { setRatingApp(null); setSubmitMsg(''); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={async () => {
                  try {
                    await api.post('/api/reviews', {
                      volunteer_profile_id: ratingApp.volunteer_profile_id,
                      ngo_profile_id: ratingApp.ngo_profile_id,
                      requirement_id: ratingApp.requirement_id,
                      rating: ratingValue,
                      review_comment: commentValue,
                    });
                    setSubmitMsg('Review submitted');
                    setApplications(prev =>
                      prev.map(app => app.id === ratingApp.id ? { ...app, has_review: true } : app)
                    );
                    setRatingApp(null);
                  } catch (err) {
                    setSubmitMsg(err.message || 'Submission failed');
                  }
                }}
              >
                Submit
              </button>
            </div>
            {submitMsg && <p className="mt-2 text-sm text-green-600">{submitMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyApplications;
