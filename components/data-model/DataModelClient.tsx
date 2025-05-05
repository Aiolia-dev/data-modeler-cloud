"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Plus, Upload } from "lucide-react";
import Link from "next/link";
import DiagramView from "@/components/diagram/DiagramView";
import EntityList from "@/components/entity/entity-list";
import { RulesListView } from "@/components/rules/rules-list-view";
import { ReferentialList } from "@/components/referential/referential-list";
import { EntityModal, EntityFormData } from "@/components/entity/entity-modal";
import { ImportModelModal } from "@/components/data-model/import-model-modal";
import { ExportModelModal, ExportFormat } from "@/components/data-model/export-model-modal";
import { exportDataModel } from "@/utils/export-utils";
import { usePermissions } from "@/context/permission-context";
import { PermissionButton } from "@/components/ui/permission-button";

interface DataModelClientProps {
  projectId: string;
  modelId: string;
}

export default function DataModelClient({ projectId, modelId }: DataModelClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "entities");
  
  // State for entities, referentials, and other data
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
  const [isAddEntityModalOpen, setIsAddEntityModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [availableReferentials, setAvailableReferentials] = useState<any[]>([]);
  const [referentials, setReferentials] = useState<any[]>([]);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);

  // Fetch projects for the import modal
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    
    fetchProjects();
  }, []);

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
      setIsAddEntityModalOpen(false);
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-700 text-gray-300"
                onClick={() => setIsImportModalOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-700 text-gray-300"
                onClick={() => setIsExportModalOpen(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <div className="text-sm text-gray-400 ml-2">
                Version {dataModel?.version || "1.0"} • Updated {dataModel?.updated_at ? new Date(dataModel.updated_at).toLocaleString() : "recently"}
              </div>
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
                <PermissionButton 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsAddEntityModalOpen(true)}
                  action="create"
                  projectId={projectId}
                  disabledMessage="You need editor or admin permissions to create entities"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Entity
                </PermissionButton>
              </div>
              
              {entitiesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse text-gray-400">Loading entities...</div>
                </div>
              ) : entities.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
                  <p className="text-gray-400 mb-4">No entities found in this data model</p>
                  <PermissionButton 
                    variant="outline" 
                    className="border-gray-600"
                    onClick={() => setIsAddEntityModalOpen(true)}
                    action="create"
                    projectId={projectId}
                    disabledMessage="You need editor or admin permissions to create entities"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first entity
                  </PermissionButton>
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
        open={isAddEntityModalOpen}
        onOpenChange={setIsAddEntityModalOpen}
        onSave={handleCreateEntity}
        availableEntities={entities}
        availableReferentials={availableReferentials}
      />

      {/* Import Modal */}
      <ImportModelModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        projects={[{ id: projectId, name: dataModel?.name || 'Current Project' }]}
        onImport={async (projectId, file) => {
          try {
            const formData = new FormData();
            formData.append('projectId', projectId);
            formData.append('modelName', dataModel?.name || 'Imported Model');
            formData.append('file', file);
            
            const response = await fetch('/api/data-models/import', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to import model');
            }
            
            // Refresh the data after import
            window.location.reload();
          } catch (error) {
            console.error('Error importing model:', error);
            throw error;
          }
        }}
      />

      {/* Export Modal */}
      <ExportModelModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        onExport={async (format) => {
          try {
            await exportDataModel(modelId, format);
          } catch (error) {
            console.error('Error exporting model:', error);
          }
        }}
        projectId={projectId}
        dataModelId={modelId}
      />
    </div>
  );
}
