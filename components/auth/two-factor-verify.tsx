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
}

export function TwoFactorVerify({ onSuccess, onCancel, secret }: TwoFactorVerifyProps) {
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
          const totp = new OTPAuth.TOTP({
            issuer: 'DataModelerCloud',
            label: 'user',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: secret
          });
          
          // Verify with a window of 1 period before/after
          const delta = totp.validate({ token, window: 1 });
          verified = delta !== null;
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
