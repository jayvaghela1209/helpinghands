import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, CheckCircle, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

const ALLOWED_FOCUS_AREAS = [
  'Education',
  'Healthcare',
  'Environment & Sustainability',
  'Gender Equality',
  'Rural Development',
  'Poverty & Hunger',
  'Disaster Relief',
  'Skill Development'
];

export const NgoOnboarding = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [organizationName, setOrganizationName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [darpanId, setDarpanId] = useState('');
  const [selectedFocusAreas, setSelectedFocusAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchNgoProfile = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

        const response = await fetch(`${apiUrl}/api/ngo/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.has_profile) {
            setIsEditMode(true);
            setOrganizationName(data.organization_name || '');
            setRegistrationNumber(data.registration_number || '');
            setPanNumber(data.pan_number || '');
            setDarpanId(data.darpan_id || '');
            setSelectedFocusAreas(Array.isArray(data.focus_areas) ? data.focus_areas : []);
            setVerificationStatus(data.verification_status || 'pending');
          } else {
            // Prefill org name with user's name if blank
            setOrganizationName(profile?.name || '');
          }
        }
      } catch (err) {
        console.error("Error loading NGO profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNgoProfile();
  }, [profile]);

  const toggleFocusArea = (area) => {
    if (selectedFocusAreas.includes(area)) {
      setSelectedFocusAreas(selectedFocusAreas.filter(a => a !== area));
    } else {
      setSelectedFocusAreas([...selectedFocusAreas, area]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!organizationName.trim() || !registrationNumber.trim()) {
      setErrorMsg('Organization Name and Registration Number are required.');
      return;
    }

    if (selectedFocusAreas.length === 0) {
      setErrorMsg('Please select at least one focus area.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = JSON.parse(localStorage.getItem('hh_session'))?.access_token;

      const payload = {
        organization_name: organizationName,
        registration_number: registrationNumber,
        pan_number: panNumber || null,
        darpan_id: darpanId || null,
        focus_areas: selectedFocusAreas
      };

      const response = await fetch(`${apiUrl}/api/ngo/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to save NGO profile');
      }

      setSuccessMsg(isEditMode ? 'NGO Profile updated successfully!' : 'NGO Onboarding complete! Profile submitted.');
      setIsEditMode(true);
      setTimeout(() => {
        navigate('/ngo-dashboard');
      }, 1200);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary">
      <main className="max-w-3xl mx-auto px-6 py-8">
        
        {/* Navigation / Header */}
        <div className="mb-6">
          <Link to="/ngo-dashboard" className="text-xs text-gray-500 hover:underline flex items-center mb-2">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
          </Link>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-primary text-white rounded-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-dark">
                {isEditMode ? 'Edit NGO Organization Profile' : 'NGO Organization Onboarding'}
              </h1>
              <p className="text-xs text-gray-500">
                {isEditMode 
                  ? 'Update your organization details and compliance registration.' 
                  : 'Complete your organization details to start posting verified opportunities.'}
              </p>
            </div>
          </div>
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

        {/* Card Form */}
        <div className="bg-white border border-brand-border rounded-md p-6 shadow-sm">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-md h-8 w-8 border-2 border-brand-primary border-t-transparent mx-auto"></div>
              <p className="text-xs text-gray-500 mt-4">Loading NGO details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Organization Name & Reg Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark uppercase mb-1">
                    Organization Name <span className="text-brand-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hope Foundation"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-xs text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-dark uppercase mb-1">
                    Registration Number <span className="text-brand-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REG-123456"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-xs text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* PAN & Darpan ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-dark uppercase mb-1">
                    PAN Number <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-xs text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-dark uppercase mb-1">
                    NITI Aayog Darpan ID <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AB/2021/012345"
                    value={darpanId}
                    onChange={(e) => setDarpanId(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-border rounded-md text-xs text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>
              </div>

              {/* Focus Areas Fixed Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-brand-dark uppercase mb-1">
                  Focus Areas <span className="text-brand-error">*</span>
                </label>
                <p className="text-[11px] text-gray-500 mb-3">Select all domains relevant to your NGO operations:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALLOWED_FOCUS_AREAS.map((area) => {
                    const isSelected = selectedFocusAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleFocusArea(area)}
                        className={`px-3 py-2 text-xs font-medium rounded-md border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-primary text-white border-brand-primary'
                            : 'bg-white text-gray-700 border-brand-border hover:bg-gray-50'
                        }`}
                      >
                        <span>{area}</span>
                        {isSelected && <ShieldCheck className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verification Status Indicator */}
              {isEditMode && (
                <div className="p-3 bg-gray-50 border border-brand-border rounded-md flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-semibold uppercase">Current Verification Status:</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 border border-brand-accent text-brand-accent bg-brand-secondary rounded-sm">
                    {verificationStatus}
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 border-t border-brand-border flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2.5 px-6 bg-brand-primary hover:bg-opacity-95 text-white font-bold text-xs rounded-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving Profile...' : isEditMode ? 'Update Organization Profile' : 'Submit & Save Profile'}
                </button>
              </div>

            </form>
          )}
        </div>

      </main>
    </div>
  );
};

export default NgoOnboarding;
