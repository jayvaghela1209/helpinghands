import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const CSRFunding = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const preselectedNgoId = query.get('ngo_id') || '';
  const navigate = useNavigate();

  const [selectedNgo, setSelectedNgo] = useState(preselectedNgoId);
  const [ngoName, setNgoName] = useState('');
  const [amount, setAmount] = useState('');
  const [hours, setHours] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Helper to get auth token
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

  // Fetch selected NGO details using URL parameter
  useEffect(() => {
    const fetchNgo = async () => {
      try {
        const token = getToken();
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/csr/ngos/${preselectedNgoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('NGO profile not found');
        const data = await res.json();
        setNgoName(data.profile?.name || data.name || 'Verified NGO');
        setSelectedNgo(preselectedNgoId);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (preselectedNgoId) {
      fetchNgo();
    } else {
      setError('No NGO selected');
      setLoading(false);
    }
  }, [preselectedNgoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const parsedAmount = parseFloat(amount);
    if (!selectedNgo || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive funding amount.');
      return;
    }

    // Default volunteer hours to 0 when empty because pledged_hours is NOT NULL in database
    const parsedHours = hours !== '' ? parseFloat(hours) : 0;

    const payload = {
      ngo_id: selectedNgo,
      pledged_amount: parsedAmount,
      pledged_hours: isNaN(parsedHours) ? 0 : parsedHours,
    };

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
        throw new Error(err.detail || 'Failed to create CSR pledge');
      }

      setMessage('CSR pledge created successfully!');
      
      // Redirect back to NGO Details after successful submission
      setTimeout(() => {
        navigate(`/browse-ngos?ngo_id=${selectedNgo}`);
      }, 1200);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center mt-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
        <p className="text-sm text-gray-500 mt-4">Loading NGO details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200 mt-10">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Submit General CSR Funding</h2>
        <p className="text-xs text-gray-500 mt-1">Pledge corporate CSR funds directly to approved NGO partner</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm mb-4">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selected NGO Field (Read Only) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1" htmlFor="ngo">
            Selected NGO (Read Only)
          </label>
          <input
            id="ngo"
            type="text"
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-800 font-medium text-sm cursor-not-allowed"
            value={ngoName || 'Verified NGO Partner'}
          />
        </div>

        {/* Funding Amount Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1" htmlFor="amount">
            Funding Amount ($) <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 5000"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        {/* Volunteer Hours Field (Optional) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1" htmlFor="hours">
            Volunteer Hours <span className="text-gray-400 font-normal lowercase">(optional - defaults to 0)</span>
          </label>
          <input
            id="hours"
            type="number"
            min="0"
            step="0.5"
            placeholder="e.g. 20"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-100">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white font-semibold py-2.5 px-4 rounded hover:bg-blue-700 transition text-sm shadow-xs"
          >
            Submit Pledge
          </button>
          <button
            type="button"
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded hover:bg-gray-200 transition text-sm border border-gray-300"
            onClick={() => navigate(`/browse-ngos?ngo_id=${preselectedNgoId}`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CSRFunding;

