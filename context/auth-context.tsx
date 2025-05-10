"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import * as OTPAuth from 'otpauth';

// Define the context type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  isTwoFactorEnabled: boolean;
  isTwoFactorVerified: boolean;
  refreshSession: () => Promise<void>;
  setupTwoFactor: () => Promise<{ secret: string; qrCode: string }>;
  verifyTwoFactor: (token: string) => Promise<boolean>;
  disableTwoFactor: () => Promise<boolean>;
  validateTwoFactorToken: (token: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isTwoFactorVerified, setIsTwoFactorVerified] = useState(false);
  
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
          
          // Check if 2FA is enabled
          const twoFactorEnabled = userData.user.user_metadata?.two_factor_enabled === true;
          setIsTwoFactorEnabled(twoFactorEnabled);
          setIsTwoFactorVerified(false); // Always start as not verified
          
          console.log('User authenticated:', userData.user.email);
          console.log('Superuser status:', superuserStatus);
          console.log('2FA enabled:', twoFactorEnabled);
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
  
  // Setup two-factor authentication
  const setupTwoFactor = async () => {
    try {
      // Generate a new TOTP secret
      const appName = 'DataModelerCloud';
      const accountName = user?.email || 'user';
      
      // Create a new TOTP object with a random secret
      const totpSecret = new OTPAuth.Secret();
      const totp = new OTPAuth.TOTP({
        issuer: appName,
        label: accountName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: totpSecret
      });
      
      // Get the secret in base32 format
      const secretBase32 = totpSecret.base32;
      
      // Generate a QR code URL
      const qrCode = totp.toString();
      
      // Save the secret to the user's metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          totp_secret: secretBase32,
          two_factor_enabled: false // Not enabled until verified
        }
      });
      
      if (error) throw error;
      
      return { secret: secretBase32, qrCode };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw new Error('Failed to setup two-factor authentication');
    }
  };
  
  // Verify a two-factor token and enable 2FA if valid
  const verifyTwoFactor = async (token: string) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      // Get the secret from user metadata
      const secret = user.user_metadata?.totp_secret;
      if (!secret) throw new Error('Two-factor setup not initiated');
      
      // Create a TOTP object with the user's secret
      const totp = new OTPAuth.TOTP({
        issuer: 'DataModelerCloud',
        label: user.email || 'user',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });
      
      // Verify the token
      const delta = totp.validate({ token });
      
      if (delta === null) {
        // Invalid token
        return false;
      }
      
      // Token is valid, enable 2FA for the user
      const { error } = await supabase.auth.updateUser({
        data: {
          two_factor_enabled: true
        }
      });
      
      if (error) throw error;
      
      // Update local state
      setIsTwoFactorEnabled(true);
      setIsTwoFactorVerified(true);
      
      // Generate recovery codes (in a real implementation, store these securely)
      // For now, we're just returning success
      return true;
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return false;
    }
  };
  
  // Disable two-factor authentication
  const disableTwoFactor = async () => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      // Update user metadata to disable 2FA
      const { error } = await supabase.auth.updateUser({
        data: {
          two_factor_enabled: false,
          totp_secret: null
        }
      });
      
      if (error) throw error;
      
      // Update local state
      setIsTwoFactorEnabled(false);
      setIsTwoFactorVerified(false);
      
      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return false;
    }
  };
  
  // Validate a token during login
  const validateTwoFactorToken = async (token: string) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      // Get the secret from user metadata
      const secret = user.user_metadata?.totp_secret;
      if (!secret) throw new Error('Two-factor not set up');
      
      // Create a TOTP object with the user's secret
      const totp = new OTPAuth.TOTP({
        issuer: 'DataModelerCloud',
        label: user.email || 'user',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });
      
      // Verify the token
      const delta = totp.validate({ token });
      
      if (delta === null) {
        // Invalid token
        return false;
      }
      
      // Token is valid, mark as verified
      setIsTwoFactorVerified(true);
      return true;
    } catch (error) {
      console.error('Error validating 2FA token:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated,
        isSuperuser,
        isTwoFactorEnabled,
        isTwoFactorVerified,
        refreshSession,
        setupTwoFactor,
        verifyTwoFactor,
        disableTwoFactor,
        validateTwoFactorToken
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
