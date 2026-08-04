import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Edit, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, Users, ArrowLeft } from 'lucide-react';

export const ManageRequirements = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing state
  const [editingReq, setEditingReq] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Education');
  const [editSeatsTotal, setEditSeatsTotal] = useState(10);
  const [editEventDate, setEditEventDate] = useState('');
  const [editLocationName, setEditLocationName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRequirements = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const response = await fetch(`${apiUrl}/api/requirements/ngo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch NGO requirements');
      }

      const data = await response.json();
      setRequirements(data);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while loading requirements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const response = await fetch(`${apiUrl}/api/requirements/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update requirement status');
      }

      setSuccessMsg(`Requirement status set to '${newStatus}' successfully!`);
      fetchRequirements();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const startEdit = (req) => {
    setEditingReq(req);
    setEditTitle(req.title || '');
    setEditDescription(req.description || '');
    setEditCategory(req.category || 'Education');
    setEditSeatsTotal(req.seats_total || 10);
    setEditEventDate(req.event_date || '');
    setEditLocationName(req.location_name || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReq) return;

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const payload = {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        seats_total: parseInt(editSeatsTotal, 10),
        event_date: editEventDate,
        location_name: editLocationName
      };

      const response = await fetch(`${apiUrl}/api/requirements/${editingReq.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to edit requirement');
      }

      setSuccessMsg('Requirement updated successfully!');
      setEditingReq(null);
      fetchRequirements();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 border border-brand-success text-brand-success bg-green-50 rounded-sm">Open</span>;
      case 'draft':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 border border-yellow-500 text-yellow-600 bg-yellow-50 rounded-sm">Draft</span>;
      case 'completed':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 border border-blue-500 text-blue-600 bg-blue-50 rounded-sm">Completed</span>;
      case 'cancelled':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 border border-brand-error text-brand-error bg-red-50 rounded-sm">Cancelled</span>;
      default:
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 border border-gray-300 text-gray-500 bg-gray-50 rounded-sm">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
              <Link to="/ngo-dashboard" className="hover:underline flex items-center">
                <ArrowLeft className="w-3 h-3 mr-1" /> Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-brand-dark">Manage Volunteering Requirements</h1>
            <p className="text-sm text-gray-500 mt-1">
              View, edit, complete, or cancel posted volunteering opportunities for your organization.
            </p>
          </div>
          <Link
            to="/post-requirement"
            className="py-2 px-4 bg-brand-primary text-white text-xs font-bold rounded-md hover:bg-opacity-95 transition-all"
          >
            + Create New Requirement
          </Link>
        </div>

        {/* Feedback Messages */}
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

        {/* Edit Form Modal/Card */}
        {editingReq && (
          <div className="mb-8 bg-white border border-brand-primary rounded-md p-6 shadow-md">
            <h2 className="text-sm font-bold text-brand-dark uppercase border-b border-brand-border pb-3 mb-4">
              Edit Requirement — {editingReq.title}
            </h2>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 uppercase mb-1">Description</label>
                <textarea
                  rows="3"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-600 uppercase mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark bg-white outline-none"
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
                  <label className="block font-semibold text-gray-600 uppercase mb-1">Total Seats</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editSeatsTotal}
                    onChange={(e) => setEditSeatsTotal(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-600 uppercase mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-600 uppercase mb-1">Location Name</label>
                <input
                  type="text"
                  required
                  value={editLocationName}
                  onChange={(e) => setEditLocationName(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setEditingReq(null)}
                  className="py-2 px-4 border border-brand-border rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-6 bg-brand-primary text-white font-bold rounded-md hover:bg-opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Requirements Table / Cards */}
        <div className="bg-white border border-brand-border rounded-md">
          <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center">
            <h2 className="text-xs font-bold text-brand-dark uppercase tracking-wider">Posted Opportunities</h2>
            <span className="text-xs text-gray-400 font-mono">{requirements.length} Total</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
              <p className="text-xs text-gray-500 mt-4">Loading requirements...</p>
            </div>
          ) : requirements.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              You have not posted any volunteering requirements yet.
            </div>
          ) : (
            <div className="divide-y divide-brand-border">
              {requirements.map((req) => {
                const canEdit = req.status === 'draft' || req.status === 'open';

                return (
                  <div key={req.id} className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                    
                    {/* Main details */}
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-base font-bold text-brand-dark">{req.title}</h3>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{req.description || 'No description provided.'}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 mr-1" />
                          {req.event_date}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mr-1" />
                          {req.location_name}
                        </span>
                        <span className="flex items-center font-semibold text-brand-dark">
                          <Users className="w-3.5 h-3.5 text-gray-400 mr-1" />
                          Seats filled: {req.seats_filled || 0} / {req.seats_total}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/ngo/requirements/${req.id}/review`}
                          className="py-1.5 px-3 border border-brand-border bg-gray-50 hover:bg-gray-100 text-brand-dark rounded-md text-xs font-semibold transition-all"
                        >
                          Applicants & Attendance
                        </Link>

                      {canEdit && (
                        <button
                          onClick={() => startEdit(req)}
                          className="py-1.5 px-3 border border-brand-border text-brand-dark hover:border-brand-primary rounded-md text-xs font-semibold flex items-center transition-all cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                        </button>
                      )}

                      {req.status === 'open' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'completed')}
                          className="py-1.5 px-3 border border-brand-success text-brand-success bg-green-50 hover:bg-green-100 rounded-md text-xs font-semibold flex items-center transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Complete
                        </button>
                      )}

                      {(req.status === 'draft' || req.status === 'open') && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'cancelled')}
                          className="py-1.5 px-3 border border-brand-error text-brand-error bg-red-50 hover:bg-red-100 rounded-md text-xs font-semibold flex items-center transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default ManageRequirements;
