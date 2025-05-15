"use client";

import React, { useEffect, useState, memo } from 'react';
import ReactFlow, { Background, Node, Edge, ReactFlowProvider, MarkerType, EdgeTypes, getBezierPath, EdgeLabelRenderer } from 'reactflow';
// Create a simplified custom edge component for the preview
const PreviewEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: any) => {
  // Get the bezier path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePosition || 'right',
    targetX,
    targetY,
    targetPosition: targetPosition || 'left',
  });

  // Get cardinality values
  const sourceCardinality = data?.sourceCardinality || '0..N';
  const targetCardinality = data?.targetCardinality || '1..1';
  
  // Calculate positions for cardinality labels
  const sourceCardinalityX = sourceX + (targetX - sourceX) * 0.15;
  const sourceCardinalityY = sourceY + (targetY - sourceY) * 0.15;
  const targetCardinalityX = sourceX + (targetX - sourceX) * 0.85;
  const targetCardinalityY = sourceY + (targetY - sourceY) * 0.85;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke="#4f46e5"
        strokeWidth={2}
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      <EdgeLabelRenderer>
        {/* Source cardinality label */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceCardinalityX}px, ${sourceCardinalityY}px)`,
            background: 'rgba(30, 41, 59, 0.8)',
            color: 'white',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 500,
            pointerEvents: 'none',
          }}
          className="nodrag nopan"
        >
          {sourceCardinality}
        </div>
        
        {/* Target cardinality label */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetCardinalityX}px, ${targetCardinalityY}px)`,
            background: 'rgba(30, 41, 59, 0.8)',
            color: 'white',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 500,
            pointerEvents: 'none',
          }}
          className="nodrag nopan"
        >
          {targetCardinality}
        </div>
        
        {/* Relationship name label */}
        {data?.label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: 'rgba(30, 41, 59, 0.7)',
              color: 'white',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              pointerEvents: 'none',
            }}
            className="nodrag nopan"
          >
            {data.label}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};
import 'reactflow/dist/style.css';
import { ModelChange } from './NLProcessor';

// Define types for the entity node data
interface EntityNodeData {
  id: string;
  name: string;
  entity_type?: 'standard' | 'join';
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
    referencedEntity?: string;
  }>;
}

// Create a styled version of the EntityNode component that matches the Diagram tab
const StyledEntityNode: React.FC<{ data: EntityNodeData }> = ({ data }) => {
  // Sort attributes: primary keys first, then foreign keys, then others
  const sortedAttributes = [...(data.attributes || [])].sort((a, b) => {
    const aIsPrimary = a.isPrimaryKey || a.is_primary_key;
    const bIsPrimary = b.isPrimaryKey || b.is_primary_key;
    const aIsForeign = a.isForeignKey || a.is_foreign_key;
    const bIsForeign = b.isForeignKey || b.is_foreign_key;
    
    if (aIsPrimary && !bIsPrimary) return -1;
    if (!aIsPrimary && bIsPrimary) return 1;
    if (aIsForeign && !bIsForeign) return -1;
    if (!aIsForeign && bIsForeign) return 1;
    return 0;
  });
  
  const isJoinEntity = data.entity_type === 'join';
  
  return (
    <div 
      className={`w-[300px] rounded-md overflow-hidden shadow-md ${isJoinEntity ? 'bg-[#2a3045]' : 'bg-gray-800'} border-2 ${isJoinEntity ? 'border-gray-400 border-dashed' : 'border-gray-700'}`}
      style={{
        ...(isJoinEntity ? { 
          backgroundImage: 'linear-gradient(to bottom, #2a3045, #1e2232)',
          boxShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
        } : {})
      }}
    >
      {/* Entity Header */}
      <div 
        className="p-3 font-medium text-gray-100 flex justify-between items-center"
        style={{ 
          backgroundColor: isJoinEntity ? '#3a4055' : '#374151'
        }}
      >
        <span>{data.name}</span>
        {isJoinEntity && (
          <div className="h-5 px-1.5 text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded-sm font-semibold">
            JOIN
          </div>
        )}
      </div>
      
      {/* Entity Attributes */}
      <div className="p-2 text-sm">
        {sortedAttributes.length === 0 && data.entity_type !== 'standard' ? (
          <div className="text-gray-400 italic text-xs p-1">No attributes</div>
        ) : (
          sortedAttributes.map((attr, index) => {
            const isPrimaryKey = attr.isPrimaryKey || attr.is_primary_key;
            const isForeignKey = attr.isForeignKey || attr.is_foreign_key;
            const isRequired = attr.isRequired || attr.is_required;
            const isUnique = attr.isUnique || attr.is_unique;
            
            return (
              <div 
                key={attr.id || index} 
                className={`px-2 py-1 flex items-center gap-2 ${isPrimaryKey ? 'bg-purple-950 bg-opacity-30' : isForeignKey ? 'bg-blue-950 bg-opacity-30' : ''}`}
              >
                <div className="flex-1 flex items-center gap-1">
                  {isPrimaryKey && <span className="text-purple-400 text-xs">🔑</span>}
                  {isForeignKey && <span className="text-blue-400 text-xs">🔗</span>}
                  <span className={`${isPrimaryKey ? 'text-purple-300' : isForeignKey ? 'text-blue-300' : 'text-white'}`}>
                    {attr.name}
                  </span>
                </div>
                <div className="text-xs text-gray-400">{attr.dataType || attr.data_type}</div>
                <div className="flex gap-1">
                  {isRequired && <div className="h-4 text-[0.6rem] px-1 py-0 border border-red-500 text-red-400 rounded-sm">Req</div>}
                  {isUnique && <div className="h-4 text-[0.6rem] px-1 py-0 border border-yellow-500 text-yellow-400 rounded-sm">Unq</div>}
                </div>
              </div>
            );
          })
        )}
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
          position: { x: 100, y: 100 },
          data: {
            id: 'source-entity',
            name: sourceEntityName,
            entity_type: 'standard',
            attributes: [],
          },
        },
        {
          id: 'target-entity',
          type: 'simpleEntityNode',
          position: { x: 500, y: 100 },
          data: {
            id: 'target-entity',
            name: targetEntityName,
            entity_type: 'standard',
            attributes: [],
          },
        },
        {
          id: 'join-entity',
          type: 'simpleEntityNode',
          position: { x: 300, y: 250 },
          data: {
            id: 'join-entity',
            name: entityName,
            entity_type: 'join',
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
                referencedEntity: 'source-entity',
              },
              {
                id: `preview-id${targetEntityName.replace(/\s+/g, '')}`,
                name: `id${targetEntityName.replace(/\s+/g, '')}`,
                dataType: 'uuid',
                data_type: 'uuid',
                description: `Foreign key to ${targetEntityName}`,
                isForeignKey: true,
                is_foreign_key: true,
                referencedEntity: 'target-entity',
              }
            ],
          },
        }
      );
      
      // Create styled edges between all entities
      edges.push(
        // Edge from source entity to join entity
        {
          id: 'edge-join-source',
          source: 'source-entity',
          target: 'join-entity',
          type: 'relationshipEdge',
          animated: true,
          sourceHandle: 'right',
          targetHandle: 'left',
          data: {
            sourceCardinality: '0..N',
            targetCardinality: '1..1',
            sourceEntityName: sourceEntityName,
            targetEntityName: entityName,
            sourcePosition: 'right',
            targetPosition: 'left'
          },
        },
        // Edge from join entity to target entity
        {
          id: 'edge-join-target',
          source: 'join-entity',
          target: 'target-entity',
          type: 'relationshipEdge',
          animated: true,
          sourceHandle: 'right',
          targetHandle: 'left',
          data: {
            sourceCardinality: '0..N',
            targetCardinality: '1..1',
            sourceEntityName: entityName,
            targetEntityName: targetEntityName,
            sourcePosition: 'right',
            targetPosition: 'left'
          },
        },
        // Direct relationship between source and target entities
        {
          id: 'edge-source-target',
          source: 'source-entity',
          target: 'target-entity',
          type: 'relationshipEdge',
          animated: true,
          sourceHandle: 'bottom',
          targetHandle: 'bottom',
          data: {
            sourceCardinality: '1..1',
            targetCardinality: '1..1',
            sourceEntityName: sourceEntityName,
            targetEntityName: targetEntityName,
            label: 'many-to-many',
            sourcePosition: 'bottom',
            targetPosition: 'bottom'
          },
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
    simpleEntityNode: StyledEntityNode,
  };
  
  // Define the edge types for ReactFlow
  const edgeTypes: EdgeTypes = {
    relationshipEdge: PreviewEdge,
  };

  return (
    <div className="h-[300px] w-full border border-border rounded-md overflow-hidden">
      <ReactFlowProvider>
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-right"
          defaultEdgeOptions={{
            type: 'relationshipEdge',
          }}
        >
          {/* Define SVG markers for the arrows */}
          <svg style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="15"
                markerHeight="15"
                refX="10"
                refY="5"
                orient="auto"
              >
                <path
                  d="M 0 0 L 10 5 L 0 10 z"
                  fill="#4f46e5"
                  style={{ strokeWidth: 1 }}
                />
              </marker>
            </defs>
          </svg>
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export default memo(EntityPreview);
