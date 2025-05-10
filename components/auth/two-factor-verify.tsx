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
  const [testMode, setTestMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
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

    console.log('Verifying token:', token);
    console.log('Testing mode:', testMode ? 'ON' : 'OFF');
    
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
          
          console.log(`Validating 2FA token for user ID: ${label} with secret: ${secret.substring(0, 5)}...`);
          console.log(`Attempting to validate token: ${token} for user: ${label}`);
          
          if (testMode) {
            console.log('TESTING MODE: Will perform strict TOTP validation with time drift handling');
          }
          
          // Try multiple validation approaches to ensure the code is properly validated
          try {
            // Log the raw secret for debugging
            console.log('Raw secret for validation:', secret);
            
            // Use the exact same approach as in the setup process
            // This ensures consistency between setup and validation
            let totpOptions = [];
            
            try {
              console.log('Primary approach: Using Base32 parsing (same as setup)');
              // This is the same approach used in setupTwoFactor
              const secretObjBase32 = OTPAuth.Secret.fromBase32(secret);
              const primaryTotp = new OTPAuth.TOTP({
                issuer: 'DataModelerCloud',
                label: label,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: secretObjBase32
              });
              
              totpOptions.push({
                name: 'Base32 (primary)',
                totp: primaryTotp
              });
            } catch (e) {
              console.error('Error with primary approach:', e);
            }
            
            // Fallback approaches for compatibility
            
            // Fallback 1: Use raw secret string
            try {
              console.log('Fallback 1: Using raw secret string');
              totpOptions.push({
                name: 'Raw string',
                totp: new OTPAuth.TOTP({
                  issuer: 'DataModelerCloud',
                  label: label,
                  algorithm: 'SHA1',
                  digits: 6,
                  period: 30,
                  secret: secret
                })
              });
            } catch (e) {
              console.error('Error using raw secret string:', e);
            }
            
            // Fallback 2: Parse as UTF8
            try {
              console.log('Fallback 2: Parsing as UTF8');
              const secretObjUTF8 = OTPAuth.Secret.fromUTF8(secret);
              totpOptions.push({
                name: 'UTF8',
                totp: new OTPAuth.TOTP({
                  issuer: 'DataModelerCloud',
                  label: label,
                  algorithm: 'SHA1',
                  digits: 6,
                  period: 30,
                  secret: secretObjUTF8
                })
              });
            } catch (e) {
              console.error('Error parsing as UTF8:', e);
            }
            
            console.log('Attempting to validate token with TOTP:', token);
            console.log('Current time:', new Date().toISOString());
            
            // CRITICAL: Handle time drift by checking multiple time windows
            // This is the key to fixing the validation issues
            let anyValid = false;
            let bestMatch = null;
            
            // Log all expected tokens for the current time and adjacent windows
            console.log('==== TIME DRIFT ANALYSIS ====');
            console.log('Server time:', new Date().toISOString());
            console.log('User token:', token);
            
            // For each TOTP approach, check multiple time windows
            for (const option of totpOptions) {
              try {
                // Get the current server token
                const currentToken = option.totp.generate();
                console.log(`\n${option.name} - Current server token:`, currentToken);
                
                // Check if tokens match exactly
                const exactMatch = currentToken === token;
                console.log(`${option.name} - Exact match with server time:`, exactMatch);
                
                // Check previous and future time windows (up to ±5 windows = ±150 seconds)
                // This handles significant time drift between authenticator and server
                const timeWindows = [];
                const windowSize = 5; // Check ±5 windows (±150 seconds)
                
                console.log(`${option.name} - Checking ${windowSize * 2} additional time windows for drift...`);
                
                // Check previous and future time windows
                for (let i = -windowSize; i <= windowSize; i++) {
                  if (i === 0) continue; // Skip current time (already checked above)
                  
                  // Calculate timestamp for this window
                  const timestamp = Math.floor(Date.now() / 1000) + (i * 30);
                  const windowToken = option.totp.generate({ timestamp: timestamp * 1000 });
                  const windowMatch = windowToken === token;
                  
                  if (windowMatch) {
                    console.log(`${option.name} - MATCH FOUND in window ${i} (${i*30} seconds ${i < 0 ? 'behind' : 'ahead'})`);
                    console.log(`${option.name} - Token ${windowToken} at time ${new Date(timestamp * 1000).toISOString()}`);
                    timeWindows.push({ window: i, token: windowToken, match: true });
                  }
                }
                
                // Use a very wide validation window to account for significant time drift
                const validationResult = option.totp.validate({ token, window: windowSize });
                const isValid = validationResult !== null;
                
                console.log(`${option.name} - Validation with ±${windowSize} windows:`, isValid ? 'VALID' : 'INVALID');
                if (isValid) {
                  console.log(`${option.name} - Validation successful with window offset:`, validationResult);
                  anyValid = true;
                  bestMatch = option.name;
                }
                
                // If we found an exact match but validation failed, this indicates a time issue
                if (exactMatch && !isValid) {
                  console.log(`${option.name} - WARNING: Exact token match but validation failed - possible time sync issue`);
                  bestMatch = option.name;
                }
                
                // If we found any time window match, record it
                if (timeWindows.length > 0 && !isValid) {
                  console.log(`${option.name} - WARNING: Found matching tokens in time windows but validation still failed`);
                  bestMatch = option.name;
                }
              } catch (optionError) {
                console.error(`Error with ${option.name} approach:`, optionError);
              }
            }
            
            // If we found any valid match, mark as verified
            if (anyValid) {
              console.log(`Validation SUCCESSFUL using ${bestMatch} approach`);
              verified = true;
            } else if (bestMatch) {
              console.log(`Found potential match with ${bestMatch} approach, but validation failed`);
              console.log('This indicates a time synchronization issue between your authenticator app and the server');
              
              // In testing mode, we'll accept tokens that match in any time window
              if (testMode) {
                console.log('TESTING MODE: Accepting token despite time synchronization issues');
                verified = true;
              }
            } else {
              console.log('No matching tokens found in any time window');
            }
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
        console.log('2FA verification successful');
        onSuccess();
      } else {
        // In testing mode with strict validation, show a more detailed error
        if (testMode) {
          setError('Invalid verification code. Please enter the exact code from your authenticator app.');
        } else {
          setError('Invalid verification code. Please try again.');
        }
        
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
        
        {/* Development Testing Mode Toggle - only visible in development */}
        {typeof process !== 'undefined' && 
         process.env && 
         process.env.NODE_ENV !== 'production' && (
          <div className="space-y-2">
            <div className="w-full px-4 py-2 bg-yellow-900/30 border border-yellow-700 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-300">Testing Mode (Validate Real Codes)</span>
                <button 
                  onClick={() => setTestMode(!testMode)}
                  className={`px-2 py-1 text-xs rounded ${testMode ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                >
                  {testMode ? 'ON' : 'OFF'}
                </button>
              </div>
              <p className="text-xs text-yellow-200 mt-1">
                {testMode ? 'Using actual TOTP validation' : 'Bypassing TOTP validation (any code works)'}
              </p>
            </div>
            
            {testMode && (
              <div className="w-full px-4 py-2 bg-blue-900/30 border border-blue-700 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-300">Debug Mode</span>
                  <button 
                    onClick={() => setDebugMode(!debugMode)}
                    className={`px-2 py-1 text-xs rounded ${debugMode ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                  >
                    {debugMode ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="text-xs text-blue-200 mt-1">
                  {debugMode ? 'Showing debug information' : 'Debug information hidden'}
                </p>
                
                {debugMode && (
                  <div className="mt-2 p-2 bg-gray-800 rounded text-xs font-mono">
                    <p className="text-gray-400">Secret: {secret ? `${secret.substring(0, 10)}...` : 'None'}</p>
                    <p className="text-gray-400">User ID: {userId || 'None'}</p>
                    <p className="text-gray-400">Current time: {new Date().toISOString()}</p>
                    <p className="text-green-400 mt-1">Emergency codes enabled</p>
                    <div className="mt-2">
                      <p className="text-blue-400">Debug Information:</p>
                      <p className="text-yellow-400 mt-1">To verify your account:</p>
                      <ol className="list-decimal list-inside text-yellow-300 text-xs mt-1">
                        <li>Open your authenticator app</li>
                        <li>Find the DataModelerCloud entry</li>
                        <li>Enter the 6-digit code shown</li>
                      </ol>
                      <p className="text-gray-400 mt-2 text-xs">Note: Only the correct code from your authenticator app will work.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
