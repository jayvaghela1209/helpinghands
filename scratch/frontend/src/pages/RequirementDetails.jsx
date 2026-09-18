import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, Flame, Star, ArrowLeft, Download, Award } from 'lucide-react';
import { api } from '../services/api';
import { getAccuratePosition } from '../lib/getAccuratePosition';

// ── IST offset in minutes (UTC+5:30) ────────────────────────────────────────
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Returns the current date/time shifted to IST as a plain JS Date.
 * Used only for display — the backend enforces the authoritative check.
 */
const nowIST = () => new Date(Date.now() + IST_OFFSET_MS - new Date().getTimezoneOffset() * 60000);

/**
 * Parse a "HH:MM:SS" or "HH:MM" time string into { hours, minutes }.
 */
const parseTime = (t) => {
  if (!t) return null;
  const parts = t.split(':');
  return { hours: parseInt(parts[0], 10), minutes: parseInt(parts[1], 10) };
};

/**
 * Format a "HH:MM:SS" time string to "10:00 AM" display format.
 */
const formatTime = (t) => {
  const p = parseTime(t);
  if (!p) return '';
  const d = new Date(0);
  d.setHours(p.hours, p.minutes, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * Compute the volunteer-facing check-in window status.
 * Returns one of: 'upcoming' | 'open' | 'ended' | 'unknown'
 */
const getCheckinWindowStatus = (eventDate, eventStartTime, eventEndTime) => {
  if (!eventDate || !eventStartTime || !eventEndTime) return 'unknown';

  // Build window boundaries as UTC timestamps matching IST wall-clock times.
  // We use the raw date string (YYYY-MM-DD) and parse it in UTC to avoid
  // browser local-timezone shifting the date.
  const [year, month, day] = eventDate.split('-').map(Number);
  const startP = parseTime(eventStartTime);
  const endP   = parseTime(eventEndTime);

  // Construct as UTC so that Date.UTC(y,m-1,d,h,min) gives us the IST wall-clock
  // time as UTC (i.e. we pretend IST = UTC for the purpose of comparison because
  // we also shift `now` by the same offset).
  const windowStart = new Date(Date.UTC(year, month - 1, day, startP.hours, startP.minutes, 0));
  const windowEnd   = new Date(Date.UTC(year, month - 1, day, endP.hours,   endP.minutes,   0));

  // Current time expressed as a "UTC clock reading" of IST wall-clock time.
  const nowAsIST = new Date(Date.now() + IST_OFFSET_MS - new Date().getTimezoneOffset() * 60000);
  // Strip timezone offset to get a comparable UTC timestamp
  const nowUTC = new Date(nowAsIST.toISOString().replace('Z', '+00:00'));

  if (nowUTC < windowStart) return 'upcoming';
  if (nowUTC >= windowEnd)  return 'ended';
  return 'open';
};

/**
 * Returns true when fewer than 48 hours remain until the event start (IST).
 * Used for display-only withdrawal restriction — backend is authoritative.
 */
const isWithin48Hours = (eventDate, eventStartTime) => {
  if (!eventDate || !eventStartTime) return false;
  const [year, month, day] = eventDate.split('-').map(Number);
  const startP = parseTime(eventStartTime);
  const eventStartUTC = new Date(Date.UTC(year, month - 1, day, startP.hours, startP.minutes, 0));
  const nowAsIST = new Date(Date.now() + IST_OFFSET_MS - new Date().getTimezoneOffset() * 60000);
  const nowUTC = new Date(nowAsIST.toISOString().replace('Z', '+00:00'));
  const diffMs = eventStartUTC - nowUTC;
  return diffMs <= 48 * 60 * 60 * 1000;
};

/**
 * Returns true when the event has not yet started (IST wall-clock).
 * Used for display-only checkout restriction — backend is authoritative.
 */
const isBeforeEventStart = (eventDate, eventStartTime) => {
  if (!eventDate || !eventStartTime) return false;
  const [year, month, day] = eventDate.split('-').map(Number);
  const startP = parseTime(eventStartTime);
  const eventStartUTC = new Date(Date.UTC(year, month - 1, day, startP.hours, startP.minutes, 0));
  const nowAsIST = new Date(Date.now() + IST_OFFSET_MS - new Date().getTimezoneOffset() * 60000);
  const nowUTC = new Date(nowAsIST.toISOString().replace('Z', '+00:00'));
  return nowUTC < eventStartUTC;
};

const RequirementDetails = () => {
  const { id } = useParams();
  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appliedInfo, setAppliedInfo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Fetch requirement details
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
        const res = await fetch(`${apiUrl}/api/requirements/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to load requirement');
        }
        const data = await res.json();
        setRequirement(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  // Check if volunteer already applied
  const fetchMyApps = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const data = await api.get('/api/volunteers/applications', token);
      const app = data.find((a) => a.requirement_id === id);
      if (app) setAppliedInfo({ status: app.status, appId: app.id, attendance_status: app.attendance_status });
    } catch (_) { }
  };

  useEffect(() => {
    fetchMyApps();
    const interval = setInterval(fetchMyApps, 15000);
    return () => clearInterval(interval);
  }, [id]);

  const statusBadge = (status) => {
    let color = 'bg-gray-200 text-gray-800';
    let Icon = Clock;
    if (status === 'pending') { color = 'bg-yellow-100 text-yellow-800'; Icon = Clock; }
    else if (status === 'accepted') { color = 'bg-green-100 text-green-800'; Icon = CheckCircle; }
    else if (status === 'rejected') { color = 'bg-red-100 text-red-800'; Icon = AlertCircle; }
    else if (status === 'withdrawn') { color = 'bg-gray-100 text-gray-800'; Icon = AlertCircle; }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${color}`}>
        <Icon className="w-3 h-3 mr-1" />{status}
      </span>
    );
  };

  // Apply to this requirement
  const handleApply = async () => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const res = await fetch(`${apiUrl}/api/requirements/${id}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Apply failed');
      }
      setAppliedInfo({ status: 'pending', appId: data.id, attendance_status: 'none' });
      setActionMsg('Applied successfully!');
    } catch (e) {
      setActionMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Withdraw handler
  const handleWithdraw = async (appId) => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const res = await fetch(`${apiUrl}/api/applications/${appId}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Withdraw failed');
      setActionMsg('Application withdrawn');
      await fetchMyApps();
    } catch (e) {
      setActionMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Check‑in handler (uses getAccuratePosition for a high-accuracy, validated GPS fix)
  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionMsg('Acquiring GPS location…');
    try {
      const { latitude, longitude, accuracy } = await getAccuratePosition();

      // Diagnostic log — GPS values from getAccuratePosition
      console.log('[CheckIn] GPS coords from getAccuratePosition:', { latitude, longitude, accuracy });

      const payload = { latitude, longitude };

      // Endpoint uses requirement id (id from useParams), NOT the application id
      console.log('[CheckIn] Sending payload to POST /api/requirements/' + id + '/checkin', payload);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const res = await fetch(`${apiUrl}/api/requirements/${id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        // data.detail may be a nested object (e.g. distance check returns
        // {detail: "...", distance: ..., allowed_radius: ...}) — extract the
        // human-readable string rather than stringifying the whole object.
        const detail = data.detail;
        const msg = typeof detail === 'object' && detail !== null
          ? (detail.detail || 'Check‑in failed')
          : (detail || 'Check‑in failed');
        throw new Error(msg);
      }
      setActionMsg('Checked in successfully');
      await fetchMyApps();
    } catch (e) {
      setActionMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Check‑out handler
  const handleCheckOut = async () => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const getLocation = () => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const pos = await getLocation();
      const payload = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const res = await fetch(`${apiUrl}/api/applications/${appliedInfo.appId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Check‑out failed');
      setActionMsg('Checked out successfully');
      await fetchMyApps();
    } catch (e) {
      setActionMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Real certificate generation handler
  const handleGenerateCertificate = async () => {
    if (!appliedInfo?.appId) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;
      const res = await fetch(`${apiUrl}/api/applications/${appliedInfo.appId}/certificate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Certificate generation failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HelpingHands_Certificate_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setActionMsg('Certificate downloaded successfully!');
    } catch (e) {
      setActionMsg(e.message);
    } finally {
      setActionLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-brand-secondary"><div className="text-center py-16">Loading...</div></div>
    );
  }

  if (error) {
    if (error.toLowerCase().includes('not found')) {
      return (
        <div className="min-h-screen bg-brand-secondary">
          <main className="max-w-5xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold text-brand-dark mb-4">Opportunity not found</h1>
            <p className="text-gray-600">The opportunity you are looking for does not exist or has been removed.</p>
            <Link to="/browse-opportunities" className="mt-4 inline-block text-blue-600 hover:underline">Back to opportunities</Link>
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-brand-secondary">Error: {error}</div>
    );
  }

  const {
    organization_name,
    title,
    description,
    category,
    event_date,
    event_start_time,
    event_end_time,
    location_name,
    seats_filled,
    seats_total,
    is_urgent,
    avg_rating,
  } = requirement;

  const isApplied = !!appliedInfo;
  const attendanceStatus = appliedInfo?.attendance_status || 'none';

  // Compute display-only check-in window status (backend is authoritative)
  const windowStatus = getCheckinWindowStatus(event_date, event_start_time, event_end_time);
  const startDisplay = formatTime(event_start_time);
  const endDisplay   = formatTime(event_end_time);
  const eventDateDisplay = event_date
    ? new Date(event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // Display-only restrictions — backend enforces authoritatively
  const withdrawalBlocked = isWithin48Hours(event_date, event_start_time);
  const checkoutBlocked   = isBeforeEventStart(event_date, event_start_time);

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Link to="/volunteer-dashboard" className="inline-flex items-center text-xs font-semibold text-brand-primary hover:underline">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center mb-4">
          <h1 className="text-3xl font-bold text-brand-dark mr-2">{title}</h1>
          {is_urgent && (
            <span className="flex items-center text-xs font-bold uppercase bg-red-50 text-brand-error border border-brand-error rounded px-2 py-0.5">
              <Flame className="w-3 h-3 mr-1" />Urgent
            </span>
          )}
        </div>
        <p className="text-gray-700 mb-2"><strong>Organization:</strong> {organization_name}</p>
        <p className="text-gray-700 mb-2"><strong>Category:</strong> {category}</p>
        <p className="text-gray-700 mb-2"><strong>Event Date:</strong> {new Date(event_date).toLocaleDateString()}</p>
        {startDisplay && endDisplay && (
          <p className="text-gray-700 mb-2">
            <strong>Event Time:</strong> {startDisplay} – {endDisplay} IST
          </p>
        )}
        <p className="text-gray-700 mb-2">
          <strong>Location:</strong>{' '}
          {(() => {
            const name = location_name?.trim();
            if (name) return name;
            const lat = requirement.event_latitude != null ? parseFloat(requirement.event_latitude) : null;
            const lon = requirement.event_longitude != null ? parseFloat(requirement.event_longitude) : null;
            const hasRealCoords =
              lat !== null && lon !== null && !(lat === 0.0 && lon === 0.0);
            if (hasRealCoords) return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            return 'Virtual Opportunity';
          })()}
        </p>
        <p className="text-gray-700 mb-4"><strong>Description:</strong> {description}</p>
        <p className="text-gray-700 mb-2"><strong>Seats Filled:</strong> {seats_filled} / {seats_total}</p>
        {avg_rating && (
          <p className="flex items-center text-gray-700 mb-2">
            <Star className="w-4 h-4 mr-1 text-yellow-400" />Average NGO rating: {avg_rating.toFixed(1)}
          </p>
        )}
        <div className="mt-6 space-y-4">
          {/* Application Status Section */}
          {isApplied ? (
            <div className="flex flex-col space-y-2">
              <div>{statusBadge(appliedInfo.status)}</div>
              {(appliedInfo.status === 'pending' || appliedInfo.status === 'accepted') && (appliedInfo.attendance_status !== 'checked_in' && appliedInfo.attendance_status !== 'verified') && (
                <>
                  {withdrawalBlocked ? (
                    <p className="text-xs text-gray-500 italic">
                      Withdrawal is unavailable within 48 hours of the event.
                    </p>
                  ) : (
                    <button
                      onClick={() => handleWithdraw(appliedInfo.appId)}
                      disabled={actionLoading}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md transition-all cursor-pointer"
                    >
                      {actionLoading ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleApply}
              disabled={actionLoading}
              className="w-full py-2 bg-brand-primary hover:bg-opacity-95 text-white font-bold text-xs rounded-md transition-all cursor-pointer"
            >
              {actionLoading ? 'Applying…' : 'Apply Now'}
            </button>
          )}

          {/* Attendance Actions */}
          {isApplied && appliedInfo.status === 'accepted' && (
            <div className="flex flex-col space-y-2">
              {attendanceStatus === 'none' && (
                <>
                  {/* Check-in window status banner */}
                  {event_start_time && event_end_time && (
                    <div className={`px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-2 border ${
                      windowStatus === 'open'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : windowStatus === 'ended'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        {windowStatus === 'open' && (
                          `Check-in is open. Available until ${endDisplay} IST.`
                        )}
                        {windowStatus === 'upcoming' && (
                          `Check-in is not available yet. Opens at ${startDisplay} IST on ${eventDateDisplay}.`
                        )}
                        {windowStatus === 'ended' && (
                          `The window was ${startDisplay} – ${endDisplay} IST on ${eventDateDisplay}.`
                        )}
                        {windowStatus === 'unknown' && (
                          `Check-in available from ${startDisplay} to ${endDisplay} IST on ${eventDateDisplay}.`
                        )}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-md transition-all cursor-pointer"
                  >
                    {actionLoading ? 'Checking In…' : 'Check In'}
                  </button>
                </>
              )}
              {attendanceStatus === 'checked_in' && (
                <>
                  {checkoutBlocked ? (
                    <div className="px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-2 border bg-amber-50 border-amber-200 text-amber-700">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        Check-out will be available when the event starts at {startDisplay} IST.
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleCheckOut}
                      disabled={actionLoading}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md transition-all cursor-pointer"
                    >
                      {actionLoading ? 'Checking Out…' : 'Check Out'}
                    </button>
                  )}
                </>
              )}
              {attendanceStatus === 'verified' && (
                <div className="flex flex-col space-y-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-800 font-semibold w-fit">
                    <CheckCircle className="w-3 h-3 mr-1" /> Attendance Verified
                  </span>
                  <button
                    onClick={handleGenerateCertificate}
                    disabled={actionLoading}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-md transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>{actionLoading ? 'Generating PDF...' : 'Download Certificate'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {actionMsg && <p className="mt-2 text-sm font-semibold text-green-600">{actionMsg}</p>}
        </div>
      </main>
    </div>
  );
};
export default RequirementDetails;
