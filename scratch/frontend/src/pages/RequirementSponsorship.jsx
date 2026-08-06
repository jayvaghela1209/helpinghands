import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RequirementSponsorship = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);

  // Read NGO ID and Requirement ID from URL (both required)
  const ngoId = query.get('ngo_id') || '';
  const reqId = query.get('requirement_id') || '';

  // State for NGO name and requirement title (fetched from API)
  const [ngoName, setNgoName] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Helper: get auth token from localStorage
  const getToken = () => {
    const directToken = localStorage.getItem('authToken');
    if (directToken) return directToken;
    try {
      const session = JSON.parse(localStorage.getItem('hh_session'));
      return session?.access_token || '';
    } catch (e) {
      return '';
    }
  };

  // On mount: fetch NGO details and requirement details in parallel
  useEffect(() => {
    if (!ngoId || !reqId) {
      setError('Missing NGO or Requirement ID. Please navigate from Browse NGOs.');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        const token = getToken();
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch NGO name and requirement title in parallel
        const [ngoRes, reqRes] = await Promise.all([
          fetch(`${apiUrl}/api/csr/ngos/${ngoId}`, { headers }),
          fetch(`${apiUrl}/api/requirements/${reqId}`, { headers }),
        ]);

        if (ngoRes.ok) {
          const ngoData = await ngoRes.json();
          setNgoName(ngoData.profile?.name || ngoData.name || 'Selected NGO');
        }

        if (reqRes.ok) {
          const reqData = await reqRes.json();
          setReqTitle(reqData.title || 'Selected Requirement');
        } else {
          setError('Could not load requirement details.');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [ngoId, reqId]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Funding Amount must be greater than zero.');
      return;
    }

    // Default volunteer hours to 0 when left empty
    const parsedHours = hours !== '' ? parseFloat(hours) : 0;

    const payload = {
      ngo_id: ngoId,
      requirement_id: reqId,
      pledged_amount: parsedAmount,
      pledged_hours: isNaN(parsedHours) ? 0 : parsedHours,
    };

    setSubmitting(true);
    try {
      const token = getToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/csr/pledges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to submit sponsorship');
      }

      // Show success and redirect back to NGO Details
      setMessage('Requirement sponsored successfully!');
      setTimeout(() => {
        navigate(`/browse-ngos?ngo_id=${ngoId}`);
      }, 1200);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center mt-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
        <p className="text-sm text-gray-500 mt-4">Loading sponsorship details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200 mt-10">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Requirement Sponsorship</h2>
        <p className="text-xs text-gray-500 mt-1">Sponsor a specific open social requirement</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {/* Success Alert */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm mb-4">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Selected NGO (Read Only) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Selected NGO <span className="text-gray-400 font-normal lowercase">(read only)</span>
          </label>
          <input
            type="text"
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-800 font-medium text-sm cursor-not-allowed"
            value={ngoName || 'Loading...'}
          />
        </div>

        {/* Selected Requirement (Read Only) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
            Selected Requirement <span className="text-gray-400 font-normal lowercase">(read only)</span>
          </label>
          <input
            type="text"
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-800 font-medium text-sm cursor-not-allowed"
            value={reqTitle || 'Loading...'}
          />
        </div>

        {/* Funding Amount (Required) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1" htmlFor="amount">
            Funding Amount <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter funding amount (e.g. 50000)"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        {/* Volunteer Hours (Optional) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1" htmlFor="hours">
            Volunteer Hours <span className="text-gray-400 font-normal lowercase">(optional)</span>
          </label>
          <input
            id="hours"
            type="number"
            min="0"
            step="0.5"
            placeholder="Enter volunteer hours (optional, defaults to 0)"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitting || !ngoId || !reqId}
            className="flex-1 bg-brand-primary text-white font-semibold py-2.5 px-4 rounded hover:bg-brand-primary/90 transition text-sm shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit Sponsorship'}
          </button>
          <button
            type="button"
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded hover:bg-gray-200 transition text-sm border border-gray-300"
            onClick={() => navigate(ngoId ? `/browse-ngos?ngo_id=${ngoId}` : '/browse-ngos')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequirementSponsorship;
