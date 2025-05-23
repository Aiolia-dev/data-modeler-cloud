"use client";

// Define the interface for the batch data cache
declare global {
  interface Window {
    batchDataCache?: Record<string, any>;
  }
}

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ChevronRightIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ReferentialModal } from "./referential-modal";
import { usePermissions } from "@/context/permission-context";
import { useViewerCheck } from "@/hooks/use-viewer-check";
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
  entityIds?: string[]; // Array of entity IDs associated with this referential
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
  // Check if the user is a viewer for this project
  const isViewer = useViewerCheck(projectId);

  // Fetch referentials and entities
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // First check if we have data in the batch data cache
        if (typeof window !== 'undefined' && window.batchDataCache && 
            window.batchDataCache[dataModelId]) {
          
          console.log('Using batch data cache for referentials list');
          
          // Get referentials from cache if available
          if (window.batchDataCache[dataModelId].referentials) {
            const referentialsList = window.batchDataCache[dataModelId].referentials || [];
            
            // Get entities from cache if available
            if (window.batchDataCache[dataModelId].entities) {
              const entitiesList = window.batchDataCache[dataModelId].entities || [];
              setEntities(entitiesList);
              
              // Count entities per referential and add entityIds
              const referentialsWithCounts = referentialsList.map((ref: Referential) => {
                const entitiesInRef = entitiesList.filter((entity: any) => entity.referential_id === ref.id);
                return {
                  ...ref,
                  entity_count: entitiesInRef.length,
                  entities: entitiesInRef.map((e: any) => ({ id: e.id, name: e.name })),
                  entityIds: entitiesInRef.map((e: any) => e.id) // Add entityIds array for the modal
                };
              });
              
              setReferentials(referentialsWithCounts);
              setLoading(false);
              return;
            }
          }
        }
        
        console.log('Fetching referentials and entities separately');
        
        // If not in cache, fetch referentials
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
        
        // Count entities per referential and add entityIds
        const referentialsWithCounts = referentialsList.map((ref: Referential) => {
          const entitiesInRef = entitiesList.filter((entity: any) => entity.referential_id === ref.id);
          return {
            ...ref,
            entity_count: entitiesInRef.length,
            entities: entitiesInRef.map((e: any) => ({ id: e.id, name: e.name })),
            entityIds: entitiesInRef.map((e: any) => e.id) // Add entityIds array for the modal
          };
        });
        
        setReferentials(referentialsWithCounts);
        
        // Update the cache with the fetched data
        if (typeof window !== 'undefined') {
          if (!window.batchDataCache) {
            window.batchDataCache = {};
          }
          if (!window.batchDataCache[dataModelId]) {
            window.batchDataCache[dataModelId] = {};
          }
          window.batchDataCache[dataModelId].referentials = referentialsList;
          window.batchDataCache[dataModelId].entities = entitiesList;
        }
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
        // When updating a referential, update the entity count and entities list based on entityIds
        const entityIds = referentialData.entityIds || [];
        const entitiesInRef = entities.filter(entity => entityIds.includes(entity.id));
        
        setReferentials(prev => prev.map(ref => 
          ref.id === editingReferential!.id ? { 
            ...savedData.referential,
            entity_count: entityIds.length,
            entities: entitiesInRef.map(e => ({ id: e.id, name: e.name })),
            entityIds: entityIds
          } : ref
        ));
      } else {
        // Add the new referential to the list
        setReferentials(prev => [...prev, { ...savedData.referential, entity_count: 0, entities: [], entityIds: [] }]);
      }
      
      setShowModal(false);
    } catch (error) {
      console.error("Error saving referential:", error);
      setError(`Failed to ${editingReferential ? 'update' : 'create'} referential`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Referentials</h2>
        <PermissionButton
          onClick={handleCreateReferential}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
          projectId={projectId}
          action="edit"
          disabledMessage="You don't have permission to create referentials"
        >
          <Plus size={16} className="mr-1" />
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
                      {!isViewer ? (
                        <>
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-700 rounded"
                            onClick={() => handleEditReferential(referential)}
                            title="Edit referential"
                          >
                            <Edit size={16} className="text-gray-400" />
                          </button>
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-700 rounded"
                            onClick={() => setDeleteConfirmation(referential.id)}
                            title="Delete referential"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="p-1 cursor-not-allowed opacity-50"
                            disabled
                            title="You don't have permission to edit referentials"
                          >
                            <Edit size={16} className="text-gray-400" />
                          </button>
                          <button
                            type="button"
                            className="p-1 cursor-not-allowed opacity-50"
                            disabled
                            title="You don't have permission to delete referentials"
                          >
                            <Trash2 size={16} className="text-gray-400" />
                          </button>
                        </>
                      )}
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
                          <PermissionButton 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteReferential(referential.id)}
                            projectId={projectId}
                            action="edit"
                            disabledMessage="You don't have permission to delete referentials"
                          >
                            Delete
                          </PermissionButton>
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
        onOpenChange={(open) => setShowModal(open)}
        onSave={handleSaveReferential}
        editingReferential={editingReferential ? {
          id: editingReferential.id,
          name: editingReferential.name,
          description: editingReferential.description || undefined,
          color: editingReferential.color,
          entityIds: editingReferential.entityIds
        } : undefined}
        dataModelId={dataModelId}
        projectId={projectId}
        entities={entities}
        referentials={referentials}
      />
    </div>
  );
}
