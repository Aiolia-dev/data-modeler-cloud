"use client";

import React, { useEffect, useState, memo } from 'react';
import ReactFlow, { Background, Node, Edge, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { ModelChange } from './NLProcessor';

// Define types for the entity node data
interface EntityNodeData {
  id: string;
  name: string;
  attributes?: Array<{
    id?: string;
    name: string;
    dataType?: string;
    data_type?: string;
    description?: string;
    isRequired?: boolean;
    is_required?: boolean;
    isUnique?: boolean;
    is_unique?: boolean;
    isPrimaryKey?: boolean;
    is_primary_key?: boolean;
    isForeignKey?: boolean;
    is_foreign_key?: boolean;
  }>;
}

// Create a simplified version of the EntityNode component
const SimpleEntityNode: React.FC<{ data: EntityNodeData }> = ({ data }) => {
  return (
    <div className="bg-background border-2 border-primary rounded-md p-4 shadow-md">
      <div className="font-bold text-lg mb-2">{data.name}</div>
      <div className="space-y-1">
        {data.attributes && data.attributes.map((attr, index: number) => (
          <div key={attr.id || index} className="text-sm flex items-center">
            <span className="mr-2">{attr.isPrimaryKey || attr.is_primary_key ? '🔑' : '•'}</span>
            <span className="font-medium">{attr.name}</span>
            <span className="text-muted-foreground ml-1">: {attr.dataType || attr.data_type}</span>
            {(attr.isRequired || attr.is_required) && <span className="text-primary ml-1">*</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

interface EntityPreviewProps {
  entityName: string;
  changes: ModelChange[];
  existingAttributes?: any[];
  sourceEntityName?: string;
  targetEntityName?: string;
  isJoinEntity?: boolean;
}

/**
 * A component that renders a mini preview of an entity with its attributes
 * including any proposed changes from the Natural Language Interface
 */
function EntityPreview({ entityName, changes, existingAttributes = [], sourceEntityName, targetEntityName, isJoinEntity = false }: EntityPreviewProps) {
  // Calculate nodes and edges once without dependencies on state
  const { initialNodes, initialEdges } = React.useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    if (isJoinEntity && sourceEntityName && targetEntityName) {
      // Create nodes for source, target, and join entities
      nodes.push(
        {
          id: 'source-entity',
          type: 'simpleEntityNode',
          position: { x: 50, y: 100 },
          data: {
            id: 'source-entity',
            name: sourceEntityName,
            attributes: [],
          },
        },
        {
          id: 'target-entity',
          type: 'simpleEntityNode',
          position: { x: 350, y: 100 },
          data: {
            id: 'target-entity',
            name: targetEntityName,
            attributes: [],
          },
        },
        {
          id: 'join-entity',
          type: 'simpleEntityNode',
          position: { x: 200, y: 250 },
          data: {
            id: 'join-entity',
            name: entityName,
            attributes: [
              {
                id: 'preview-id',
                name: 'id',
                dataType: 'uuid',
                data_type: 'uuid',
                description: 'Primary key',
                isPrimaryKey: true,
                is_primary_key: true,
                isRequired: true,
                is_required: true,
              },
              {
                id: `preview-id${sourceEntityName.replace(/\s+/g, '')}`,
                name: `id${sourceEntityName.replace(/\s+/g, '')}`,
                dataType: 'uuid',
                data_type: 'uuid',
                description: `Foreign key to ${sourceEntityName}`,
                isForeignKey: true,
                is_foreign_key: true,
              },
              {
                id: `preview-id${targetEntityName.replace(/\s+/g, '')}`,
                name: `id${targetEntityName.replace(/\s+/g, '')}`,
                dataType: 'uuid',
                data_type: 'uuid',
                description: `Foreign key to ${targetEntityName}`,
                isForeignKey: true,
                is_foreign_key: true,
              }
            ],
          },
        }
      );
      
      // Create edges between join entity and source/target entities
      edges.push(
        {
          id: 'edge-join-source',
          source: 'join-entity',
          target: 'source-entity',
          type: 'default',
          animated: true,
        },
        {
          id: 'edge-join-target',
          source: 'join-entity',
          target: 'target-entity',
          type: 'default',
          animated: true,
        }
      );
      
      return { initialNodes: nodes, initialEdges: edges };
    } else {
      // Create a preview node for a regular entity with attributes
      const attributes = [...existingAttributes];
      
      // Process the changes to update the attributes
      changes.forEach(change => {
        if (change.type === 'create' && change.operation === 'add_attribute' && change.entity === entityName) {
          // Add the new attribute to the attributes array
          attributes.push({
            id: `preview-${change.attribute}`,
            name: change.attribute || 'New Attribute',
            dataType: change.data_type || 'text',
            data_type: change.data_type || 'text',
            description: change.description || '',
            isRequired: change.is_required || false,
            is_required: change.is_required || false,
            isUnique: change.is_unique || false,
            is_unique: change.is_unique || false,
            isPrimaryKey: change.is_primary_key || false,
            is_primary_key: change.is_primary_key || false,
            isForeignKey: false,
            is_foreign_key: false,
          });
        }
      });
      
      return { 
        initialNodes: [{
          id: 'preview-entity',
          type: 'simpleEntityNode',
          position: { x: 100, y: 100 },
          data: {
            id: 'preview-entity',
            name: entityName,
            attributes: attributes,
          },
        }],
        initialEdges: []
      };
    }
  }, [entityName, changes, existingAttributes, sourceEntityName, targetEntityName, isJoinEntity]);

  // We'll use the initialNodes and initialEdges directly instead of state
  // This prevents the infinite update loop

  // Define the node types for ReactFlow
  const nodeTypes = {
    simpleEntityNode: SimpleEntityNode,
  };

  return (
    <div className="h-[300px] w-full border border-border rounded-md overflow-hidden">
      <ReactFlowProvider>
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export default memo(EntityPreview);
