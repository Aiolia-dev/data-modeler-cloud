'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthResetPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  // Create a fresh browser client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check if we already have a session
  const checkSession = async () => {
    setLoading(true);
    setMessage('Checking session...');
    setError('');
    
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (data.session) {
        setUser(data.session.user);
        setMessage(`Logged in as ${data.session.user.email}`);
      } else {
        setMessage('No active session found');
      }
    } catch (err: any) {
      setError(`Session check failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async () => {
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    setMessage('Signing in...');
    setError('');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        setUser(data.user);
        setMessage(`Successfully signed in as ${data.user.email}`);
      }
    } catch (err: any) {
      setError(`Sign in failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    setMessage('Signing out...');
    setError('');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      setMessage('Successfully signed out');
    } catch (err: any) {
      setError(`Sign out failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Supabase Auth Reset</h1>
      
      {message && (
        <div className="bg-blue-100 p-3 rounded mb-4">
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 p-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {user ? (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Currently Logged In</h2>
          <div className="bg-gray-100 p-3 rounded mb-4">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>ID:</strong> {user.id}</p>
          </div>
          
          <button
            onClick={signOut}
            disabled={loading}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 disabled:bg-red-300"
          >
            {loading ? 'Processing...' : 'Sign Out'}
          </button>
        </div>
      ) : (
        <div className="mb-6">
          <div className="mb-4">
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="your@email.com"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Your password"
            />
          </div>
          
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300 mb-2"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>
        </div>
      )}
      
      <div className="mt-4">
        <button
          onClick={checkSession}
          disabled={loading}
          className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 disabled:bg-gray-300"
        >
          {loading ? 'Checking...' : 'Check Current Session'}
        </button>
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <p>This page uses a fresh Supabase client to test authentication independently from your main application.</p>
        <p className="mt-2">Project URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
      </div>
    </div>
  );
}
