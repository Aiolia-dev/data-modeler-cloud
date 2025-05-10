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
          
          // Check if 2FA is enabled - check both user metadata and local storage
          const metadataEnabled = userData.user.user_metadata?.two_factor_enabled === true;
          const localStorageEnabled = localStorage.getItem('dm_two_factor_enabled') === 'true';
          const twoFactorEnabled = metadataEnabled || localStorageEnabled;
          
          // If enabled in local storage but not in metadata, sync the metadata
          if (localStorageEnabled && !metadataEnabled) {
            console.log('2FA enabled in local storage but not in metadata, syncing...');
            const localSecret = localStorage.getItem('dm_totp_secret');
            
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
                }
              });
            }
          }
          
          setIsTwoFactorEnabled(twoFactorEnabled);
          setIsTwoFactorVerified(false); // Always start as not verified
          
          console.log('2FA status:', {
            metadataEnabled,
            localStorageEnabled,
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
      if (!user) throw new Error('User not authenticated');
      
      // First, try to refresh the session to ensure we have a valid session
      console.log('Refreshing session before setting up 2FA...');
      await refreshSession();
      
      // Generate a new TOTP secret
      const appName = 'DataModelerCloud';
      const accountName = user.email || 'user';
      
      // Create a new TOTP secret using a consistent format
      // We'll use base32 encoding which is standard for TOTP
      const totpSecret = new OTPAuth.Secret();
      const secretBase32 = totpSecret.base32;
      
      console.log('Generated new TOTP secret in base32 format:', secretBase32);
      console.log('Current time during setup:', new Date().toISOString());
      
      // Store the secret parameters for debugging
      const secretParams = {
        base32: secretBase32,
        algorithm: 'SHA1',
        digits: 6,
        period: 30
      };
      console.log('TOTP parameters for setup:', JSON.stringify(secretParams));
      
      // IMPORTANT: Create the TOTP object using the base32 string directly
      // This ensures consistency between setup and validation
      const totp = new OTPAuth.TOTP({
        issuer: appName,
        label: accountName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secretBase32) // Use fromBase32 for consistency
      });
      
      // For debugging, generate the current token
      const currentToken = totp.generate();
      console.log('Current token at setup time:', currentToken);
      
      // Generate a QR code URL
      const qrCode = totp.toString();
      
      // DIAGNOSTIC: Log detailed information about the QR code
      console.log('DIAGNOSTIC - Full QR code URI:', qrCode);
      console.log('DIAGNOSTIC - QR code URI components:', qrCode.split('?')[0], qrCode.includes('secret=') ? 'contains secret' : 'missing secret');
      
      // Extract the secret from the QR code URI to verify it matches
      const qrCodeParams = new URLSearchParams(qrCode.split('?')[1]);
      const secretInQR = qrCodeParams.get('secret');
      console.log('DIAGNOSTIC - Secret in QR code:', secretInQR);
      console.log('DIAGNOSTIC - QR secret matches generated secret:', secretInQR === secretBase32);
      
      console.log('Setting up 2FA for user:', user.email);
      console.log('Secret generated:', secretBase32.substring(0, 5) + '...');
      
      // Instead of updating user metadata directly, we'll store the secret in local state
      // and only update the metadata during verification
      
      // Return the secret and QR code for the setup process
      return { 
        secret: secretBase32, 
        qrCode 
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw new Error('Failed to setup two-factor authentication');
    }
  };
  
  // Verify a two-factor token and enable 2FA if valid
  const verifyTwoFactor = async (token: string, setupSecret?: string) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      // Get the secret - either from the setup process or from user metadata
      const secret = setupSecret || user.user_metadata?.totp_secret;
      if (!secret) throw new Error('Two-factor setup not initiated');
      
      // DIAGNOSTIC: Log detailed information about the secret being used
      console.log('DIAGNOSTIC - Secret source:', setupSecret ? 'setup process' : 'user metadata');
      console.log('DIAGNOSTIC - Raw user metadata:', JSON.stringify(user.user_metadata));
      console.log('DIAGNOSTIC - Full secret being used:', secret);
      console.log('DIAGNOSTIC - Secret length:', secret.length);
      console.log('DIAGNOSTIC - Secret character set:', new Set([...secret]).size, 'unique characters');
      
      console.log('Verifying 2FA token with secret:', secret.substring(0, 5) + '...');
      console.log('User ID for 2FA verification:', user.id);
      
      // Create a TOTP object with the user's secret and unique identifier
      // Make sure we're using the secret correctly and it's tied to this specific user
      let totp;
      try {
        // Try creating the TOTP with the raw secret string
        totp = new OTPAuth.TOTP({
          issuer: 'DataModelerCloud',
          label: user.email || user.id || 'user', // Use email or ID for uniqueness
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: secret
        });
      } catch (e) {
        console.error('Error creating TOTP with string secret:', e);
        // If that fails, try creating a new Secret object
        const secretObj = OTPAuth.Secret.fromBase32(secret);
        totp = new OTPAuth.TOTP({
          issuer: 'DataModelerCloud',
          label: user.email || user.id || 'user', // Use email or ID for uniqueness
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: secretObj
        });
      }
      
      // Log the token being validated
      console.log('Validating token:', token);
      
      // Verify the token
      const delta = totp.validate({ token, window: 1 }); // Allow a window of 1 period before/after
      console.log('Token validation result:', delta !== null ? 'Valid' : 'Invalid');
      
      if (delta === null) {
        // Invalid token
        return false;
      }
      
      // Token is valid, update both Supabase user metadata and local storage
      try {
        // First, try to update Supabase user metadata
        console.log('Updating Supabase user metadata with 2FA status for user:', user.id);
        
        // Make multiple attempts to update the user metadata
        // This is a workaround for the Supabase session issues
        let updateSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!updateSuccess && attempts < maxAttempts) {
          attempts++;
          console.log(`Attempt ${attempts} to update user metadata`);
          
          // DIAGNOSTIC: Log the exact secret before storing
          console.log('DIAGNOSTIC - About to store TOTP secret in user metadata:', secret);
          console.log('DIAGNOSTIC - Secret length:', secret.length);
          console.log('DIAGNOSTIC - Secret character set:', new Set([...secret]).size, 'unique characters');
          
          // Update user metadata with the TOTP secret
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              totp_secret: secret,
              // Add a timestamp to track when this was set
              totp_setup_time: new Date().toISOString()
            }
          });
          
          if (updateError) {
            console.error('DIAGNOSTIC - Error updating user metadata with TOTP secret:', updateError);
          } else {
            console.log('DIAGNOSTIC - Successfully updated user metadata with TOTP secret');
          }
          
          if (updateError) {
            console.error(`Error updating user metadata (attempt ${attempts}):`, updateError);
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
            // Try to refresh the session before retrying
            await refreshSession();
          } else {
            console.log(`Successfully updated user metadata on attempt ${attempts}`);
            updateSuccess = true;
          }
        }
        
        // Verify that the metadata was actually updated
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!userError) {
          console.log('User metadata after update:', userData.user?.user_metadata);
          const metadataUpdated = userData.user?.user_metadata?.two_factor_enabled === true;
          console.log('2FA enabled in metadata after update:', metadataUpdated);
          
          if (!metadataUpdated) {
            console.warn('2FA status not properly updated in metadata, will rely on local storage');
          }
        }
        
        // Refresh the session to ensure the updated metadata is available
        await refreshSession();
        
        // Also store in local storage as a fallback, but use user-specific keys
        // This prevents one user's 2FA settings from affecting another user on the same browser
        const secretKey = `dm_totp_secret_${user.id}`;
        const enabledKey = `dm_two_factor_enabled_${user.id}`;
        localStorage.setItem(secretKey, secret);
        localStorage.setItem(enabledKey, 'true');
        
        // Update local state
        setIsTwoFactorEnabled(true);
        setIsTwoFactorVerified(true);
        
        console.log('Two-factor authentication enabled successfully for user:', user.id);
        
        // Generate recovery codes (in a real implementation, store these securely)
        // For now, we're just returning success
        return true;
      } catch (error) {
        console.error('Error enabling 2FA:', error);
        return false;
      }
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
        
        // Use a larger window to account for time drift (2 periods before/after)
        const delta1 = totp1.validate({ token, window: 2 });
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
          
          const delta2 = totp2.validate({ token, window: 2 });
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
              
              const delta3 = totp3.validate({ token, window: 2 });
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
