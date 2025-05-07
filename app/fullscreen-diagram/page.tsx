"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import EntityNode from '@/components/diagram/EntityNode';
import RelationshipEdge from '@/components/diagram/RelationshipEdge';

// Define node and edge types outside of the component to prevent recreation on each render
const NODE_TYPES: NodeTypes = {
  entityNode: EntityNode,
};

const EDGE_TYPES: EdgeTypes = {
  relationshipEdge: RelationshipEdge,
};

/**
 * FullscreenDiagram component that displays just the ReactFlow canvas in fullscreen.
 * This is a simplified version of the DiagramView that only shows the diagram itself.
 */
const FullscreenDiagram = () => {
  const searchParams = useSearchParams();
  const dataModelId = searchParams.get('dataModelId');
  const projectId = searchParams.get('projectId');
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load the diagram state from localStorage
  useEffect(() => {
    if (!dataModelId) return;
    
    try {
      // Get the diagram state that was saved by the FullScreenButton
      const savedState = localStorage.getItem(`diagram-state-${dataModelId}`);
      
      if (savedState) {
        const { nodes, edges } = JSON.parse(savedState);
        setNodes(nodes);
        setEdges(edges);
      } else {
        console.error('No saved diagram state found');
      }
    } catch (error) {
      console.error('Error loading diagram state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dataModelId, setNodes, setEdges]);

  // Add a keyboard shortcut to close the window when Escape is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.close();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add a title to the page
  useEffect(() => {
    document.title = 'Diagram Fullscreen View';
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-900 text-white">
        <div className="text-xl">Loading diagram...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
        
        {/* Close button in the top-right corner */}
        <div 
          className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-700"
          onClick={() => window.close()}
        >
          Close Fullscreen (Esc)
        </div>
      </ReactFlow>
    </div>
  );
};

// Wrap the component with ReactFlowProvider
const FullscreenDiagramPage = () => {
  return (
    <ReactFlowProvider>
      <FullscreenDiagram />
    </ReactFlowProvider>
  );
};

export default FullscreenDiagramPage;
