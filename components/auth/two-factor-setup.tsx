"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QRCodeSVG } from 'qrcode.react';

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
      
      console.log('Verifying 2FA setup with token:', token, 'and secret:', secret ? secret.substring(0, 5) + '...' : 'none');
      
      // VALIDATION IMPROVEMENT: Before calling the API, verify the token locally
      // This helps ensure the user has scanned the correct QR code
      let localVerification = false;
      
      try {
        if (secret) {
          const OTPAuth = await import('otpauth');
          
          // Create a TOTP object using the same approach as in auth-context.tsx
          const totp = new OTPAuth.TOTP({
            issuer: 'DataModelerCloud',
            label: 'setup',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(secret)
          });
          
          // Check with a wide window to account for time drift
          const delta = totp.validate({ token, window: 2 });
          localVerification = delta !== null;
          
          console.log('Local verification result:', localVerification ? 'Valid' : 'Invalid');
          console.log('Expected token:', totp.generate());
          console.log('User provided token:', token);
          
          // If local verification fails, try direct comparison with a wider window
          if (!localVerification) {
            console.log('Trying direct token comparison with wider window');
            
            // Check a wide range of time windows
            for (let i = -10; i <= 10; i++) {
              const timestamp = Math.floor(Date.now() / 1000) + (i * 30);
              const windowToken = totp.generate({ timestamp: timestamp * 1000 });
              
              if (windowToken === token) {
                console.log(`Direct match found in window ${i} (${i*30} seconds ${i < 0 ? 'behind' : 'ahead'})`);
                localVerification = true;
                break;
              }
            }
          }
        }
      } catch (localVerifyError) {
        console.error('Error during local verification:', localVerifyError);
        // Continue with server verification even if local verification fails
      }
      
      // If local verification failed, warn the user but still try server verification
      if (!localVerification && secret) {
        console.warn('Local verification failed - the token may not match the displayed QR code');
      }
      
      // Pass both the token and the secret from the setup process
      const verified = await verifyTwoFactor(token, secret);
      
      if (verified) {
        console.log('2FA setup verification successful');
        setSuccess(true);
        // In a real implementation, you would get recovery codes from the backend
        setRecoveryCodes(['ABCDE-12345', 'FGHIJ-67890', 'KLMNO-13579', 'PQRST-24680']);
        
        // Store the successful secret in local storage as a backup
        if (secret) {
          try {
            localStorage.setItem('dm_last_successful_totp_secret', secret);
            console.log('Stored successful TOTP secret in local storage as backup');
          } catch (storageError) {
            console.error('Error storing TOTP secret in local storage:', storageError);
          }
        }
        
        // Force a refresh of the auth state to ensure the 2FA status is updated
        try {
          const { data, error } = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }).then(res => res.json());
          
          if (error) {
            console.error('Error refreshing auth state:', error);
          } else {
            console.log('Auth state refreshed successfully');
            
            // Ensure the 2FA status is also saved in local storage
            // This is a fallback in case the Supabase metadata update fails
            if (data?.user?.id) {
              localStorage.setItem(`dm_two_factor_enabled_${data.user.id}`, 'true');
              if (secret) {
                localStorage.setItem(`dm_totp_secret_${data.user.id}`, secret);
              }
              console.log('2FA status saved to local storage');
            }
          }
        } catch (refreshError) {
          console.error('Failed to refresh auth state:', refreshError);
        }
        
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
              <QRCodeSVG value={qrCode} size={200} />
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
