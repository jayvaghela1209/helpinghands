import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { GeoapifyAutocomplete } from '../lib/geoapify.jsx';

// ─── Empty location sentinel ──────────────────────────────────────────────────
const EMPTY_LOCATION = { name: '', lat: '', lon: '' };

export const PostRequirement = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // ── Basic fields ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Education');
  const [skillTags, setSkillTags] = useState('');
  const [seatsTotal, setSeatsTotal] = useState(10);
  const [eventDate, setEventDate] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // ── Unified location state ──────────────────────────────────────────────────
  // { name, lat, lon } — all three are always set together or all empty.
  // This is the confirmed, submittable location.
  const [location, setLocation] = useState(EMPTY_LOCATION);

  // Ephemeral manual-entry fields — exist only until "Confirm" is clicked.
  // Once confirmed they are cleared; the result lives in `location`.
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');

  // Search input display value (controlled separately so the autocomplete
  // can show partial text without that being a "confirmed" location).
  const [searchText, setSearchText] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Derived ─────────────────────────────────────────────────────────────────
  const locationConfirmed = location.name !== '' && location.lat !== '' && location.lon !== '';

  // ── Location handlers ───────────────────────────────────────────────────────

  // Called by GeoapifyAutocomplete when the user selects a suggestion.
  // Sets all three fields atomically and clears manual inputs.
  const handleSuggestionSelect = ({ address, lat, lon }) => {
    if (lat == null || lon == null) {
      setErrorMsg('Selected location has no coordinates. Please try a different result.');
      return;
    }
    setLocation({ name: address, lat: String(lat), lon: String(lon) });
    setSearchText(address);
    setManualName('');
    setManualLat('');
    setManualLon('');
    setErrorMsg('');
  };

  // Called on every keystroke in the search input.
  // Any typing invalidates the previously confirmed location.
  const handleSearchChange = (val) => {
    setSearchText(val);
    // Clear the confirmed location — user is actively changing it
    setLocation(EMPTY_LOCATION);
    // Also clear manual inputs — only one mode at a time
    setManualName('');
    setManualLat('');
    setManualLon('');
  };

  // Called when the user types in the manual name field.
  const handleManualNameChange = (val) => {
    setManualName(val);
    // Typing manual means "not using search" — clear search state
    setSearchText('');
    setLocation(EMPTY_LOCATION);
  };

  // Called when the user types in the manual latitude field.
  const handleManualLatChange = (val) => {
    setManualLat(val);
    // Typing coordinates means "not using search" — clear search state
    setSearchText('');
    setLocation(EMPTY_LOCATION);
  };

  // Called when the user types in the manual longitude field.
  const handleManualLonChange = (val) => {
    setManualLon(val);
    setSearchText('');
    setLocation(EMPTY_LOCATION);
  };

  // Validates manual inputs, then sets location atomically using the manually entered name.
  const handleManualConfirm = () => {
    setErrorMsg('');

    if (manualName.trim() === '') {
      setErrorMsg('Location name is required.');
      return;
    }
    if (manualLat.trim() === '' || manualLon.trim() === '') {
      setErrorMsg('Both latitude and longitude are required.');
      return;
    }
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
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

    // All three set atomically using the NGO's manually entered name;
    // manual input fields are cleared.
    setLocation({ name: manualName.trim(), lat: String(lat), lon: String(lon) });
    setManualName('');
    setManualLat('');
    setManualLon('');
    setErrorMsg('');
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!locationConfirmed) {
      setErrorMsg(
        'Please confirm a location before submitting. ' +
        'Either select one from the search results or enter coordinates and click "Confirm".'
      );
      return;
    }

    setLoading(true);

    const payload = {
      title,
      description: description || null,
      category,
      skill_tags: skillTags
        ? skillTags.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      seats_total: parseInt(seatsTotal, 10),
      event_date: eventDate,
      location_name: location.name,
      event_latitude: parseFloat(location.lat),
      event_longitude: parseFloat(location.lon),
      is_urgent: isUrgent,
    };

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const response = await fetch(`${apiUrl}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-3xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-dark">Post Volunteering Need</h1>
          <p className="text-sm text-gray-500">
            Create a verified opportunity for volunteers to apply and check-in.
          </p>
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

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Opportunity Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Teaching Math to Underprivileged Children"
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Description
              </label>
              <textarea
                rows="4"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the volunteer assignment, timing, and responsibilities..."
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            {/* Category + Seats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </label>
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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Seats Available
                </label>
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

            {/* Event Date + Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Event Date
                </label>
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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Skills Needed (Comma separated)
                </label>
                <input
                  type="text"
                  value={skillTags}
                  onChange={(e) => setSkillTags(e.target.value)}
                  placeholder="e.g. tutoring, communication, patient"
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* ── Event Location ─────────────────────────────────────────────── */}
            <div className="border-t border-brand-border pt-4">
              <label className="block text-xs font-bold text-brand-primary uppercase tracking-wider mb-1">
                Event Location (For Attendance)
              </label>
              <p className="text-[11px] text-gray-400 mb-3">
                Search for a location <em>or</em> enter coordinates manually.
                Either way, the full location (name + coordinates) will be confirmed together.
              </p>

              {/* Search */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Search by Name / Address
                </label>
                <GeoapifyAutocomplete
                  value={searchText}
                  onChange={handleSearchChange}
                  onSuggestionSelect={handleSuggestionSelect}
                />
              </div>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-brand-border" />
                <span className="mx-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Or Enter Coordinates Manually
                </span>
                <div className="flex-1 border-t border-brand-border" />
              </div>

              {/* Manual name + lat/lon */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Location Name / Exact Address
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => handleManualNameChange(e.target.value)}
                    placeholder="e.g. XYZ Community Hall, Ahmedabad"
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

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
              </div>

              <button
                type="button"
                onClick={handleManualConfirm}
                disabled={!manualName.trim() || !manualLat.trim() || !manualLon.trim()}
                className="mt-3 text-xs font-bold px-4 py-2 border border-brand-border bg-brand-secondary text-brand-primary hover:bg-gray-100 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirm Coordinates
              </button>

              {/* Confirmed location display */}
              {locationConfirmed && (
                <div className="mt-3 p-3 bg-green-50 border border-brand-success rounded-md">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-success flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-brand-success">
                      <p className="font-semibold">{location.name}</p>
                      <p className="font-mono text-[11px] mt-0.5">
                        {parseFloat(location.lat).toFixed(7)}, {parseFloat(location.lon).toFixed(7)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* ── End Event Location ─────────────────────────────────────────── */}

            {/* Urgent */}
            <div className="flex items-center space-x-2">
              <input
                id="isUrgent"
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-4 w-4 text-brand-primary border-brand-border rounded-sm"
              />
              <label
                htmlFor="isUrgent"
                className="text-xs font-semibold text-gray-700 uppercase tracking-wider select-none"
              >
                Mark as High Priority / Urgent Need
              </label>
            </div>

            {/* Actions */}
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
