"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QRCode from 'qrcode.react';

interface TwoFactorSetupProps {
  onComplete?: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const { setupTwoFactor, verifyTwoFactor } = useAuth();
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const handleSetup = async () => {
    try {
      setIsLoading(true);
      setError('');
      const result = await setupTwoFactor();
      setSecret(result.secret);
      setQrCode(result.qrCode);
    } catch (err) {
      setError('Failed to setup 2FA. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!token) {
      setError('Please enter the verification code');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');
      const verified = await verifyTwoFactor(token);
      if (verified) {
        setSuccess(true);
        // In a real implementation, you would get recovery codes from the backend
        setRecoveryCodes(['ABCDE-12345', 'FGHIJ-67890', 'KLMNO-13579', 'PQRST-24680']);
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 3000);
        }
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify 2FA. Please try again.');
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="bg-green-900/30 border border-green-700 rounded-md p-4">
          <h3 className="text-lg font-medium text-green-300">Two-factor authentication enabled!</h3>
          <p className="mt-2 text-sm text-green-200">Your account is now more secure.</p>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Recovery Codes</h3>
          <p className="text-sm text-gray-400">
            Save these recovery codes in a secure place. You can use them to access your account if you lose your authenticator device.
          </p>
          <div className="bg-gray-800 p-4 rounded-md font-mono text-sm">
            {recoveryCodes.map((code, index) => (
              <div key={index} className="py-1">{code}</div>
            ))}
          </div>
          <p className="text-sm text-amber-400">
            Warning: These codes will only be shown once. If you lose them, you'll need to generate new ones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!secret ? (
        <div>
          <p className="mb-4 text-sm text-gray-400">
            Two-factor authentication adds an extra layer of security to your account. Once enabled, you'll need to provide a verification code from your authenticator app when signing in.
          </p>
          <Button 
            onClick={handleSetup} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Setting up...' : 'Set up two-factor authentication'}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Scan QR Code</h3>
            <p className="text-sm text-gray-400 mb-4">
              Scan this QR code with your authenticator app (like Google Authenticator, Authy, or Microsoft Authenticator).
            </p>
            <div className="flex justify-center bg-white p-4 rounded-md">
              <QRCode value={qrCode} size={200} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Manual Setup</h3>
            <p className="text-sm text-gray-400 mb-2">
              If you can't scan the QR code, enter this code manually in your authenticator app:
            </p>
            <div className="bg-gray-800 p-3 rounded-md font-mono text-center select-all">
              {secret}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Verify Setup</h3>
            <p className="text-sm text-gray-400 mb-4">
              Enter the verification code from your authenticator app to complete the setup:
            </p>
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').substring(0, 6))}
                className="bg-gray-800 border-gray-700"
                maxLength={6}
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
                {isVerifying ? 'Verifying...' : 'Verify and Enable'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
