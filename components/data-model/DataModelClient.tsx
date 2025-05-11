"use client";

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
        const response = await fetch(`/api/projects/${projectId}/models/${modelId}`);
        if (response.ok) {
          const data = await response.json();
          setDataModel(data);
        } else {
          console.error('Failed to fetch data model:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching data model:', error);
      } finally {
        setDataModelLoading(false);
      }
    };
    
    fetchDataModel();
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
  
  // Fetch entities for the data model
  useEffect(() => {
    const fetchEntities = async () => {
      setEntitiesLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/models/${modelId}/entities`);
        if (response.ok) {
          const data = await response.json();
          setEntities(data.entities || []);
          setEntityCount(data.entities?.length || 0);
          
          // Fetch attribute counts for each entity
          setAttributeCountsLoading(true);
          const attrCountsPromises = (data.entities || []).map(async (entity: any) => {
            try {
              const attrResponse = await fetch(`/api/attributes?entityId=${entity.id}`);
              if (attrResponse.ok) {
                const attrData = await attrResponse.json();
                return { entityId: entity.id, count: attrData.attributes?.length || 0 };
              }
              return { entityId: entity.id, count: 0 };
            } catch (error) {
              console.error(`Error fetching attributes for entity ${entity.id}:`, error);
              return { entityId: entity.id, count: 0 };
            }
          });
          
          const attrCountsResults = await Promise.all(attrCountsPromises);
          const newAttrCounts: Record<string, number> = {};
          attrCountsResults.forEach(result => {
            newAttrCounts[result.entityId] = result.count;
          });
          setAttributeCounts(newAttrCounts);
          setAttributeCountsLoading(false);
          
          // Fetch foreign key counts for each entity
          setForeignKeyCountsLoading(true);
          const fkCountsPromises = (data.entities || []).map(async (entity: any) => {
            try {
              const fkResponse = await fetch(`/api/attributes?entityId=${entity.id}&isForeignKey=true`);
              if (fkResponse.ok) {
                const fkData = await fkResponse.json();
                return { entityId: entity.id, count: fkData.attributes?.length || 0 };
              }
              return { entityId: entity.id, count: 0 };
            } catch (error) {
              console.error(`Error fetching foreign keys for entity ${entity.id}:`, error);
              return { entityId: entity.id, count: 0 };
            }
          });
          
          const fkCountsResults = await Promise.all(fkCountsPromises);
          const newFkCounts: Record<string, number> = {};
          fkCountsResults.forEach(result => {
            newFkCounts[result.entityId] = result.count;
          });
          setForeignKeyCounts(newFkCounts);
          setForeignKeyCountsLoading(false);
          
          // Set relationship counts (placeholder for now)
          setRelationshipCountsLoading(true);
          const newRelationshipCounts: Record<string, number> = {};
          (data.entities || []).forEach((entity: any) => {
            newRelationshipCounts[entity.id] = 0; // Placeholder
          });
          setRelationshipCounts(newRelationshipCounts);
          setRelationshipCountsLoading(false);
          
          // Fetch rule counts for each entity
          setRuleCountsLoading(true);
          const ruleCountsPromises = (data.entities || []).map(async (entity: any) => {
            try {
              const rulesResponse = await fetch(`/api/rules?entityId=${entity.id}`);
              if (rulesResponse.ok) {
                const rulesData = await rulesResponse.json();
                return { entityId: entity.id, count: rulesData?.length || 0 };
              }
              return { entityId: entity.id, count: 0 };
            } catch (error) {
              console.error(`Error fetching rules for entity ${entity.id}:`, error);
              return { entityId: entity.id, count: 0 };
            }
          });
          
          const ruleCountsResults = await Promise.all(ruleCountsPromises);
          const newRuleCounts: Record<string, number> = {};
          ruleCountsResults.forEach(result => {
            newRuleCounts[result.entityId] = result.count;
          });
          setRuleCounts(newRuleCounts);
          setRuleCountsLoading(false);
        } else {
          console.error('Failed to fetch entities:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching entities:', error);
      } finally {
        setEntitiesLoading(false);
      }
    };
    
    fetchEntities();
  }, [projectId, modelId]);
  
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
  
  // Handle entity creation
  const handleCreateEntity = async (entityData: EntityFormData) => {
    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entityData,
          dataModelId: modelId,
        }),
      });
      
      if (response.ok) {
        // Refresh the entities list
        const entitiesResponse = await fetch(`/api/projects/${projectId}/models/${modelId}/entities`);
        if (entitiesResponse.ok) {
          const data = await entitiesResponse.json();
          setEntities(data.entities || []);
          setEntityCount(data.entities?.length || 0);
        }
        
        // Close the modal
        setShowEntityModal(false);
      } else {
        console.error('Failed to create entity:', await response.text());
      }
    } catch (error) {
      console.error('Error creating entity:', error);
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
            <h1 className="text-2xl font-bold">{dataModel?.name || 'Loading...'}</h1>
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
