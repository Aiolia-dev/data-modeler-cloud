"use client";

import React, { useState, useRef } from 'react';
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
  const [attempts, setAttempts] = useState(3);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleVerify = async () => {
    if (!token) {
      setError('Please enter the verification code');
      return;
    }

    // Ensure token is a 6-digit number
    if (!/^\d{6}$/.test(token)) {
      setError('Verification code must be 6 digits');
      return;
    }
    
    try {
      setIsVerifying(true);
      setError('');
      
      let verified = false;
      
      // For login flow, handle the verification directly
      if (secret) {
        try {
          const OTPAuth = await import('otpauth');
          
          // Create a unique TOTP for this specific user
          const label = userId || 'user';
          
          try {
            // Use the exact same approach as in the setup process
            // This ensures consistency between setup and validation
            
            // Primary approach using Base32 (same as setup)
            const secretObjBase32 = OTPAuth.Secret.fromBase32(secret);
            const totp = new OTPAuth.TOTP({
              issuer: 'DataModelerCloud',
              label: label,
              algorithm: 'SHA1',
              digits: 6,
              period: 30,
              secret: secretObjBase32
            });
            
            // Use a window of 2 to account for time drift (±1 minute)
            const validationResult = totp.validate({ token, window: 2 });
            verified = validationResult !== null;
            
            // If validation fails with the primary approach, try a fallback
            if (!verified) {
              try {
                // Fallback: Use raw secret string
                const fallbackTotp = new OTPAuth.TOTP({
                  issuer: 'DataModelerCloud',
                  label: label,
                  algorithm: 'SHA1',
                  digits: 6,
                  period: 30,
                  secret: secret
                });
                
                // Use a window of 2 to account for time drift (±1 minute)
                const fallbackResult = fallbackTotp.validate({ token, window: 2 });
                verified = fallbackResult !== null;
              } catch (e) {
                console.error('Error with fallback approach:', e);
              }
            }
          } catch (validationError) {
            console.error('Error during TOTP validation:', validationError);
          }
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
        setError('Invalid verification code. Please try again.');
        
        // Decrement attempts
        setAttempts(prev => prev - 1);
      }
    } catch (err) {
      console.error('Error during verification:', err);
      setError('An error occurred during verification. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-white">
      <div className="flex flex-col items-center space-y-6">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-blue-500" />
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Two-Factor Authentication</h2>
          <p className="text-gray-400">
            Enter the verification code from your authenticator app
            to continue
          </p>
        </div>

        <div className="space-y-4 w-full">
          <Input
            type="text"
            placeholder="Enter 6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').substring(0, 6))}
            className="bg-gray-800 border-gray-700 text-center text-lg tracking-widest"
            maxLength={6}
            autoFocus
            ref={inputRef}
          />
          
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-md p-3 text-sm text-red-300 error-container">
              {error}
            </div>
          )}
          
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying || token.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
    </div>
  );
}
