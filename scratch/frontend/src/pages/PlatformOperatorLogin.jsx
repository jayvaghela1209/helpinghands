import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Shield } from 'lucide-react';
import logo from '../assets/image.png';

const PO_SESSION_KEY = 'po_session';

const PlatformOperatorLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // If already authenticated, skip straight to dashboard
  useEffect(() => {
    const stored = sessionStorage.getItem(PO_SESSION_KEY);
    if (stored) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
      const res = await fetch(`${apiUrl}/api/platform-operator/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Login failed.');
      }

      // Store token in sessionStorage only — never in localStorage
      sessionStorage.setItem(PO_SESSION_KEY, data.access_token);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src={logo} alt="HelpingHands" className="h-10 w-auto object-contain mx-auto mb-4" />
        <h2 className="text-3xl font-extrabold text-brand-primary tracking-tight">HelpingHands</h2>
        <p className="mt-2 text-sm text-gray-500 font-medium">Platform Operator Portal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-brand-border rounded-md sm:px-10">

          <div className="flex items-center space-x-2 mb-6 pb-3 border-b border-brand-border">
            <Shield className="w-4 h-4 text-brand-primary" />
            <h3 className="text-xs font-bold text-brand-dark uppercase tracking-wider">
              Operator Authentication
            </h3>
          </div>

          {errorMsg && (
            <div className="mb-5 p-4 bg-red-50 border border-brand-error rounded-md text-brand-error text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="po-email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Operator Email
              </label>
              <input
                id="po-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                placeholder="operator@helpinghands.org"
              />
            </div>

            <div>
              <label htmlFor="po-password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Password
              </label>
              <input
                id="po-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-semibold text-white bg-brand-primary hover:bg-opacity-95 focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Authenticating…' : 'Sign In as Operator'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            This portal is restricted to authorised platform operators only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlatformOperatorLogin;
