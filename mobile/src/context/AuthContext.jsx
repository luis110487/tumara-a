import { disablePushForLogout } from '../lib/pushNotifications';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileFor, setProfileFor] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      setSession(null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setProfileFor(null);
      setProfileLoading(false);
      return;
    }
    let active = true;
    setProfileLoading(true);
    apiFetch('/api/me')
      .then(data => { if(active) setProfile(data); })
      .catch(() => { if(active) setProfile(null); })
      .finally(() => { if(active) { setProfileFor(session.user.id); setProfileLoading(false); } });
    return () => { active = false; };
  }, [session]);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    profileLoading: loading || profileLoading || Boolean(session && profileFor !== session.user.id),
    refreshProfile: async () => { const updated = await apiFetch('/api/me'); setProfile(updated); return updated; },
    signOut: async () => { try { await disablePushForLogout(); } catch {} return supabase.auth.signOut(); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
