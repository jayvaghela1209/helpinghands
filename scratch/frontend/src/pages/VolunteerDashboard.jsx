import React, { useEffect, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { Award, Clock, Star, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export const VolunteerDashboard = () => {
  const { profile } = useAuth();
  const [volProfile, setVolProfile] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', city: '', skill_tags: '' });
  const [message, setMessage] = useState('');
  const [applications, setApplications] = useState([]);
  const [appliedRequirementIds, setAppliedRequirementIds] = useState(new Set());

  useEffect(() => {
    // Fetch volunteer profile from backend
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const data = await api.get('/api/volunteer/profile', token);
        setVolProfile(data);
        setForm({
          name: data.name || '',
          phone: data.phone || '',
          city: data.city || '',
          skill_tags: (data.skill_tags || []).join(', ')
        });
      } catch (err) {
        console.error('Failed to load volunteer profile', err);
      }
    };

    const fetchMyApplications = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('authToken');

        const response = await fetch(`${apiUrl}/api/volunteers/applications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Fetch requirement details for each application
          const enriched = await Promise.all(data.map(async (app) => {
            try {
              const reqRes = await fetch(`${apiUrl}/api/requirements/${app.requirement_id}`);
              const reqData = await reqRes.json();
              return { ...app, requirement: reqData };
            } catch (e) {
              return app;
            }
          }));
          setApplications(enriched);
          const ids = new Set(data.map(app => String(app.requirement_id)));
          setAppliedRequirementIds(ids);
        }
      } catch (err) {
        console.error('Error fetching applications status:', err);
      }
    };

    fetchProfile();
    fetchMyApplications();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      phone: form.phone,
      city: form.city,
      skill_tags: form.skill_tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const token = localStorage.getItem('authToken');

      const updated = await api.put(
        '/api/volunteer/profile',
        payload,
        token
      );

      setVolProfile(updated);
      setMessage('Profile updated successfully');
    } catch (err) {
      console.error('Update failed', err);
      setMessage('Failed to update profile');
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary">

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-brand-dark">Volunteer Portal</h1>
          <p className="text-sm text-gray-500">Track your verified volunteer hours, credentials, and digital certificates.</p>
        </div>

        {/* Stats Grid */}
        {volProfile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            <div className="bg-white p-6 border border-brand-border rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Verified Hours</p>
                  <p className="text-2xl font-bold text-brand-dark mt-2">{volProfile.total_hours} hrs</p>
                </div>
                <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                  <Clock className="w-5 h-5 text-brand-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">Accrued from checked-in events</p>
            </div>

            <div className="bg-white p-6 border border-brand-border rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Credit Points</p>
                  <p className="text-2xl font-bold text-brand-dark mt-2">{volProfile.credit_points} pts</p>
                </div>
                <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                  <Award className="w-5 h-5 text-brand-accent" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">Bronze tier entry points</p>
            </div>

            <div className="bg-white p-6 border border-brand-border rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Trust Score</p>
                  <p className="text-2xl font-bold text-brand-dark mt-2">{volProfile.trust_score}%</p>
                </div>
                <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                  <Star className="w-5 h-5 text-brand-primary" />
                </div>
              </div>
              <p className="text-xs text-brand-success mt-4">● Perfect attendance rating</p>
            </div>

            <div className="bg-white p-6 border border-brand-border rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Badge Level</p>
                  <p className="text-2xl font-bold text-brand-dark mt-2">Bronze</p>
                </div>
                <div className="p-2 bg-brand-secondary border border-brand-border rounded-md">
                  <Activity className="w-5 h-5 text-brand-accent" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">Next level at 100 points</p>
            </div>

          </div>
        )}

        {/* Dashboard Content split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Left: Tasks */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-brand-border rounded-md">
              <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
                <h2 className="text-sm font-bold text-brand-dark uppercase">My Applications</h2>
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-400 font-mono">{applications?.length ?? 0} Total</span>
                  <Link to="/volunteer/certificates" className="text-xs font-semibold text-brand-primary bg-purple-50 border border-purple-200 hover:bg-purple-100 px-3 py-1 rounded-md transition-all">My Certificates</Link>
                  <Link to="/browse-opportunities" className="text-xs font-semibold text-white bg-brand-primary hover:bg-opacity-90 px-3 py-1 rounded-md transition-all">Browse Opportunities</Link>
                </div>
              </div>
              {applications && applications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">You haven't applied to any volunteering events yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-brand-border">
                  {applications && applications.map(app => (
                    <li key={app.id} className="p-4 flex justify-between items-center">
                      <div className="text-sm font-medium text-brand-dark">
                        {app.requirement?.title || `Requirement #${app.requirement_id}`}
                      </div>
                      <div className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-100 rounded">
                        {app.status}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar Right: Profile Details */}
          <div className="space-y-6">
            <div className="bg-white border border-brand-border rounded-md p-6">
              <h2 className="text-sm font-bold text-brand-dark uppercase border-b border-brand-border pb-3 mb-4">Profile</h2>
              {volProfile ? (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold">Full Name</span>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-2 py-1 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold">Verified Email</span>
                    <input type="text" disabled value={volProfile.email} className="w-full bg-gray-100 border border-gray-300 rounded px-2 py-1 mt-1" />
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold">Phone Contact</span>
                    <input
                      type="text"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-2 py-1 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold">Registered City</span>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-2 py-1 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase font-semibold">Skill Tags (comma separated)</span>
                    <input
                      type="text"
                      name="skill_tags"
                      value={form.skill_tags}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded px-2 py-1 mt-1"
                    />
                  </div>
                  {message && <p className="text-sm text-green-600">{message}</p>}
                  <button type="submit" className="mt-2 w-full bg-brand-primary text-white py-1 rounded">
                    Save Changes
                  </button>
                </form>
              ) : (
                <p className="text-sm text-gray-500">Loading profile…</p>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};
export default VolunteerDashboard;
