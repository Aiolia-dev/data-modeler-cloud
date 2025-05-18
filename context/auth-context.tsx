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
  
  // Create a standard Supabase client
  const supabase = createClientComponentClient();
  
  // Function to refresh the session
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
          console.log('DEBUG AUTH: Checking 2FA status from getUser');
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
          
          const finalStatus = metadataEnabled || localStorageEnabled;
          console.log('DEBUG AUTH: Setting isTwoFactorEnabled to:', finalStatus);
          setIsTwoFactorEnabled(finalStatus);
          
          return; // Skip the session refresh if we already have the user
        }
      } catch (directUserError) {
        console.error('Error getting user directly:', directUserError);
        // Continue to try refreshing the session
      }
      
      // If we couldn't get the user directly, try refreshing the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        // Try to recover by checking local storage for 2FA status
        const recovered = tryRecoverTwoFactorStatus();
        if (recovered) {
          setIsTwoFactorEnabled(true);
        }
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
        
        // Check if 2FA is enabled after refresh
        console.log('DEBUG AUTH: Checking 2FA status after session refresh');
        console.log('DEBUG AUTH: User metadata after refresh:', JSON.stringify(data.user.user_metadata));
        
        const metadataEnabled = data.user.user_metadata?.two_factor_enabled === true;
        console.log('DEBUG AUTH: 2FA enabled in metadata after refresh:', metadataEnabled);
        
        const userSpecificKey = `dm_two_factor_enabled_${data.user.id}`;
        const localStorageEnabled = localStorage.getItem(userSpecificKey) === 'true';
        console.log('DEBUG AUTH: 2FA local storage check after refresh:', {
          key: userSpecificKey,
          value: localStorage.getItem(userSpecificKey),
          enabled: localStorageEnabled
        });
        
        const finalStatus = metadataEnabled || localStorageEnabled;
        console.log('DEBUG AUTH: Setting isTwoFactorEnabled to:', finalStatus);
        setIsTwoFactorEnabled(finalStatus);
        
        console.log('DEBUG AUTH: 2FA status after refresh:', {
          metadataEnabled,
          localStorageEnabled,
          finalStatus
        });
        
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
          
          // Check if 2FA is enabled - check both user metadata and user-specific local storage
          console.log('DEBUG AUTH: Checking 2FA status during auth initialization');
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
          
          // If enabled in local storage but not in metadata, sync the metadata
          if (localStorageEnabled && !metadataEnabled) {
            console.log('DEBUG AUTH: 2FA enabled in local storage but not in metadata, syncing...');
            const localSecret = localStorage.getItem(`dm_totp_secret_${userData.user.id}`);
            console.log('DEBUG AUTH: Local secret found:', !!localSecret);
            
            if (localSecret) {
              // Update the user metadata with the 2FA status from local storage
              supabase.auth.updateUser({
                data: {
                  two_factor_enabled: true,
                  totp_secret: localSecret
                }
              }).then(({ error }) => {
                if (error) {
                  console.error('Error syncing 2FA status to metadata:', error);
                } else {
                  console.log('Successfully synced 2FA status to metadata');
                  // Ensure we update our state to reflect the change
                  setIsTwoFactorEnabled(true);
                }
              });
            }
          }
          
          setIsTwoFactorEnabled(twoFactorEnabled);
          setIsTwoFactorVerified(false); // Always start as not verified
          
          console.log('DEBUG AUTH: Setting isTwoFactorEnabled to:', twoFactorEnabled);
          console.log('DEBUG AUTH: 2FA status summary:', {
            metadataEnabled,
            localStorageEnabled,
            userSpecificKey,
            finalStatus: twoFactorEnabled
          });
          
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
      async (event: string, newSession: Session | null) => {
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
  
  // Set up two-factor authentication
  const setupTwoFactor = async () => {
    try {
      if (!user) {
        console.error('DEBUG AUTH: No user found when setting up 2FA');
        throw new Error('User not authenticated');
      }
      
      console.log('DEBUG AUTH: Setting up 2FA for user:', user.id);
      
      // First, try to refresh the session to ensure we have a valid session
      console.log('DEBUG AUTH: Refreshing session before setting up 2FA...');
      try {
        await refreshSession();
        console.log('DEBUG AUTH: Session refreshed successfully');
      } catch (refreshError) {
        console.error('DEBUG AUTH: Error refreshing session:', refreshError);
        // Continue anyway - we'll try with the current user
      }
      
      console.log('DEBUG AUTH: Generating TOTP secret...');
      
      // Dynamically import OTPAuth to ensure it's available
      try {
        // Generate a new TOTP secret
        const secretBuffer = new Uint8Array(20);
        window.crypto.getRandomValues(secretBuffer);
        const secretBase32 = base32Encode(secretBuffer);
        
        console.log('DEBUG AUTH: Generated secret:', secretBase32.substring(0, 5) + '...');
        
        // Store the secret in user-specific storage temporarily during setup
        localStorage.setItem(`dm_pending_totp_secret_${user.id}`, secretBase32);
        
        // Create a TOTP URI
        const issuer = 'DataModeler';
        const account = user.email || user.id;
        const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
        
        console.log('DEBUG AUTH: Generated QR code URL');
        
        return {
          secret: secretBase32,
          qrCode: qrCodeUrl
        };
      } catch (otpError) {
        console.error('DEBUG AUTH: Error with OTP library:', otpError);
        throw new Error('Failed to generate 2FA secret. Please try again.');
      }
    } catch (error) {
      console.error('DEBUG AUTH: Error setting up 2FA:', error);
      throw new Error('Failed to setup two-factor authentication');
    }
  };
  
  // Helper function to encode buffer as base32
  function base32Encode(buffer: Uint8Array): string {
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
    try {
      if (!user) {
        console.error('No user found when verifying 2FA');
        return false;
      }
      
      console.log('DEBUG AUTH: Verifying 2FA token...');
      console.log('DEBUG AUTH: Current user:', user.id);
      console.log('DEBUG AUTH: Current user metadata:', JSON.stringify(user.user_metadata));
      
      // Get the secret from the setup process or from user metadata
      const secret = setupSecret || user.user_metadata?.totp_secret;
      
      if (!secret) {
        console.error('No TOTP secret found for verification');
        return false;
      }
      
      // Create a TOTP object with the secret
      const totp = new OTPAuth.TOTP({ secret });
      
      // Validate with a window of 1 period before/after
      const delta = totp.validate({ token, window: 1 });
      
      console.log('TOTP validation result:', delta);
      
      if (delta === null) {
        // Try a second approach with a different format
        const totp2 = new OTPAuth.TOTP({
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(secret)
        });
        
        const delta2 = totp2.validate({ token, window: 1 });
        console.log('Second TOTP validation result:', delta2);
        
        if (delta2 === null) {
          console.error('Invalid 2FA token');
          return false;
        }
      }
      
      // Token is valid, update user metadata
      console.log('DEBUG AUTH: Token is valid, updating user metadata...');
      
      const { data: updateData, error } = await supabase.auth.updateUser({
        data: {
          two_factor_enabled: true,
          totp_secret: secret
        }
      });
      
      if (error) {
        console.error('DEBUG AUTH: Error updating user metadata:', error);
        return false;
      }
      
      console.log('DEBUG AUTH: User metadata updated successfully');
      console.log('DEBUG AUTH: Updated user metadata:', JSON.stringify(updateData?.user?.user_metadata));
      
      // Force a refresh of the session to ensure the metadata is updated
      try {
        console.log('DEBUG AUTH: Refreshing session after 2FA verification...');
        await refreshSession();
        console.log('DEBUG AUTH: Session refreshed successfully after 2FA verification');
      } catch (refreshError) {
        console.error('DEBUG AUTH: Error refreshing session after 2FA verification:', refreshError);
        // Continue anyway since we've already updated the metadata
      }
      
      // Store in user-specific storage
      localStorage.setItem(`dm_two_factor_enabled_${user.id}`, 'true');
      localStorage.setItem(`dm_totp_secret_${user.id}`, secret);
      console.log('DEBUG AUTH: Stored 2FA status and secret in local storage');
      
      // Update state
      setIsTwoFactorEnabled(true);
      setIsTwoFactorVerified(true);
      console.log('DEBUG AUTH: Updated state variables: isTwoFactorEnabled=true, isTwoFactorVerified=true');
      
      // Force a double refresh after a short delay to ensure all systems recognize the change
      setTimeout(async () => {
        try {
          console.log('DEBUG AUTH: Performing delayed session refresh after 2FA verification...');
          await refreshSession();
          console.log('DEBUG AUTH: Delayed session refresh completed');
        } catch (delayedRefreshError) {
          console.error('DEBUG AUTH: Error in delayed session refresh:', delayedRefreshError);
        }
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return false;
    }
  };
  
  // Disable two-factor authentication
  const disableTwoFactor = async () => {
    try {
      if (!user) {
        console.error('No user found when disabling 2FA');
        return false;
      }
      
      console.log('Disabling 2FA...');
      
      // Update user metadata
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
      
      console.log('User metadata updated successfully');
      
      // Remove from user-specific local storage
      localStorage.removeItem(`dm_two_factor_enabled_${user.id}`);
      localStorage.removeItem(`dm_totp_secret_${user.id}`);
      
      // Update state
      setIsTwoFactorEnabled(false);
      setIsTwoFactorVerified(false);
      
      return true;
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      
      // Try the local storage fallback even if the main function fails
      try {
        if (user && typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`dm_two_factor_enabled_${user.id}`, 'false');
          localStorage.removeItem(`dm_totp_secret_${user.id}`);
          console.log('Emergency fallback: Updated 2FA status in local storage');
          
          // Update local state
          setIsTwoFactorEnabled(false);
          setIsTwoFactorVerified(false);
          
          return true;
        }
      } catch (fallbackError) {
        console.error('Error with fallback approach:', fallbackError);
      }
      
      return false;
    }
  };
  
  // Validate a token during login
  const validateTwoFactorToken = async (token: string) => {
    try {
      if (!user) {
        console.error('No user found when validating 2FA token');
        return false;
      }
      
      // Get the secret from user metadata
      const secret = user.user_metadata?.totp_secret;
      if (!secret) {
        // Check if we have a secret in local storage as fallback
        const localSecret = localStorage.getItem(`dm_totp_secret_${user.id}`);
        if (!localSecret) {
          console.error('Two-factor not set up for user:', user.id);
          throw new Error('Two-factor not set up');
        }
      }
      
      // Use the secret from metadata or local storage
      const secretToUse = secret || localStorage.getItem(`dm_totp_secret_${user.id}`);
      
      console.log(`Validating 2FA token for user: ${user.id} with secret: ${secretToUse?.substring(0, 5)}...`);
      
      // Create a TOTP object with the user's secret and unique identifier
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
