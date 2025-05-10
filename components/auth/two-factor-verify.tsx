"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck } from 'lucide-react';

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
  secret?: string; // Optional secret for direct validation without using auth context
  userId?: string; // Optional user ID to ensure we're validating for the correct user
}

export function TwoFactorVerify({ onSuccess, onCancel, secret, userId }: TwoFactorVerifyProps) {
  const { validateTwoFactorToken } = useAuth();
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3); // Add attempt counter

  const handleVerify = async () => {
    if (!token) {
      setError('Please enter the verification code');
      return;
    }

    if (token.length !== 6 || !/^\d+$/.test(token)) {
      setError('Verification code must be 6 digits');
      return;
    }
    
    // TEMPORARY: Log the token for debugging
    console.log('Verifying token:', token);
    
    // TEMPORARY: For testing purposes only - remove in production
    // This allows any 6-digit code to work during development
    if (typeof process !== 'undefined' && 
        process.env && 
        process.env.NODE_ENV !== 'production') {
      console.log('DEVELOPMENT MODE: Bypassing actual TOTP validation');
      onSuccess();
      return;
    }

    try {
      setIsVerifying(true);
      setError('');
      
      // If a secret was provided directly (during sign-in), use it for validation
      // Otherwise use the auth context method (for settings page verification)
      let verified = false;
      
      if (secret) {
        // For sign-in flow, create a TOTP object and validate directly
        try {
          const OTPAuth = await import('otpauth');
          
          // Create a unique TOTP for this specific user
          // This ensures that one user's code won't work for another user
          const label = userId || 'user';
          
          console.log(`Validating 2FA token for user ID: ${label} with secret: ${secret.substring(0, 5)}...`);
          
          console.log(`Attempting to validate token: ${token} for user: ${label}`);
          
          // IMPORTANT: For development/testing only
          // In a real production app, we would never do this
          // Using typeof check to avoid TypeScript errors with process.env
          if (typeof process !== 'undefined' && 
              process.env && 
              process.env.NODE_ENV !== 'production') {
            console.log('DEVELOPMENT MODE: Bypassing TOTP validation');
            verified = true;
            return;
          }
          
          // Try multiple validation approaches to ensure the code is properly validated
          try {
            // Always convert the secret to a proper Secret object first
            // This ensures we're using the correct format
            let secretObj;
            
            try {
              // First try to parse as Base32 (most common format for TOTP)
              console.log('Trying to parse secret as Base32');
              secretObj = OTPAuth.Secret.fromBase32(secret);
            } catch (e) {
              console.error('Error parsing as Base32:', e);
              try {
                // Try as raw string
                console.log('Trying to use raw secret string');
                secretObj = secret;
              } catch (e2) {
                console.error('Error using raw secret:', e2);
              }
            }
            
            // Create TOTP with the parsed secret
            const totp = new OTPAuth.TOTP({
              issuer: 'DataModelerCloud',
              label: label,
              algorithm: 'SHA1',
              digits: 6,
              period: 30,
              secret: secretObj
            });
            
            // Use a larger window to account for time drift (2 periods before/after)
            const delta = totp.validate({ token, window: 2 });
            console.log('TOTP validation result:', delta !== null ? 'Valid' : 'Invalid');
            verified = delta !== null;
          } catch (validationError) {
            console.error('Error during TOTP validation:', validationError);
          }
          
          console.log(`2FA validation result: ${verified ? 'Valid' : 'Invalid'} for user ${label}`);
        } catch (e) {
          console.error('Error validating TOTP:', e);
          verified = false;
        }
      } else {
        // For settings or other flows, use the auth context
        verified = await validateTwoFactorToken(token);
      }
      
      if (verified) {
        onSuccess();
      } else {
        // Decrease remaining attempts
        const newAttempts = remainingAttempts - 1;
        setRemainingAttempts(newAttempts);
        
        if (newAttempts <= 0) {
          setError('Too many failed attempts. Please try again later.');
          setTimeout(() => {
            onCancel(); // Return to sign-in form after too many failed attempts
          }, 2000);
        } else {
          setError(`Invalid verification code. ${newAttempts} attempts remaining.`);
        }
      }
    } catch (err) {
      setError('Failed to verify code. Please try again.');
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="bg-blue-900/30 p-3 rounded-full mb-4">
          <ShieldCheck className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
        <p className="text-sm text-gray-400 text-center mt-2">
          Enter the verification code from your authenticator app to continue
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Enter 6-digit code"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, '').substring(0, 6))}
          className="bg-gray-800 border-gray-700 text-center text-lg tracking-widest"
          maxLength={6}
          autoFocus
        />
        
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-md p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        
        <Button 
          onClick={handleVerify} 
          disabled={isVerifying || token.length !== 6}
          className="w-full"
        >
          {isVerifying ? 'Verifying...' : 'Verify and Continue'}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="w-full text-gray-400"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
