import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, CheckCircle, AlertCircle, ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react';

export const AttendanceView = () => {
  const { reqId } = useParams();

  const [requirement, setRequirement] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      // Requirement details
      const reqRes = await fetch(`${apiUrl}/api/requirements/${reqId}/details`, { headers });
      if (!reqRes.ok) throw new Error('Failed to fetch requirement details');
      const reqData = await reqRes.json();
      setRequirement(reqData);

      // Attendance logs
      const attRes = await fetch(`${apiUrl}/api/requirements/${reqId}/attendance`, { headers });
      if (!attRes.ok) throw new Error('Failed to fetch attendance records');
      const attData = await attRes.json();
      setAttendance(attData);
    } catch (err) {
      setErrorMsg(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reqId) fetchData();
  }, [reqId]);

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
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
        </div>

        {/* Error / Success banners */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-brand-error rounded-md text-brand-error text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Attendance Table */}
        <div className="bg-white border border-brand-border rounded-md shadow-sm">
          <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-gray-50">
            <h2 className="text-xs font-bold text-brand-dark uppercase tracking-wider">Attendance Records</h2>
            <span className="text-[11px] text-gray-500">{attendance.length} records</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
              <p className="text-xs text-gray-500 mt-4">Loading attendance...</p>
            </div>
          ) : attendance.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">No attendance records yet.</div>
          ) : (
            <div className="divide-y divide-brand-border">
              {attendance.map(att => (
                <div key={att.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-brand-primary" />
                      <span className="font-medium text-brand-dark">{att.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Check‑in: {att.checked_in_at ? new Date(att.checked_in_at).toLocaleString() : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Check‑out: {att.checked_out_at ? new Date(att.checked_out_at).toLocaleString() : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Worked Hours: {att.worked_hours != null ? att.worked_hours : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${att.present ? 'bg-green-50 border-brand-success text-brand-success' : 'bg-red-50 border-brand-error text-brand-error'}`}>
                      {att.present ? 'Present' : 'Absent'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AttendanceView;
