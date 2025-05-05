"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

type User = {
  id: string;
  email: string;
  name?: string;
};

type AddUserModalProps = {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
};

export default function AddUserModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onUserAdded,
}: AddUserModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [accessLevel, setAccessLevel] = useState<"read" | "edit">("read");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all users when the modal opens
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          (user.name && user.name.toLowerCase().includes(query))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      // Map UI access level to database role value
      const role = accessLevel === "read" ? "viewer" : "editor";
      
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          role: role,
          access: accessLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add user");
      }

      // Success
      onUserAdded();
      onClose();
    } catch (err) {
      console.error("Error adding user:", err);
      setError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto add-user-modal">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Add User to {projectName}
        </h2>

        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Select User</h3>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Search users..."
              className="pl-10 search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-0 max-h-60 overflow-y-auto border rounded-md dark:border-gray-700 user-list">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 user-item ${
                    selectedUser?.id === user.id ? "bg-blue-50 dark:bg-gray-700 selected" : ""
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white border border-gray-300 dark:border-gray-500 mr-3 user-avatar">
                    {user.email ? user.email.slice(0, 2).toLowerCase() : "?"}
                  </div>
                  <div>
                    <div className="font-medium dark:text-white user-name">{user.name || user.email.split("@")[0]}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 user-email">{user.email}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mb-6 access-level-section">
          <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Access Level</h3>
          
          {/* Custom modern radio buttons for both light and dark mode */}
          <div className="modern-radio">
            <div 
              className={`radio-option ${accessLevel === 'read' ? 'selected' : ''}`}
              onClick={() => setAccessLevel('read')}
            >
              <div className="radio-circle">
                <div className="radio-dot"></div>
              </div>
              <div className="radio-content">
                <div className="radio-label">Read Only</div>
                <div className="radio-description">(Can view but not edit)</div>
              </div>
            </div>
            
            <div 
              className={`radio-option ${accessLevel === 'edit' ? 'selected' : ''}`}
              onClick={() => setAccessLevel('edit')}
            >
              <div className="radio-circle">
                <div className="radio-dot"></div>
              </div>
              <div className="radio-content">
                <div className="radio-label">Edit Access</div>
                <div className="radio-description">(Can view and edit)</div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

        <div className="flex justify-end space-x-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="cancel-btn"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddUser}
            disabled={!selectedUser || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white add-btn"
          >
            Add User
          </Button>
        </div>
      </div>
    </div>
  );
}
