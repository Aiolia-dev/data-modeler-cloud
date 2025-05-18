"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import * as OTPAuth from 'otpauth';
import { createSafeClient } from '@/utils/supabase/safe-client';

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
  verifyTwoFactor: (token: string, setupSecret?: string) => Promise<boolean>;
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
  
  // Create a safe Supabase client
  const supabase = createSafeClient();
  
  // Helper function to try to recover 2FA status from local storage when session is missing
  const tryRecoverTwoFactorStatus = () => {
    console.log('DEBUG AUTH: Trying to recover 2FA status from local storage');
    
    // Clean up any temporary 2FA keys that might be causing false positives
    const keysToRemove = [];
    const twoFactorKeys = [];
    
    // Scan localStorage for 2FA related keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Collect temporary keys for removal
        if (key.startsWith('dm_two_factor_enabled_temp_')) {
          keysToRemove.push(key);
        }
        // Collect valid 2FA keys
        else if (key.startsWith('dm_two_factor_enabled_') && !key.includes('undefined')) {
          twoFactorKeys.push(key);
        }
      }
    }
    
    // Remove temporary keys
    keysToRemove.forEach(key => {
      console.log('DEBUG AUTH: Removing temporary 2FA key:', key);
      localStorage.removeItem(key);
    });
    
    console.log('DEBUG AUTH: Found valid 2FA enabled keys:', twoFactorKeys);
    
    // Only consider keys with actual user IDs, not temporary or undefined ones
    for (const key of twoFactorKeys) {
      if (localStorage.getItem(key) === 'true') {
        // Only trust keys that have a corresponding secret
        const secretKey = key.replace('two_factor_enabled', 'totp_secret');
        if (localStorage.getItem(secretKey)) {
          console.log('DEBUG AUTH: Found valid enabled 2FA key with secret:', key);
          return true;
        }
      }
    }
    
    return false;
  };
  
  const refreshSession = async () => {
    try {
      console.log('Refreshing auth session...');
      
      // First try to get the user directly without refreshing the session
      // This is more reliable when there are cookie parsing issues
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userError && userData.user) {
          console.log('Successfully retrieved user without session refresh:', userData.user.email);
          
          // We have a user, let's update our state
          setUser(userData.user);
          setIsAuthenticated(true);
          
          // Check for superuser status
          const isSuperuserFlag = userData.user.user_metadata?.is_superuser;
          const superuserStatus = isSuperuserFlag === true || isSuperuserFlag === "true";
          setIsSuperuser(superuserStatus);
          
          // Check if 2FA is enabled
          console.log('DEBUG AUTH: Checking 2FA status during refresh');
          console.log('DEBUG AUTH: User metadata:', JSON.stringify(userData.user.user_metadata));
          
          const metadataEnabled = userData.user.user_metadata?.two_factor_enabled === true;
          console.log('DEBUG AUTH: 2FA enabled in metadata:', metadataEnabled);
          
          const userSpecificKey = `dm_two_factor_enabled_${userData.user.id}`;
          const localStorageEnabled = localStorage.getItem(userSpecificKey) === 'true';
          console.log('DEBUG AUTH: 2FA local storage check:', {
            key: userSpecificKey,
            value: localStorage.getItem(userSpecificKey),
            enabled: localStorageEnabled
          });
          
          const twoFactorEnabled = metadataEnabled || localStorageEnabled;
          console.log('DEBUG AUTH: Final 2FA status:', twoFactorEnabled);
          
          setIsTwoFactorEnabled(twoFactorEnabled);
          setIsTwoFactorVerified(false); // Always start as not verified
          
          console.log('DEBUG AUTH: Setting isTwoFactorEnabled to:', twoFactorEnabled);
          
          // Now get the session
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (!sessionError && sessionData.session) {
            setSession(sessionData.session);
          } else {
            console.log('No session found, but user is authenticated');
          }
          
          return;
        }
      } catch (e) {
        console.error('Error getting user directly:', e);
      }
      
      // If we get here, we need to try the traditional session refresh
      console.log('Trying traditional session refresh...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        throw error;
      }
      
      if (data.session) {
        console.log('Session refreshed successfully:', data.session.user.email);
        setSession(data.session);
        setUser(data.session.user);
        setIsAuthenticated(true);
        
        // Check for superuser status
        const isSuperuserFlag = data.session.user.user_metadata?.is_superuser;
        const superuserStatus = isSuperuserFlag === true || isSuperuserFlag === "true";
        setIsSuperuser(superuserStatus);
        
        // Check if 2FA is enabled - check both user metadata and user-specific local storage
        console.log('DEBUG AUTH: Checking 2FA status during refresh');
        console.log('DEBUG AUTH: User metadata:', JSON.stringify(data.session.user.user_metadata));
        
        const metadataEnabled = data.session.user.user_metadata?.two_factor_enabled === true;
        console.log('DEBUG AUTH: 2FA enabled in metadata:', metadataEnabled);
        
        const userSpecificKey = `dm_two_factor_enabled_${data.session.user.id}`;
        const localStorageEnabled = localStorage.getItem(userSpecificKey) === 'true';
        console.log('DEBUG AUTH: 2FA local storage check:', {
          key: userSpecificKey,
          value: localStorage.getItem(userSpecificKey),
          enabled: localStorageEnabled
        });
        
        const twoFactorEnabled = metadataEnabled || localStorageEnabled;
        console.log('DEBUG AUTH: Final 2FA status:', twoFactorEnabled);
        
        setIsTwoFactorEnabled(twoFactorEnabled);
        setIsTwoFactorVerified(false); // Always start as not verified
        
        console.log('DEBUG AUTH: Setting isTwoFactorEnabled to:', twoFactorEnabled);
      } else {
        console.log('No session found during refresh');
        
        // Check if we can recover 2FA status from local storage
        const recovered2FA = tryRecoverTwoFactorStatus();
        setIsTwoFactorEnabled(recovered2FA);
        
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsSuperuser(false);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
      
      // Reset auth state on error
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      setIsSuperuser(false);
      
      // Try to recover 2FA status from local storage
      const recovered2FA = tryRecoverTwoFactorStatus();
      setIsTwoFactorEnabled(recovered2FA);
    }
  };
  
  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        console.log('Initializing auth context...');
        await refreshSession();
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
    
    initAuth();
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session) {
          setSession(session);
          setUser(session.user);
          setIsAuthenticated(true);
          
          // Check for superuser status
          const isSuperuserFlag = session.user.user_metadata?.is_superuser;
          const superuserStatus = isSuperuserFlag === true || isSuperuserFlag === "true";
          setIsSuperuser(superuserStatus);
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
  
  // Set up two-factor authentication
  const setupTwoFactor = async () => {
    if (!user) {
      throw new Error('User must be authenticated to set up 2FA');
    }
    
    try {
      // Generate a random secret
      const buffer = new Uint8Array(20);
      crypto.getRandomValues(buffer);
      const secret = base32Encode(buffer);
      
      // Create a TOTP object
      const totp = new OTPAuth.TOTP({
        issuer: 'DataModelerCloud',
        label: user.email || user.id || 'user', // Use email or ID for uniqueness
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret
      });
      
      // Generate a QR code URL
      const qrCode = totp.toString();
      
      // Store the secret temporarily in local storage
      // We'll only permanently enable it after verification
      localStorage.setItem(`dm_totp_secret_temp_${user.id}`, secret);
      
      return { secret, qrCode };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw error;
    }
  };
  
  // Helper function to encode buffer as base32
  const base32Encode = (buffer: Uint8Array): string => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    
    return result;
  };
  
  // Verify a two-factor token and enable 2FA if valid
  const verifyTwoFactor = async (token: string, setupSecret?: string) => {
    if (!user) {
      throw new Error('User must be authenticated to verify 2FA');
    }
    
    try {
      // Determine which secret to use
      let secretToUse = setupSecret;
      
      if (!secretToUse) {
        // If no setup secret provided, check if we have a temporary one in local storage
        secretToUse = localStorage.getItem(`dm_totp_secret_temp_${user.id}`);
      }
      
      if (!secretToUse) {
        console.error('No 2FA secret available for verification');
        return false;
      }
      
      console.log(`Attempting to verify token: ${token} for user: ${user.id} with secret: ${secretToUse.substring(0, 5)}...`);
      
      // Create a TOTP object
      const totp = new OTPAuth.TOTP({
        issuer: 'DataModelerCloud',
        label: user.email || user.id || 'user', // Use email or ID for uniqueness
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secretToUse
      });
      
      // Validate the token with a window of 1 period before/after
      const delta = totp.validate({ token, window: 1 });
      
      if (delta === null) {
        console.log('Token validation failed');
        return false;
      }
      
      console.log('Token validated successfully, enabling 2FA');
      
      // Store the secret in local storage permanently
      localStorage.setItem(`dm_two_factor_enabled_${user.id}`, 'true');
      localStorage.setItem(`dm_totp_secret_${user.id}`, secretToUse);
      
      // Remove any temporary secret
      localStorage.removeItem(`dm_totp_secret_temp_${user.id}`);
      
      // Update user metadata to indicate 2FA is enabled
      const { error } = await supabase.auth.updateUser({
        data: {
          two_factor_enabled: true,
          totp_secret: secretToUse
        }
      });
      
      if (error) {
        console.error('Error updating user metadata:', error);
      }
      
      // Update state
      setIsTwoFactorEnabled(true);
      setIsTwoFactorVerified(true);
      
      return true;
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return false;
    }
  };
  
  // Disable two-factor authentication
  const disableTwoFactor = async () => {
    if (!user) {
      throw new Error('User must be authenticated to disable 2FA');
    }
    
    try {
      // Remove 2FA data from local storage
      localStorage.removeItem(`dm_two_factor_enabled_${user.id}`);
      localStorage.removeItem(`dm_totp_secret_${user.id}`);
      
      // Update user metadata to indicate 2FA is disabled
      const { error } = await supabase.auth.updateUser({
        data: {
          two_factor_enabled: false,
          totp_secret: null
        }
      });
      
      if (error) {
        console.error('Error updating user metadata:', error);
        return false;
      }
      
      // Update state
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
    if (!user) {
      throw new Error('User must be authenticated to validate 2FA token');
    }
    
    try {
      // First try to get the secret from user metadata
      let secretToUse = user.user_metadata?.totp_secret;
      
      // If not in metadata, try local storage
      if (!secretToUse) {
        secretToUse = localStorage.getItem(`dm_totp_secret_${user.id}`);
      }
      
      if (!secretToUse) {
        console.error('No 2FA secret available for validation');
        return false;
      }
      
      console.log(`Attempting to validate token: ${token} for user: ${user.id} with secret: ${secretToUse?.substring(0, 5)}...`);
      
      // Try multiple validation approaches to ensure the code is properly validated
      let verified = false;
      
      try {
        // Approach 1: Try with raw secret string
        console.log('Trying validation approach 1 with raw secret');
        const totp1 = new OTPAuth.TOTP({
          issuer: 'DataModelerCloud',
          label: user.email || user.id || 'user', // Use email or ID for uniqueness
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: secretToUse
        });
        
        // Use a wider window to account for time drift (4 periods before/after = ±2 minutes)
        const delta1 = totp1.validate({ token, window: 4 });
        console.log('Validation approach 1 result:', delta1 !== null ? 'Valid' : 'Invalid');
        
        if (delta1 !== null) {
          verified = true;
        } else {
          // Approach 2: Try with Secret object from Base32
          console.log('Trying validation approach 2 with Secret.fromBase32');
          const secretObj = OTPAuth.Secret.fromBase32(secretToUse || '');
          const totp2 = new OTPAuth.TOTP({
            issuer: 'DataModelerCloud',
            label: user.email || user.id || 'user', // Use email or ID for uniqueness
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: secretObj
          });
          
          // Use a wider window to account for time drift (4 periods before/after = ±2 minutes)
          const delta2 = totp2.validate({ token, window: 4 });
          console.log('Validation approach 2 result:', delta2 !== null ? 'Valid' : 'Invalid');
          
          if (delta2 !== null) {
            verified = true;
          } else {
            // Approach 3: Try with different encoding
            console.log('Trying validation approach 3 with different encoding');
            try {
              const secretObj3 = OTPAuth.Secret.fromUTF8(secretToUse || '');
              const totp3 = new OTPAuth.TOTP({
                issuer: 'DataModelerCloud',
                label: user.email || user.id || 'user', // Use email or ID for uniqueness
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: secretObj3
              });
              
              // Use a wider window to account for time drift (4 periods before/after = ±2 minutes)
              const delta3 = totp3.validate({ token, window: 4 });
              console.log('Validation approach 3 result:', delta3 !== null ? 'Valid' : 'Invalid');
              verified = delta3 !== null;
            } catch (e) {
              console.error('Error in validation approach 3:', e);
            }
          }
        }
      } catch (e) {
        console.error('Error creating TOTP with string secret:', e);
      }
      
      console.log('Final token validation result:', verified ? 'Valid' : 'Invalid');
      
      if (!verified) {
        // Invalid token
        return false;
      }
      
      // Token is valid, mark as verified
      setIsTwoFactorVerified(true);
      console.log('User 2FA verified successfully:', user.id);
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
