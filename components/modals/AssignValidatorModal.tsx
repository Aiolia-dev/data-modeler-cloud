"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";

type User = {
  id: string;
  email: string;
  name?: string;
};

type ValidationRole = {
  id: string;
  name: string;
  description?: string;
};

type AssignValidatorModalProps = {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onValidatorAssigned?: () => void;
  existingRole?: any; // For editing existing role
};

export default function AssignValidatorModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onValidatorAssigned,
  existingRole
}: AssignValidatorModalProps) {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [componentScope, setComponentScope] = useState("all");
  const [customScope, setCustomScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [validationRoles, setValidationRoles] = useState<ValidationRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchValidationRoles();
    }
  }, [isOpen]);

  // Filter users based on search query
  useEffect(() => {
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

  const fetchValidationRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/validation/roles");
      if (!response.ok) {
        throw new Error("Failed to fetch validation roles");
      }
      const data = await response.json();
      setValidationRoles(data.roles || []);
    } catch (err) {
      console.error("Error fetching validation roles:", err);
      setError("Failed to load validation roles");
      // Fallback to default roles if API fails
      setValidationRoles([
        { id: "1", name: "model_validator", description: "Can validate overall model structure" },
        { id: "2", name: "attribute_validator", description: "Can validate attribute definitions" },
        { id: "3", name: "rule_validator", description: "Can validate business rules" },
        { id: "4", name: "compliance_validator", description: "Can validate regulatory compliance" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignValidator = async () => {
    if (!selectedUser || !selectedRole) {
      setError("Please select both a user and a validation role");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/projects/${projectId}/validation-roles`, {
        method: existingRole ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUser,
          validation_role_id: selectedRole,
          component_scope: componentScope === "custom" ? customScope : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign validator role");
      }

      if (onValidatorAssigned) {
        onValidatorAssigned();
      }
      onClose();
    } catch (err) {
      console.error("Error assigning validator:", err);
      setError(err instanceof Error ? err.message : "Failed to assign validator");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          {existingRole ? "Edit Validator Role" : "Assign Validator Role"}
        </h2>

        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {existingRole 
              ? `Update validation role for ${projectName}`
              : `Assign a validation role for ${projectName}`}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="user" className="text-sm font-medium dark:text-gray-300">Select User</Label>
            <div className="mt-1">
              <Input
                type="text"
                placeholder="Search users..."
                className="mb-2 bg-white dark:bg-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="max-h-60 overflow-y-auto border rounded-md dark:border-gray-700 bg-white dark:bg-gray-800">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedUser === user.id ? "bg-blue-50 dark:bg-gray-700" : ""}`}
                      onClick={() => setSelectedUser(user.id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white border border-gray-300 dark:border-gray-500 mr-3">
                        {user.email ? user.email.slice(0, 2).toLowerCase() : "?"}
                      </div>
                      <div>
                        <div className="font-medium dark:text-white">{user.name || user.email.split("@")[0]}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="role" className="text-sm font-medium dark:text-gray-300">Validation Role</Label>
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
            >
              <SelectTrigger className="w-full mt-1 bg-white dark:bg-gray-700">
                <SelectValue placeholder="Select a validation role" />
              </SelectTrigger>
              <SelectContent>
                {validationRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name === "model_validator" ? "Model Validator" :
                     role.name === "attribute_validator" ? "Attribute Validator" :
                     role.name === "rule_validator" ? "Rule Validator" :
                     role.name === "compliance_validator" ? "Compliance Validator" :
                     role.name.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium dark:text-gray-300 mb-2 block">Component Scope</Label>
            <RadioGroup
              value={componentScope}
              onValueChange={setComponentScope}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="dark:text-white">All Components</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="dark:text-white">Specific Components</Label>
              </div>
            </RadioGroup>
            
            {componentScope === "custom" && (
              <div className="mt-2 pl-6">
                <input
                  type="text"
                  value={customScope}
                  onChange={(e) => setCustomScope(e.target.value)}
                  placeholder="e.g., Customer, Product Entities"
                  className="w-full p-2 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
          </div>
        </div>

        {error && <div className="text-red-500 text-sm mt-4">{error}</div>}

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignValidator}
            disabled={loading || !selectedUser || !selectedRole}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {existingRole ? "Update Role" : "Assign Role"}
          </Button>
        </div>
      </div>
    </div>
  );
}
