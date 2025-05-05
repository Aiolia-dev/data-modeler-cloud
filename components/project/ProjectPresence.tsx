"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "../ui/avatar";

interface OnlineUser {
  user_id: string;
  last_seen_at: string;
  avatar_url?: string;
  name?: string;
}

interface ProjectPresenceProps {
  projectId: string;
  className?: string;
}

export const ProjectPresence: React.FC<ProjectPresenceProps> = ({ projectId, className }) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const debugRef = useRef<HTMLDivElement>(null);

  // Get current user ID on mount
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        // Try to get the user info from the session
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.id) {
            setUserId(data.user.id);
            return;
          }
        }
        
        // Fallback - try to get from localStorage or cookie
        const localUserInfo = localStorage.getItem('supabase.auth.token');
        if (localUserInfo) {
          try {
            const parsed = JSON.parse(localUserInfo);
            if (parsed?.currentSession?.user?.id) {
              setUserId(parsed.currentSession.user.id);
            }
          } catch (e) {
            console.error('Failed to parse user info:', e);
          }
        }
      } catch (error) {
        console.error('Error getting user info:', error);
      }
    };
    
    getUserInfo();
  }, []);

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    if (debugRef.current) {
      debugRef.current.innerHTML += 'Fetching users... ';
    }
    try {
      const res = await fetch(`/api/user-presence?projectId=${projectId}`);
      const data = await res.json();
      if (data.users) {
        setOnlineUsers(data.users);
        if (debugRef.current) {
          debugRef.current.innerHTML += `Found ${data.users.length} users. `;
        }
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
      if (debugRef.current) {
        debugRef.current.innerHTML += `Error: ${error}. `;
      }
    }
  }, [projectId]);

  // Upsert presence
  const upsertPresence = useCallback(async () => {
    if (!userId) return;
    if (debugRef.current) {
      debugRef.current.innerHTML += 'Upserting presence... ';
    }
    try {
      const res = await fetch("/api/user-presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          project_id: projectId,
          last_seen_at: new Date().toISOString(),
        }),
      });
      
      if (res.ok) {
        if (debugRef.current) {
          debugRef.current.innerHTML += 'Success. ';
        }
      } else {
        if (debugRef.current) {
          debugRef.current.innerHTML += `Failed: ${res.status}. `;
        }
      }
    } catch (error) {
      console.error('Error upserting presence:', error);
      if (debugRef.current) {
        debugRef.current.innerHTML += `Error: ${error}. `;
      }
    }
  }, [userId, projectId]);

  // Set offline on unload
  useEffect(() => {
    if (!userId) return;
    
    const handleUnload = async () => {
      try {
        await fetch("/api/user-presence/offline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            project_id: projectId,
          }),
          keepalive: true,
        });
      } catch (error) {
        console.error('Error setting offline status:', error);
      }
    };
    
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("unload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [userId, projectId]);

  // Poll presence and update
  useEffect(() => {
    if (!userId) return;
    
    upsertPresence();
    fetchOnlineUsers();
    
    intervalRef.current = setInterval(() => {
      upsertPresence();
      fetchOnlineUsers();
    }, 30000); // 30 seconds
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userId, projectId, upsertPresence, fetchOnlineUsers]);

  // Always show at least something for debugging
  return (
    <div className={`relative ${className || ""}` }>
      {/* Debug info - visible during development */}
      <div 
        ref={debugRef} 
        className="text-xs text-yellow-500 max-w-xs overflow-hidden absolute -top-6 right-0"
        style={{ zIndex: 9999, fontSize: '10px' }}
      >
        Init: {userId ? `User: ${userId.substring(0, 6)}...` : 'No user'}
      </div>
      
      {/* Visible presence indicator with high contrast */}
      <div className="flex items-center space-x-2 bg-blue-900 border border-blue-500 rounded-lg py-1 px-3 shadow-lg">
        <div className="flex-shrink-0 w-3 h-3 rounded-full bg-green-400 animate-pulse" 
             title="Presence active"></div>
        <span className="text-xs text-white font-semibold">
          {onlineUsers.length > 0 ? 
            `${onlineUsers.length} online` : 
            'Presence active'}
        </span>
        
        {onlineUsers.map((user) => (
          <Avatar key={user.user_id} size={28} alt={user.name || 'User'} fallback={user.name?.[0] || "?"} />
        ))}
      </div>
    </div>
  );
};
