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

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  // Validate a single field and return the error string (or '' if valid)
  const validateField = (fieldName, value) => {
    switch (fieldName) {
      case 'password': {
        if (value) {
          if (value.length < 8) {
            return 'Password must be at least 8 characters and contain at least one uppercase letter and one special character.';
          }
          if (!/[A-Z]/.test(value)) {
            return 'Password must be at least 8 characters and contain at least one uppercase letter and one special character.';
          }
          if (!/[!@#$%^&*()_+\-=\[\]{};:'",.< >?/\\|`~]/.test(value)) {
            return 'Password must be at least 8 characters and contain at least one uppercase letter and one special character.';
          }
        }
        return '';
      }
      case 'name': {
        if (value) {
          const trimmed = value.trim();
          if (!trimmed) return 'Name cannot be empty or whitespace only.';
          if (/\d/.test(trimmed)) return 'Name must not contain digits.';
          if (/^[^\w\s'-]+$/u.test(trimmed)) return 'Name must not be only special characters.';
        }
        return '';
      }
      case 'city': {
        if (value && value !== '') {
          if (!APPROVED_CITIES.includes(value)) {
            return 'Please select a valid city.';
          }
        }
        return '';
      }
      case 'email': {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return 'Please enter a valid email address.';
        }
        return '';
      }
      case 'phone': {
        if (value) {
          const trimmed = value.trim();
          if (!/^[6-9][0-9]{9}$/.test(trimmed)) {
            return 'Phone must be exactly 10 digits starting with 6, 7, 8, or 9.';
          }
        }
        return '';
      }
      case 'registrationNo': {
        if (value && !/^\d{1,9}$/.test(value)) {
          return 'Registration number must contain maximum 9 digits (numbers only).';
        }
        return '';
      }
      case 'darpanId': {
        if (value) {
          const trimmed = value.trim().toUpperCase();
          if (!/^[A-Z]{2}\/[0-9]{4}\/[0-9]{7}$/.test(trimmed)) {
            return 'Enter a valid NGO DARPAN ID, e.g. GJ/2017/0168501.';
          }
        }
        return '';
      }
      case 'panNumber': {
        if (value) {
          const trimmed = value.trim().toUpperCase();
          if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(trimmed)) {
            return 'PAN number must be 10 characters in format like AACTS0036Q.';
          }
        }
        return '';
      }
      case 'cinNumber': {
        if (value) {
          const trimmed = value.trim().toUpperCase();
          if (!/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(trimmed)) {
            return 'Enter a valid 21-character CIN, e.g. U74999MH2000PTC123456.';
          }
        }
        return '';
      }
      default:
        return '';
    }
  };

  const handleFieldChange = (fieldName, value, setter) => {
    setter(value);
    const err = validateField(fieldName, value);
    setFieldErrors(prev => ({ ...prev, [fieldName]: err }));
  };

  // Canonical focus-area list fetched from backend
  const [allowedFocusAreas, setAllowedFocusAreas] = useState([]);
  // NGO: selected focus areas (array, not comma string)
  const [selectedNgoFocusAreas, setSelectedNgoFocusAreas] = useState([]);

  const APPROVED_CITIES = [
    'Ahmedabad', 'Bengaluru', 'Bhopal', 'Bhubaneswar', 'Chandigarh',
    'Chennai', 'Delhi', 'Hyderabad', 'Indore', 'Jaipur',
    'Kochi', 'Kolkata', 'Lucknow', 'Mumbai', 'Nagpur',
    'Patna', 'Pune', 'Surat', 'Vadodara', 'Visakhapatnam'
  ];

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

    // Build field validation errors
    const newErrors = {};
    
    // Common validations for all roles
    newErrors.password = validateField('password', password);
    newErrors.city = validateField('city', city);
    
    if (role === 'volunteer') {
      newErrors.name = validateField('name', name);
      newErrors.email = validateField('email', email);
      newErrors.phone = validateField('phone', phone);
    } else if (role === 'ngo') {
      newErrors.orgName = validateField('name', orgName);
      newErrors.email = validateField('email', email);
      newErrors.phone = validateField('phone', phone);
      newErrors.registrationNo = validateField('registrationNo', registrationNo);
      newErrors.darpanId = validateField('darpanId', darpanId);
      newErrors.panNumber = validateField('panNumber', panNumber);
    } else if (role === 'corporate') {
      newErrors.companyName = validateField('name', companyName);
      newErrors.email = validateField('email', email);
      newErrors.phone = validateField('phone', phone);
      newErrors.cinNumber = validateField('cinNumber', cinNumber);
    }

    // Check if any errors
    const hasErrors = Object.values(newErrors).some(err => err !== '');
    setFieldErrors(newErrors);
    
    if (hasErrors) return;

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
                  onChange={e => {
                    setEmail(e.target.value);
                    const err = validateField('email', e.target.value);
                    setFieldErrors(prev => ({ ...prev, email: err }));
                  }}
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                  placeholder="email@example.com"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-brand-error">{fieldErrors.email}</p>
                )}
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
                  onChange={e => {
                    setPassword(e.target.value);
                    const err = validateField('password', e.target.value);
                    setFieldErrors(prev => ({ ...prev, password: err }));
                  }}
                  className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                  placeholder="Min 8 characters"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-brand-error">{fieldErrors.password}</p>
                )}
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
                    onChange={e => {
                      setName(e.target.value);
                      const err = validateField('name', e.target.value);
                      setFieldErrors(prev => ({ ...prev, name: err }));
                    }}
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                    placeholder="Full Name"
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-brand-error">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="text"
                    value={phone}
                    onChange={e => {
                      setPhone(e.target.value);
                      const err = validateField('phone', e.target.value);
                      setFieldErrors(prev => ({ ...prev, phone: err }));
                    }}
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                    placeholder="e.g. 9999999999"
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-brand-error">{fieldErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Registered City
                  </label>
                  <select
                    id="city"
                    value={city}
                    onChange={e => {
                      setCity(e.target.value);
                      const err = validateField('city', e.target.value);
                      setFieldErrors(prev => ({ ...prev, city: err }));
                    }}
                    className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                  >
                    <option value="">Select City</option>
                    {APPROVED_CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {fieldErrors.city && (
                    <p className="mt-1 text-xs text-brand-error">{fieldErrors.city}</p>
                  )}
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
                      onChange={e => {
                        setOrgName(e.target.value);
                        const err = validateField('name', e.target.value);
                        setFieldErrors(prev => ({ ...prev, orgName: err }));
                      }}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="e.g. Hope Foundation"
                    />
                    {fieldErrors.orgName && (
                      <p className="mt-1 text-xs text-brand-error">{fieldErrors.orgName}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="registrationNo" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reg. Number
                    </label>
                    <input
                      id="registrationNo"
                      type="text"
                      value={registrationNo}
                      maxLength={9}
                      onChange={e => {
                        // Only allow numeric digits, max 9
                        const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setRegistrationNo(val);
                        const err = validateField('registrationNo', val);
                        setFieldErrors(prev => ({ ...prev, registrationNo: err }));
                      }}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="Max 9 digits"
                    />
                    {fieldErrors.registrationNo && (
                      <p className="mt-1 text-xs text-brand-error">{fieldErrors.registrationNo}</p>
                    )}
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
                      onChange={e => {
                        const val = e.target.value.trim().toUpperCase();
                        setDarpanId(val);
                        const err = validateField('darpanId', val);
                        setFieldErrors(prev => ({ ...prev, darpanId: err }));
                      }}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="e.g. GJ/2017/0168501"
                    />
                    {fieldErrors.darpanId && (
                      <p className="mt-1 text-xs text-brand-error">{fieldErrors.darpanId}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="panNumber" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      PAN Number
                    </label>
                    <input
                      id="panNumber"
                      type="text"
                      value={panNumber}
                      maxLength={10}
                      onChange={e => {
                        const val = e.target.value.toUpperCase().slice(0, 10);
                        setPanNumber(val);
                        const err = validateField('panNumber', val);
                        setFieldErrors(prev => ({ ...prev, panNumber: err }));
                      }}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="e.g. AACTS0036Q"
                    />
                    {fieldErrors.panNumber && (
                      <p className="mt-1 text-xs text-brand-error">{fieldErrors.panNumber}</p>
                    )}
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
                      onChange={e => {
                        setCompanyName(e.target.value);
                        const err = validateField('name', e.target.value);
                        setFieldErrors(prev => ({ ...prev, companyName: err }));
                      }}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="e.g. Acme Corporation"
                    />
                    {fieldErrors.companyName && (
                      <p className="mt-1 text-xs text-brand-error">{fieldErrors.companyName}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="cinNumber" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Corporate CIN Number
                    </label>
                    <input
                      id="cinNumber"
                      type="text"
                      value={cinNumber}
                      maxLength={21}
                      onChange={e => {
                        const val = e.target.value.toUpperCase().slice(0, 21);
                        setCinNumber(val);
                        const err = validateField('cinNumber', val);
                        setFieldErrors(prev => ({ ...prev, cinNumber: err }));
                      }}
                      className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                      placeholder="e.g. U74999MH2000PTC123456"
                    />
                    {fieldErrors.cinNumber && (
                      <p className="mt-1 text-xs text-brand-error">{fieldErrors.cinNumber}</p>
                    )}
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
