import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Signup = () => {
  const [role, setRole] = useState('volunteer'); // volunteer, ngo, corporate
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // used only for volunteer
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  
  // Volunteer specific
  const [skillTags, setSkillTags] = useState('');
  
  // NGO specific
  const [orgName, setOrgName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [darpanId, setDarpanId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  
  // Corporate specific
  const [companyName, setCompanyName] = useState('');
  const [cinNumber, setCinNumber] = useState('');
  const [csrFocusAreas, setCsrFocusAreas] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Canonical focus-area list fetched from backend
  const [allowedFocusAreas, setAllowedFocusAreas] = useState([]);
  // NGO: selected focus areas (array, not comma string)
  const [selectedNgoFocusAreas, setSelectedNgoFocusAreas] = useState([]);

  const navigate = useNavigate();

  // Fetch canonical focus-area list as soon as the signup page loads
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/ngo/focus-areas`)
      .then(r => r.json())
      .then(d => setAllowedFocusAreas(Array.isArray(d.focus_areas) ? d.focus_areas : []))
      .catch(() => {});
  }, []);

  const toggleNgoFocusArea = (area) => {
    setSelectedNgoFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    
    // Build request body
    const signupData = {
      email,
      password,
      role,
    };
    
    // Add common optional fields
    if (phone) signupData.phone = phone;
    if (city) signupData.city = city;
    
    if (role === 'volunteer') {
      signupData.name = name;          // required by backend
      signupData.skill_tags = skillTags
        ? skillTags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];
    } else if (role === 'ngo') {
      signupData.name = orgName;              // backend `name` field (required)
      signupData.organization_name = orgName; // backend ngo profile field
      signupData.registration_number = registrationNo || null; // correct key
      signupData.darpan_id = darpanId || null;
      signupData.pan_number = panNumber || null;
      // Use the validated selection — only values from the canonical backend list
      signupData.focus_areas = selectedNgoFocusAreas;
    } else if (role === 'corporate') {
      signupData.name = companyName;          // backend `name` field (required)
      signupData.company_name = companyName;  // backend corporate profile field
      signupData.cin_number = cinNumber || null;
      signupData.csr_focus_areas = csrFocusAreas
        ? csrFocusAreas.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || 'Registration failed.');
      }
      setSuccessMsg('Account registered successfully! Redirecting to login page...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during registration.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <h2 className="text-3xl font-extrabold text-brand-primary tracking-tight">HelpingHands</h2>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Create an account on the verified volunteer & compliance portal
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 border border-brand-border rounded-md sm:px-10">
          <h3 className="text-lg font-bold text-brand-dark mb-6 border-b border-brand-border pb-3 uppercase tracking-wider text-xs">
            Account Registration
          </h3>
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-brand-error rounded-md text-brand-error text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-brand-success rounded-md text-brand-success text-xs flex items-start space-x-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                I am registering as:
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('volunteer')}
                  className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                    role === 'volunteer'
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'bg-white border-brand-border text-brand-dark hover:bg-gray-50'
                  }`}
                >
                  Volunteer
                </button>
                <button
                  type="button"
                  onClick={() => setRole('ngo')}
                  className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                    role === 'ngo'
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'bg-white border-brand-border text-brand-dark hover:bg-gray-50'
                  }`}
                >
                  NGO
                </button>
                <button
                  type="button"
                  onClick={() => setRole('corporate')}
                  className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-all cursor-pointer ${
                    role === 'corporate'
                      ? 'bg-brand-primary border-brand-primary text-white'
                      : 'bg-white border-brand-border text-brand-dark hover:bg-gray-50'
                  }`}
                >
                  Company
                </button>
              </div>
            </div>
            {/* Core credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
            {/* Primary contact – only for volunteers */}
            {role === 'volunteer' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contact Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                    placeholder="e.g. +91 9999999999"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Registered City
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                    placeholder="City Name"
                  />
                </div>
              </div>
            )}
            {/* Role specific forms */}
            {role === 'volunteer' && (
              <div className="border-t border-brand-border pt-4">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wide mb-3">
                  Volunteer Profile Settings
                </h4>
                <div>
                  <label htmlFor="skillTags" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Skills (Comma separated tags)
                  </label>
                  <input
                    id="skillTags"
                    type="text"
                    value={skillTags}
                    onChange={e => setSkillTags(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                    placeholder="e.g. teaching, medical support, IT help"
                  />
                </div>
              </div>
            )}
            {role === 'ngo' && (
              <div className="border-t border-brand-border pt-4 space-y-4">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wide mb-1">
                  NGO Legal Entity Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="orgName" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Organization Name
                    </label>
                    <input
                      id="orgName"
                      type="text"
                      required
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="e.g. Hope Foundation"
                    />
                  </div>
                  <div>
                    <label htmlFor="registrationNo" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reg. Number
                    </label>
                    <input
                      id="registrationNo"
                      type="text"
                      value={registrationNo}
                      onChange={e => setRegistrationNo(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="Registration Reg No."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="darpanId" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      NGO Darpan ID
                    </label>
                    <input
                      id="darpanId"
                      type="text"
                      value={darpanId}
                      onChange={e => setDarpanId(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="e.g. DL/2026/012345"
                    />
                  </div>
                  <div>
                    <label htmlFor="panNumber" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      PAN Number
                    </label>
                    <input
                      id="panNumber"
                      type="text"
                      value={panNumber}
                      onChange={e => setPanNumber(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="10-digit PAN"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Focus Areas
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allowedFocusAreas.map(area => {
                      const isSelected = selectedNgoFocusAreas.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => toggleNgoFocusArea(area)}
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
              </div>
            )}
            {role === 'corporate' && (
              <div className="border-t border-brand-border pt-4 space-y-4">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wide mb-1">
                  Corporate Entity Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="companyName" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Company Name
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      required
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="e.g. Acme Corporation"
                    />
                  </div>
                  <div>
                    <label htmlFor="cinNumber" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Corporate CIN Number
                    </label>
                    <input
                      id="cinNumber"
                      type="text"
                      value={cinNumber}
                      onChange={e => setCinNumber(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="21-digit CIN"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="csrFocusAreas" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    CSR Focus Sectors (Comma separated tags)
                  </label>
                  <input
                    id="csrFocusAreas"
                    type="text"
                    value={csrFocusAreas}
                    onChange={e => setCsrFocusAreas(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                    placeholder="e.g. rural development, health, gender equality"
                  />
                </div>
              </div>
            )}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-semibold text-white bg-brand-primary hover:bg-opacity-95 focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </div>
          </form>
          <div className="mt-6 border-t border-brand-border pt-4 text-center">
            <p className="text-xs text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-primary hover:text-brand-accent transition-colors">
                Sign In Instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Signup;
