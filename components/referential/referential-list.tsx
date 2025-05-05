"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ChevronRightIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ReferentialModal } from "./referential-modal";
import { usePermissions } from "@/context/permission-context";
import { PermissionButton } from "@/components/ui/permission-button";

interface Referential {
  id: string;
  name: string;
  description: string | null;
  color: string;
  data_model_id: string;
  created_at: string;
  updated_at: string;
  entity_count?: number;
  entities?: { id: string; name: string }[];
}

interface ReferentialListProps {
  dataModelId: string;
  projectId: string;
}

export function ReferentialList({ dataModelId, projectId }: ReferentialListProps) {
  const [referentials, setReferentials] = useState<Referential[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReferential, setEditingReferential] = useState<Referential | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const { hasPermission } = usePermissions();

  // Fetch referentials and entities
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch referentials
        const refResponse = await fetch(`/api/referentials?dataModelId=${dataModelId}`);
        if (!refResponse.ok) {
          throw new Error("Failed to fetch referentials");
        }
        
        const refData = await refResponse.json();
        const referentialsList = refData.referentials || [];
        
        // Fetch entities to get counts
        const entitiesResponse = await fetch(`/api/projects/${projectId}/models/${dataModelId}/entities`);
        if (!entitiesResponse.ok) {
          throw new Error("Failed to fetch entities");
        }
        
        const entitiesData = await entitiesResponse.json();
        const entitiesList = entitiesData.entities || [];
        setEntities(entitiesList);
        
        // Count entities per referential
        const referentialsWithCounts = referentialsList.map((ref: Referential) => {
          const entitiesInRef = entitiesList.filter((entity: any) => entity.referential_id === ref.id);
          return {
            ...ref,
            entity_count: entitiesInRef.length,
            entities: entitiesInRef.map((e: any) => ({ id: e.id, name: e.name }))
          };
        });
        
        setReferentials(referentialsWithCounts);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load referentials");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [dataModelId, projectId]);

  // Handle creating a new referential
  const handleCreateReferential = () => {
    setEditingReferential(null);
    setShowModal(true);
  };

  // Handle editing a referential
  const handleEditReferential = (referential: Referential) => {
    setEditingReferential(referential);
    setShowModal(true);
  };

  // Handle deleting a referential
  const handleDeleteReferential = async (referentialId: string) => {
    try {
      const response = await fetch(`/api/referentials/${referentialId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete referential");
      }
      
      // Remove the deleted referential from the list
      setReferentials(prev => prev.filter(ref => ref.id !== referentialId));
      setDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting referential:", error);
      setError("Failed to delete referential");
    }
  };

  // Handle saving a referential (create or update)
  const handleSaveReferential = async (referentialData: any) => {
    try {
      const isEditing = !!editingReferential;
      const url = isEditing 
        ? `/api/referentials/${editingReferential!.id}`
        : '/api/referentials';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      // Add the data model ID if creating a new referential
      const dataToSend = {
        ...referentialData,
        data_model_id: dataModelId
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} referential`);
      }
      
      const savedData = await response.json();
      
      // Update the referentials list
      if (isEditing) {
        setReferentials(prev => prev.map(ref => 
          ref.id === editingReferential!.id ? { ...savedData.referential, entity_count: ref.entity_count, entities: ref.entities } : ref
        ));
      } else {
        // Add the new referential to the list
        setReferentials(prev => [...prev, { ...savedData.referential, entity_count: 0, entities: [] }]);
      }
      
      setShowModal(false);
    } catch (error) {
      console.error("Error saving referential:", error);
      setError(`Failed to ${editingReferential ? 'update' : 'create'} referential`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Referentials</h2>
        <PermissionButton 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleCreateReferential}
          action="create"
          projectId={projectId}
          disabledMessage="You need editor or admin permissions to create referentials"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Referential
        </PermissionButton>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Loading referentials...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      ) : referentials.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
          <p className="text-gray-400 mb-4">No referentials found in this data model</p>
          <PermissionButton 
            variant="outline" 
            className="border-gray-600"
            onClick={handleCreateReferential}
            action="create"
            projectId={projectId}
            disabledMessage="You need editor or admin permissions to create referentials"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create your first referential
          </PermissionButton>
        </div>
      ) : (
        <div className="border border-gray-700 rounded-md overflow-hidden bg-gray-900">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-200">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-200">Description</th>
                <th className="text-center px-4 py-3 font-medium text-gray-200">Color</th>
                <th className="text-center px-4 py-3 font-medium text-gray-200">Entities</th>
                <th className="text-right px-4 py-3 font-medium text-gray-200">Last Updated</th>
                <th className="text-center px-4 py-3 font-medium text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {referentials.map((referential) => (
                <tr 
                  key={referential.id} 
                  className="border-t border-gray-700 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-100">{referential.name}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {referential.description || "No description"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div 
                      className="w-6 h-6 rounded-full mx-auto" 
                      style={{ backgroundColor: referential.color || '#6366F1' }}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded-md text-sm">
                      {referential.entity_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-400">
                    {formatDistanceToNow(new Date(referential.updated_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        className="p-1 hover:bg-gray-700 rounded"
                        onClick={() => handleEditReferential(referential)}
                      >
                        <Edit size={16} className="text-gray-400" />
                      </button>
                      <button
                        type="button"
                        className="p-1 hover:bg-gray-700 rounded"
                        onClick={() => setDeleteConfirmation(referential.id)}
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                    
                    {/* Delete confirmation */}
                    {deleteConfirmation === referential.id && (
                      <div className="absolute z-10 bg-gray-800 border border-gray-700 rounded-md p-3 shadow-lg mt-2">
                        <p className="text-sm text-gray-300 mb-2">
                          {referential.entity_count! > 0 
                            ? `This will remove the referential from ${referential.entity_count} entities.` 
                            : 'Are you sure you want to delete this referential?'}
                        </p>
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setDeleteConfirmation(null)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteReferential(referential.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Referential Modal for creating/editing */}
      <ReferentialModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveReferential}
        editingReferential={editingReferential}
        dataModelId={dataModelId}
        entities={entities}
        referentials={referentials}
      />
    </div>
  );
}
