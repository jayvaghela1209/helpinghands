import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Briefcase, MapPin, AlertCircle, CheckCircle } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const prefillMockLocation = () => {
    // Standard coordinates (e.g., Connaught Place, New Delhi)
    setLocationName('Connaught Place, New Delhi');
    setLatitude('28.6304');
    setLongitude('77.2177');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(false);

    if (!latitude || !longitude) {
      setErrorMsg('Latitude and Longitude are required for geo-checkins.');
      return;
    }

    setLoading(true);

    const payload = {
      title,
      description: description || null,
      category,
      skill_tags: skillTags ? skillTags.split(',').map(s => s.trim()).filter(Boolean) : [],
      seats_total: parseInt(seatsTotal, 10),
      event_date: eventDate,
      location_name: locationName || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
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
      setTimeout(() => {
        navigate('/ngo-dashboard');
      }, 2000);

    } catch (err) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary">
      <Navbar />
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
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                />
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-brand-primary uppercase tracking-wider">
                  Event Geolocation (For Attendance)
                </label>
                <button
                  type="button"
                  onClick={prefillMockLocation}
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-brand-secondary border border-brand-border text-brand-primary hover:bg-gray-100 rounded-md transition-all cursor-pointer"
                >
                  Prefill Delhi Mock Coordinates
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Location Name</label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Connaught Place"
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 28.6304"
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 77.2177"
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none"
                  />
                </div>
              </div>
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
