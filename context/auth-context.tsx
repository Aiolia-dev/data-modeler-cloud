"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';

// Define the context type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  
  const supabase = createClientComponentClient();
  
  // Function to refresh the session
  const refreshSession = async () => {
    try {
      console.log('Refreshing auth session...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return;
      }
      
      console.log('Session refreshed successfully:', data.session ? 'Session exists' : 'No session');
      
      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Check for superuser status
        const isSuperuserFlag = data.user.user_metadata?.is_superuser;
        const superuserStatus = isSuperuserFlag === true || isSuperuserFlag === "true";
        setIsSuperuser(superuserStatus);
        
        console.log('User authenticated:', data.user.email);
        console.log('Superuser status:', superuserStatus);
      } else {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsSuperuser(false);
      }
    } catch (err) {
      console.error('Unexpected error refreshing session:', err);
    }
  };
  
  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        console.log('Initializing auth context...');
        
        // First try to get the user directly
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user:', userError);
          throw userError;
        }
        
        // Get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }
        
        console.log('Auth initialization results:', { 
          hasUser: !!userData.user, 
          hasSession: !!sessionData.session,
          userMetadata: userData.user?.user_metadata
        });
        
        // If we have a user, we're authenticated regardless of session
        if (userData.user) {
          setUser(userData.user);
          setSession(sessionData.session);
          setIsAuthenticated(true);
          
          // Check for superuser status
          const isSuperuserFlag = userData.user.user_metadata?.is_superuser;
          const superuserStatus = isSuperuserFlag === true || isSuperuserFlag === "true";
          setIsSuperuser(superuserStatus);
          
          console.log('User authenticated:', userData.user.email);
          console.log('Superuser status:', superuserStatus);
          console.log('User metadata:', userData.user.user_metadata);
        } else {
          console.log('No user found');
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsSuperuser(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        // Reset auth state on error
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsSuperuser(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initialize auth state
    initAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          setIsAuthenticated(true);
          
          // Check for superuser status
          const isSuperuserFlag = newSession.user?.user_metadata?.is_superuser;
          const superuserStatus = isSuperuserFlag === true || isSuperuserFlag === "true";
          setIsSuperuser(superuserStatus);
          
          console.log('User authenticated:', newSession.user.email);
          console.log('Superuser status:', superuserStatus);
        } else {
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsSuperuser(false);
        }
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated,
        isSuperuser,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
