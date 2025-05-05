"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type Member = {
  id: string;
  user_id: string;
  email: string;
  name?: string;
  role: string;
};

type ChangeAccessModalProps = {
  projectId: string;
  projectName: string;
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onAccessChanged: () => void;
};

export default function ChangeAccessModal({
  projectId,
  projectName,
  member,
  isOpen,
  onClose,
  onAccessChanged,
}: ChangeAccessModalProps) {
  // Map the member's role to the UI access level
  const initialAccessLevel = member?.role === "editor" ? "edit" : "read";
  const [accessLevel, setAccessLevel] = useState<"read" | "edit">(initialAccessLevel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset access level when member changes
  React.useEffect(() => {
    if (member) {
      const newAccessLevel = member.role === "editor" ? "edit" : "read";
      setAccessLevel(newAccessLevel);
    }
  }, [member]);

  const handleChangeAccess = async () => {
    if (!member) return;

    try {
      setLoading(true);
      
      // Map UI access level to database role value
      const role = accessLevel === "read" ? "viewer" : "editor";
      
      const response = await fetch(`/api/projects/${projectId}/members/${member.user_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user access");
      }

      // Success
      onAccessChanged();
      onClose();
    } catch (err) {
      console.error("Error updating user access:", err);
      setError(err instanceof Error ? err.message : "Failed to update user access");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Change Access for {member.name || member.email}
        </h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update access level for this user in project "{projectName}"
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2 dark:text-gray-300">Access Level</h3>
          <RadioGroup
            value={accessLevel}
            onValueChange={(value) => setAccessLevel(value as "read" | "edit")}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="read" id="read" />
              <Label htmlFor="read" className="dark:text-white">Read Only <span className="text-xs text-gray-500 dark:text-gray-400">(Can view but not edit)</span></Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="edit" id="edit" />
              <Label htmlFor="edit" className="dark:text-white">Edit Access <span className="text-xs text-gray-500 dark:text-gray-400">(Can view and edit)</span></Label>
            </div>
          </RadioGroup>
        </div>

        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

        <div className="flex justify-end space-x-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangeAccess}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? "Updating..." : "Update Access"}
          </Button>
        </div>
      </div>
    </div>
  );
}
