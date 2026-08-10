import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ngoProfile, setNgoProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        localStorage.setItem('authToken', token);
        return data;
      } else {
        console.error('Failed to fetch user database profile:', await response.text());
        setProfile(null);
        return null;
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setProfile(null);
      return null;
    }
  };

  // Fetches the NGO-specific profile (organization_name, etc.) and stores it in context.
  // Called after login when role === 'ngo', and after the NGO saves their profile.
  const refreshNgoProfile = useCallback(async (token) => {
    const resolvedToken = token
      || JSON.parse(localStorage.getItem('hh_session') || 'null')?.access_token
      || localStorage.getItem('authToken');
    if (!resolvedToken) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/ngo/profile`, {
        headers: { 'Authorization': `Bearer ${resolvedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNgoProfile(data.has_profile ? data : null);
      }
    } catch (err) {
      console.error('Error fetching NGO profile:', err);
    }
  }, []);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.access_token) {
        const userData = await fetchProfile(initialSession.access_token);
        if (userData?.role === 'ngo') {
          await refreshNgoProfile(initialSession.access_token);
        }
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.access_token) {
        setLoading(true);
        const userData = await fetchProfile(currentSession.access_token);
        if (userData?.role === 'ngo') {
          await refreshNgoProfile(currentSession.access_token);
        }
        setLoading(false);
      } else {
        setProfile(null);
        setNgoProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshNgoProfile]);

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out from Supabase:', err);
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setNgoProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, ngoProfile, loading, logout, fetchProfile, refreshNgoProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
