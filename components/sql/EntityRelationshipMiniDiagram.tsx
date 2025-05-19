"use client";

import React, { useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { EntityWithAttributes } from './SqlGenerator';

// Simplified versions of the diagram components for the mini-diagram
const MiniEntityNode = ({ data }: any) => {
  return (
    <div className={`px-3 py-2 rounded-md shadow-lg ${data.isPrimaryEntity 
      ? 'bg-blue-900 border-2 border-blue-500' 
      : 'bg-gray-800 border border-gray-600'}`}
    >
      <div className={`font-medium text-sm truncate max-w-[150px] ${data.isPrimaryEntity ? 'text-white' : 'text-gray-200'}`}>
        {data.name}
      </div>
      {data.isPrimaryEntity && (
        <div className="text-xs text-blue-300 mt-1 flex items-center">
          <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
          Primary Entity
        </div>
      )}
    </div>
  );
};

const MiniRelationshipEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: any) => {
  // Calculate the path
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const path = `M${sourceX},${sourceY} C${sourceX + dx / 2},${sourceY} ${targetX - dx / 2},${targetY} ${targetX},${targetY}`;

  return (
    <>
      {/* Path shadow for better visibility */}
      <path
        id={`${id}-shadow`}
        className="react-flow__edge-path"
        d={path}
        strokeWidth={4}
        stroke="rgba(0,0,0,0.5)"
        fill="none"
      />
      {/* Main path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        strokeWidth={2.5}
        stroke="#60a5fa" // Blue color for better visibility
        fill="none"
      />
      {/* Cardinality badges with better visibility */}
      {data?.sourceCardinality && (
        <g transform={`translate(${sourceX + dx * 0.15}, ${sourceY + dy * 0.15 - 10})`}>
          <rect
            x="-12"
            y="-8"
            width="24"
            height="16"
            rx="4"
            fill="#1e293b"
            stroke="#3b82f6"
            strokeWidth="1"
          />
          <text
            x="0"
            y="2"
            className="text-[9px] fill-white font-medium"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {data.sourceCardinality}
          </text>
        </g>
      )}
      {data?.targetCardinality && (
        <g transform={`translate(${sourceX + dx * 0.85}, ${sourceY + dy * 0.85 - 10})`}>
          <rect
            x="-12"
            y="-8"
            width="24"
            height="16"
            rx="4"
            fill="#1e293b"
            stroke="#3b82f6"
            strokeWidth="1"
          />
          <text
            x="0"
            y="2"
            className="text-[9px] fill-white font-medium"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {data.targetCardinality}
          </text>
        </g>
      )}
    </>
  );
};

const NODE_TYPES: NodeTypes = {
  entityNode: MiniEntityNode,
};

const EDGE_TYPES: EdgeTypes = {
  relationshipEdge: MiniRelationshipEdge,
};

interface EntityRelationshipMiniDiagramProps {
  entity: EntityWithAttributes;
  allEntities: EntityWithAttributes[];
  relationships: any[];
}

const EntityRelationshipMiniDiagram: React.FC<EntityRelationshipMiniDiagramProps> = ({
  entity,
  allEntities,
  relationships,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entity || !allEntities || !relationships) return;

    // Find relationships involving this entity
    const entityRelationships = relationships.filter(
      (rel) => rel.source_entity_id === entity.id || rel.target_entity_id === entity.id
    );

    // Create nodes for the primary entity and related entities
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const relatedEntityIds = new Set<string>();

    // Add related entities to the set
    entityRelationships.forEach((rel) => {
      if (rel.source_entity_id === entity.id) {
        relatedEntityIds.add(rel.target_entity_id);
      } else {
        relatedEntityIds.add(rel.source_entity_id);
      }
    });

    // Add the primary entity node
    newNodes.push({
      id: entity.id,
      type: 'entityNode',
      position: { x: 150, y: 100 },
      data: {
        name: entity.name,
        isPrimaryEntity: true,
      },
    });

    // Add related entity nodes in a circular arrangement
    const relatedEntitiesArray = Array.from(relatedEntityIds);
    const radius = 120;
    const angleStep = (2 * Math.PI) / relatedEntitiesArray.length;

    relatedEntitiesArray.forEach((relatedEntityId, index) => {
      const relatedEntity = allEntities.find((e) => e.id === relatedEntityId);
      if (!relatedEntity) return;

      const angle = index * angleStep;
      const x = 150 + radius * Math.cos(angle);
      const y = 100 + radius * Math.sin(angle);

      newNodes.push({
        id: relatedEntityId,
        type: 'entityNode',
        position: { x, y },
        data: {
          name: relatedEntity.name,
          isPrimaryEntity: false,
        },
      });
    });

    // Add edges for relationships
    entityRelationships.forEach((rel) => {
      const sourcePosition = rel.source_entity_id === entity.id ? Position.Right : Position.Left;
      const targetPosition = rel.target_entity_id === entity.id ? Position.Left : Position.Right;

      newEdges.push({
        id: `edge-${rel.id}`,
        source: rel.source_entity_id,
        target: rel.target_entity_id,
        type: 'relationshipEdge',
        sourceHandle: null,
        targetHandle: null,
        // @ts-ignore - sourcePosition and targetPosition are valid props but TypeScript doesn't recognize them
        sourcePosition,
        targetPosition,
        data: {
          sourceCardinality: rel.source_cardinality || '0..N',
          targetCardinality: rel.target_cardinality || '1..1',
        },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [entity, allEntities, relationships, setNodes, setEdges]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full rounded-md overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
        // @ts-ignore - defaultZoom is a valid prop but TypeScript doesn't recognize it
        defaultZoom={0.8}
        attributionPosition="bottom-right"
      >
        <Background color="#2a2a3c" gap={16} />
      </ReactFlow>
    </div>
  );
};

// Wrap with ReactFlowProvider to use outside of a React Flow context
const EntityRelationshipMiniDiagramWithProvider: React.FC<EntityRelationshipMiniDiagramProps> = (props) => (
  <ReactFlowProvider>
    <EntityRelationshipMiniDiagram {...props} />
  </ReactFlowProvider>
);

export default EntityRelationshipMiniDiagramWithProvider;
