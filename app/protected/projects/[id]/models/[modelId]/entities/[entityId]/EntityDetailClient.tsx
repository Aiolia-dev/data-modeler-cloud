"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import EntityDetail from "@/components/entity/entity-detail";

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

interface EntityDetailClientProps {
  projectId: string;
  modelId: string;
}

export default function EntityDetailClient({ projectId, modelId }: EntityDetailClientProps) {
  const router = useRouter();
  const params = useParams();
  const entityId = params.entityId as string;
  
  // Always initialize all hooks at the top level
  const [entity, setEntity] = useState<Entity | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [referentials, setReferentials] = useState<Referential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Handle tab navigation
  const handleTabChange = (value: string) => {
    if (value !== 'entities') {
      router.push(`/protected/projects/${projectId}/models/${modelId}?tab=${value}`);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch entity data
        const entityRes = await fetch(`/api/entities/${entityId}?dataModelId=${modelId}`);
        
        if (!entityRes.ok) {
          throw new Error('Failed to fetch entity');
        }
        
        const entityData = await entityRes.json();
        
        // Fetch attributes
        const attrRes = await fetch(`/api/attributes?entityId=${entityId}`);
        
        if (!attrRes.ok) {
          throw new Error('Failed to fetch attributes');
        }
        
        const attrData = await attrRes.json();
        
        // Fetch referentials
        const refRes = await fetch(`/api/referentials?dataModelId=${modelId}`);
        let refData = { referentials: [] };
        
        if (refRes.ok) {
          refData = await refRes.json();
        }
        
        setEntity(entityData.entity);
        setAttributes(attrData.attributes || []);
        setReferentials(refData.referentials || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [entityId, modelId]);

  const handleSave = async (entityData: any, attributesData: any) => {
    if (!entity) return;
    
    try {
      await fetch(`/api/entities/${entity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entityData)
      });
      router.refresh();
    } catch (err) {
      console.error('Error saving entity:', err);
      setError(err instanceof Error ? err.message : 'Failed to save entity');
    }
  };

  const handleDelete = async (entityId: string) => {
    try {
      await fetch(`/api/entities/${entityId}`, { method: "DELETE" });
      router.push(`/protected/projects/${projectId}/models/${modelId}`);
    } catch (err) {
      console.error('Error deleting entity:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete entity');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse text-gray-400">Loading entity details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 bg-red-900/20 p-4 rounded-md">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => router.push(`/protected/projects/${projectId}/models/${modelId}`)}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
          >
            Back to Data Model
          </button>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 bg-red-900/20 p-4 rounded-md">
          <h2 className="text-xl font-semibold mb-2">Entity Not Found</h2>
          <p>The entity you're looking for could not be found.</p>
          <button
            onClick={() => router.push(`/protected/projects/${projectId}/models/${modelId}`)}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
          >
            Back to Data Model
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back button and data model name */}
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/protected/projects/${projectId}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{entity.name}</h1>
      </div>
      
      {/* Tabs for navigation - custom implementation that matches the visual style */}
      <div className="w-full">
        <div className="grid grid-cols-5 mb-8 bg-gray-800 rounded-md">
          <button className="py-2 px-4 text-sm font-medium bg-gray-700 text-white rounded-sm">
            Entities
          </button>
          <button 
            className="py-2 px-4 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-sm"
            onClick={() => handleTabChange('referentials')}
          >
            Referentials
          </button>
          <button 
            className="py-2 px-4 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-sm"
            onClick={() => handleTabChange('diagram')}
          >
            Diagram
          </button>
          <button 
            className="py-2 px-4 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-sm"
            onClick={() => handleTabChange('rules')}
          >
            Rules
          </button>
          <button 
            className="py-2 px-4 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded-sm"
            onClick={() => handleTabChange('sql')}
          >
            SQL
          </button>
        </div>
        
        <div className="mt-0 w-full">
          <EntityDetail
            entity={entity}
            attributes={attributes}
            referentials={referentials}
            onBack={() => router.push(`/protected/projects/${projectId}/models/${modelId}`)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
