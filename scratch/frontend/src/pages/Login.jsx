import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      navigate(`/${profile.role}-dashboard`, { replace: true });
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        // Successful login, context listener will capture and update user.
        // Redirection handled by useEffect.
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred during authentication.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-brand-primary tracking-tight">HelpingHands</h2>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Verified Volunteering & CSR Compliance Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-brand-border rounded-md sm:px-10">
          
          <h3 className="text-lg font-bold text-brand-dark mb-6 border-b border-brand-border pb-3 uppercase tracking-wider text-xs">
            Account Authentication
          </h3>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-brand-error rounded-md text-brand-error text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Corporate or Personal Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-border rounded-md text-sm text-brand-dark focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-semibold text-white bg-brand-primary hover:bg-opacity-95 focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-brand-border pt-4 text-center">
            <p className="text-xs text-gray-500">
              New to the platform?{' '}
              <Link to="/signup" className="font-semibold text-brand-primary hover:text-brand-accent transition-colors">
                Register an Account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
export default Login;
