"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { ShieldCheck, ShieldOff, User, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { user, isTwoFactorEnabled, disableTwoFactor, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('security');
  const [showSetup, setShowSetup] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  
  // Effect to check 2FA status when the component mounts
  React.useEffect(() => {
    const check2FAStatus = async () => {
      try {
        console.log('DEBUG: Checking 2FA status in settings page');
        console.log('DEBUG: User object:', user ? 'exists' : 'null', user?.id);
        console.log('DEBUG: Auth context isTwoFactorEnabled:', isTwoFactorEnabled);
        
        // Default to not enabled
        let enabled = false;
        
        // Only proceed with checks if we have a user object
        if (user) {
          if (user.user_metadata) {
            console.log('DEBUG: User metadata:', JSON.stringify(user.user_metadata));
            
            // Check if 2FA is enabled in user metadata (most authoritative source)
            if (user.user_metadata.two_factor_enabled === true) {
              console.log('DEBUG: 2FA is enabled according to user metadata');
              enabled = true;
            }
          } else {
            console.log('DEBUG: User metadata is null or undefined');
          }
          
          // If not enabled by metadata, check the auth context
          if (!enabled && isTwoFactorEnabled) {
            console.log('DEBUG: 2FA is enabled according to auth context');
            enabled = true;
          }
          
          // If still not enabled, check local storage as a final fallback
          // but ONLY if we have a valid user ID
          if (!enabled && user.id) {
            const userSpecificKey = `dm_two_factor_enabled_${user.id}`;
            const localEnabled = localStorage.getItem(userSpecificKey);
            console.log('DEBUG: Local storage 2FA status:', {
              key: userSpecificKey,
              value: localEnabled
            });
            
            if (localEnabled === 'true') {
              console.log('DEBUG: 2FA is enabled according to local storage');
              enabled = true;
            }
          }
        } else {
          console.log('DEBUG: No user object available, cannot reliably determine 2FA status');
          // Clear any existing 2FA status when no user is available
          enabled = false;
          
          // Clean up any temporary 2FA flags that might be causing false positives
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('dm_two_factor_enabled_temp_')) {
              keysToRemove.push(key);
            }
          }
          
          // Remove any temporary keys
          keysToRemove.forEach(key => {
            console.log('DEBUG: Removing temporary 2FA key:', key);
            localStorage.removeItem(key);
          });
        }
        
        // Update the state based on our determination
        console.log('DEBUG: Final 2FA status determination:', enabled);
        setIs2FAEnabled(enabled);
      } catch (err) {
        console.error('Error checking 2FA status:', err);
        // Default to not enabled on error
        setIs2FAEnabled(false);
      }
    };
    
    // Refresh the session first to get the latest user metadata
    const refreshAndCheck = async () => {
      try {
        console.log('DEBUG: Refreshing session in settings page...');
        await refreshSession();
        console.log('DEBUG: Session refreshed successfully');
        check2FAStatus();
      } catch (err) {
        console.error('Error refreshing session:', err);
        check2FAStatus(); // Still check even if refresh fails
      }
    };
    
    console.log('DEBUG: Initial settings page load, calling refreshAndCheck');
    refreshAndCheck();
    
    // Set up a periodic check to ensure the 2FA status stays in sync
    const intervalId = setInterval(() => {
      console.log('DEBUG: Periodic 2FA status check');
      check2FAStatus();
    }, 5000); // Check every 5 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user, isTwoFactorEnabled, refreshSession]);

  const handleDisableTwoFactor = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }
    
    try {
      setIsDisabling(true);
      setError('');
      setSuccess('');
      
      console.log('Attempting to disable 2FA from settings page');
      
      // First refresh the session to ensure we have a valid session
      try {
        console.log('Refreshing session before disabling 2FA...');
        await refreshSession();
        console.log('Session refreshed successfully');
      } catch (refreshError) {
        console.error('Error refreshing session, but continuing:', refreshError);
        // Continue anyway - the disableTwoFactor function will handle this
      }
      
      // Try to disable 2FA through the auth context
      const result = await disableTwoFactor();
      
      if (result) {
        console.log('2FA disabled successfully');
        // Update our local state to reflect that 2FA is now disabled
        setIs2FAEnabled(false);
        
        // Also remove from localStorage as a backup
        if (user?.id) {
          localStorage.removeItem(`dm_two_factor_enabled_${user.id}`);
          localStorage.removeItem(`dm_totp_secret_${user.id}`);
          console.log('Removed 2FA data from localStorage');
        }
        
        setSuccess('Two-factor authentication has been disabled');
        setTimeout(() => setSuccess(''), 5000);
        
        // Force a page refresh after a short delay to ensure all state is updated
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        console.error('Failed to disable 2FA through the auth context');
        
        // Fallback approach - update local storage and state directly
        if (user?.id) {
          localStorage.setItem(`dm_two_factor_enabled_${user.id}`, 'false');
          localStorage.removeItem(`dm_totp_secret_${user.id}`);
          console.log('Emergency fallback: Updated 2FA status in local storage');
          
          setIs2FAEnabled(false);
          setSuccess('Two-factor authentication has been disabled (using fallback method)');
          
          // Force a page refresh after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setError('Failed to disable two-factor authentication');
        }
      }
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      
      // Even if there's an error, try the local storage fallback
      if (user?.id) {
        try {
          localStorage.setItem(`dm_two_factor_enabled_${user.id}`, 'false');
          localStorage.removeItem(`dm_totp_secret_${user.id}`);
          console.log('Last resort fallback: Updated 2FA status in local storage after error');
          
          setIs2FAEnabled(false);
          setSuccess('Two-factor authentication has been disabled (using emergency fallback)');
          
          // Force a page refresh after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (localStorageError) {
          console.error('Even local storage fallback failed:', localStorageError);
          setError('An error occurred while disabling two-factor authentication');
        }
      } else {
        setError('An error occurred while disabling two-factor authentication');
      }
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>
      
      <div className="flex border-b border-gray-700 mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'profile' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('profile')}
        >
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>Profile</span>
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'security' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('security')}
        >
          <div className="flex items-center gap-2">
            <Lock size={16} />
            <span>Security</span>
          </div>
        </button>
      </div>
      
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                <div className="bg-gray-700 px-3 py-2 rounded-md">
                  {user?.email || 'Not available'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Two-Factor Authentication</h2>
            
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-md p-3 mb-4 text-sm text-red-300">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-900/30 border border-green-700 rounded-md p-3 mb-4 text-sm text-green-300">
                {success}
              </div>
            )}
            
            {!showSetup ? (
              <div>
                <div className="flex items-start mb-4">
                  <div className={`p-2 rounded-full mr-3 ${is2FAEnabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {is2FAEnabled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {is2FAEnabled ? 'Two-factor authentication is enabled' : 'Two-factor authentication is disabled'}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {is2FAEnabled 
                        ? 'Your account is protected with an additional layer of security.' 
                        : 'Add an extra layer of security to your account by requiring a verification code.'}
                    </p>
                  </div>
                </div>
                
                {is2FAEnabled ? (
                  <Button 
                    variant="destructive" 
                    onClick={handleDisableTwoFactor}
                    disabled={isDisabling}
                  >
                    {isDisabling ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                  </Button>
                ) : (
                  <Button 
                    onClick={async () => {
                      try {
                        console.log('Refreshing session before showing 2FA setup...');
                        await refreshSession();
                        console.log('Session refreshed successfully, showing 2FA setup');
                        setShowSetup(true);
                      } catch (refreshError) {
                        console.error('Error refreshing session:', refreshError);
                        setError('Failed to prepare for 2FA setup. Please try again.');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Enable Two-Factor Authentication
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSetup(false)} 
                  className="mb-4"
                >
                  ← Back
                </Button>
                <TwoFactorSetup 
                  onComplete={() => {
                    setShowSetup(false);
                    // Update 2FA status and show success message
                    setIs2FAEnabled(true);
                    setSuccess('Two-factor authentication has been enabled successfully!');
                    // Refresh the page after a short delay to ensure all state is updated
                    setTimeout(() => {
                      window.location.reload();
                    }, 2000);
                  }} 
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
