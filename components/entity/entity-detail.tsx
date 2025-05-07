"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PermissionButton } from "@/components/ui/permission-button";
import { usePermissions } from "@/context/permission-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, SaveIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { AttributeFormData } from "./attribute-form";
import AttributeTable from "./attribute-table";
import AttributeModal, { AttributeModalData } from "./attribute-modal";
import ForeignKeyModal, { ForeignKeyData } from "./foreign-key-modal";
import RelationshipTable from "./relationship-table";
import RulesTab from "./rules/rules-tab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Entity {
  id: string;
  name: string;
  description: string | null;
  data_model_id: string;
  referential_id?: string | null;
  created_at: string;
  updated_at: string;
  entity_type?: 'standard' | 'join';
  join_entities?: string[];
}

interface Attribute {
  id: string;
  name: string;
  description: string | null;
  data_type: string;
  length?: number;
  precision?: number;
  scale?: number;
  is_required: boolean;
  is_unique: boolean;
  default_value?: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  referenced_entity_id?: string;
  referenced_attribute_id?: string;
  on_delete_action?: string;
  on_update_action?: string;
  entity_id: string;
  created_at: string;
  updated_at: string;
}

interface Referential {
  id: string;
  name: string;
  description: string | null;
  color?: string | null;
  data_model_id: string;
  created_at: string;
  updated_at: string;
}

interface EntityDetailProps {
  entity: Entity;
  attributes: Attribute[];
  onBack: () => void;
  onSave: (entityData: any, attributesData: any[]) => Promise<void>;
  onDelete: (entityId: string) => Promise<void>;
  referentials?: Referential[];
}

// Component for displaying and editing entity details
export default function EntityDetail({
  entity,
  attributes,
  onBack,
  onSave,
  onDelete,
  referentials = [],
}: EntityDetailProps) {
  // Early return with a loading state if entity is not provided
  if (!entity) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading entity details...</p>
      </div>
    );
  }
  
  const [isEditingName, setIsEditingName] = useState(false);
const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Handles blur (or Enter) on entity name input
  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (editedEntity.name !== entity.name) {
      setIsSaving(true);
      setError(null);
      try {
        await onSave({ ...editedEntity }, editedAttributes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save entity name');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Handles saving the description
  const handleDescriptionSave = async () => {
    setIsEditingDescription(false);
    if (editedEntity.description !== entity.description) {
      setIsSaving(true);
      setError(null);
      try {
        await onSave({ ...editedEntity }, editedAttributes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save description');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Cancel editing description
  const handleDescriptionCancel = () => {
    setIsEditingDescription(false);
    setEditedEntity({ ...editedEntity, description: entity.description });
  };
  
  // Handle referential change
  const handleReferentialChange = async (referentialId: string | null) => {
    const updatedEntity = { ...editedEntity, referential_id: referentialId };
    setEditedEntity(updatedEntity);
    
    setIsSaving(true);
    setError(null);
    try {
      await onSave(updatedEntity, editedAttributes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update referential');
    } finally {
      setIsSaving(false);
    }
  };

  const [activeTab, setActiveTab] = useState("attributes");
  const [editedEntity, setEditedEntity] = useState<Entity>(entity);
  const [editedAttributes, setEditedAttributes] = useState<AttributeFormData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [showForeignKeyModal, setShowForeignKeyModal] = useState(false);
  const [loadingReferentials, setLoadingReferentials] = useState(false);
  const [availableReferentials, setAvailableReferentials] = useState<Referential[]>(referentials || []);
  
  // Count states for tabs
  const [attributeCount, setAttributeCount] = useState(attributes.length);
  const [relationshipCount, setRelationshipCount] = useState(0);
  const [ruleCount, setRuleCount] = useState(0);
  
  // Extract project ID directly from URL to ensure we have the correct one
  const extractProjectIdFromUrl = () => {
    if (typeof window !== 'undefined') {
      // First try the full project/model pattern
      const fullUrlMatch = window.location.pathname.match(/\/projects\/([\w-]+)\/models\/[\w-]+/);
      if (fullUrlMatch) {
        return fullUrlMatch[1];
      }
      
      // Fall back to the simpler project-only pattern
      const simpleUrlMatch = window.location.pathname.match(/\/projects\/([\w-]+)/);
      if (simpleUrlMatch) {
        return simpleUrlMatch[1];
      }
    }
    return null;
  };
  
  // Get the project ID directly from the URL for permission checks
  const urlProjectId = extractProjectIdFromUrl();
  
  // Get permission context to check if user can edit entities
  const { hasPermission } = usePermissions();
  
  // Check if the user has edit permission using the extracted project ID
  const canEditEntity = hasPermission('edit', urlProjectId || undefined);
  
  // State for project and data model IDs
  const [dataModelId, setDataModelId] = useState('');
  
  // Extract data model ID directly from entity and use URL project ID
  useEffect(() => {
    if (entity && entity.data_model_id) {
      setDataModelId(entity.data_model_id);
    }
  }, [entity]);
  
  // Use the URL project ID for all operations
  const projectId = urlProjectId || '';

  // Fetch referentials if not provided
  useEffect(() => {
    if (referentials?.length) {
      setAvailableReferentials(referentials);
      return;
    }
    
    const fetchReferentials = async () => {
      setLoadingReferentials(true);
      try {
        const response = await fetch(`/api/referentials?dataModelId=${dataModelId}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableReferentials(data.referentials || []);
        }
      } catch (err) {
        console.error('Error fetching referentials:', err);
      } finally {
        setLoadingReferentials(false);
      }
    };
    
    fetchReferentials();
  }, [dataModelId, referentials]);
  
  // We already have projectId from the URL extraction above
  // No need to extract it again

  // Convert DB attributes to form format and update counts
  useEffect(() => {
    setEditedEntity(entity);
    setEditedAttributes(
      attributes.map((attr) => ({
        id: attr.id,
        name: attr.name,
        description: attr.description || "",
        dataType: attr.data_type,
        length: attr.length,
        precision: attr.precision,
        scale: attr.scale,
        isRequired: attr.is_required,
        isUnique: attr.is_unique,
        defaultValue: attr.default_value || "",
        isPrimaryKey: attr.is_primary_key,
        isForeignKey: attr.is_foreign_key,
        referencedEntity: attr.referenced_entity_id || "",
        referencedAttribute: attr.referenced_attribute_id || "",
        onDeleteAction: attr.on_delete_action || "NO ACTION",
        onUpdateAction: attr.on_update_action || "NO ACTION",
      }))
    );
    
    // Update attribute count
    setAttributeCount(attributes.length);
    
    // Count relationships (foreign keys)
    const fkCount = attributes.filter(attr => attr.is_foreign_key).length;
    setRelationshipCount(fkCount);
    
    // Fetch rules count
    fetchRulesCount();
  }, [entity, attributes]);

  // Fetch rules count for the entity
  const fetchRulesCount = async () => {
    try {
      const response = await fetch(`/api/rules?entityId=${entity.id}`);
      if (response.ok) {
        const rulesData = await response.json();
        setRuleCount(Array.isArray(rulesData) ? rulesData.length : 0);
      }
    } catch (error) {
      console.error("Error fetching rules count:", error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Convert form attributes back to DB format
      const attributesForSave = editedAttributes.map(attr => ({
        id: attr.id,
        name: attr.name,
        description: attr.description || null,
        data_type: attr.dataType,
        length: attr.length,
        precision: attr.precision,
        scale: attr.scale,
        is_required: attr.isRequired,
        is_unique: attr.isUnique,
        default_value: attr.defaultValue || null,
        is_primary_key: attr.isPrimaryKey,
        is_foreign_key: attr.isForeignKey,
        referenced_entity_id: attr.referencedEntity || null,
        referenced_attribute_id: attr.referencedAttribute || null,
        on_delete_action: attr.onDeleteAction || null,
        on_update_action: attr.onUpdateAction || null,
        entity_id: entity.id
      }));
      
      await onSave(editedEntity, attributesForSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entity");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(entity.id);
      setShowDeleteDialog(false);
    } catch (err) {
      console.error('Error deleting entity:', err);
      setError(err instanceof Error ? err.message : "Failed to delete entity");
      setIsDeleting(false);
    }
  };
  
  // Handle adding a foreign key
  const handleAddForeignKey = useCallback(async (data: ForeignKeyData) => {
    try {
      // Create the foreign key attribute via API
      const response = await fetch('/api/attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          dataType: 'integer', // Foreign keys are typically integers
          entityId: entity.id,
          isRequired: data.isRequired,
          isForeignKey: true,
          referencedEntityId: data.referencedEntityId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create foreign key');
      }
      
      const responseData = await response.json();
      
      // Add the new foreign key to the list
      const newForeignKey: AttributeFormData = {
        id: responseData.attribute.id,
        name: responseData.attribute.name,
        description: responseData.attribute.description || "",
        dataType: responseData.attribute.data_type,
        isRequired: responseData.attribute.is_required,
        isUnique: responseData.attribute.is_unique,
        isPrimaryKey: responseData.attribute.is_primary_key,
        isForeignKey: true,
        referencedEntity: responseData.attribute.referenced_entity_id,
        defaultValue: responseData.attribute.default_value,
      };
      
      // Use setTimeout to safely update state
      setTimeout(() => {
        setEditedAttributes(prevAttributes => [...prevAttributes, newForeignKey]);
      }, 0);
      
      // If we're on the relationships tab, switch to attributes tab to see the new FK
      if (activeTab === "relationships") {
        setActiveTab("attributes");
      }
      
      setShowForeignKeyModal(false);
    } catch (err) {
      console.error('Error adding foreign key:', err);
      setError(err instanceof Error ? err.message : 'Failed to add foreign key');
    }
  }, [entity.id, setError, setEditedAttributes, activeTab, setActiveTab]);

  // Find primary key attribute for info
  const primaryKeyAttribute = attributes.find(attr => attr.is_primary_key);
  const primaryKeyInfo = {
    type: primaryKeyAttribute?.data_type || "integer",
    name: primaryKeyAttribute?.name || "id"
  };

  // Use useCallback to memoize the handleAddAttribute function
  const handleAddAttribute = useCallback(async (attributeData: AttributeModalData) => {
    try {
      setError(null);
      
      // Create a new attribute with the form data
      const response = await fetch('/api/attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: attributeData.name,
          description: attributeData.description,
          dataType: attributeData.dataType,
          entityId: entity.id,
          isRequired: attributeData.isRequired,
          isUnique: attributeData.isUnique,
          defaultValue: attributeData.defaultValue || null,
          isPrimaryKey: attributeData.isPrimaryKey || false,
          isForeignKey: attributeData.isForeignKey || false,
          length: attributeData.length || null
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create attribute');
      }
      
      const data = await response.json();
      
      // Add the new attribute to the list
      const newAttribute: AttributeFormData = {
        id: data.attribute.id,
        name: data.attribute.name,
        description: data.attribute.description || "",
        dataType: data.attribute.data_type,
        isRequired: data.attribute.is_required,
        isUnique: data.attribute.is_unique,
        isPrimaryKey: data.attribute.is_primary_key,
        isForeignKey: data.attribute.is_foreign_key,
        defaultValue: data.attribute.default_value,
        length: data.attribute.length
      };
      
      // Use setTimeout to safely update state
      setTimeout(() => {
        setEditedAttributes(prevAttributes => [...prevAttributes, newAttribute]);
      }, 0);
    } catch (err) {
      console.error('Error adding attribute:', err);
      setError(err instanceof Error ? err.message : "Failed to add attribute");
    }
  }, [entity.id, setError, setEditedAttributes]);

  return (
    <div className="p-6 space-y-6 bg-gray-900 border border-gray-700 rounded-lg w-full max-w-none">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <ArrowLeftIcon size={16} />
          </Button>
          {isEditingName ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editedEntity.name}
                onChange={(e) => setEditedEntity({ ...editedEntity, name: e.target.value })}
                onBlur={handleNameBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          ) : (
            <div className="relative group">
              <h1 
                className={`text-xl font-semibold ${canEditEntity ? 'cursor-pointer hover:text-blue-400 transition-colors' : 'cursor-not-allowed'}`}
                onClick={() => canEditEntity && setIsEditingName(true)}
                title={canEditEntity ? 'Click to edit entity name' : "You don't have permission to edit this entity"}
              >
                {editedEntity.name}
              </h1>
              {!canEditEntity && (
                <div className="absolute hidden group-hover:block bg-gray-800 text-gray-300 text-xs p-2 rounded shadow-lg -bottom-8 left-0 whitespace-nowrap">
                  You don't have permission to edit this entity
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PermissionButton
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-1 text-destructive hover:text-destructive-foreground hover:bg-destructive"
            action="delete"
            projectId={projectId}
            disabledMessage="Viewers cannot delete entities"
          >
            <Trash2Icon size={16} />
            Delete
          </PermissionButton>
          <PermissionButton
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1"
            action="edit"
            projectId={projectId}
            disabledMessage="Viewers cannot save changes to entities"
          >
            <SaveIcon size={16} />
            {isSaving ? "Saving..." : "Save Changes"}
          </PermissionButton>
        </div>
      </div>

      {isEditingDescription ? (
        <div className="flex items-start gap-2 mt-1">
          <textarea
            className="text-black bg-white border rounded w-full min-h-[48px] p-2 focus:outline-none focus:border-blue-500 resize-vertical"
            value={editedEntity.description || ''}
            autoFocus
            disabled={isSaving}
            maxLength={500}
            onChange={e => setEditedEntity({ ...editedEntity, description: e.target.value })}
          />
          <div className="flex flex-col gap-1 ml-2">
            <Button size="sm" onClick={handleDescriptionSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDescriptionCancel} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="group flex items-center gap-2 mt-1 min-h-[24px]">
          <p
            className={`text-muted-foreground ${editedEntity.description ? '' : 'italic text-gray-500'}`}
            title="Click to edit description"
            onClick={() => setIsEditingDescription(true)}
            style={{ cursor: 'pointer' }}
          >
            {editedEntity.description || 'Click to add a description...'}
          </p>
          <Button
            size="icon"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            tabIndex={-1}
            onClick={e => {
              e.stopPropagation();
              setIsEditingDescription(true);
            }}
            aria-label="Edit description"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M16.862 5.487l1.65-1.65a1.875 1.875 0 1 1 2.652 2.652l-1.65 1.65M15.21 7.139l-9.12 9.12a2.25 2.25 0 0 0-.573.98l-1.02 3.057a.375.375 0 0 0 .474.474l3.057-1.02a2.25 2.25 0 0 0 .98-.573l9.12-9.12m-3.968 2.318l4.242-4.242"/></svg>
          </Button>
        </div>
      )
      }

      {/* Referential selection */}
      <div className="mt-6 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-medium">Referential</h3>
          {loadingReferentials && <span className="text-xs text-muted-foreground">(Loading...)</span>}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={editedEntity.referential_id || ''}
            onChange={(e) => handleReferentialChange(e.target.value || null)}
            disabled={isSaving || loadingReferentials}
          >
            <option value="">None</option>
            {availableReferentials.map((ref) => (
              <option key={ref.id} value={ref.id}>
                {ref.name}
              </option>
            ))}
          </select>
          {editedEntity.referential_id && (
            <div 
              className="w-6 h-6 rounded-full" 
              style={{ 
                backgroundColor: availableReferentials.find(r => r.id === editedEntity.referential_id)?.color || '#6366F1' 
              }}
            />
          )}
        </div>
      </div>
      
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="attributes" className="relative">
            Attributes
            {attributeCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 rounded-full text-xs">
                {attributeCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="relationships" className="relative">
            Relationships
            {relationshipCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 rounded-full text-xs">
                {relationshipCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="constraints" className="relative">
            Constraints & Business Rules
            {ruleCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 rounded-full text-xs">
                {ruleCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="attributes" className="mt-6 w-full">
          <div className="w-full max-w-none">
            <AttributeTable 
              attributes={editedAttributes}
              onAttributeChange={setEditedAttributes}
              onAddAttribute={() => setShowAttributeModal(true)}
              onAddForeignKey={handleAddForeignKey}
              entityId={entity.id}
              dataModelId={dataModelId}
              projectId={projectId}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="relationships" className="mt-6">
          <RelationshipTable 
            entityId={entity.id}
            dataModelId={dataModelId}
            projectId={projectId}
          />
        </TabsContent>
        
        <TabsContent value="constraints" className="mt-6">
          <RulesTab 
            entityId={entity.id}
            dataModelId={dataModelId}
            projectId={projectId}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the entity "{entity.name}" and all its attributes.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Entity"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Attribute Creation Modal */}
      <AttributeModal
        open={showAttributeModal}
        onOpenChange={setShowAttributeModal}
        onSave={handleAddAttribute}
        entityId={entity.id}
      />
      
      {/* Foreign Key Creation Modal */}
      <ForeignKeyModal
        open={showForeignKeyModal}
        onOpenChange={setShowForeignKeyModal}
        onSave={handleAddForeignKey}
        entityId={entity.id}
        dataModelId={dataModelId}
        projectId={projectId}
      />
    </div>
  );
}
