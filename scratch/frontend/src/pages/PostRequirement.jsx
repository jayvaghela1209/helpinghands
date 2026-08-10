
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, AlertCircle, CheckCircle, Loader } from 'lucide-react';

// Geoapify Autocomplete — self-contained, no external SDK needed
const GeoapifyAutocomplete = ({ value, onChange, onSuggestionSelect }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (text) => {
    if (!text.trim() || text.trim().length < 3) {
      setSuggestions([]);
      setNoResults(false);
      setOpen(false);
      return;
    }

    setSearching(true);
    setNoResults(false);

    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(text)}&limit=5&format=json&apiKey=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      const results = data?.results ?? [];

      if (results.length === 0) {
        setSuggestions([]);
        setNoResults(true);
        setOpen(true);
      } else {
        setSuggestions(results);
        setNoResults(false);
        setOpen(true);
      }
    } catch {
      setSuggestions([]);
      setNoResults(false);
    } finally {
      setSearching(false);
    }
  }, [apiKey]);

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    // Clear confirmed state upstream handled by parent's onChange
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = (result) => {
    const address = result.formatted || result.address_line1 || result.city || '';
    const lat = result.lat;
    const lon = result.lon;
    onSuggestionSelect({ address, lat, lon });
    setSuggestions([]);
    setNoResults(false);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => (suggestions.length > 0 || noResults) && setOpen(true)}
          placeholder="Search event location..."
          autoComplete="off"
          className="w-full px-3 py-2 pr-8 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
        />
        {searching && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <Loader className="w-3.5 h-3.5 text-gray-400 animate-spin" />
          </span>
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-brand-border rounded-md shadow-md overflow-hidden text-sm">
          {noResults ? (
            <li className="px-4 py-3 text-xs text-gray-500 italic">
              No matching location found.
            </li>
          ) : (
            suggestions.map((result, idx) => (
              <li
                key={idx}
                onMouseDown={() => handleSelect(result)}
                className="px-4 py-2.5 flex items-start space-x-2 hover:bg-brand-secondary cursor-pointer border-b border-brand-border last:border-b-0"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5" />
                <span className="text-xs text-brand-dark leading-snug">
                  {result.formatted || result.address_line1 || result.city}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export const PostRequirement = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Education');
  const [skillTags, setSkillTags] = useState('');
  const [seatsTotal, setSeatsTotal] = useState(10);
  const [eventDate, setEventDate] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  // 'search' | 'manual'  — which mode produced the confirmed coordinates
  const [locationMode, setLocationMode] = useState('search');
  // Manual entry fields (kept separate so they don't stomp Geoapify state)
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSuggestionSelect = ({ address, lat, lon }) => {
    setLocationName(address);
    setLatitude(String(lat));
    setLongitude(String(lon));
    setLocationConfirmed(true);
    setLocationMode('search');
    setErrorMsg('');
  };

  const handleLocationChange = (val) => {
    setLocationName(val);
    // Typing in the search box clears any previously confirmed search result
    if (locationConfirmed && locationMode === 'search') {
      setLocationConfirmed(false);
      setLatitude('');
      setLongitude('');
    }
    // If user starts typing a location, clear manual coordinates
    if (val.trim()) {
      setManualLat('');
      setManualLon('');
      if (locationMode === 'manual') {
        setLocationConfirmed(false);
        setLatitude('');
        setLongitude('');
      }
    }
  };

  // Validate and confirm manual coordinates
  const handleManualConfirm = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    if (manualLat.trim() === '' || manualLon.trim() === '') {
      setErrorMsg('Both latitude and longitude are required for manual entry.');
      return;
    }
    if (isNaN(lat) || isNaN(lon)) {
      setErrorMsg('Latitude and longitude must be valid numbers.');
      return;
    }
    if (lat < -90 || lat > 90) {
      setErrorMsg('Latitude must be between -90 and 90.');
      return;
    }
    if (lon < -180 || lon > 180) {
      setErrorMsg('Longitude must be between -180 and 180.');
      return;
    }

    setLatitude(String(lat));
    setLongitude(String(lon));
    setLocationConfirmed(true);
    setLocationMode('manual');
    setErrorMsg('');
  };

  // Clearing manual fields also clears confirmation if manual was authoritative
  const handleManualLatChange = (val) => {
    setManualLat(val);
    if (locationConfirmed && locationMode === 'manual') {
      setLocationConfirmed(false);
      setLatitude('');
      setLongitude('');
    }
    // If user starts entering coordinates, clear the location name
    if (val.trim()) {
      setLocationName('');
      if (locationMode === 'search') {
        setLocationConfirmed(false);
        setLatitude('');
        setLongitude('');
      }
    }
  };

  const handleManualLonChange = (val) => {
    setManualLon(val);
    if (locationConfirmed && locationMode === 'manual') {
      setLocationConfirmed(false);
      setLatitude('');
      setLongitude('');
    }
    // If user starts entering coordinates, clear the location name
    if (val.trim()) {
      setLocationName('');
      if (locationMode === 'search') {
        setLocationConfirmed(false);
        setLatitude('');
        setLongitude('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // ── Location validation ─────────────────────────────────────────
    // Check what the user has actually typed/selected in each field
    const hasLocation = locationName.trim() !== '';
    const hasLatitude = manualLat.trim() !== '' || (locationMode === 'search' && latitude !== '');
    const hasLongitude = manualLon.trim() !== '' || (locationMode === 'search' && longitude !== '');

    // Nothing provided at all
    if (!hasLocation && !hasLatitude && !hasLongitude) {
      setErrorMsg('Please enter either a Location or both Latitude and Longitude.');
      return;
    }

    // Only one coordinate entered — latitude and longitude must come as a pair
    if (!hasLocation && (hasLatitude !== hasLongitude)) {
      setErrorMsg('Please enter both Latitude and Longitude.');
      return;
    }

    // Both location name AND coordinates entered — only one method allowed
    if (hasLocation && (hasLatitude || hasLongitude)) {
      setErrorMsg('Enter either Location OR Latitude and Longitude, not both.');
      return;
    }
    // ───────────────────────────────────────────────────────────────

    // For coords-only: if the user hasn't clicked "Confirm", parse manualLat/manualLon now
    const finalLat = latitude !== '' ? parseFloat(latitude) : parseFloat(manualLat);
    const finalLon = longitude !== '' ? parseFloat(longitude) : parseFloat(manualLon);

    if (hasLatitude && hasLongitude) {
      if (isNaN(finalLat) || isNaN(finalLon)) {
        setErrorMsg('Latitude and longitude must be valid numbers.');
        return;
      }
      if (finalLat < -90 || finalLat > 90) {
        setErrorMsg('Latitude must be between -90 and 90.');
        return;
      }
      if (finalLon < -180 || finalLon > 180) {
        setErrorMsg('Longitude must be between -180 and 180.');
        return;
      }
    }

    setLoading(true);

    const payload = {
      title,
      description: description || null,
      category,
      skill_tags: skillTags ? skillTags.split(',').map(s => s.trim()).filter(Boolean) : [],
      seats_total: parseInt(seatsTotal, 10),
      event_date: eventDate,
      // Send only the relevant location fields; backend handles defaults for DB
      location_name: hasLocation ? locationName.trim() : null,
      event_latitude: (hasLatitude && hasLongitude) ? finalLat : null,
      event_longitude: (hasLatitude && hasLongitude) ? finalLon : null,
      is_urgent: isUrgent
    };

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const response = await fetch(`${apiUrl}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to post requirement.');
      }

      setSuccessMsg('Requirement posted successfully! Redirecting...');
      setTimeout(() => navigate('/ngo-dashboard'), 2000);

    } catch (err) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-3xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-dark">Post Volunteering Need</h1>
          <p className="text-sm text-gray-500">Create a verified opportunity for volunteers to apply and check-in.</p>
        </div>

        <div className="bg-white border border-brand-border rounded-md p-6">
          <h2 className="text-sm font-bold text-brand-dark uppercase border-b border-brand-border pb-3 mb-6">
            Opportunity Details
          </h2>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-brand-error rounded-md text-brand-error text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-brand-success rounded-md text-brand-success text-xs flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Opportunity Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Teaching Math to Underprivileged Children"
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the volunteer assignment, timing, and responsibilities..."
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark bg-white outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option>Education</option>
                  <option>Environment</option>
                  <option>Health</option>
                  <option>Disasters</option>
                  <option>Animal Welfare</option>
                  <option>Senior Support</option>
                  <option>Others</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Seats Available</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={seatsTotal}
                  onChange={(e) => setSeatsTotal(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Date</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <p className="mt-1 text-[11px] text-gray-400">Previous dates cannot be selected.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Skills Needed (Comma separated)</label>
                <input
                  type="text"
                  value={skillTags}
                  onChange={(e) => setSkillTags(e.target.value)}
                  placeholder="e.g. tutoring, communication, patient"
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>

            <div className="border-t border-brand-border pt-4">
              <label className="block text-xs font-bold text-brand-primary uppercase tracking-wider mb-1">
                Event Location (For Attendance)
              </label>
              <p className="text-[11px] text-gray-400 mb-3">
                Enter <strong>Location Name</strong> <em>or</em> <strong>Latitude &amp; Longitude</strong> — not both.
              </p>

              {/* ── Mode 1: Geoapify search ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Location Name
                </label>
                <GeoapifyAutocomplete
                  value={locationName}
                  onChange={handleLocationChange}
                  onSuggestionSelect={handleSuggestionSelect}
                />
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-brand-border" />
                <span className="mx-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Or Enter Coordinates Manually
                </span>
                <div className="flex-1 border-t border-brand-border" />
              </div>

              {/* ── Mode 2: Manual lat/lon ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Latitude <span className="text-gray-400 font-normal">(−90 to 90)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={manualLat}
                    onChange={(e) => handleManualLatChange(e.target.value)}
                    placeholder="e.g. 23.0540"
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Longitude <span className="text-gray-400 font-normal">(−180 to 180)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={manualLon}
                    onChange={(e) => handleManualLonChange(e.target.value)}
                    placeholder="e.g. 72.5474"
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualConfirm}
                disabled={!manualLat.trim() || !manualLon.trim()}
                className="mt-3 text-xs font-bold px-4 py-2 border border-brand-border bg-brand-secondary text-brand-primary hover:bg-gray-100 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirm Manual Coordinates
              </button>

              {/* ── Confirmed coordinates display ── */}
              {locationConfirmed && latitude && longitude && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-brand-success">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Location confirmed
                    {locationMode === 'manual' ? ' (manual)' : ''}:{' '}
                    {parseFloat(latitude).toFixed(7)}, {parseFloat(longitude).toFixed(7)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="isUrgent"
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-4 w-4 text-brand-primary border-brand-border rounded-sm"
              />
              <label htmlFor="isUrgent" className="text-xs font-semibold text-gray-700 uppercase tracking-wider select-none">
                Mark as High Priority / Urgent Need
              </label>
            </div>

            <div className="pt-4 border-t border-brand-border flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/ngo-dashboard')}
                className="py-2 px-4 border border-brand-border rounded-md text-xs font-semibold text-brand-dark hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-2 px-6 bg-brand-primary text-white rounded-md text-xs font-bold hover:bg-opacity-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Posting...' : 'Create Post'}
              </button>
            </div>

          </form>
        </div>

      </main>
    </div>
  );
};
export default PostRequirement;
