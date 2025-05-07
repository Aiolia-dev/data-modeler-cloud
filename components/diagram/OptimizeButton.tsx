"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Node, Edge, useReactFlow, Position } from 'reactflow';
import { OptimizationSelectionModal, OptimizationAlgorithm } from './OptimizationSelectionModal';

interface OptimizeButtonProps {
  nodes: Node[];
  edges: Edge[];
  onOptimize: (newNodes: Node[], updatedEdges?: Edge[]) => void;
  isOptimizing: boolean;
}

/**
 * A button component that triggers force-directed layout optimization
 * for the diagram nodes to minimize edge crossings and improve readability.
 */
const OptimizeButton: React.FC<OptimizeButtonProps> = ({ 
  nodes, 
  edges, 
  onOptimize,
  isOptimizing
}) => {
  const { fitView } = useReactFlow();
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);

  const handleOptimize = () => {
    if (isOptimizing || nodes.length === 0) return;
    
    // Show the optimization selection modal instead of immediately optimizing
    setShowOptimizationModal(true);
  };
  
  const handleSelectAlgorithm = (algorithm: OptimizationAlgorithm) => {
    if (isOptimizing || nodes.length === 0) return;
    
    // Create a copy of the nodes to work with
    const nodesCopy = JSON.parse(JSON.stringify(nodes));
    
    let optimizedNodes: Node[];
    let updatedEdges: Edge[];
    
    // Apply the selected optimization algorithm
    switch (algorithm) {
      case 'sugiyama':
        // Start the Sugiyama hierarchical layout algorithm
        optimizedNodes = applySugiyamaLayout(nodesCopy, edges);
        // Determine optimal anchor points for edges based on new node positions
        updatedEdges = determineOptimalAnchorPoints(optimizedNodes, edges);
        break;
        
      case 'referential':
        // Apply the referential cluster algorithm
        console.log('Applying referential cluster optimization');
        optimizedNodes = applyReferentialClusterLayout(nodesCopy, edges);
        updatedEdges = determineOptimalAnchorPoints(optimizedNodes, edges);
        break;
        
      case 'option3':
        // Placeholder for option 3 algorithm
        console.log('Option 3 optimization selected - implementation pending');
        // For now, use Sugiyama as fallback
        optimizedNodes = applySugiyamaLayout(nodesCopy, edges);
        updatedEdges = determineOptimalAnchorPoints(optimizedNodes, edges);
        break;
        
      default:
        optimizedNodes = applySugiyamaLayout(nodesCopy, edges);
        updatedEdges = determineOptimalAnchorPoints(optimizedNodes, edges);
    }
    
    // Update the nodes with the new positions and edge anchor points
    onOptimize(optimizedNodes, updatedEdges);
    
    // Fit the view to show all nodes
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 50);
  };

  /**
   * Hierarchical layout algorithm implementation based on Sugiyama method
   * This algorithm arranges nodes in layers to emphasize hierarchical relationships:
   * 1. Assign nodes to layers (vertical positioning)
   * 2. Minimize edge crossings by reordering nodes within layers
   * 3. Assign horizontal positions to nodes
   * 4. Route edges and determine optimal anchor points
   */
  const applySugiyamaLayout = (nodes: Node[], edges: Edge[]): Node[] => {
    if (nodes.length === 0) return nodes;
    
    // Constants for the Sugiyama algorithm
    const HORIZONTAL_SPACING = 400; // Horizontal spacing between nodes in the same layer
    const VERTICAL_SPACING = 350;   // Vertical spacing between layers
    const NODE_WIDTH = 300;         // Default node width
    const NODE_HEIGHT = 200;        // Default node height
    
    // Step 1: Create a directed graph representation
    const graph = createDirectedGraph(nodes, edges);
    
    // Step 2: Cycle removal - convert the graph to a directed acyclic graph (DAG)
    // In this implementation, we'll keep the original edges but reverse some for layout purposes
    const dag = removeCycles(graph);
    
    // Step 3: Layer assignment - assign each node to a layer
    const layers = assignLayers(dag);
    
    // Step 4: Crossing reduction - reorder nodes within layers to minimize edge crossings
    const orderedLayers = reduceCrossings(layers, dag);
    
    // Step 5: Horizontal coordinate assignment
    const positionedNodes = assignCoordinates(orderedLayers, HORIZONTAL_SPACING, VERTICAL_SPACING);
    
    // Step 6: Update node positions in the original nodes array
    nodes.forEach(node => {
      const positionedNode = positionedNodes.find(n => n.id === node.id);
      if (positionedNode) {
        node.position = positionedNode.position;
      }
    });
    
    return nodes;
  };
  
  /**
   * Creates a directed graph representation from nodes and edges
   */
  const createDirectedGraph = (nodes: Node[], edges: Edge[]) => {
    const graph: Record<string, { outgoing: string[], incoming: string[] }> = {};
    
    // Initialize graph with all nodes
    nodes.forEach(node => {
      graph[node.id] = { outgoing: [], incoming: [] };
    });
    
    // Add edges to the graph
    edges.forEach(edge => {
      if (graph[edge.source]) {
        graph[edge.source].outgoing.push(edge.target);
      }
      if (graph[edge.target]) {
        graph[edge.target].incoming.push(edge.source);
      }
    });
    
    return graph;
  };
  
  /**
   * Removes cycles from the graph to create a directed acyclic graph (DAG)
   * This is a simplified implementation that doesn't actually remove edges,
   * but identifies a set of edges that could be reversed to make the graph acyclic
   */
  const removeCycles = (graph: Record<string, { outgoing: string[], incoming: string[] }>) => {
    // For simplicity, we'll use a heuristic approach:
    // Nodes with more outgoing than incoming edges are placed higher in the hierarchy
    const nodeIds = Object.keys(graph);
    
    // Create a copy of the graph that we can modify
    const dag = JSON.parse(JSON.stringify(graph));
    
    // Find and mark edges that create cycles
    const visited = new Set<string>();
    const temp = new Set<string>();
    const reversedEdges = new Set<string>();
    
    // DFS to detect cycles
    const dfs = (nodeId: string) => {
      if (temp.has(nodeId)) {
        // We found a cycle
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }
      
      temp.add(nodeId);
      
      for (const targetId of graph[nodeId].outgoing) {
        // If this edge creates a cycle, mark it for reversal
        if (dfs(targetId)) {
          reversedEdges.add(`${nodeId}-${targetId}`);
          return true;
        }
      }
      
      temp.delete(nodeId);
      visited.add(nodeId);
      return false;
    };
    
    // Run DFS from each unvisited node
    nodeIds.forEach(nodeId => {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    });
    
    // For our layout purposes, we don't actually reverse the edges,
    // but we could use this information for more sophisticated layouts
    
    return dag;
  };
  
  /**
   * Assigns nodes to layers based on their position in the hierarchy
   */
  const assignLayers = (graph: Record<string, { outgoing: string[], incoming: string[] }>) => {
    const nodeIds = Object.keys(graph);
    const layerMap: Record<string, number> = {};
    const maxIterations = nodeIds.length * 2; // Prevent infinite loops
    
    // Initialize all nodes to layer 0
    nodeIds.forEach(nodeId => {
      layerMap[nodeId] = 0;
    });
    
    // Assign layers based on longest path from any source node
    let changed = true;
    let iteration = 0;
    
    while (changed && iteration < maxIterations) {
      changed = false;
      iteration++;
      
      nodeIds.forEach(nodeId => {
        const node = graph[nodeId];
        
        // For each incoming edge, check if we need to update this node's layer
        node.incoming.forEach(sourceId => {
          const newLayer = layerMap[sourceId] + 1;
          if (newLayer > layerMap[nodeId]) {
            layerMap[nodeId] = newLayer;
            changed = true;
          }
        });
      });
    }
    
    // Group nodes by layer
    const layers: string[][] = [];
    
    nodeIds.forEach(nodeId => {
      const layer = layerMap[nodeId];
      if (!layers[layer]) {
        layers[layer] = [];
      }
      layers[layer].push(nodeId);
    });
    
    // Remove empty layers
    return layers.filter(layer => layer && layer.length > 0);
  };
  
  /**
   * Reduces edge crossings by reordering nodes within each layer
   */
  const reduceCrossings = (
    layers: string[][], 
    graph: Record<string, { outgoing: string[], incoming: string[] }>
  ) => {
    if (layers.length <= 1) return layers;
    
    const orderedLayers = [...layers];
    const maxIterations = 24; // Limit iterations for performance
    
    // Barycenter heuristic: position each node at the average of its neighbors' positions
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let improved = false;
      
      // Process layers from top to bottom, then bottom to top
      const direction = iteration % 2 === 0 ? 1 : -1;
      const startLayer = direction === 1 ? 1 : layers.length - 2;
      const endLayer = direction === 1 ? layers.length : -1;
      
      for (let i = startLayer; direction === 1 ? i < endLayer : i > endLayer; i += direction) {
        const currentLayer = orderedLayers[i];
        const fixedLayer = direction === 1 ? orderedLayers[i - 1] : orderedLayers[i + 1];
        
        // Calculate barycenter values for each node in the current layer
        const barycenters: Record<string, number> = {};
        
        currentLayer.forEach(nodeId => {
          const neighbors = direction === 1 ? graph[nodeId].incoming : graph[nodeId].outgoing;
          if (neighbors.length === 0) {
            barycenters[nodeId] = currentLayer.length / 2; // Place in the middle if no neighbors
          } else {
            let sum = 0;
            let count = 0;
            
            neighbors.forEach(neighborId => {
              const index = fixedLayer.indexOf(neighborId);
              if (index !== -1) {
                sum += index;
                count++;
              }
            });
            
            barycenters[nodeId] = count > 0 ? sum / count : currentLayer.length / 2;
          }
        });
        
        // Sort the current layer based on barycenter values
        currentLayer.sort((a, b) => barycenters[a] - barycenters[b]);
      }
    }
    
    return orderedLayers;
  };
  
  /**
   * Assigns x and y coordinates to nodes based on their layer and position within the layer
   */
  const assignCoordinates = (
    layers: string[][], 
    horizontalSpacing: number, 
    verticalSpacing: number
  ) => {
    const positionedNodes: { id: string, position: { x: number, y: number } }[] = [];
    
    // Calculate the maximum number of nodes in any layer to center all layers
    const maxNodesInLayer = Math.max(...layers.map(layer => layer.length));
    
    // Position nodes layer by layer
    layers.forEach((layer, layerIndex) => {
      const y = layerIndex * verticalSpacing;
      
      // Center the nodes in this layer
      const layerWidth = (layer.length - 1) * horizontalSpacing;
      const startX = (maxNodesInLayer - layer.length) * horizontalSpacing / 2;
      
      layer.forEach((nodeId, nodeIndex) => {
        const x = startX + nodeIndex * horizontalSpacing;
        positionedNodes.push({
          id: nodeId,
          position: { x, y }
        });
      });
    });
    
    return positionedNodes;
  };
  
  /**
   * Determines the optimal anchor points for edges based on the relative positions of nodes
   */
  const determineOptimalAnchorPoints = (nodes: Node[], edges: Edge[]) => {
    return edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return edge;
      
      const sourceWidth = sourceNode.width || 300;
      const sourceHeight = sourceNode.height || 200;
      const targetWidth = targetNode.width || 300;
      const targetHeight = targetNode.height || 200;
      
      // Calculate centers
      const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
      const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
      const targetCenterX = targetNode.position.x + targetWidth / 2;
      const targetCenterY = targetNode.position.y + targetHeight / 2;
      
      // Determine the best anchor points based on relative positions
      let sourcePosition: Position;
      let targetPosition: Position;
      
      // Calculate horizontal and vertical differences
      const dx = targetCenterX - sourceCenterX;
      const dy = targetCenterY - sourceCenterY;
      
      // Determine if the connection is primarily horizontal or vertical
      if (Math.abs(dx) > Math.abs(dy)) {
        // Primarily horizontal connection
        sourcePosition = dx > 0 ? Position.Right : Position.Left;
        targetPosition = dx > 0 ? Position.Left : Position.Right;
      } else {
        // Primarily vertical connection
        sourcePosition = dy > 0 ? Position.Bottom : Position.Top;
        targetPosition = dy > 0 ? Position.Top : Position.Bottom;
      }
      
      return {
        ...edge,
        sourceHandle: sourcePosition,
        targetHandle: targetPosition,
      };
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOptimize}
        disabled={isOptimizing || nodes.length === 0}
        className="flex items-center gap-1"
        title="Optimize diagram layout"
      >
        <RefreshCw className={`h-4 w-4 ${isOptimizing ? 'animate-spin' : ''}`} />
        <span>Optimize</span>
      </Button>
      
      <OptimizationSelectionModal
        open={showOptimizationModal}
        onOpenChange={setShowOptimizationModal}
        onSelectAlgorithm={handleSelectAlgorithm}
      />
    </>
  );
};

/**
 * Organizes entities by their referential assignments, creating visually distinct clusters
 * This algorithm groups entities that belong to the same referential close to each other
 * and separates different referential clusters with sufficient spacing.
 */
const applyReferentialClusterLayout = (nodes: Node[], edges: Edge[]): Node[] => {
  if (nodes.length === 0) return nodes;
  
  // Constants for the referential cluster layout
  const CLUSTER_SPACING = 800;      // Spacing between different referential clusters
  const ENTITY_SPACING = 300;       // Spacing between entities in the same cluster
  const CLUSTER_RADIUS_FACTOR = 1.5; // Factor to determine cluster radius based on entity count
  
  // Step 1: Group entities by referential ID
  const referentialGroups: Record<string, Node[]> = {};
  
  // Initialize with a default group for entities without a referential
  referentialGroups['none'] = [];
  
  // Group nodes by their referential ID
  nodes.forEach(node => {
    const referentialId = node.data?.referential_id || 'none';
    if (!referentialGroups[referentialId]) {
      referentialGroups[referentialId] = [];
    }
    referentialGroups[referentialId].push(node);
  });
  
  // Step 2: Calculate positions for each referential cluster
  const referentialIds = Object.keys(referentialGroups);
  const clusterCount = referentialIds.length;
  
  // Arrange clusters in a grid layout
  const gridSize = Math.ceil(Math.sqrt(clusterCount));
  
  // Step 3: Position each entity within its cluster
  referentialIds.forEach((referentialId, clusterIndex) => {
    const clusterNodes = referentialGroups[referentialId];
    if (clusterNodes.length === 0) return;
    
    // Calculate cluster center position based on grid layout
    const row = Math.floor(clusterIndex / gridSize);
    const col = clusterIndex % gridSize;
    
    const clusterCenterX = col * CLUSTER_SPACING;
    const clusterCenterY = row * CLUSTER_SPACING;
    
    // Determine the layout for entities within the cluster
    if (clusterNodes.length === 1) {
      // Single entity - place at cluster center
      clusterNodes[0].position = { x: clusterCenterX, y: clusterCenterY };
    } else if (clusterNodes.length <= 8) {
      // Small cluster - arrange in a circle around the center
      const radius = ENTITY_SPACING * CLUSTER_RADIUS_FACTOR;
      clusterNodes.forEach((node, i) => {
        const angle = (i / clusterNodes.length) * 2 * Math.PI;
        const x = clusterCenterX + radius * Math.cos(angle);
        const y = clusterCenterY + radius * Math.sin(angle);
        node.position = { x, y };
      });
    } else {
      // Larger cluster - arrange in a grid within the cluster
      const innerGridSize = Math.ceil(Math.sqrt(clusterNodes.length));
      clusterNodes.forEach((node, i) => {
        const innerRow = Math.floor(i / innerGridSize);
        const innerCol = i % innerGridSize;
        
        const x = clusterCenterX + (innerCol - innerGridSize / 2) * ENTITY_SPACING;
        const y = clusterCenterY + (innerRow - innerGridSize / 2) * ENTITY_SPACING;
        node.position = { x, y };
      });
    }
  });
  
  // Step 4: Optimize connections between clusters
  // Find edges that connect entities from different referential groups
  const interClusterEdges = edges.filter(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return false;
    
    const sourceRefId = sourceNode.data?.referential_id || 'none';
    const targetRefId = targetNode.data?.referential_id || 'none';
    
    return sourceRefId !== targetRefId;
  });
  
  // Adjust positions to minimize edge crossings between clusters
  // This is a simplified approach - for complex graphs, more sophisticated algorithms would be needed
  interClusterEdges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;
    
    // Move connected entities slightly toward each other to reduce edge length
    // but maintain cluster integrity by limiting the movement
    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only adjust if distance is large
    if (distance > CLUSTER_SPACING / 2) {
      const moveRatio = 0.1; // Move 10% toward the other entity
      
      // Move source node slightly toward target
      sourceNode.position.x += dx * moveRatio;
      sourceNode.position.y += dy * moveRatio;
      
      // Move target node slightly toward source
      targetNode.position.x -= dx * moveRatio;
      targetNode.position.y -= dy * moveRatio;
    }
  });
  
  return nodes;
};

export default OptimizeButton;