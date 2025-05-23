"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { TwoFactorVerify } from './two-factor-verify';
import { signInAction } from "@/app/actions";
import { useAuth } from '@/context/auth-context';

export function SignInForm({ message }: { message?: { type: string; text: string } }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User is already authenticated, redirecting to protected page');
      router.push('/protected');
    }
  }, [isAuthenticated, router]);
  // Create a fresh browser client with proper configuration
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce'
      }
    }
  );
  const { isTwoFactorEnabled, isTwoFactorVerified } = useAuth();

  // Use client-side authentication first to check for 2FA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // First, try to sign in with password to check if 2FA is needed
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Log user metadata for debugging
      console.log('User metadata after sign-in:', data.user?.user_metadata);
      console.log('2FA enabled in metadata:', data.user?.user_metadata?.two_factor_enabled);
      
      // Check if 2FA is enabled for THIS specific user by checking Supabase user metadata first, then local storage as fallback
      const metadataEnabled = data.user?.user_metadata?.two_factor_enabled === true;
      const localStorageEnabled = localStorage.getItem(`dm_two_factor_enabled_${data.user?.id}`) === 'true';
      // Prioritize metadata over local storage
      const twoFactorEnabled = metadataEnabled || localStorageEnabled;
      
      console.log(`User ${data.user?.id} 2FA status:`, {
        metadataEnabled,
        localStorageEnabled,
        twoFactorEnabled,
        userMetadata: data.user?.user_metadata
      });
      
      // Check if we need to fetch the latest user metadata
      // This is a workaround for the Supabase session issues
      if (localStorageEnabled && !metadataEnabled) {
        console.log('2FA enabled in localStorage but not in metadata, fetching latest user data...');
        
        try {
          // Try to refresh the auth state to get the latest metadata
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }).then(res => res.json());
          
          if (refreshResponse.user?.user_metadata?.two_factor_enabled === true) {
            console.log('Updated metadata shows 2FA is enabled');
            setUser(refreshResponse.user);
            const secret = refreshResponse.user.user_metadata?.totp_secret || localStorage.getItem(`dm_totp_secret_${data.user?.id}`);
            setTwoFactorSecret(secret || '');
            setShowTwoFactor(true);
            setIsLoading(false);
            return;
          }
        } catch (refreshError) {
          console.error('Error refreshing auth state:', refreshError);
        }
      }
      
      // Proceed with 2FA verification if enabled in either metadata or localStorage
      if (metadataEnabled || localStorageEnabled) {
        console.log('2FA is enabled, showing verification screen');
        // Store the user and show 2FA verification
        setUser(data.user);
        
        // Get the secret from metadata or user-specific local storage
        const metadataSecret = data.user?.user_metadata?.totp_secret;
        const userSpecificSecret = localStorage.getItem(`dm_totp_secret_${data.user?.id}`);
        
        if (metadataSecret || userSpecificSecret) {
          console.log('Found TOTP secret, proceeding with 2FA verification');
          setTwoFactorSecret(metadataSecret || userSpecificSecret || '');
          setShowTwoFactor(true);
          setIsLoading(false);
          return;
        } else {
          console.error('2FA is enabled but no TOTP secret found');
          throw new Error('Two-factor authentication is enabled but no secret key was found. Please contact support.');
        }
      } else {
        console.log('2FA not enabled, proceeding with direct redirection');
        
        // Use Next.js router for navigation
        console.log('Redirecting to protected page using Next.js router...');
        router.push('/protected');
        
        // Set a fallback with direct navigation in case router doesn't work
        setTimeout(() => {
          console.log('Fallback: Using direct navigation');
          window.location.href = '/protected';
        }, 500);
      }
    } catch (err: any) {
      console.error('Error during sign-in:', err);
      setError(err.message || 'An error occurred during sign-in');
      setIsLoading(false);
    }
  };

  const handleTwoFactorSuccess = async () => {
    setIsLoading(true);
    try {
      // After successful 2FA verification, we can directly navigate to the protected page
      // The user is already authenticated at this point
      console.log('2FA verification successful, redirecting to protected page');
      
      // Use Next.js router for navigation
      console.log('Redirecting to protected page using Next.js router...');
      router.push('/protected');
      
      // Set a fallback with direct navigation in case router doesn't work
      setTimeout(() => {
        console.log('Fallback: Using direct navigation');
        window.location.href = '/protected';
      }, 500);
    } catch (err: any) {
      console.error('Error after 2FA verification:', err);
      setError(err.message || 'An error occurred after 2FA verification');
      setIsLoading(false);
    }
  };

  const handleTwoFactorCancel = async () => {
    // User canceled 2FA, sign them out
    await supabase.auth.signOut();
    setShowTwoFactor(false);
    setUser(null);
  };

  if (showTwoFactor) {
    return (
      <TwoFactorVerify
        onSuccess={handleTwoFactorSuccess}
        onCancel={handleTwoFactorCancel}
        secret={twoFactorSecret}
        userId={user?.id} // Pass the user ID to ensure token is validated for the correct user
      />
    );
  }

  return (
    <form className="flex flex-col w-full" onSubmit={handleSubmit}>
      <h1 className="text-2xl font-medium mb-2">Sign in</h1>
      <p className="text-sm text-gray-400 mb-8">
        Access your data modeling workspace
      </p>
      
      <div className="mb-4">
        <Label htmlFor="email" className="block mb-2">Email</Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <Input 
            name="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" 
            required 
            className="pl-10 bg-gray-800 border-gray-700 text-white auth-input" 
          />
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <Label htmlFor="password">Password</Label>
          <Link
            className="text-indigo-400 hover:text-indigo-300 text-sm"
            href="/forgot-password"
          >
            Forgot Password?
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <Input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="pl-10 bg-gray-800 border-gray-700 text-white auth-input"
          />
        </div>
      </div>
      
      <button 
        type="submit"
        disabled={isLoading}
        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md mt-2 mb-4"
      >
        {isLoading ? "Signing In..." : "Sign in"}
      </button>
      
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-md p-3 mb-4 text-sm text-red-300">
          {error}
        </div>
      )}
      
      {message && message.type === 'error' && (
        <div className="bg-red-900/30 border border-red-700 rounded-md p-3 mb-4 text-sm text-red-300">
          {message.text}
        </div>
      )}
      
      {message && message.type === 'success' && (
        <div className="bg-green-900/30 border border-green-700 rounded-md p-3 mb-4 text-sm text-green-300">
          {message.text}
        </div>
      )}
      
      <div className="text-center mt-4 text-gray-400 text-sm">
        Don't have an account?{" "}
        <Link className="text-indigo-400 hover:text-indigo-300" href="/sign-up">
          Sign up
        </Link>
      </div>
    </form>
  );
}
