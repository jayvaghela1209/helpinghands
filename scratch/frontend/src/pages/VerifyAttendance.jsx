import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { UserCheck, UserX, CheckCircle, AlertCircle, MapPin, Clock } from 'lucide-react';

export const VerifyAttendance = () => {
  const { reqId } = useParams();
  const navigate = useNavigate();

  const [requirement, setRequirement] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      // 1. Fetch requirement details
      const reqRes = await fetch(`${apiUrl}/api/requirements/${reqId}`);
      if (!reqRes.ok) throw new Error('Requirement details not found');
      const reqData = await reqRes.json();
      setRequirement(reqData);

      // 2. Fetch applicants
      const appRes = await fetch(`${apiUrl}/api/requirements/${reqId}/applicants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (appRes.ok) {
        const appData = await appRes.json();
        setApplicants(appData);
      }

      // 3. Fetch attendance logs
      const attRes = await fetch(`${apiUrl}/api/requirements/${reqId}/attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData);
      }

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reqId) {
      fetchData();
    }
  }, [reqId]);

  const handleDecide = async (appId, status) => {
    setActionLoading(appId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const res = await fetch(`${apiUrl}/api/applications/${appId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Action failed');

      setSuccessMsg(`Application successfully ${status === 'accepted' ? 'accepted' : 'rejected'}!`);
      fetchData(); // reload
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualVerify = async (attId) => {
    setActionLoading(attId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const res = await fetch(`${apiUrl}/api/attendance/${attId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Action failed');

      setSuccessMsg('Attendance confirmed successfully and volunteer rewarded!');
      fetchData(); // reload
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-secondary">
        <div className="text-center py-24">
          <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
          <p className="text-xs text-gray-500 mt-4">Loading operational details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">NGO Dashboard / Operations</span>
            <h1 className="text-2xl font-bold text-brand-dark mt-1">{requirement?.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Event Date: <strong>{requirement?.event_date}</strong> | Location: <strong>{requirement?.location_name}</strong>
            </p>
          </div>
          <Link
            to="/ngo-dashboard"
            className="py-2 px-4 border border-brand-border bg-white hover:bg-gray-50 text-xs font-bold text-brand-dark rounded-md transition-all"
          >
            ← Back to Dashboard
          </Link>
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

        {/* Details and Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Column 1: Applications & Approvals */}
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-xs font-bold text-brand-dark uppercase tracking-wider">Volunteer Applicants</h2>
                <span className="text-xs text-gray-400 font-mono">
                  {applicants.length} Total Applied
                </span>
              </div>

              {applicants.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  No applicants have registered for this need yet.
                </div>
              ) : (
                <div className="divide-y divide-brand-border">
                  {applicants.map(app => (
                    <div key={app.id} className="p-6 flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-brand-dark">{app.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{app.email}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          City: {app.city || 'N/A'} | Skills: {(app.skill_tags || []).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {app.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleDecide(app.id, 'accepted')}
                              disabled={actionLoading !== null}
                              className="p-1.5 bg-brand-secondary border border-brand-border hover:border-brand-primary text-brand-primary rounded-md transition-all cursor-pointer"
                              title="Accept Volunteer"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDecide(app.id, 'rejected')}
                              disabled={actionLoading !== null}
                              className="p-1.5 bg-brand-secondary border border-brand-border hover:border-brand-error text-brand-error rounded-md transition-all cursor-pointer"
                              title="Reject Volunteer"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border rounded-sm ${
                            app.status === 'accepted'
                              ? 'bg-green-50 border-brand-success text-brand-success'
                              : 'bg-red-50 border-brand-error text-brand-error'
                          }`}>
                            {app.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Geofenced Attendance */}
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-xs font-bold text-brand-dark uppercase tracking-wider">Checked-In Attendance Logs</h2>
                <span className="text-xs text-brand-success font-mono font-bold">
                  {attendance.filter(a => a.present).length} Present
                </span>
              </div>

              {attendance.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  No volunteers have logged their geo-checkins yet.
                </div>
              ) : (
                <div className="divide-y divide-brand-border">
                  {attendance.map(att => (
                    <div key={att.id} className="p-6 flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-brand-dark">{att.name}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <MapPin className="w-3 h-3 text-gray-400 mr-1" />
                          Distance: {att.distance_meters ? `${Math.round(att.distance_meters)}m` : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center">
                          <Clock className="w-3 h-3 text-gray-400 mr-1" />
                          Checked In: {att.checked_in_at ? new Date(att.checked_in_at).toLocaleTimeString() : 'N/A'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {att.present ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-brand-success text-brand-success bg-green-50 rounded-sm">
                            ✓ Present
                          </span>
                        ) : (
                          <button
                            onClick={() => handleManualVerify(att.id)}
                            disabled={actionLoading !== null}
                            className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 bg-brand-primary text-white hover:bg-opacity-90 rounded-md transition-all cursor-pointer"
                          >
                            Verify Manually
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};
export default VerifyAttendance;
