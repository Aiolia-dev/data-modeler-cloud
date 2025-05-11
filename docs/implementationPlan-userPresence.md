Based on my analysis of the codebase, I'll now create an action plan for implementing the collaborative feature that shows connected users on the Diagram tab. Here's what I've found and what needs to be done:

Current State Analysis
User Presence Infrastructure:
The application already has a user_presence table in Supabase
API endpoints exist for tracking user presence (/api/user-presence)
A ProjectPresence component exists but isn't being used in the diagram view
Diagram Component Structure:
The diagram view is implemented in /components/diagram/DiagramView.tsx
The component has a toolbar area where we can add the user avatars
The diagram is rendered inside a ReactFlow provider
Action Plan for Implementation
1. Create a ModelPresence Component
First, we'll create a specialized component for showing user presence specifically for data models:

tsx
CopyInsert
// components/data-model/ModelPresence.tsx
"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Avatar } from "../ui/avatar";

interface OnlineUser {
  user_id: string;
  email?: string;
  last_seen_at: string;
}

interface ModelPresenceProps {
  projectId: string;
  modelId: string;
  className?: string;
}

export const ModelPresence: React.FC<ModelPresenceProps> = ({ projectId, modelId, className }) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current user ID on mount
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.id) {
            setUserId(data.user.id);
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
    try {
      const res = await fetch(`/api/user-presence?projectId=${projectId}`);
      const data = await res.json();
      if (data.users) {
        setOnlineUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  }, [projectId]);

  // Upsert presence
  const upsertPresence = useCallback(async () => {
    if (!userId) return;
    try {
      await fetch("/api/user-presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          project_id: projectId,
          model_id: modelId,
          last_seen_at: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error upserting presence:', error);
    }
  }, [userId, projectId, modelId]);

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

  // Generate initials from email
  const getInitials = (email: string) => {
    return email.substring(0, 3).toUpperCase();
  };

  return (
    <div className={`flex items-center gap-1 ${className || ""}`}>
      {onlineUsers.map((user) => (
        <Avatar 
          key={user.user_id} 
          className="h-8 w-8 bg-primary text-primary-foreground" 
          title={user.email || 'User'}
        >
          <span className="text-xs font-semibold">
            {user.email ? getInitials(user.email) : "???"}
          </span>
        </Avatar>
      ))}
    </div>
  );
};
2. Update the API Endpoints
We need to modify the user presence API to include the model_id parameter:

typescript
CopyInsert
// app/api/user-presence/route.ts
// Update the POST function to accept model_id
export async function POST(req: NextRequest) {
  try {
    const { user_id, project_id, model_id, last_seen_at } = await req.json();
    console.log(`Upserting presence for user ${user_id} in project ${project_id}, model ${model_id || 'none'}`);

    // Rest of the function remains the same, but pass model_id to the RPC function
    const { error } = await (adminClient.rpc as any)('set_user_presence', {
      p_user_id: user_id,
      p_project_id: project_id,
      p_model_id: model_id, // Add this parameter
      p_last_seen_at: last_seen_at
    });
    // ...
  }
}

// Update the GET function to filter by model_id if provided
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get('projectId');
    const model_id = searchParams.get('modelId');
    
    // ...
    
    // Update the RPC call to include model_id filtering
    const { data, error } = await (adminClient.rpc as any)('get_online_users', {
      p_project_id: project_id,
      p_model_id: model_id || null,
      p_threshold_minutes: 2
    });
    // ...
  }
}
3. Create Supabase Database Function for User Presence
We need to update the Supabase database functions to handle the model_id parameter:

sql
CopyInsert
-- Update the set_user_presence function
CREATE OR REPLACE FUNCTION set_user_presence(
  p_user_id UUID,
  p_project_id UUID,
  p_model_id UUID DEFAULT NULL,
  p_last_seen_at TIMESTAMPTZ DEFAULT now()
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_presence (user_id, project_id, model_id, last_seen_at, is_online)
  VALUES (p_user_id, p_project_id, p_model_id, p_last_seen_at, TRUE)
  ON CONFLICT (user_id, project_id)
  DO UPDATE SET
    last_seen_at = p_last_seen_at,
    model_id = p_model_id,
    is_online = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update the get_online_users function
CREATE OR REPLACE FUNCTION get_online_users(
  p_project_id UUID,
  p_model_id UUID DEFAULT NULL,
  p_threshold_minutes INT DEFAULT 2
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  last_seen_at TIMESTAMPTZ,
  is_online BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    au.email,
    up.last_seen_at,
    up.is_online
  FROM 
    user_presence up
  JOIN 
    auth.users au ON up.user_id = au.id
  WHERE 
    up.project_id = p_project_id
    AND (p_model_id IS NULL OR up.model_id = p_model_id)
    AND up.last_seen_at > (now() - (p_threshold_minutes || ' minutes')::interval)
    AND up.is_online = TRUE;
END;
$$ LANGUAGE plpgsql;
4. Update the Database Schema
We need to modify the user_presence table to include the model_id column:

sql
CopyInsert
-- Alter the user_presence table to add model_id column
ALTER TABLE user_presence ADD COLUMN model_id UUID REFERENCES data_models(id) NULL;

-- Update the primary key to include model_id
ALTER TABLE user_presence DROP CONSTRAINT user_presence_pkey;
ALTER TABLE user_presence ADD PRIMARY KEY (user_id, project_id);
5. Integrate the ModelPresence Component into DiagramView
Now we'll integrate the ModelPresence component into the DiagramView component:

tsx
CopyInsert
// components/diagram/DiagramView.tsx
// Add the import
import { ModelPresence } from '@/components/data-model/ModelPresence';

// Inside the DiagramContent component's return statement, add the ModelPresence component
// Find the ReactFlow component with the Panel components and add:

<Panel position="top-right" className="flex items-center gap-2">
  <ModelPresence projectId={projectId} modelId={dataModelId} />
  {/* Existing buttons */}
  <Button variant="outline" size="icon" onClick={() => setShowReferentialModal(true)}>
    <BoxSelect size={18} />
  </Button>
  {/* Other buttons */}
</Panel>
6. Update the DataModelClient Component
Finally, we need to ensure the ModelPresence component is only shown when the Diagram tab is active:

tsx
CopyInsert
// components/data-model/DataModelClient.tsx
// Add the import
import { ModelPresence } from '@/components/data-model/ModelPresence';

// In the TabsContent for the diagram tab, add the ModelPresence component
<TabsContent value="diagram" className="mt-0">
  <div className="bg-gray-800 rounded-lg p-0 border border-gray-700 h-full min-h-[calc(100vh-200px)] relative">
    {/* Add this conditional rendering */}
    {activeTab === 'diagram' && (
      <div className="absolute top-4 right-4 z-10">
        <ModelPresence projectId={projectId} modelId={modelId} />
      </div>
    )}
    <DiagramView 
      dataModelId={modelId} 
      projectId={projectId} 
      selectedEntityId={undefined} 
    />
  </div>
</TabsContent>
Implementation Timeline
Database Schema Updates (1 hour)
Add model_id column to user_presence table
Update database functions
API Endpoint Updates (1 hour)
Modify the user presence API to handle model_id
ModelPresence Component (2 hours)
Create the new component
Implement user avatar display with email initials
Integration (2 hours)
Integrate the component into the DiagramView
Test and debug
Final Testing and Refinement (1 hour)
Test with multiple users
Refine styling and positioning
Total estimated time: ~7 hours

This implementation plan provides a complete solution for showing connected users on the Diagram tab with avatars displaying the first three letters of their email addresses, positioned in the top-right corner of the diagram view.

