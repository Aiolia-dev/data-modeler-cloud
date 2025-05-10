"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { ShieldCheck, ShieldOff, User, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { user, isTwoFactorEnabled, disableTwoFactor } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('security');
  const [showSetup, setShowSetup] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDisableTwoFactor = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }
    
    try {
      setIsDisabling(true);
      setError('');
      const result = await disableTwoFactor();
      
      if (result) {
        setSuccess('Two-factor authentication has been disabled');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to disable two-factor authentication');
      }
    } catch (err) {
      setError('An error occurred while disabling two-factor authentication');
      console.error(err);
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
                  <div className={`p-2 rounded-full mr-3 ${isTwoFactorEnabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {isTwoFactorEnabled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {isTwoFactorEnabled ? 'Two-factor authentication is enabled' : 'Two-factor authentication is disabled'}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {isTwoFactorEnabled 
                        ? 'Your account is protected with an additional layer of security.' 
                        : 'Add an extra layer of security to your account by requiring a verification code.'}
                    </p>
                  </div>
                </div>
                
                {isTwoFactorEnabled ? (
                  <Button 
                    variant="destructive" 
                    onClick={handleDisableTwoFactor}
                    disabled={isDisabling}
                  >
                    {isDisabling ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowSetup(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
                <TwoFactorSetup onComplete={() => setShowSetup(false)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
