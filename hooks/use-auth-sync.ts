"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { usePermissions } from '@/context/permission-context';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * A hook to synchronize authentication state between contexts
 * This helps resolve inconsistencies between the auth context and permission context
 */
export function useAuthSync() {
  const { 
    user, 
    session, 
    isAuthenticated, 
    isSuperuser, 
    refreshSession 
  } = useAuth();
  
  const {
    setIsAuthenticated,
    setIsSuperuser,
    setUserId,
    setUserEmail,
  } = usePermissions();
  
  const supabase = createClientComponentClient();
  
  // Synchronize auth state on mount and when auth context changes
  useEffect(() => {
    const syncAuth = async () => {
      console.log('[AuthSync] Synchronizing auth state...');
      
      try {
        // First try to get user directly from Supabase
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('[AuthSync] Error getting user:', userError);
          return;
        }
        
        if (userData.user) {
          console.log('[AuthSync] Found user from direct API call:', userData.user.email);
          
          // Update permission context with user data
          setIsAuthenticated(true);
          setUserId(userData.user.id);
          setUserEmail(userData.user.email || null);
          
          // Check for superuser status
          const isSuperuserFlag = userData.user.user_metadata?.is_superuser;
          const superuserStatus = isSuperuserFlag === true || isSuperuserFlag === "true";
          setIsSuperuser(superuserStatus);
          
          console.log('[AuthSync] Updated permission context with superuser status:', superuserStatus);
          
          // If auth context doesn't have this user, refresh it
          if (!isAuthenticated || !user) {
            console.log('[AuthSync] Auth context out of sync, refreshing...');
            await refreshSession();
          }
        } else if (user) {
          // If we don't have a user from direct API but have one in context, use that
          console.log('[AuthSync] Using user from auth context:', user.email);
          
          setIsAuthenticated(true);
          setUserId(user.id);
          setUserEmail(user.email || null);
          setIsSuperuser(isSuperuser);
        } else {
          console.log('[AuthSync] No user found in any source');
          
          // Reset permission context
          setIsAuthenticated(false);
          setUserId(null);
          setUserEmail(null);
          setIsSuperuser(false);
        }
      } catch (err) {
        console.error('[AuthSync] Error synchronizing auth state:', err);
      }
    };
    
    // Run sync on mount and when auth state changes
    syncAuth();
  }, [
    user, 
    session, 
    isAuthenticated, 
    isSuperuser, 
    setIsAuthenticated,
    setIsSuperuser,
    setUserId,
    setUserEmail,
    refreshSession,
    supabase.auth
  ]);
  
  return { isAuthenticated, isSuperuser, user, session };
}
