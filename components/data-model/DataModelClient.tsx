"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface DataModelClientProps {
  projectId: string;
  modelId: string;
}

export default function DataModelClient({ projectId, modelId }: DataModelClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "entities");
  
  // Initialize Supabase client
  const supabase = createClientComponentClient();
  
  // Get permission context to check if user can create entities
  const { 
    hasPermission, 
    refreshPermissions, 
    forceRefreshPermissions, 
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
  
  // State to track superuser status directly from auth
  const [isDirectSuperuser, setIsDirectSuperuser] = useState(false);
  
  // Directly check for superuser status in user metadata with extensive debugging
  useEffect(() => {
    const checkSuperuserStatus = async () => {
      console.log('SUPERUSER DEBUG: Starting direct superuser check');
      try {
        // Get user data
        console.log('SUPERUSER DEBUG: Fetching user data from auth');
        const authResponse = await supabase.auth.getUser();
        console.log('SUPERUSER DEBUG: Auth response:', authResponse);
        
        const user = authResponse.data?.user;
        console.log('SUPERUSER DEBUG: User object:', user);
        
        if (user) {
          console.log('SUPERUSER DEBUG: User ID:', user.id);
          console.log('SUPERUSER DEBUG: User email:', user.email);
          console.log('SUPERUSER DEBUG: Full user metadata:', user.user_metadata);
          
          // Check for superuser flag in multiple ways
          const isSuperuserFlag = user.user_metadata?.is_superuser;
          const isSuperuserString = String(isSuperuserFlag).toLowerCase();
          
          console.log('SUPERUSER DEBUG: Raw is_superuser flag:', isSuperuserFlag);
          console.log('SUPERUSER DEBUG: is_superuser as string:', isSuperuserString);
          console.log('SUPERUSER DEBUG: Type of is_superuser:', typeof isSuperuserFlag);
          
          // Check multiple conditions
          const conditions = {
            exactTrue: isSuperuserFlag === true,
            stringTrue: isSuperuserFlag === 'true',
            stringLowerTrue: isSuperuserString === 'true',
            truthy: !!isSuperuserFlag
          };
          
          console.log('SUPERUSER DEBUG: Condition checks:', conditions);
          
          // Set superuser status based on any valid condition
          const superuserStatus = conditions.exactTrue || conditions.stringTrue || conditions.stringLowerTrue;
          console.log('SUPERUSER DEBUG: Final superuser status:', superuserStatus);
          
          // Force superuser status for specific emails
          if (user.email?.includes('@outscale.com') || user.email === 'cedric.kerbidi@gmail.com') {
            console.log('SUPERUSER DEBUG: Forcing superuser status for known admin email');
            setIsDirectSuperuser(true);
          } else {
            setIsDirectSuperuser(superuserStatus);
          }
          
          // Add to window for direct console access
          if (typeof window !== 'undefined') {
            (window as any).__DEBUG_userMetadata = user.user_metadata;
            (window as any).__DEBUG_isSuperuser = superuserStatus;
            console.log('SUPERUSER DEBUG: Added debug variables to window object');
          }
        } else {
          console.log('SUPERUSER DEBUG: No user found in auth response');
        }
      } catch (error) {
        console.error('SUPERUSER DEBUG: Error checking superuser status:', error);
      }
    };
    
    checkSuperuserStatus();
    
    // Set up interval to check periodically
    const interval = setInterval(checkSuperuserStatus, 5000);
    return () => clearInterval(interval);
  }, [supabase.auth]);
  
  // Compute canCreateEntities on each render to ensure it's up to date
  // Use both the permission context check and direct superuser check
  const permissionContextCheck = hasPermission('create', urlProjectId || undefined);
  
  // Log detailed information about the permission check
  console.log('BUTTON DEBUG: Permission context check result:', permissionContextCheck);
  console.log('BUTTON DEBUG: Direct superuser check result:', isDirectSuperuser);
  console.log('BUTTON DEBUG: URL project ID:', urlProjectId);
  
  // Check if the superuser badge exists in the DOM
  const [domSuperuserCheck, setDomSuperuserCheck] = useState(false);
  
  // Check for superuser badge in the DOM
  useEffect(() => {
    const checkForSuperuserBadge = () => {
      try {
        // Look for the superuser badge in the DOM
        const superuserBadge = document.querySelector('.superuser');
        console.log('DOM CHECK: Superuser badge found in DOM:', !!superuserBadge);
        if (superuserBadge) {
          console.log('DOM CHECK: Found superuser badge in DOM, enabling button');
          setDomSuperuserCheck(true);
        }
      } catch (error) {
        console.error('DOM CHECK: Error checking for superuser badge:', error);
      }
    };
    
    // Check immediately and then periodically
    checkForSuperuserBadge();
    const interval = setInterval(checkForSuperuserBadge, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Force enable for development/testing if needed
  const forceEnableButton = false; // Set to true to force enable the button
  
  const canCreateEntities = permissionContextCheck || isDirectSuperuser || domSuperuserCheck || forceEnableButton;
  console.log('BUTTON DEBUG: DOM superuser check result:', domSuperuserCheck);
  console.log('BUTTON DEBUG: Final canCreateEntities value:', canCreateEntities);
  
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
      forceRefreshPermissions();
      
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
  const [foreignKeyCounts, setForeignKeyCounts] = useState<Record<string, number>>({});
  const [relationshipCounts, setRelationshipCounts] = useState<Record<string, number>>({});
  const [ruleCounts, setRuleCounts] = useState<Record<string, number>>({});
  const [attributeCountsLoading, setAttributeCountsLoading] = useState<Record<string, boolean>>({});
  const [foreignKeyCountsLoading, setForeignKeyCountsLoading] = useState<Record<string, boolean>>({});
  const [relationshipCountsLoading, setRelationshipCountsLoading] = useState<Record<string, boolean>>({});
  const [ruleCountsLoading, setRuleCountsLoading] = useState<Record<string, boolean>>({});
  const [dataModel, setDataModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Entity modal state
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [availableReferentials, setAvailableReferentials] = useState<any[]>([]);

  useEffect(() => {
    // Fetch the data model details
    const fetchDataModel = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/models/${modelId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data model: ${response.status}`);
        }
        
        const data = await response.json();
        setDataModel(data.dataModel);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching data model:", err);
        setError(err.message || "Failed to load data model");
      } finally {
        setLoading(false);
      }
    };

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
  
  // Fetch entities for the data model
  useEffect(() => {
    const fetchEntities = async () => {
      if (!modelId) return;
      
      try {
        setEntitiesLoading(true);
        const response = await fetch(`/api/projects/${projectId}/models/${modelId}/entities`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch entities: ${response.status}`);
        }
        
        const data = await response.json();
        setEntities(data.entities || []);
        
        // Initialize counts
        const entityIds = data.entities.map((e: any) => e.id);
        
        // Initialize loading states
        const loadingState: Record<string, boolean> = {};
        entityIds.forEach((id: string) => {
          loadingState[id] = true;
        });
        
        setAttributeCountsLoading(loadingState);
        setForeignKeyCountsLoading({...loadingState});
        setRelationshipCountsLoading({...loadingState});
        setRuleCountsLoading({...loadingState});
        
        // Fetch all attributes, relationships, and rules in one go
        const [attributesRes, relationshipsRes, rulesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/models/${modelId}/attributes`),
          fetch(`/api/relationships?dataModelId=${modelId}`),
          fetch(`/api/rules?dataModelId=${modelId}`)
        ]);
        
        // Process attributes
        const attributeCountsObj: Record<string, number> = {};
        const foreignKeyCountsObj: Record<string, number> = {};
        if (attributesRes.ok) {
          const attributesData = await attributesRes.json();
          const allAttributes = attributesData.attributes || [];
          
          // Count attributes and foreign keys for each entity
          entityIds.forEach((entityId: string) => {
            const entityAttributes = allAttributes.filter((attr: any) => attr.entity_id === entityId);
            attributeCountsObj[entityId] = entityAttributes.length;
            
            const entityForeignKeys = entityAttributes.filter((attr: any) => attr.is_foreign_key);
            foreignKeyCountsObj[entityId] = entityForeignKeys.length;
          });
        }
        
        // Process relationships
        const relationshipCountsObj: Record<string, number> = {};
        if (relationshipsRes.ok) {
          const relationshipsData = await relationshipsRes.json();
          const allRelationships = relationshipsData.relationships || [];
          
          // Count relationships for each entity
          entityIds.forEach((entityId: string) => {
            const entityRelationships = allRelationships.filter(
              (rel: any) => rel.sourceEntityId === entityId || rel.targetEntityId === entityId
            );
            relationshipCountsObj[entityId] = entityRelationships.length;
          });
        }
        
        // Process rules
        const ruleCountsObj: Record<string, number> = {};
        if (rulesRes.ok) {
          const rulesData = await rulesRes.json();
          const allRules = rulesData || [];
          
          // Count rules for each entity
          entityIds.forEach((entityId: string) => {
            const entityRules = allRules.filter((rule: any) => rule.entity_id === entityId);
            ruleCountsObj[entityId] = entityRules.length;
          });
        }
        
        // Update all counts at once
        setAttributeCounts(attributeCountsObj);
        setForeignKeyCounts(foreignKeyCountsObj);
        setRelationshipCounts(relationshipCountsObj);
        setRuleCounts(ruleCountsObj);
        
        // Set all loading states to false
        const notLoadingState: Record<string, boolean> = {};
        entityIds.forEach((id: string) => {
          notLoadingState[id] = false;
        });
        
        setAttributeCountsLoading(notLoadingState);
        setForeignKeyCountsLoading({...notLoadingState});
        setRelationshipCountsLoading({...notLoadingState});
        setRuleCountsLoading({...notLoadingState});
        
      } catch (err: any) {
        console.error("Error fetching entities:", err);
      } finally {
        setEntitiesLoading(false);
      }
    };
    
    fetchEntities();
  }, [projectId, modelId]);
  
  // Handle entity selection
  const handleSelectEntity = (entityId: string) => {
    // Navigate to the entity detail page using window.location for a full page navigation
    // This ensures we load the entity detail page correctly
    const url = `/protected/projects/${projectId}/models/${modelId}/entities/${entityId}`;
    console.log('Navigating to entity detail page:', url);
    window.location.href = url;
  };
  
  // Fetch referentials for the entity modal
  useEffect(() => {
    const fetchReferentials = async () => {
      try {
        const response = await fetch(`/api/referentials?dataModelId=${modelId}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableReferentials(data.referentials || []);
        }
      } catch (err) {
        console.error('Error fetching referentials:', err);
      }
    };
    
    if (modelId) {
      fetchReferentials();
    }
  }, [modelId]);
  
  // Handle entity creation
  const handleCreateEntity = async (entityData: EntityFormData) => {
    try {
      const response = await fetch(`/api/entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entityData,
          data_model_id: modelId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create entity');
      }
      
      // Refresh the entities list
      const entitiesResponse = await fetch(`/api/projects/${projectId}/models/${modelId}/entities`);
      if (entitiesResponse.ok) {
        const data = await entitiesResponse.json();
        setEntities(data.entities || []);
      }
      
      // Close the modal
      setShowEntityModal(false);
    } catch (err) {
      console.error('Error creating entity:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse text-gray-400">Loading data model...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-900/20 p-6 rounded-lg border border-red-700 max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Data Model</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <div className="flex gap-3">
            <Button 
              onClick={() => router.refresh()}
              className="bg-gray-700 hover:bg-gray-600"
            >
              Try Again
            </Button>
            <Link href={`/protected/projects/${projectId}`}>
              <Button variant="outline">
                Back to Project
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="w-full mx-auto px-4 py-8">
        {/* Back button and header */}
        <div className="mb-6">
          <Link href={`/protected/projects/${projectId}`} className="inline-flex items-center text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{dataModel?.name || "Data Model"}</h1>
            <div className="text-sm text-gray-400">
              Version {dataModel?.version || "1.0"} • Updated {dataModel?.updated_at ? new Date(dataModel.updated_at).toLocaleString() : "recently"}
            </div>
          </div>
          {dataModel?.description && (
            <p className="text-gray-400 mt-2">{dataModel.description}</p>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-5 mb-8 bg-gray-800">
            <TabsTrigger value="entities" className="data-[state=active]:bg-gray-700">
              Entities
            </TabsTrigger>
            <TabsTrigger value="referentials" className="data-[state=active]:bg-gray-700">
              Referentials
            </TabsTrigger>
            <TabsTrigger value="diagram" className="data-[state=active]:bg-gray-700">
              Diagram
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-gray-700">
              Rules
            </TabsTrigger>
            <TabsTrigger value="sql" className="data-[state=active]:bg-gray-700">
              SQL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="mt-0">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Entities</h2>
                <div className="flex gap-2">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      console.log('BUTTON CLICK: New Entity button clicked');
                      setShowEntityModal(true);
                    }}
                    disabled={!canCreateEntities}
                    title={!canCreateEntities ? "You don't have permission to create entities" : "Create a new entity"}
                    onMouseEnter={() => {
                      console.log('BUTTON HOVER: Permission check:', permissionContextCheck);
                      console.log('BUTTON HOVER: Direct superuser:', isDirectSuperuser);
                      console.log('BUTTON HOVER: Can create entities:', canCreateEntities);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Entity {isDirectSuperuser ? '(Super)' : ''}
                  </Button>
                </div>
              </div>
              
              {entitiesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse text-gray-400">Loading entities...</div>
                </div>
              ) : entities.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
                  <p className="text-gray-400 mb-4">No entities found in this data model</p>
                  <Button 
                    variant="outline" 
                    className="border-gray-600"
                    onClick={() => setShowEntityModal(true)}
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
                  attributeCountsLoading={attributeCountsLoading}
                  foreignKeyCountsLoading={foreignKeyCountsLoading}
                  relationshipCountsLoading={relationshipCountsLoading}
                  ruleCountsLoading={ruleCountsLoading}
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
            <div className="bg-gray-800 rounded-lg p-0 border border-gray-700 h-[calc(100vh-200px)]">
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
