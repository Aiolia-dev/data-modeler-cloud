"use client";

import React from 'react';
import { AuthProvider } from '@/context/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';

export function AuthProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorBoundary>
  );
}
