"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { TwoFactorVerify } from './two-factor-verify';

export function SignInForm({ message }: { message?: { type: string; text: string } }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Check if 2FA is enabled for this user
      if (data.user.user_metadata?.two_factor_enabled === true) {
        // Store the user data and show 2FA verification
        setUser(data.user);
        setShowTwoFactor(true);
      } else {
        // No 2FA, redirect to protected area
        router.push('/protected');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSuccess = () => {
    // 2FA verification successful, redirect to protected area
    router.push('/protected');
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
      />
    );
  }

  return (
    <form className="flex flex-col w-full" onSubmit={handleSignIn}>
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
