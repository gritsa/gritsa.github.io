import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import type { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: SupabaseUser | null;
  userData: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (user: SupabaseUser, retryCount = 0): Promise<User | null> => {
    try {
      console.log('[fetchUserData] Starting query for user:', user.id, 'Retry:', retryCount);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('[fetchUserData] Query response:', { data, error });

      // If user not found and this is a new signup, retry after delay
      if (error && error.code === 'PGRST116' && retryCount < 3) {
        console.log('[fetchUserData] User not found, retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchUserData(user, retryCount + 1);
      }

      if (error) {
        console.error('[fetchUserData] Error after retries:', error);
        return null;
      }

      if (data) {
        console.log('[fetchUserData] User data:', data);
        return {
          uid: data.id,
          email: data.email,
          role: data.role as UserRole,
          displayName: data.display_name,
          profileCompleted: data.profile_completed,
          createdAt: new Date(data.created_at),
          managerId: data.manager_id,
          projectIds: data.project_ids,
        };
      }

      return null;
    } catch (error) {
      console.error('[fetchUserData] Error:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    console.log('[AuthContext] Initializing auth listener...');

    // Check for existing session first with timeout
    const initializeAuth = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 3000)
        );

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]) as any;

        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          // Clear potentially corrupted session data
          localStorage.clear();
          sessionStorage.clear();
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user && isMounted) {
          console.log('[AuthContext] Found existing session for:', session.user.email);
          setCurrentUser(session.user);

          const data = await fetchUserData(session.user);
          if (isMounted) {
            setUserData(data);
          }
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error);
        // Clear potentially corrupted session data
        localStorage.clear();
        sessionStorage.clear();
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes - handles sign in, sign out, token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state changed:', event, session ? 'User logged in' : 'No user');
      if (!isMounted) return;

      // Handle specific auth events
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserData(null);
        localStorage.clear();
        sessionStorage.clear();
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed successfully');
      }

      setCurrentUser(session?.user ?? null);

      if (session?.user) {
        try {
          console.log('[AuthContext] Fetching user data for:', session.user.email);
          const data = await fetchUserData(session.user);
          console.log('[AuthContext] User data fetched:', data);
          if (isMounted) {
            setUserData(data);
          }
        } catch (error) {
          console.error('[AuthContext] Error fetching user data:', error);
          // If we can't fetch user data, sign out to prevent stuck state
          await supabase.auth.signOut();
          localStorage.clear();
          sessionStorage.clear();
        }
      } else {
        setUserData(null);
      }
    });

    // Note: initializeDefaultAdmin() removed - admin user now created via Signup page or manually
    // If you need to recreate the admin user, use the Supabase dashboard or SQL commands

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    // Clear all storage to prevent stale session data
    localStorage.clear();
    sessionStorage.clear();
  };

  const refreshUserData = async () => {
    if (currentUser) {
      const data = await fetchUserData(currentUser);
      setUserData(data);
    }
  };

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    signIn,
    signOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
