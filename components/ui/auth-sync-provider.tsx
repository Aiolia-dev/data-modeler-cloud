"use client";

import React, { ReactNode } from 'react';
import { useAuthSync } from '@/hooks/use-auth-sync';

/**
 * A component that synchronizes authentication state between contexts
 * This helps resolve inconsistencies between the auth context and permission context
 */
export function AuthSyncProvider({ children }: { children: ReactNode }) {
  // Use the auth sync hook to ensure contexts are synchronized
  useAuthSync();
  
  return <>{children}</>;
}
