"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck } from 'lucide-react';

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorVerify({ onSuccess, onCancel }: TwoFactorVerifyProps) {
  const { validateTwoFactorToken } = useAuth();
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!token) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');
      const verified = await validateTwoFactorToken(token);
      
      if (verified) {
        onSuccess();
      } else {
        setError('Invalid verification code. Please try again.');
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
