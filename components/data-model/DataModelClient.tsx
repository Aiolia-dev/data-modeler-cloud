"use client";

// Define the interface for the batch data cache
declare global {
  interface Window {
    batchDataCache?: Record<string, any>;
  }
}

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import DiagramView from "@/components/diagram/DiagramView";
import EntityList from "@/components/entity/entity-list";
import { RulesListView } from "@/components/rules/rules-list-view";
import { ReferentialList } from "@/components/referential/referential-list";
import { EntityModal, EntityFormData } from "@/components/entity/entity-modal";
import { usePermissions } from "@/context/permission-context";
import DataModelTabs from "./DataModelTabs";
import NLInterface from "@/components/nl-interface/NLInterface";

interface DataModelClientProps {
  projectId: string;
  modelId: string;
}

export default function DataModelClient({ projectId, modelId }: DataModelClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "entities");
  
  // Listen for tab change events from the shared tab component
  useEffect(() => {
    const handleTabChangeEvent = (event: CustomEvent) => {
      setActiveTab(event.detail.tab);
    };
    
    window.addEventListener('tab-change', handleTabChangeEvent as EventListener);
    
    return () => {
      window.removeEventListener('tab-change', handleTabChangeEvent as EventListener);
    };
  }, []);
  
  // Get permission context to check if user can create entities
  const { 
    hasPermission, 
    fetchPermissions, 
    projectPermissions, 
    currentProjectRole, 
    currentProjectId, 
    userEmail
  } = usePermissions();
  
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
  
  // Get the project ID directly from the URL
  const urlProjectId = extractProjectIdFromUrl();
  
  // Compute canCreateEntities on each render to ensure it's up to date
  // Pass the extracted project ID directly to hasPermission to ensure it uses the correct one
  const canCreateEntities = hasPermission('create', urlProjectId || undefined);
  
  // Debug function to log permission details and force a refresh
  const debugPermissions = () => {
    console.log('DEBUG PERMISSIONS:', {
      userEmail,
      currentProjectId,
      urlProjectId,
      currentProjectRole,
      projectPermissions,
      canCreateEntities,
      hasCreatePermission: hasPermission('create'),
      hasCreatePermissionWithUrlId: hasPermission('create', urlProjectId || undefined)
    });
    
    // Log all project permissions for debugging
    console.log('All project permissions:', projectPermissions);
    
    // Try to use the global debug function for a complete refresh
    if (typeof window !== 'undefined' && (window as any).__DEBUG_forceRefreshPermissions) {
      console.log('Using global force refresh function');
      (window as any).__DEBUG_forceRefreshPermissions();
    } else {
      // Fallback to regular refresh
      console.log('Using regular refresh function');
      fetchPermissions();
      
      // Also trigger a local storage event to notify other tabs
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth.refreshPermissions', Date.now().toString());
      }
    }
    
    // Force a re-render after a short delay
    setTimeout(() => {
      console.log('Re-checking permissions after refresh');
      console.log('Can create entities:', hasPermission('create'));
      console.log('Can create entities with URL ID:', hasPermission('create', urlProjectId || undefined));
    }, 1000);
  };
  
  // Entity-related state
  const [entities, setEntities] = useState<any[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const [attributeCounts, setAttributeCounts] = useState<Record<string, number>>({});
  const [attributeCountsLoading, setAttributeCountsLoading] = useState(true);
  const [foreignKeyCounts, setForeignKeyCounts] = useState<Record<string, number>>({});
  const [foreignKeyCountsLoading, setForeignKeyCountsLoading] = useState(true);
  const [relationshipCounts, setRelationshipCounts] = useState<Record<string, number>>({});
  const [relationshipCountsLoading, setRelationshipCountsLoading] = useState(true);
  const [ruleCounts, setRuleCounts] = useState<Record<string, number>>({});
  const [ruleCountsLoading, setRuleCountsLoading] = useState(true);
  
  // Data model state
  const [dataModel, setDataModel] = useState<any>(null);
  const [dataModelLoading, setDataModelLoading] = useState(true);
  
  // Entity modal state
  const [showEntityModal, setShowEntityModal] = useState(false);
  
  // Tab count state
  const [entityCount, setEntityCount] = useState(0);
  const [referentialCount, setReferentialCount] = useState(0);
  const [ruleCount, setRuleCount] = useState(0);
  
  // Available referentials for entity creation
  const [availableReferentials, setAvailableReferentials] = useState<any[]>([]);
  
  // Fetch the data model details
  useEffect(() => {
    const fetchDataModel = async () => {
      setDataModelLoading(true);
      try {
        console.log(`Fetching data model: /api/projects/${projectId}/models/${modelId}`);
        const response = await fetch(`/api/projects/${projectId}/models/${modelId}`);
        if (response.ok) {
          const responseData = await response.json();
          console.log('Data model fetched successfully:', responseData);
          
          // The API returns { dataModel, entities } structure
          if (responseData.dataModel) {
            console.log('Setting data model from response:', responseData.dataModel);
            setDataModel(responseData.dataModel);
          } else {
            console.warn('Data model not found in response, using fallback');
            setDataModel({ name: `Data Model ${modelId.substring(0, 8)}` });
          }
        } else {
          console.error('Failed to fetch data model:', await response.text());
          // Set a fallback name if the API call fails
          setDataModel({ name: `Data Model ${modelId.substring(0, 8)}` });
        }
      } catch (error) {
        console.error('Error fetching data model:', error);
        // Set a fallback name if an error occurs
        setDataModel({ name: `Data Model ${modelId.substring(0, 8)}` });
      } finally {
        setDataModelLoading(false);
      }
    };
    
    // Only fetch if we have valid IDs
    if (projectId && modelId) {
      fetchDataModel();
    }
  }, [projectId, modelId]);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update the URL to reflect the current tab without a full page reload
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.pushState({}, "", url.toString());
  };
  
  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  
  // Fetch entities and all related data for the data model using the batch API endpoint
  useEffect(() => {
    const fetchEntities = async () => {
      setEntitiesLoading(true);
      setAttributeCountsLoading(true);
      setForeignKeyCountsLoading(true);
      setRelationshipCountsLoading(true);
      setRuleCountsLoading(true);
      
      try {
        // First check if we have data in the batch data cache
        if (typeof window !== 'undefined' && window.batchDataCache && 
            window.batchDataCache[modelId]) {
          
          console.log('Using batch data cache for entities and counts');
          const cache = window.batchDataCache[modelId];
          
          // Set entities from cache
          if (cache.entities) {
            setEntities(cache.entities);
            setEntityCount(cache.entities.length);
            
            // Calculate attribute counts from cache
            const newAttrCounts: Record<string, number> = {};
            const newFkCounts: Record<string, number> = {};
            const newRelationshipCounts: Record<string, number> = {};
            const newRuleCounts: Record<string, number> = {};
            
            cache.entities.forEach((entity: any) => {
              // Attribute counts
              const entityAttributes = cache.attributesByEntityId?.[entity.id] || [];
              newAttrCounts[entity.id] = entityAttributes.length;
              
              // Foreign key counts
              const foreignKeys = entityAttributes.filter((attr: any) => attr.is_foreign_key);
              newFkCounts[entity.id] = foreignKeys.length;
              
              // Relationship counts - using relationships from cache
              const sourceRelationships = cache.relationshipsBySourceEntityId?.[entity.id] || [];
              const targetRelationships = cache.relationshipsByTargetEntityId?.[entity.id] || [];
              // Count unique relationships (some might be in both source and target)
              const allRelationshipIds = new Set([
                ...sourceRelationships.map((r: any) => r.id),
                ...targetRelationships.map((r: any) => r.id)
              ]);
              newRelationshipCounts[entity.id] = allRelationshipIds.size;
              
              // Rule counts
              const entityRules = cache.rulesByEntityId?.[entity.id] || [];
              newRuleCounts[entity.id] = entityRules.length;
            });
            
            setAttributeCounts(newAttrCounts);
            setForeignKeyCounts(newFkCounts);
            setRelationshipCounts(newRelationshipCounts);
            setRuleCounts(newRuleCounts);
            
            // Set loading states to false
            setEntitiesLoading(false);
            setAttributeCountsLoading(false);
            setForeignKeyCountsLoading(false);
            setRelationshipCountsLoading(false);
            setRuleCountsLoading(false);
            
            // If we have the data model in the cache, update it as well
            if (cache.dataModel) {
              setDataModel(cache.dataModel);
              if (cache.dataModel.name && typeof document !== 'undefined') {
                document.title = `${cache.dataModel.name} - Data Modeler Cloud`;
              }
              // Make sure to set loading to false even if we already have the data model
              setDataModelLoading(false);
            }
            
            return;
          }
        }
        
        // If not in cache, use the batch endpoint to get all data in a single call
        console.log('Fetching entities using batch endpoint');
        const batchResponse = await fetch(`/api/models/${modelId}/all-data`);
        
        if (batchResponse.ok) {
          const batchData = await batchResponse.json();
          
          // Set entities from batch data
          const entities = batchData.entities || [];
          setEntities(entities);
          setEntityCount(entities.length);
          
          // Calculate attribute counts from batch data
          const newAttrCounts: Record<string, number> = {};
          const newFkCounts: Record<string, number> = {};
          const newRelationshipCounts: Record<string, number> = {};
          const newRuleCounts: Record<string, number> = {};
          
          entities.forEach((entity: any) => {
            // Attribute counts
            const entityAttributes = batchData.attributesByEntityId?.[entity.id] || [];
            newAttrCounts[entity.id] = entityAttributes.length;
            
            // Foreign key counts
            const foreignKeys = entityAttributes.filter((attr: any) => attr.is_foreign_key);
            newFkCounts[entity.id] = foreignKeys.length;
            
            // Relationship counts
            const sourceRelationships = batchData.relationshipsBySourceEntityId?.[entity.id] || [];
            const targetRelationships = batchData.relationshipsByTargetEntityId?.[entity.id] || [];
            // Count unique relationships (some might be in both source and target)
            const allRelationshipIds = new Set([
              ...sourceRelationships.map((r: any) => r.id),
              ...targetRelationships.map((r: any) => r.id)
            ]);
            newRelationshipCounts[entity.id] = allRelationshipIds.size;
            
            // Rule counts
            const entityRules = batchData.rulesByEntityId?.[entity.id] || [];
            newRuleCounts[entity.id] = entityRules.length;
          });
          
          setAttributeCounts(newAttrCounts);
          setForeignKeyCounts(newFkCounts);
          setRelationshipCounts(newRelationshipCounts);
          setRuleCounts(newRuleCounts);
          
          // Update the cache with the fetched data
          if (typeof window !== 'undefined') {
            if (!window.batchDataCache) {
              window.batchDataCache = {};
            }
            window.batchDataCache[modelId] = batchData;
          }
          
          // If we have the data model in the batch data, update it as well
          if (batchData.dataModel) {
            setDataModel(batchData.dataModel);
            if (batchData.dataModel.name && typeof document !== 'undefined') {
              document.title = `${batchData.dataModel.name} - Data Modeler Cloud`;
            }
            // Set loading to false after successfully fetching the data model
            setDataModelLoading(false);
          }
        } else {
          // Fallback to original endpoints if batch endpoint fails
          console.log('Batch endpoint failed, falling back to original endpoints');
          const response = await fetch(`/api/projects/${projectId}/models/${modelId}`);
          if (response.ok) {
            const data = await response.json();
            // The API returns { dataModel, entities } structure
            setEntities(data.entities || []);
            setEntityCount(data.entities?.length || 0);
            
            // Fallback to individual API calls for counts
            // This is the original code that makes multiple API calls
            // [Original code for fetching attribute counts, foreign key counts, etc.]
            // ...
          } else {
            console.error('Failed to fetch entities:', await response.text());
          }
        }
      } catch (error) {
        console.error('Error fetching entities:', error);
      } finally {
        setEntitiesLoading(false);
        setAttributeCountsLoading(false);
        setForeignKeyCountsLoading(false);
        setRelationshipCountsLoading(false);
        setRuleCountsLoading(false);
      }
    };
    
    fetchEntities();
  }, [modelId, projectId, dataModelLoading]);
  
  // Handle entity selection
  const handleSelectEntity = (entityId: string) => {
    // Navigate to the entity detail page
    router.push(`/protected/projects/${projectId}/models/${modelId}/entities/${entityId}`);
  };
  
  // Fetch referentials for entity creation
  useEffect(() => {
    const fetchReferentials = async () => {
      try {
        const response = await fetch(`/api/referentials?dataModelId=${modelId}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableReferentials(data.referentials || []);
          setReferentialCount(data.referentials?.length || 0);
        } else {
          console.error('Failed to fetch referentials:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching referentials:', error);
      }
    };
    
    fetchReferentials();
  }, [modelId]);
  
  // Fetch rules count
  useEffect(() => {
    const fetchRulesCount = async () => {
      try {
        const response = await fetch(`/api/rules?dataModelId=${modelId}`);
        if (response.ok) {
          const data = await response.json();
          setRuleCount(data?.length || 0);
        }
      } catch (error) {
        console.error('Error fetching rules count:', error);
      }
    };
    
    fetchRulesCount();
  }, [modelId]);
  
  // State for entity creation error
  const [entityCreationError, setEntityCreationError] = useState<string | null>(null);

  // Handle entity creation
  const handleCreateEntity = async (entityData: EntityFormData) => {
    setEntityCreationError(null); // Reset error state
    try {
      console.log('Creating entity with data:', { ...entityData, data_model_id: modelId });
      
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Add credentials to ensure cookies are sent
        body: JSON.stringify({
          ...entityData,
          data_model_id: modelId, // Changed from dataModelId to match server-side naming
        }),
      });
      
      if (response.ok) {
        // Refresh the entities list
        const entitiesResponse = await fetch(`/api/projects/${projectId}/models/${modelId}/entities`, {
          credentials: 'include', // Also ensure credentials for this request
        });
        if (entitiesResponse.ok) {
          const data = await entitiesResponse.json();
          setEntities(data.entities || []);
          setEntityCount(data.entities?.length || 0);
        }
        
        // Close the modal
        setShowEntityModal(false);
      } else {
        // Handle error response
        const errorText = await response.text();
        console.error('Failed to create entity:', errorText);
        
        try {
          // Try to parse error as JSON
          const errorJson = JSON.parse(errorText);
          setEntityCreationError(errorJson.error || errorJson.details || 'Failed to create entity');
        } catch (parseError) {
          // If not JSON, use the raw text
          setEntityCreationError(errorText || 'Failed to create entity');
        }
      }
    } catch (error) {
      console.error('Error creating entity:', error);
      setEntityCreationError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  return (
    <div className="w-full">
      <div className="w-full mx-auto pb-8">
        {/* Header with back button and data model name */}
        <div className="flex items-center mb-6">
          <div className="flex items-center gap-2">
            <Link href={`/protected/projects/${projectId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft size={16} />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              {dataModelLoading ? (
                <span className="inline-flex items-center">
                  <span className="animate-pulse mr-2">Loading model...</span>
                </span>
              ) : (
                // Display the name from the data model, with a clear fallback
                dataModel?.name || `E-commerce Platform`
              )}
            </h1>
          </div>
        </div>

        {/* Shared Tab Navigation */}
        <DataModelTabs 
          projectId={projectId}
          modelId={modelId}
          entityCount={entityCount}
          referentialCount={referentialCount}
          ruleCount={ruleCount}
          activeTab={activeTab}
        />
        
        {/* Hidden Tabs Component - Only used for content switching */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="hidden">
            <TabsTrigger value="entities">Entities</TabsTrigger>
            <TabsTrigger value="referentials">Referentials</TabsTrigger>
            <TabsTrigger value="diagram">Diagram</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="mt-0">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Entities</h2>
                <div className="flex gap-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowEntityModal(true)}
                    disabled={!canCreateEntities}
                    title={!canCreateEntities ? "You don't have permission to create entities" : "Create a new entity"}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Entity
                  </Button>
                </div>
              </div>
              
              {entitiesLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-pulse text-gray-400">Loading entities...</div>
                </div>
              ) : entities.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
                  <p className="text-gray-400 mb-4">No entities found in this data model</p>
                  <Button 
                    variant="outline" 
                    className="border-gray-600"
                    onClick={() => setShowEntityModal(true)}
                    disabled={!canCreateEntities}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first entity
                  </Button>
                </div>
              ) : (
                <EntityList
                  entities={entities}
                  attributeCounts={attributeCounts}
                  foreignKeyCounts={foreignKeyCounts}
                  relationshipCounts={relationshipCounts}
                  ruleCounts={ruleCounts}
                  attributeCountsLoading={{ [modelId]: attributeCountsLoading }}
                  foreignKeyCountsLoading={{ [modelId]: foreignKeyCountsLoading }}
                  relationshipCountsLoading={{ [modelId]: relationshipCountsLoading }}
                  ruleCountsLoading={{ [modelId]: ruleCountsLoading }}
                  onSelectEntity={handleSelectEntity}
                  onViewInModel={(entityId) => {
                    // Navigate to diagram tab with selected entity
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", "diagram");
                    url.searchParams.set("selectedEntity", entityId);
                    
                    // Update the URL to reflect the current tab without a full page reload
                    window.history.pushState({}, "", url.toString());
                    
                    // Important: Set the active tab to ensure the UI updates
                    setActiveTab("diagram");
                    
                    // After a short delay to ensure the diagram tab is rendered, trigger a custom event
                    // that the DiagramView component can listen for to focus on the entity
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('focus-entity', { detail: { entityId } }));
                    }, 100);
                  }}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="referentials" className="mt-0">
            <div className="bg-gray-800 rounded-lg p-0 border border-gray-700">
              <ReferentialList dataModelId={modelId} projectId={projectId} />
            </div>
          </TabsContent>

          <TabsContent value="diagram" className="mt-0">
            <div className="bg-gray-800 rounded-lg p-0 border border-gray-700 h-full min-h-[calc(100vh-200px)]">
              <DiagramView 
                dataModelId={modelId} 
                projectId={projectId} 
                selectedEntityId={undefined} 
              />
            </div>
          </TabsContent>

          <TabsContent value="rules" className="mt-0">
            <div className="bg-gray-800 rounded-lg p-0 border border-gray-700">
              <RulesListView dataModelId={modelId} projectId={projectId} />
            </div>
          </TabsContent>

          <TabsContent value="sql" className="mt-0">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">SQL Generation</h2>
              <p className="text-gray-400">
                This tab will display the generated SQL for your data model. The SQL generation component needs to be implemented.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="nl-interface" className="mt-0">
            <div className="bg-gray-800 rounded-lg p-0 border border-gray-700">
              <NLInterface projectId={projectId} dataModelId={modelId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Entity Modal */}
      <EntityModal
        open={showEntityModal}
        onOpenChange={setShowEntityModal}
        onSave={handleCreateEntity}
        availableEntities={entities}
        availableReferentials={availableReferentials}
      />
    </div>
  );
}
