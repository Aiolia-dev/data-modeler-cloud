"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  ConnectionLineType,
  ReactFlowProvider,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import EntityNode from './EntityNode';
import RelationshipEdge from './RelationshipEdge';
import CircularContextMenu from './CircularContextMenu';
import { DiagramSearch } from './DiagramSearch';
import { Button } from '@/components/ui/button';
import { BoxSelect, CrosshairIcon, Edit, Eye, EyeOff, Link, MessageSquare, Plus, PlusCircle, RefreshCw, Settings, Share2, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { usePermissions } from '@/context/permission-context';
import { useViewerCheck } from '@/hooks/use-viewer-check';
import { CommentModal } from './CommentModal';
import { CommentData } from './CommentTypes';
import { CommentNode, Comment, commentsToNodes } from './CommentMarker';
import { CommentViewModal } from './CommentViewModal';
import { EntityModal, EntityFormData } from '@/components/entity/entity-modal';
import { ReferentialSelectionModal } from './ReferentialSelectionModal';
import { ReferentialLegend } from './ReferentialLegend';
import OptimizeButton from './OptimizeButton';
import FullScreenButton from './FullScreenButton';
import { SettingsModal } from '@/components/settings/settings-modal';

// Define node and edge types outside of the component to prevent recreation on each render
// These must be defined outside and remain constant
const NODE_TYPES: NodeTypes = {
  entityNode: EntityNode,
  commentNode: CommentNode,
};

const EDGE_TYPES: EdgeTypes = {
  relationshipEdge: RelationshipEdge,
};

// Log the node types for debugging
console.log('NODE_TYPES defined outside component:', Object.keys(NODE_TYPES));

interface DiagramViewProps {
  dataModelId: string;
  projectId: string;
  selectedEntityId?: string;
}

// Inner component that uses React Flow hooks
const DiagramContent: React.FC<DiagramViewProps> = ({ dataModelId, projectId, selectedEntityId: initialSelectedEntityId }) => {
  // Get the Next.js router for navigation
  const router = useRouter();
  // Local state for selected entity ID
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(initialSelectedEntityId);
  
  // State for comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [entities, setEntities] = useState<any[]>([]);
  const [authLoaded, setAuthLoaded] = useState<boolean>(false);
  
  // State for entity creation modal
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [preSelectedEntityIds, setPreSelectedEntityIds] = useState<string[]>([]);
  
  // State for referential selection modal
  const [showReferentialModal, setShowReferentialModal] = useState(false);
  const [showEntitiesWithoutReferential, setShowEntitiesWithoutReferential] = useState(true); // Default to true/checked
  const [referentials, setReferentials] = useState<Array<{
    id: string;
    name: string;
    isSelected: boolean;
    entityCount?: number; // Count of entities in this referential
  }>>([]);
  const [entitiesWithoutReferentialCount, setEntitiesWithoutReferentialCount] = useState(0);
  
  // Update local state when prop changes
  useEffect(() => {
    setSelectedEntityId(initialSelectedEntityId);
  }, [initialSelectedEntityId]);
  
  // Listen for the custom focus-entity event
  useEffect(() => {
    const handleFocusEntity = (event: CustomEvent) => {
      const { entityId } = event.detail;
      console.log('[DiagramView] Received focus-entity event for entity:', entityId);
      
      // Set the selected entity ID
      setSelectedEntityId(entityId);
      
      // Reset the centering flag to ensure the entity gets centered
      setHasCenteredOnEntity(false);
    };
    
    // Add event listener for the custom event
    window.addEventListener('focus-entity', handleFocusEntity as EventListener);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('focus-entity', handleFocusEntity as EventListener);
    };
  }, []);
  // Get the React Flow utility functions for coordinate transformation
  const { screenToFlowPosition } = useReactFlow();
  
  // Map to store referential colors by ID
  const [referentialColors, setReferentialColors] = useState<Record<string, string>>({});

  // Fetch referentials from the API
  const fetchReferentials = async () => {
    try {
      console.log('Fetching referentials for data model:', dataModelId);
      const response = await fetch(`/api/referentials?dataModelId=${dataModelId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Referentials fetched:', data.referentials?.length || 0);
        
        // Create a map of referential IDs to colors
        const colorMap: Record<string, string> = {};
        if (data.referentials && Array.isArray(data.referentials)) {
          data.referentials.forEach((ref: any) => {
            if (ref.id && ref.color) {
              colorMap[ref.id] = ref.color;
            }
          });
        }
        setReferentialColors(colorMap);
        console.log('Referential colors map created:', Object.keys(colorMap).length, 'colors');
        
        if (data.referentials && Array.isArray(data.referentials)) {
          // Map the API response to our component's state format
          // Initially mark all referentials as selected
          const mappedReferentials = data.referentials.map((ref: { id: string; name: string; color?: string }) => {
            // Calculate entity counts for each referential
            const entityCount = Object.values(entityReferentialMap).filter(refId => refId === ref.id).length;
            
            return {
              id: ref.id,
              name: ref.name,
              isSelected: true, // Default to selected
              color: ref.color || '#6366F1', // Use the color from DB or default
              entityCount: entityCount // Add the entity count
            };
          });
          
          console.log('Referentials with entity counts:', mappedReferentials);
          setReferentials(mappedReferentials);
        } else {
          console.warn('No referentials found or invalid response format');
          setReferentials([]);
        }
      } else {
        const errorData = await response.text();
        console.error('Error fetching referentials:', response.status, errorData);
      }
    } catch (error) {
      console.error('Exception fetching referentials:', error);
    }
  };
  
  // Fetch referentials when component mounts
  useEffect(() => {
    fetchReferentials();
  }, [dataModelId]);
  // --- Contextual menu state for right-click on empty canvas ---
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [contextMenuPos, setContextMenuPos] = React.useState<{ x: number; y: number } | null>(null);

  // --- Contextual menu state for right-click on selected entities ---
  const [selectionContextMenuOpen, setSelectionContextMenuOpen] = React.useState(false);
  const [selectionContextMenuPos, setSelectionContextMenuPos] = React.useState<{ x: number; y: number } | null>(null);

  // --- Contextual menu state for right-click on a single node ---
  const [nodeContextMenuOpen, setNodeContextMenuOpen] = React.useState(false);
  const [nodeContextMenuOptionsState, setNodeContextMenuOptionsState] = React.useState<any[]>([]);

  // --- Hidden entities state ---
  const [hiddenEntityIds, setHiddenEntityIds] = useState<string[]>([]);
  // Track which entities belong to which referentials
  const [entityReferentialMap, setEntityReferentialMap] = useState<Record<string, string>>({});

  // Helper to determine if right-click is on empty canvas (not on a node)
  // This will be replaced by handleBackgroundContextMenu
  const handlePaneContextMenu = React.useCallback((event: React.MouseEvent) => {
    // This function is no longer used directly
    // See handleBackgroundContextMenu instead
  }, []);
  


  // Options for the circular menu
  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        console.log('Fetching user authentication info...');
        
        // For now, we'll use a hardcoded email since we're having auth issues
        // This is a temporary solution until the auth issues are resolved
        const hardcodedEmail = 'cedric.kerbidi@gmail.com';
        const hardcodedUserId = '12345678-1234-1234-1234-123456789012';
        
        // Set the hardcoded values
        setUserEmail(hardcodedEmail);
        setUserId(hardcodedUserId);
        
        console.log('Using hardcoded user email:', hardcodedEmail);
        console.log('Using hardcoded user ID:', hardcodedUserId);
        
        // Also try the API call for debugging purposes
        const response = await fetch('/api/auth/me');
        console.log('Auth API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('User auth data received from API:', data);
          // Note: We're not using this data, just logging it for debugging
        } else {
          console.error('Failed to fetch user info, status:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        // Mark auth as loaded even if it failed
        setAuthLoaded(true);
      }
    };
    
    fetchUserInfo();
  }, []);

  // State for comment view/edit modal
  const [showCommentViewModal, setShowCommentViewModal] = useState(false);
  
  // Handler for clicking on a comment marker - defined early so it can be used in the useEffect below
  const handleCommentClick = useCallback((comment: Comment) => {
    setSelectedComment(comment);
    setShowCommentViewModal(true);
    console.log('Comment clicked:', comment);
  }, []);

  // Function to fetch comments for this data model
  const fetchComments = useCallback(async () => {
    if (!dataModelId) {
      console.warn('Cannot fetch comments: dataModelId is missing');
      return;
    }
    
    console.log('Fetching comments for data model:', dataModelId);
    
    try {
      // Include user email in headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add user email to headers if available
      if (userEmail) {
        headers['x-user-email'] = userEmail;
      }
      
      console.log('Fetching comments with headers:', headers);
      
      const response = await fetch(`/api/comments?dataModelId=${dataModelId}`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Comments fetched successfully:', data.comments?.length || 0);
        console.log('Comment data:', JSON.stringify(data.comments, null, 2));
        
        // Process the comments immediately
        const fetchedComments = data.comments || [];
        
        // Set the comments in state - this will trigger the useEffect that adds them to nodes
        setComments(fetchedComments);
      } else {
        console.error('Failed to fetch comments, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [dataModelId, userEmail]);
  
  // Fetch comments when component mounts or when dependencies change
  useEffect(() => {
    console.log('Fetching comments on mount or dependency change');
    
    // Immediate fetch on mount
    fetchComments();
    
    // Set up an interval to periodically refresh comments (every 30 seconds)
    const intervalId = setInterval(() => {
      console.log('Refreshing comments (interval)');
      fetchComments();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchComments, dataModelId]);
  
  // Prioritize loading comments on initial render
  useEffect(() => {
    // This effect runs only once on component mount
    if (dataModelId) {
      console.log('🚀 Priority loading comments for faster initial display');
      
      // Directly fetch comments without going through the fetchComments function
      // to avoid any potential delays from other operations
      const quickFetchComments = async () => {
        try {
          const response = await fetch(`/api/comments?dataModelId=${dataModelId}`, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('🚀 Quick-loaded comments:', data.comments?.length || 0);
            
            if (data.comments && data.comments.length > 0) {
              // Directly set comments in state
              setComments(data.comments);
            }
          }
        } catch (error) {
          console.error('Error in priority comment loading:', error);
        }
      };
      
      // Execute the quick fetch
      quickFetchComments();
    }
  }, [dataModelId]);
  
  // These are now defined earlier in the component

  // Handler for editing a comment
  const handleEditComment = async (commentId: string, newContent: string) => {
    try {
      console.log('Editing comment:', commentId, newContent);
      
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'x-user-email': userEmail } : {})
        },
        body: JSON.stringify({ content: newContent })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit comment');
      }
      
      // Refresh comments to get the updated data
      await fetchComments();
      
      // Close the modal if it was successful
      setShowCommentViewModal(false);
    } catch (error) {
      console.error('Error editing comment:', error);
      throw error;
    }
  };

  // Handler for deleting a comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      console.log('Deleting comment:', commentId);
      
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          ...(userEmail ? { 'x-user-email': userEmail } : {})
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete comment');
      }
      
      // Refresh comments to get the updated data
      await fetchComments();
      
      // Close the modal if it was successful
      setShowCommentViewModal(false);
      setSelectedComment(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  };

  // Convert comments to React Flow nodes whenever comments change
  useEffect(() => {
    console.log('Comments state changed, current count:', comments.length);
    
    // Log the current comments for debugging
    if (comments.length > 0) {
      console.log('Current comments in state:', 
        comments.map(c => ({ id: c.id, content: c.content.substring(0, 20), position: { x: c.position_x, y: c.position_y } }))
      );
      
      // Force comment nodes to be added to the diagram
      const commentNodes = commentsToNodes(comments, userEmail, handleCommentClick);
      console.log('Created comment nodes for immediate display:', commentNodes.length);
      
      // Use requestAnimationFrame to ensure this runs in the next frame for better performance
      requestAnimationFrame(() => {
        // Add comment nodes to the existing nodes
        setNodes(nodes => {
          // Remove any existing comment nodes
          const filteredNodes = nodes.filter(node => !node.id.startsWith('comment-'));
          // Add the new comment nodes
          return [...filteredNodes, ...commentNodes];
        });
      });
    }
  }, [comments, userEmail, handleCommentClick]);
  
  // Get entities for the data model
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch(`/api/entities?dataModelId=${dataModelId}`);
        if (response.ok) {
          const data = await response.json();
          setEntities(data.entities || []);
          
          // Build a map of entity ID to referential ID
          const refMap: Record<string, string> = {};
          if (data.entities && Array.isArray(data.entities)) {
            data.entities.forEach((entity: any) => {
              if (entity.id && entity.referential_id) {
                refMap[entity.id] = entity.referential_id;
              }
            });
          }
          setEntityReferentialMap(refMap);
          
          // Calculate entity counts for each referential
          const refCounts: Record<string, number> = {};
          let noRefCount = 0;
          
          data.entities.forEach((entity: any) => {
            if (entity.referential_id) {
              refCounts[entity.referential_id] = (refCounts[entity.referential_id] || 0) + 1;
            } else {
              noRefCount++;
            }
          });
          
          // Update referentials with entity counts
          setReferentials(prev => prev.map(ref => ({
            ...ref,
            entityCount: refCounts[ref.id] || 0
          })));
          
          // Update count of entities without referential
          setEntitiesWithoutReferentialCount(noRefCount);
          
          console.log('Entity to referential map built:', Object.keys(refMap).length, 'entities mapped');
        }
      } catch (error) {
        console.error('Error fetching entities:', error);
      }
    };
    
    if (dataModelId) {
      fetchEntities();
    }
  }, [dataModelId]);
  
  // Handler for creating a new entity from context menu
  const handleCreateEntity = async () => {
    if (!dataModelId || !projectId || !contextMenuPos) return;
    try {
      // Get canvas coordinates (convert from clientX/clientY to diagram coordinates)
      let x = 100, y = 100;
      if (contextMenuPos && screenToFlowPosition) {
        // Convert screen (client) coordinates to diagram coordinates
        // screenToFlowPosition accounts for pan and zoom level
        const diagramCoords = screenToFlowPosition({
          x: contextMenuPos.x,
          y: contextMenuPos.y
        });
        x = diagramCoords.x;
        y = diagramCoords.y;
        console.log('Creating entity at position:', { screen: contextMenuPos, flow: diagramCoords });
      }
      // Default entity values
      const entity = {
        data_model_id: dataModelId, // snake_case for API compatibility
        name: 'Untitled_entity',
        description: '',
        position_x: x,
        position_y: y,
        entity_type: 'standard',
        join_entities: [],
      };

      // POST to API (or call createEntity utility via API route)
      const response = await fetch(`/api/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entity),
      });
      if (!response.ok) throw new Error('Failed to create entity');
      // Optionally get the new entity's ID
      const newEntity = await response.json();
      // Refresh diagram
      fetchDataModel();
    } catch (err) {
      console.error('Error creating entity:', err);
      setError('Failed to create entity');
    }
  };

  // Handler for adding a comment
  const handleAddComment = () => {
    if (!contextMenuPos) return;
    setShowCommentModal(true);
  };

  // Handler for saving a comment
  const handleSaveComment = async (commentData: CommentData) => {
    try {
      console.log('Saving comment with auth state:');
      console.log('- User email:', userEmail);
      console.log('- User ID:', userId);
      
      // Prepare comment data for API
      const comment = {
        content: commentData.content,
        data_model_id: dataModelId,
        // Include user authentication information
        user_email: userEmail,
        user_id: userId,
      };

      // Add the appropriate fields based on comment type
      if (commentData.commentType === 'free' && commentData.position) {
        // For free-floating comments, use the context menu position
        if (contextMenuPos) {
          // Convert screen coordinates to flow coordinates
          if (screenToFlowPosition) {
            const flowPosition = screenToFlowPosition({
              x: contextMenuPos.x,
              y: contextMenuPos.y
            });
            
            console.log('Converting position from', contextMenuPos, 'to', flowPosition);
            
            Object.assign(comment, {
              position_x: flowPosition.x,
              position_y: flowPosition.y,
            });
          } else {
            // Fallback if screenToFlowPosition is not available
            Object.assign(comment, {
              position_x: contextMenuPos.x,
              position_y: contextMenuPos.y,
            });
          }
        }
      } else if (commentData.commentType === 'entity' && commentData.entityId) {
        Object.assign(comment, {
          entity_id: commentData.entityId,
        });
      }

      console.log('Sending comment data to API:', comment);

      // Save comment to database
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add user email to headers if available
      if (userEmail) {
        headers['x-user-email'] = userEmail;
      }
      
      console.log('Saving comment with headers:', headers);
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers,
        body: JSON.stringify(comment),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', responseData);
        throw new Error(responseData.error || 'Failed to save comment');
      }

      console.log('Comment saved successfully:', responseData);
      
      // Close the modal
      setShowCommentModal(false);
      
      // Refresh the comments list to ensure we have the latest data
      // This will trigger the useEffect that converts comments to nodes
      await fetchComments();
      
      // Give a moment for the comment nodes to be processed
      setTimeout(() => {
        // If we have the new comment's position, center the view on it
        const commentWithPosition = comment as any; // Type assertion to avoid TypeScript errors
        if (commentWithPosition.position_x && commentWithPosition.position_y) {
          // Center the view on the new comment
          fitView({
            duration: 500,
            padding: 0.5
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error saving comment:', error);
      throw error;
    }
  };


  

  
  // Store references to the functions that will be defined later
  const handleCreateJoinEntityRef = useRef<(() => void) | null>(null);
  const handleSaveEntityRef = useRef<((entityData: EntityFormData) => Promise<any>) | null>(null);
  const selectionMenuOptionsRef = useRef<any[]>([]);
  
  // Ref to store viewport during refresh
  const preservedViewport = React.useRef<{ x: number; y: number; zoom: number } | null>(null);
  // Helper function to determine the best anchor positions for an edge
  const determineAnchorPositions = (sourceNode: any, targetNode: any) => {
    // Node dimensions (should match EntityNode rendering)
    const nodeWidth = 300;
    const nodeHeight = 200;
    // Anchor points for both nodes
    const sourceAnchors = [
      { pos: Position.Top, x: sourceNode.position.x + nodeWidth / 2, y: sourceNode.position.y },
      { pos: Position.Right, x: sourceNode.position.x + nodeWidth, y: sourceNode.position.y + nodeHeight / 2 },
      { pos: Position.Bottom, x: sourceNode.position.x + nodeWidth / 2, y: sourceNode.position.y + nodeHeight },
      { pos: Position.Left, x: sourceNode.position.x, y: sourceNode.position.y + nodeHeight / 2 },
    ];
    const targetAnchors = [
      { pos: Position.Top, x: targetNode.position.x + nodeWidth / 2, y: targetNode.position.y },
      { pos: Position.Right, x: targetNode.position.x + nodeWidth, y: targetNode.position.y + nodeHeight / 2 },
      { pos: Position.Bottom, x: targetNode.position.x + nodeWidth / 2, y: targetNode.position.y + nodeHeight },
      { pos: Position.Left, x: targetNode.position.x, y: targetNode.position.y + nodeHeight / 2 },
    ];
    // Find the closest pair
    let minDist = Infinity;
    let bestSource = Position.Right;
    let bestTarget = Position.Left;
    for (const s of sourceAnchors) {
      for (const t of targetAnchors) {
        const dist = Math.hypot(s.x - t.x, s.y - t.y);
        if (dist < minDist) {
          minDist = dist;
          bestSource = s.pos;
          bestTarget = t.pos;
        }
      }
    }
    return { sourcePosition: bestSource, targetPosition: bestTarget };
  };

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Update nodes with referential colors when referentials or nodes change
  useEffect(() => {
    if (Object.keys(referentialColors).length > 0 && nodes.length > 0) {
      console.log('Updating nodes with referential colors');
      setNodes(nodes => nodes.map(node => {
        const refId = node.data?.referential_id;
        const refColor = refId ? referentialColors[refId] : null;
        
        return {
          ...node,
          data: {
            ...node.data,
            referential_color: refColor || '#374151' // Default color if no referential
          }
        };
      }));
    }
  }, [referentialColors, nodes.length, setNodes]);
  
  // Listen for attribute updates from QuickEditAttributeModal
  useEffect(() => {
    const handleAttributeUpdated = (event: CustomEvent<{entityId: string, attributes: any[]}>) => {
      console.log('Attribute updated, updating node:', event.detail);
      const { entityId, attributes } = event.detail;
      
      // Update the node with the new attributes
      setNodes(currentNodes => {
        return currentNodes.map(node => {
          if (node.id === entityId) {
            // Create a new node with updated attributes
            return {
              ...node,
              data: {
                ...node.data,
                attributes: attributes
              }
            };
          }
          return node;
        });
      });
    };
    
    // Add event listener for attribute updates
    document.addEventListener('attribute-updated', handleAttributeUpdated as EventListener);
    
    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('attribute-updated', handleAttributeUpdated as EventListener);
    };
  }, [setNodes]);
  
  // Define node context menu options
  const nodeContextMenuOptions = React.useMemo(() => [
    {
      key: 'edit',
      icon: <Edit size={16} />,
      label: 'Edit Entity',
      onClick: (node: Node) => {
        console.log('Edit entity node:', node);
        // Extract the entity ID from the node
        // In React Flow, the node might have the entity ID stored in data or directly as id
        const entityId = node.data?.id || node.id;
        console.log('Extracted entity ID:', entityId);
        
        // Use the correct parameter name 'selectedEntity' instead of 'entityId'
        // This preserves the authentication context and ensures the entity detail view is shown
        const url = `/protected/projects/${projectId}/models/${dataModelId}?tab=entities&selectedEntity=${entityId}`;
        console.log('Navigating to entity detail view:', url);
        router.push(url);
      },
    },
    {
      key: 'hide',
      icon: <EyeOff size={16} />,
      label: 'Hide Entity',
      onClick: (node: Node) => {
        setHiddenEntityIds(prev => prev.includes(node.id) ? prev : [...prev, node.id]);
      },
    },
    {
      key: 'delete',
      icon: <Trash2 size={16} />,
      label: 'Delete Entity',
      onClick: async (node: Node) => {
        console.log('Delete entity:', node.id);
        
        // Show confirmation dialog
        if (!window.confirm('Are you sure you want to delete this entity? This action cannot be undone.')) {
          return;
        }
        
        try {
          // Call the API to delete the entity
          const resp = await fetch(`/api/projects/${projectId}/models/${dataModelId}/entities/${node.id}`, { 
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          // Parse the response to get detailed error information
          const result = await resp.json();
          
          if (resp.ok) {
            console.log('Entity deleted successfully');
            // Trigger refresh of entities
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('diagram-entity-deleted'));
            }
          } else {
            console.error('Failed to delete entity:', result);
            alert(`Failed to delete entity: ${result.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error deleting entity:', error);
          alert(`Error deleting entity: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      },
    },
    {
      key: 'add-attribute',
      icon: <Plus size={16} />,
      label: 'Add Attribute',
      onClick: (node: Node) => {
        console.log('Add attribute to entity:', node.id);
        // Implement add attribute functionality
      },
    },
  ], []);
  
  // Handle right-click on nodes
  const handleNodeContextMenu = React.useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();

    // Get all selected nodes
    const selectedNodes = nodes.filter(n => n.selected);
    const isNodeAmongSelected = selectedNodes.some(n => n.id === node.id);

    // Always close all menus before opening a new one
    setContextMenuOpen(false);
    setSelectionContextMenuOpen(false);
    setNodeContextMenuOpen(false);

    // Only open one menu: if multi-select and this node is selected, open ONLY selection menu
    if (selectedNodes.length >= 2 && isNodeAmongSelected) {
        setTimeout(() => {
            setSelectionContextMenuPos({ x: event.clientX, y: event.clientY });
            setSelectionContextMenuOpen(true);
            console.debug('[ContextMenu] Opening SELECTION menu (multi-select right-click)');
        }, 0);
    } else {
        setTimeout(() => {
            setContextMenuPos({ x: event.clientX, y: event.clientY });
            // Check if user has edit permission for this project
            const canEdit = hasPermission('edit', projectId);
            
            setNodeContextMenuOptionsState(nodeContextMenuOptions.map(option => {
                // For the delete and edit options, check permissions
                if (option.key === 'delete' || option.key === 'edit') {
                    return {
                        ...option,
                        icon: option.key === 'delete' ? 
                            <Trash2 size={16} className={canEdit ? '' : 'opacity-50'} /> : 
                            <Edit size={16} className={canEdit ? '' : 'opacity-50'} />,
                        label: canEdit ? 
                            (option.key === 'delete' ? 'Delete Entity' : 'Edit Entity') : 
                            (option.key === 'delete' ? 'Delete Entity (Requires Editor Role)' : 'Edit Entity (Requires Editor Role)'),
                        onClick: canEdit ? () => option.onClick(node) : undefined,
                    };
                }
                
                // For other options, pass through unchanged
                return {
                    ...option,
                    onClick: () => option.onClick(node),
                };
            }));
            setNodeContextMenuOpen(true);
            console.debug('[ContextMenu] Opening NODE menu (single right-click)');
        }, 0);
    }

    // Mark the event as handled to prevent the global handler from triggering
    if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.dataset.contextMenuHandled = 'true';
    }
    (event as any).isHandled = true;
    event.nativeEvent.stopImmediatePropagation();
}, [nodes, nodeContextMenuOptions]);
  
  // Define the selection menu options for multiple selected entities
  const selectionMenuOptions = React.useMemo(() => [
    {
      key: 'create-join-entity',
      icon: <Link size={16} />,
      label: 'Create Join Entity',
      onClick: () => {
        // Get all selected nodes
        const selectedNodes = nodes.filter(n => n.selected);
        
        if (selectedNodes.length >= 2) {
          // Extract entity IDs from selected nodes
          const selectedEntityIds = selectedNodes.map(node => node.id);
          
          // Set pre-selected entity IDs and open the entity modal
          setPreSelectedEntityIds(selectedEntityIds);
          setShowEntityModal(true);
        }
      },
    },
    {
      key: 'delete-selected',
      icon: <Trash2 size={16} />,
      label: 'Delete Selected',
      onClick: () => {
        // Get all selected nodes
        const selectedNodes = nodes.filter(n => n.selected);
        
        if (selectedNodes.length > 0) {
          console.log('Delete selected entities:', selectedNodes.map(node => node.id));
          // Implement delete functionality here
        }
      },
    },
  ], [nodes]);
  
  // Update the ref with the current selection menu options
  useEffect(() => {
    selectionMenuOptionsRef.current = selectionMenuOptions;
  }, [selectionMenuOptions]);
  

  
  // Handle right-click on the background
  const handleBackgroundContextMenu = React.useCallback((event: React.MouseEvent) => {
    // Check if the event has already been handled
    if ((event as any).isHandled) {
      return;
    }
    
    // Always prevent default browser context menu
    event.preventDefault();
    event.stopPropagation();
    
    // Close ALL open context menus first
    setContextMenuOpen(false);
    setSelectionContextMenuOpen(false);
    setNodeContextMenuOpen(false);
    
    // Get all selected nodes
    const selectedNodes = nodes.filter(n => n.selected);
    
    // If multiple nodes are selected, show the selection context menu
    if (selectedNodes.length >= 2) {
      setSelectionContextMenuPos({ x: event.clientX, y: event.clientY });
      setSelectionContextMenuOpen(true);
    } else {
      // Otherwise, show the regular context menu
      setContextMenuPos({ x: event.clientX, y: event.clientY });
      setContextMenuOpen(true);
    }
    
    // Set a flag on the event to prevent global handler from processing it
    (event as any).isHandled = true;
  }, [nodes]);
  
  // Add global context menu handler for selections
  useEffect(() => {
    const handleGlobalContextMenu = (event: MouseEvent) => {
      // Skip if the event was already handled by a node context menu handler
      if ((event as any).isHandled) {
        return;
      }
      
      // Close ALL open context menus first to avoid multiple menus
      setContextMenuOpen(false);
      setSelectionContextMenuOpen(false);
      setNodeContextMenuOpen(false);
      
      if (event.target instanceof Element) {
        // Check if we clicked on a node or node part
        const isNodeClick = !!event.target.closest('.react-flow__node') || 
                           !!event.target.closest('[data-nodeid]') ||
                           !!event.target.closest('.entity-node');
        
        // If this is a node click, let the node handler deal with it
        if (isNodeClick) {
          return;
        }
        
        // Also check for our handled flag
        if (event.target.closest('[data-context-menu-handled="true"]')) {
          // Reset the flag after we've checked it
          setTimeout(() => {
            const elements = document.querySelectorAll('[data-context-menu-handled="true"]');
            elements.forEach(el => {
              if (el instanceof HTMLElement) {
                el.dataset.contextMenuHandled = 'false';
              }
            });
          }, 0);
          return;
        }
      }
      
      // If right-click is on the canvas background (not on a node)
      if (event.target instanceof Element && event.target.closest('.react-flow__pane')) {
        // Check if we have selected nodes
        const selectedNodes = nodes.filter(n => n.selected);
        
        // Close any open context menus first
        setContextMenuOpen(false);
        setSelectionContextMenuOpen(false);
        
        // If we have multiple selected nodes, show the selection context menu
        if (selectedNodes.length >= 2) {
          // Prevent default browser context menu
          event.preventDefault();
          event.stopPropagation();
          
          // Show our custom context menu
          setSelectionContextMenuPos({ x: event.clientX, y: event.clientY });
          setSelectionContextMenuOpen(true);
        } else {
          // If no nodes are selected or just one node is selected but we clicked on the background,
          // show the regular context menu
          event.preventDefault();
          event.stopPropagation();
          
          setContextMenuPos({ x: event.clientX, y: event.clientY });
          setContextMenuOpen(true);
        }
      }
    };
    
    // Add the global event listener
    document.addEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
    
    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
    };
  }, [nodes]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fitView, zoomIn, zoomOut, setCenter, getViewport, setViewport } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  

  


  // Get permission context to check if user has create permission
  const { hasPermission } = usePermissions();
  
  // Check if the user is a viewer for this project
  const isViewer = useViewerCheck(projectId);
  
  // Check if user has create permission for this project
  const canCreate = useMemo(() => {
    return hasPermission('create', projectId);
  }, [hasPermission, projectId]);
  
  // Options for the circular menu on empty canvas
  const circularMenuOptions = React.useMemo(() => [
    {
      key: 'create',
      icon: <PlusCircle size={22} className={canCreate ? '' : 'opacity-50'} />, // Create Entity
      label: canCreate ? 'Create Entity' : 'Create Entity (Requires Editor Role)',
      onClick: canCreate ? handleCreateEntity : undefined,
    },
    {
      key: 'comment',
      icon: <MessageSquare size={22} />, // Add Comment
      label: 'Add Comment',
      onClick: handleAddComment,
    },
    {
      key: 'selectAll',
      icon: <BoxSelect size={22} />, // Select All Entities
      label: 'Select All Entities',
      onClick: undefined,
    },
    {
      key: 'export',
      icon: <Share2 size={22} />, // Export Model
      label: 'Export Model',
      onClick: undefined,
    },
  ], [handleCreateEntity, handleAddComment]);

  // Use the predefined node and edge types directly
  // Do NOT recreate these objects inside the component
  const nodeTypes = NODE_TYPES;
  const edgeTypes = EDGE_TYPES;

  // Marquee selection state
  const [marqueeMode, setMarqueeMode] = useState(false);
  
  // Referential legend visibility state
  const [showReferentialLegend, setShowReferentialLegend] = useState(true);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const savedReferentialLegendState = useRef(true);
  
  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Delete confirmation modal state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);
  
  // Track selected relationship
  const [selectedRelationship, setSelectedRelationship] = useState<{
    id: string;
    sourceId: string;
    targetId: string;
  } | null>(null);

  // Helper to get the correct edge ID for dimming
  const getEdgeId = (rel: { id: string; sourceId: string; targetId: string }) => `edge-${rel.sourceId}-${rel.targetId}-${rel.id}`;

  // Handle edge click to select a relationship and apply dimming immediately
  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    console.log('Edge clicked:', edge);
    
    // Clear any entity selection
    setSelectedEntityId(undefined);
    
    // Extract source and target directly from the edge
    const sourceId = edge.source;
    const targetId = edge.target;
    const relationshipId = edge.id.split('-')[3]; // Extract the relationship ID from the edge ID
    
    console.log('Applying dimming for edge:', edge.id);
    console.log('Source entity:', sourceId, 'Target entity:', targetId);
    
    // IMMEDIATELY apply dimming to all nodes
    setNodes(nodes => nodes.map(node => ({
      ...node,
      selected: node.id === sourceId || node.id === targetId,
      data: {
        ...node.data,
        dimmed: node.id !== sourceId && node.id !== targetId
      }
    })));
    
    // IMMEDIATELY apply dimming to all edges
    setEdges(edges => edges.map(e => ({
      ...e,
      selected: e.id === edge.id,
      data: {
        ...e.data,
        dimmed: e.id !== edge.id
      }
    })));
    
    // Update the selected relationship state
    setSelectedRelationship({
      id: relationshipId,
      sourceId,
      targetId
    });
  }, []);

  // Apply dimming effect based on selection
  const applyDimming = useCallback(() => {
    // If a relationship is selected
    if (selectedRelationship) {
      const { sourceId, targetId } = selectedRelationship;
      console.log('[Relationship Highlight] Using direct sourceId:', sourceId, 'targetId:', targetId);
      
      // Update nodes - dim all except the connected entities
      setNodes(nds => nds.map(node => ({
        ...node,
        data: {
          ...node.data,
          dimmed: node.id !== sourceId && node.id !== targetId
        }
      })));
      
      // Update edges - dim all except the selected relationship
      const selectedEdgeId = getEdgeId(selectedRelationship);
      setEdges(eds => eds.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          dimmed: edge.id !== selectedEdgeId
        }
      })));
    } 
    // If an entity is selected
    else if (selectedEntityId) {
      // Update nodes - dim all except the selected entity
      setNodes(nds => nds.map(node => ({
        ...node,
        selected: node.id === selectedEntityId,
        data: {
          ...node.data,
          dimmed: node.id !== selectedEntityId
        }
      })));
      
      // Update edges - dim all but highlight those connected to the selected entity
      setEdges(eds => eds.map(edge => {
        // Check if this edge is connected to the selected entity
        const isConnectedToSelected = edge.source === selectedEntityId || edge.target === selectedEntityId;
        
        return {
          ...edge,
          data: {
            ...edge.data,
            dimmed: !isConnectedToSelected,
            sourceSelected: edge.source === selectedEntityId,
            targetSelected: edge.target === selectedEntityId
          }
        };
      }));
    } 
    // If nothing is selected, reset all dimming
    else {
      setNodes(nds => nds.map(node => ({
        ...node,
        data: {
          ...node.data,
          dimmed: false
        }
      })));
      
      setEdges(eds => eds.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          dimmed: false,
          sourceSelected: false,
          targetSelected: false
        }
      })));
    }
  }, [selectedEntityId, selectedRelationship, setNodes, setEdges]);

  // --- Fix: Ensure centering happens after nodes are loaded and only once per selection ---
  const [hasCenteredOnEntity, setHasCenteredOnEntity] = useState(false);

  // Reset flag if selectedEntityId changes
  useEffect(() => {
    setHasCenteredOnEntity(false);
  }, [selectedEntityId]);

  useEffect(() => {
    if (!selectedEntityId || nodes.length === 0) return;
    if (hasCenteredOnEntity) return;
    const node = nodes.find((n) => n.id === selectedEntityId);
    if (node && reactFlowWrapper.current) {
      // Get the container size
      const container = reactFlowWrapper.current;
      const containerRect = container.getBoundingClientRect();
      const nodeCenterX = node.position.x + (node.width || 150) / 2;
      const nodeCenterY = node.position.y + (node.height || 100) / 2;
      // Center the node in the visible canvas
      setCenter(
        nodeCenterX,
        nodeCenterY,
        { zoom: 1.1, duration: 800 }
      );
      setHasCenteredOnEntity(true);
      // Reset relationship selection when entity is selected
      setSelectedRelationship(null);
      // Apply dimming effect
      applyDimming();
      console.log('[Diagram] Centered on entity', selectedEntityId);
    } else if (!node) {
      console.warn('[Diagram] Node for selectedEntityId not found!', selectedEntityId, nodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntityId, setCenter, setNodes, nodes, applyDimming, hasCenteredOnEntity]);
  
  // Apply dimming effect when relationship selection changes
  useEffect(() => {
    applyDimming();
  }, [selectedRelationship, applyDimming]);

  // Function to fetch entities and relationships from the API
  const fetchDataModel = useCallback(async () => {
    if (!dataModelId || !projectId) {
      console.error('Missing dataModelId or projectId');
      setError('Missing required parameters');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching data model:', dataModelId, projectId);

      // Fetch the data model details including entities
      const response = await fetch(`/api/projects/${projectId}/models/${dataModelId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data model');
      }
      
      const data = await response.json();
      const entities = data.entities || [];

      console.log('Fetched entities:', entities.length);

      if (entities.length === 0) {
        setNodes([]);
        setEdges([]);
        setLoading(false);
        return;
      }

      // Create nodes from entities
      const diagramNodes: Node[] = entities.map((entity: any, index: number) => {
        // Use position from database if available, otherwise create a grid layout
        let xPos, yPos;
        
        if (entity.position_x !== null && entity.position_y !== null && 
            (entity.position_x !== 0 || entity.position_y !== 0)) {
          // Use stored position
          xPos = entity.position_x;
          yPos = entity.position_y;
          console.log(`Using stored position for ${entity.name}: (${xPos}, ${yPos})`);
        } else {
          // Generate default position in a grid layout
          const columns = 3;
          xPos = (index % columns) * 300 + 50;
          yPos = Math.floor(index / columns) * 300 + 50;
          console.log(`Generated position for ${entity.name}: (${xPos}, ${yPos})`);
        }

        return {
          id: entity.id,
          type: 'entityNode',
          position: { x: xPos, y: yPos },
          // Define anchor points on all four sides but don't specify default positions
          // Let React Flow handle the connections automatically
          data: {
            id: entity.id,
            name: entity.name,
            description: entity.description,
            attributes: [], // Will be populated later
            entity_type: entity.entity_type || 'standard',
            join_entities: entity.join_entities || [],
            referential_id: entity.referential_id || null,
            // We'll fetch and add the actual color in a separate step
          },
          draggable: true, // Allow entities to be dragged
        };
      });

      // Fetch attributes for each entity
      const attributePromises = entities.map(async (entity: any) => {
        try {
          const attrResponse = await fetch(`/api/attributes?entityId=${entity.id}`);
          
          if (!attrResponse.ok) {
            console.error(`Error fetching attributes for entity ${entity.id}:`, attrResponse.statusText);
            return { entityId: entity.id, attributes: [] };
          }
          
          const attrData = await attrResponse.json();
          // Ensure we have an array of attributes, even if the response structure is unexpected
          const attributes = Array.isArray(attrData.attributes) ? attrData.attributes : [];
          console.log(`Fetched ${attributes.length} attributes for entity ${entity.id}`);
          return { entityId: entity.id, attributes };
        } catch (err) {
          console.error(`Error fetching attributes for entity ${entity.id}:`, err);
          return { entityId: entity.id, attributes: [] };
        }
      });

      const attributesResults = await Promise.all(attributePromises);
      console.log('Fetched attributes for all entities');
      
      // Update nodes with attributes
      const updatedNodes = diagramNodes.map(node => {
        // Find the attributes for this entity, defaulting to an empty array if not found
        const resultObj = attributesResults.find(result => result.entityId === node.id);
        const entityAttributes = resultObj && Array.isArray(resultObj.attributes) ? resultObj.attributes : [];
        
        // Debug: Log attributes with foreign key information
        entityAttributes.forEach((attr: any) => {
          if (attr.is_foreign_key) {
            console.log(`Foreign key found in ${node.data.name}: ${attr.name} -> ${attr.referenced_entity_id || 'unknown'}`);
          }
        });
        
        return {
          ...node,
          data: {
            ...node.data,
            attributes: entityAttributes,
          },
        };
      });
      
      setNodes(updatedNodes);

      // --- Fetch relationships with cardinality from backend ---
      let relationships: any[] = [];
      try {
        const relResp = await fetch(`/api/relationships?dataModelId=${dataModelId}`);
        if (relResp.ok) {
          const relData = await relResp.json();
          relationships = Array.isArray(relData.relationships) ? relData.relationships : [];
        } else {
          console.error('Failed to fetch relationships:', relResp.statusText);
        }
      } catch (err) {
        console.error('Error fetching relationships:', err);
      }
      // Map relationships to edges
      const diagramEdges = relationships
        .map((rel: any) => {
          const sourceNode = diagramNodes.find(node => node.id === rel.sourceEntityId);
          const targetNode = diagramNodes.find(node => node.id === rel.targetEntityId);
          if (!sourceNode || !targetNode) return null;
          const anchorPositions = determineAnchorPositions(sourceNode, targetNode);
          return {
            id: `edge-${rel.sourceEntityId}-${rel.targetEntityId}-${rel.id}`,
            source: rel.sourceEntityId,
            target: rel.targetEntityId,
            type: 'relationshipEdge',
            sourceHandle: anchorPositions.sourcePosition,
            targetHandle: anchorPositions.targetPosition,
            data: {
              sourceCardinality: rel.sourceCardinality || '0..N',
              targetCardinality: rel.targetCardinality || '1..1',
              label: rel.name,
              sourcePosition: anchorPositions.sourcePosition,
              targetPosition: anchorPositions.targetPosition,
              sourceEntityName: sourceNode.data.name,
              targetEntityName: targetNode.data.name,
            },
          } as Edge;
        })
        .filter((edge): edge is Edge => edge !== null);
      setEdges(diagramEdges);
      setLoading(false);
      
      // Fit the view to show all nodes
      setTimeout(() => {
        fitView({ padding: 0.2 });
      }, 100);
      
    } catch (err) {
      console.error('Error fetching data model:', err);
      setError('Failed to load diagram. Please try again.');
      setLoading(false);
    }
  }, [dataModelId, projectId, fitView]);
  
  // Define the handleSaveEntity function to create a new entity
  const handleSaveEntity = useCallback(async (entityData: EntityFormData) => {
    try {
      console.log('Creating entity from diagram view:', entityData);
      
      // Check if this is a join entity being created
      if (entityData.entityType === 'join' && entityData.joinEntities && entityData.joinEntities.length >= 2) {
        // For join entities, we need to delete any existing direct relationships between the entities
        console.log('Creating join entity between entities:', entityData.joinEntities);
        
        // First, fetch all existing relationships
        const relResp = await fetch(`/api/relationships?dataModelId=${dataModelId}`);
        if (!relResp.ok) {
          console.warn('Failed to fetch relationships for cleanup:', relResp.statusText);
          throw new Error(`Failed to fetch relationships: ${relResp.statusText}`);
        }
        
        const relData = await relResp.json();
        const relationships = Array.isArray(relData.relationships) ? relData.relationships : [];
        console.log('All relationships in data model:', relationships);
        
        // Define the relationship interface to fix TypeScript errors
        interface Relationship {
          id: string;
          sourceEntityId: string;
          targetEntityId: string;
          name?: string;
          cardinality?: string;
        }
        
        // Find any direct relationships between the entities that will be joined
        const relationshipsToDelete = relationships.filter((rel: Relationship) => {
          // Check if this relationship directly connects any two entities that will be joined
          const sourceInJoin = entityData.joinEntities!.includes(rel.sourceEntityId);
          const targetInJoin = entityData.joinEntities!.includes(rel.targetEntityId);
          
          // Only delete relationships that directly connect two entities being joined
          return sourceInJoin && targetInJoin;
        });
        
        // Delete these relationships
        if (relationshipsToDelete.length > 0) {
          console.log(`Found ${relationshipsToDelete.length} direct relationships to delete before creating join entity:`, 
            relationshipsToDelete.map((r: Relationship) => `${r.id} (${r.sourceEntityId} → ${r.targetEntityId})`));
          
          // Instead of parallel deletion which might cause race conditions,
          // delete relationships one by one sequentially
          try {
            const deletedIds = [];
            for (const rel of relationshipsToDelete) {
              console.log(`Deleting relationship ${rel.id} between ${rel.sourceEntityId} and ${rel.targetEntityId}`);
              
              try {
                const deleteResp = await fetch(`/api/relationships/${rel.id}`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });
                
                if (!deleteResp.ok) {
                  // Try to parse the error response as JSON
                  let errorMessage;
                  try {
                    const errorData = await deleteResp.json();
                    errorMessage = errorData.error || `HTTP error ${deleteResp.status}`;
                  } catch (e) {
                    // If it's not JSON, get the text
                    const errorText = await deleteResp.text();
                    errorMessage = errorText || `HTTP error ${deleteResp.status}`;
                  }
                  
                  console.error(`Failed to delete relationship ${rel.id}:`, errorMessage);
                  throw new Error(`Failed to delete relationship between ${rel.sourceEntityName || rel.sourceEntityId} and ${rel.targetEntityName || rel.targetEntityId}: ${errorMessage}`);
                }
                
                deletedIds.push(rel.id);
                console.log(`Successfully deleted relationship ${rel.id}`);
                
                // Add a small delay between deletions to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error) {
                console.error(`Error deleting relationship ${rel.id}:`, error);
                throw error;
              }
            }
            
            console.log('Successfully deleted all relationships:', deletedIds);
          } catch (deleteError) {
            console.error('Error deleting relationships:', deleteError);
            throw deleteError;
          }
        } else {
          console.log('No direct relationships found between the entities to be joined');
        }
      }
      
      // Prepare entity data for API request
      const entity = {
        name: entityData.name,
        description: entityData.description || null,
        data_model_id: dataModelId,
        project_id: projectId,
        // Add entity type if it's a join entity
        entity_type: entityData.entityType || "standard",
        // Add join entities if applicable
        join_entities: entityData.joinEntities || [],
      };
      
      // Create entity via API
      const response = await fetch("/api/entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entity),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create entity");
      }
      
      // Refresh the diagram after creating the entity
      // Add a small delay to ensure backend processing is complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchDataModel();
      
      return await response.json();
    } catch (error: any) {
      console.error('Error creating entity:', error);
      // Provide a more user-friendly error message
      const errorMessage = error.message || 'An unknown error occurred while creating the entity';
      throw new Error(errorMessage);
    }
  }, [dataModelId, projectId, fetchDataModel]);
  
  // Set the handleSaveEntity function to the ref so it can be used by the EntityModal
  useEffect(() => {
    handleSaveEntityRef.current = handleSaveEntity;
  }, [handleSaveEntity]);
  // Use a ref to prevent multiple fetches
  const hasFetchedRef = React.useRef(false);

  // Entity deletion event handler
  const handleEntityDeleted = useCallback(() => {
    console.log('Entity deleted event received - Refreshing diagram');
    // Preserve the current viewport before refreshing
    preservedViewport.current = getViewport();
    // Refresh the diagram data
    fetchDataModel().then(() => {
      // Restore the viewport after nodes/edges are updated
      if (preservedViewport.current) {
        setViewport(preservedViewport.current);
        preservedViewport.current = null;
      }
    }).catch(err => {
      console.error('Error refreshing diagram after entity deletion:', err);
    });
  }, [fetchDataModel, getViewport, setViewport]);

  // Fetch data model on component mount and handle entity deletion events
  useEffect(() => {
    console.log('DiagramContent useEffect - Setting up data loading and event listeners');
    
    // Initial data loading
    if (dataModelId && projectId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      console.log('🔍 Setting initial zoom level - starting data fetch');
      fetchDataModel().then(() => {
        console.log('🔍 Data loaded, applying custom zoom level');
        
        // First center the view with a moderate zoom level
        setTimeout(() => {
          console.log('🔍 Centering diagram with moderate zoom level');
          
          // First fit the view to see all nodes with moderate padding
          fitView({ 
            padding: 0.3,  // Moderate padding around nodes
            maxZoom: 0.6,  // Limit max zoom to a moderate level
            duration: 300   // Smooth transition
          });
          
          // Then set a fixed zoom level that's 8 levels up from 0.15 (around 0.6)
          setTimeout(() => {
            // Get current viewport and maintain its center position
            const currentViewport = getViewport();
            setViewport({
              x: currentViewport.x,  // Keep x position (centered)
              y: currentViewport.y,  // Keep y position (centered)
              zoom: 0.6              // Set moderate zoom level
            });
            console.log('🔍 Applied moderate zoom level (0.6) while keeping center position');
          }, 350);
        }, 500);
      }).catch(err => {
        console.error('Error fetching data model:', err);
        setError('Failed to load diagram data');
        setLoading(false);
      });
    }
    
    // Set up event listener for entity deletion
    window.addEventListener('diagram-entity-deleted', handleEntityDeleted);
    
    return () => {
      window.removeEventListener('diagram-entity-deleted', handleEntityDeleted);
    };
  }, [dataModelId, projectId, fetchDataModel, handleEntityDeleted, setViewport]);
  const handleNodeDragStop = useCallback(async (event: React.MouseEvent, node: Node) => {
    console.log('Node drag stopped:', node.id, node.position);
    
    // Check if this is a comment node
    if (node.id.startsWith('comment-')) {
      console.log('Comment node dragged to new position:', node.position);
      
      // Extract the comment ID from the node ID
      const commentId = node.id.replace('comment-', '');
      
      // Find the comment in our state
      const comment = comments.find(c => c.id === commentId);
      
      if (comment) {
        try {
          console.log(`Updating position for comment ${commentId}`);
          
          // Prepare the headers
          const headers: HeadersInit = {
            'Content-Type': 'application/json'
          };
          
          // Add user email to headers if available
          if (userEmail) {
            headers['x-user-email'] = userEmail;
          }
          
          // Send a PATCH request to update the comment position
          const response = await fetch(`/api/comments/${commentId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              position_x: node.position.x,
              position_y: node.position.y
            })
          });
          
          if (response.ok) {
            console.log('Comment position updated successfully');
            
            // Update the comment in our local state
            setComments(prevComments => 
              prevComments.map(c => 
                c.id === commentId 
                  ? { ...c, position_x: node.position.x, position_y: node.position.y }
                  : c
              )
            );
          } else {
            console.error('Failed to update comment position:', await response.text());
          }
        } catch (error) {
          console.error('Error updating comment position:', error);
        }
      }
    } 
    // Handle entity node position updates
    else if (node.type === 'entityNode' && node.id) {
      try {
        console.log(`Updating position for entity ${node.id}`);
        
        // Send a PATCH request to update the entity position
        const response = await fetch(`/api/entities/${node.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            position_x: node.position.x,
            position_y: node.position.y,
          }),
        });
        
        if (!response.ok) {
          // Log the error but don't throw - this prevents the UI from showing an error
          console.error(`Failed to update entity position: ${response.status}`);
        } else {
          const data = await response.json();
          console.log(`Position updated for entity ${node.id}:`, data);
        }
      } catch (error) {
        console.error('Error updating entity position:', error);
      }
      
      // Update edge positions when nodes move
      setEdges(prevEdges => {
        return prevEdges.map(edge => {
          if (edge.source === node.id || edge.target === node.id) {
            // Find the latest positions for both nodes
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (sourceNode && targetNode) {
              const { sourcePosition, targetPosition } = determineAnchorPositions(sourceNode, targetNode);
              
              return {
                ...edge,
                sourceHandle: sourcePosition,
                targetHandle: targetPosition,
                data: {
                  ...edge.data,
                  sourcePosition,
                  targetPosition,
                },
              };
            }
          }
          return edge;
        });
      });
    }
  }, [comments, userEmail, nodes, setEdges, determineAnchorPositions, setComments]);
  
  // Handle zoom in
  const handleZoomIn = () => {
    zoomIn();
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    zoomOut();
  };
  
  // Handle fit view
  const handleFitView = () => {
    fitView({ padding: 0.2 });
  };
  
  // Handle layout optimization with animation
  const handleOptimize = useCallback(async (optimizedNodes: Node[], updatedEdges?: Edge[]) => {
    if (isOptimizing) return;
    
    try {
      setIsOptimizing(true);
      console.log('Starting layout optimization using Sugiyama algorithm...');
      
      // Create a copy of the current nodes to work with
      const currentNodes = [...nodes];
      
      // Calculate the total animation duration based on node count
      const totalDuration = 800; // milliseconds
      const stepDuration = 20; // milliseconds per step
      const steps = totalDuration / stepDuration;
      
      // For each node, calculate the total distance to move
      const nodeMoves = currentNodes.map(node => {
        const optimizedNode = optimizedNodes.find(n => n.id === node.id);
        if (!optimizedNode) return { id: node.id, dx: 0, dy: 0 };
        
        return {
          id: node.id,
          dx: (optimizedNode.position.x - node.position.x) / steps,
          dy: (optimizedNode.position.y - node.position.y) / steps
        };
      });
      
      // Animate the nodes moving to their new positions
      for (let step = 0; step < steps; step++) {
        // Update node positions incrementally
        setNodes(prevNodes => {
          return prevNodes.map(node => {
            const move = nodeMoves.find(m => m.id === node.id);
            if (!move) return node;
            
            return {
              ...node,
              position: {
                x: node.position.x + move.dx,
                y: node.position.y + move.dy
              }
            };
          });
        });
        
        // Wait for the next frame
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
      
      // Ensure final positions are exactly as calculated
      setNodes(prevNodes => {
        return prevNodes.map(node => {
          const optimizedNode = optimizedNodes.find(n => n.id === node.id);
          if (!optimizedNode) return node;
          
          return {
            ...node,
            position: optimizedNode.position
          };
        });
      });
      
      // Update edge anchor points if provided
      if (updatedEdges && updatedEdges.length > 0) {
        console.log('Updating edge anchor points for optimal connections...');
        setEdges(prevEdges => {
          return prevEdges.map(edge => {
            const updatedEdge = updatedEdges.find(e => e.id === edge.id);
            if (!updatedEdge) return edge;
            
            return {
              ...edge,
              sourceHandle: updatedEdge.sourceHandle,
              targetHandle: updatedEdge.targetHandle,
              data: {
                ...edge.data,
                sourcePosition: updatedEdge.sourceHandle,
                targetPosition: updatedEdge.targetHandle,
              }
            };
          });
        });
      }
      
      // Save the new positions to the database
      for (const node of optimizedNodes) {
        if (node.type === 'entityNode' && node.id) {
          try {
            const response = await fetch(`/api/entities/${node.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                position_x: node.position.x,
                position_y: node.position.y,
              }),
            });
            
            if (!response.ok) {
              console.error(`Failed to update entity position: ${response.status}`);
            }
          } catch (error) {
            console.error('Error updating entity position:', error);
          }
        }
      }
      
      console.log('Hierarchical layout optimization complete');
    } catch (error) {
      console.error('Error during layout optimization:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [nodes, setNodes, setEdges, isOptimizing]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading diagram...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-destructive/15 text-destructive p-4 rounded-md max-w-md">
          <p className="font-medium mb-2">Error loading diagram</p>
          <p className="text-sm">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={fetchDataModel}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full" ref={reactFlowWrapper}>
      {/* Compute dimming for nodes and edges */}
      {(() => {
        const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
        const anySelected = selectedIds.length > 0;
        // Update nodes
        const dimmedNodes = nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            dimmed: anySelected && !n.selected,
          },
        }));
        // Update edges
        const dimmedEdges = edges.map(e => {
          const sourceSelected = selectedIds.includes(e.source);
          const targetSelected = selectedIds.includes(e.target);
          return {
            ...e,
            data: {
              ...e.data,
              dimmed: anySelected && !sourceSelected && !targetSelected,
            },
          };
        });
        // Filter out hidden nodes before rendering
        const visibleNodes = dimmedNodes.filter(n => !hiddenEntityIds.includes(n.id));
        return (
          <ReactFlow
            nodes={visibleNodes}
            edges={dimmedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeClick={handleEdgeClick}
            onPaneContextMenu={handleBackgroundContextMenu}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            fitView={false}
            minZoom={0.1}
            maxZoom={2.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            onConnect={(params) => {
              // Handle new connections between nodes
              console.log('New connection:', params);
            }}
            connectionLineType={ConnectionLineType.Bezier}
            onNodeClick={(event, node) => {
              // Only handle entity nodes
              if (node.type === 'entityNode') {
                // Update selected entity ID
                setSelectedEntityId(node.id);
                
                // Update URL with selected entity
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('selectedEntity', node.id);
                  window.history.replaceState({}, '', url.toString());
                }
              }
            }}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneClick={() => {
              // Deselect entity when clicking on empty canvas
              if (selectedEntityId) {
                setSelectedEntityId(undefined);
                // Update URL
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('selectedEntity');
                  window.history.replaceState({}, '', url.toString());
                }
              }
            }}
            onNodeDragStop={handleNodeDragStop}
            panOnScroll={!marqueeMode}
            selectionMode={marqueeMode ? "partial" : "full" as any}
            selectionOnDrag={marqueeMode}
            panOnDrag={!marqueeMode}
            selectionKeyCode={null}
            // We're handling Delete key ourselves to show a confirmation modal
            deleteKeyCode={null}
            onKeyDown={(event) => {
              // Skip handling if the event target is an input field or textarea
              const target = event.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return; // Allow default behavior for input fields
              }
              
              // Only handle Delete and Backspace keys
              if ((event.key === 'Delete' || event.key === 'Backspace') && !isViewer) {
                // Get selected nodes
                const selectedNodes = nodes.filter(node => node.selected);
                
                // If exactly one node is selected and it's an entity node
                if (selectedNodes.length === 1 && selectedNodes[0].type === 'entityNode') {
                  // Prevent default behavior (which just removes the node from the canvas)
                  event.preventDefault();
                  
                  // Set the node to delete and show confirmation modal
                  setNodeToDelete(selectedNodes[0]);
                  setShowDeleteConfirmModal(true);
                }
              }
            }}
          >
            <Background color="#666" gap={20} size={1} style={{ backgroundColor: '#000000' }} />
            <Controls showInteractive={false} />
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.type === 'entityNode') return '#1f2937';
                return '#1f2937';
              }}
              nodeColor={(n) => {
                if (n.type === 'entityNode') return '#374151';
                return '#374151';
              }}
              nodeBorderRadius={2}
            />
            
            {/* Referential Legend */}
            <ReferentialLegend 
              referentials={referentials.map(ref => ({
                id: ref.id,
                name: ref.name,
                color: referentialColors[ref.id] || '#374151',
                entityCount: ref.entityCount
              }))} 
              visible={showReferentialLegend && !isSearchActive}
            />
            <Panel position="top-left" className="m-4">
              <DiagramSearch 
                nodes={nodes} 
                onSearchActive={(active) => {
                  // If search becomes active, save current legend state and hide it
                  if (active && showReferentialLegend) {
                    savedReferentialLegendState.current = true;
                    setIsSearchActive(true);
                  } 
                  // If search becomes inactive, restore previous legend state
                  else if (!active) {
                    setIsSearchActive(false);
                  }
                }}
                onSelectEntity={(entityId) => {
                  // Select the entity node
                  setNodes(nds => nds.map(n => ({
                    ...n,
                    selected: n.id === entityId
                  })));
                  
                  // Update URL with selected entity
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('selectedEntity', entityId);
                    window.history.replaceState({}, '', url.toString());
                  }
                }} 
              />
            </Panel>
            <Panel position="top-right">
              <div className="flex flex-col gap-2">
                {hiddenEntityIds.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setHiddenEntityIds([])} 
                    className="mb-2 w-full"
                  >
                    Unhide All Entities ({hiddenEntityIds.length})
                  </Button>
                )}
                <div className="flex gap-2 bg-background p-2 rounded-md shadow-md">
                <Button 
                  size="icon" 
                  variant={marqueeMode ? "secondary" : "outline"} 
                  onClick={() => setMarqueeMode(m => !m)} 
                  title={marqueeMode ? "Disable Marquee Selection" : "Enable Marquee Selection"}
                  aria-pressed={marqueeMode}
                >
                  <BoxSelect size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowReferentialModal(true)}
                  title="Display selected referentials"
                >
                  <Eye size={16} />
                </Button>
                <Button
                  size="icon"
                  variant={showReferentialLegend ? "secondary" : "outline"}
                  onClick={() => setShowReferentialLegend(prev => !prev)}
                  title={showReferentialLegend ? "Hide Referential Legend" : "Show Referential Legend"}
                  aria-pressed={showReferentialLegend}
                >
                  <CrosshairIcon size={16} />
                </Button>
                <OptimizeButton
                  nodes={nodes}
                  edges={edges}
                  onOptimize={handleOptimize}
                  isOptimizing={isOptimizing}
                />
                <FullScreenButton
                  dataModelId={dataModelId}
                  projectId={projectId}
                  nodes={nodes}
                  edges={edges}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleFitView}
                  title="Fit View"
                >
                  <RefreshCw size={16} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setShowSettingsModal(true)}
                  title="Diagram Settings"
                >
                  <Settings size={16} />
                </Button>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        );
      })()}
      {/* Only render one context menu at a time based on open state priority */}
{nodeContextMenuOpen ? (
  <CircularContextMenu
    open={true}
    position={contextMenuPos}
    onClose={() => {
      setNodeContextMenuOpen(false);
      setContextMenuOpen(false);
      setSelectionContextMenuOpen(false);
    }}
    options={nodeContextMenuOptionsState}
  />
) : selectionContextMenuOpen ? (
  <CircularContextMenu
    open={true}
    position={selectionContextMenuPos}
    onClose={() => {
      setSelectionContextMenuOpen(false);
      setContextMenuOpen(false);
      setNodeContextMenuOpen(false);
    }}
    options={selectionMenuOptionsRef.current}
  />
) : contextMenuOpen ? (
  <CircularContextMenu
    open={true}
    position={contextMenuPos}
    onClose={() => {
      setContextMenuOpen(false);
      setNodeContextMenuOpen(false);
      setSelectionContextMenuOpen(false);
    }}
    options={circularMenuOptions}
  />
) : null}
      
      {/* Comment Creation Modal */}
      <CommentModal
        open={showCommentModal}
        onOpenChange={setShowCommentModal}
        onSave={handleSaveComment}
        position={contextMenuPos}
        dataModelId={dataModelId}
        availableEntities={entities}
      />
      
      {/* Comment View/Edit Modal */}
      <CommentViewModal
        open={selectedComment !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedComment(null);
        }}
        comment={selectedComment}
        currentUserEmail={userEmail}
        onEdit={handleEditComment}
        onDelete={handleDeleteComment}
      />
      
      {/* Settings Modal */}
      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        projectId={projectId}
      />
      
      {/* Entity Creation Modal */}
      <EntityModal
        open={showEntityModal}
        onOpenChange={setShowEntityModal}
        onSave={(data) => {
          if (handleSaveEntityRef.current) {
            return handleSaveEntityRef.current(data);
          }
          return Promise.resolve();
        }}
        availableEntities={entities}
        initialData={{
          name: '',
          description: '',
          primaryKeyType: 'auto_increment',
          primaryKeyName: 'id',
          entityType: 'join',
          joinEntities: preSelectedEntityIds,
        }}
      />
      
      {/* Referential Selection Modal */}
      <ReferentialSelectionModal
        isOpen={showReferentialModal}
        onClose={() => setShowReferentialModal(false)}
        referentials={referentials}
        showEntitiesWithoutReferential={showEntitiesWithoutReferential}
        entitiesWithoutReferentialCount={entitiesWithoutReferentialCount}
        onSelectAll={() => {
          setReferentials(refs => refs.map(ref => ({ ...ref, isSelected: true })));
        }}
        onDeselectAll={() => {
          setReferentials(refs => refs.map(ref => ({ ...ref, isSelected: false })));
        }}
        onToggleReferential={(id) => {
          setReferentials(refs => refs.map(ref => 
            ref.id === id ? { ...ref, isSelected: !ref.isSelected } : ref
          ));
        }}
        onToggleEntitiesWithoutReferential={() => {
          setShowEntitiesWithoutReferential(prev => !prev);
        }}
        onApply={() => {
          // Get IDs of unselected referentials
          const unselectedReferentialIds = referentials
            .filter(r => !r.isSelected)
            .map(r => r.id);
          
          // Find entities to hide based on referential selection
          const entitiesToHide: string[] = [];
          
          // 1. Add entities from unselected referentials
          Object.entries(entityReferentialMap)
            .filter(([entityId, refId]) => refId && unselectedReferentialIds.includes(refId))
            .forEach(([entityId]) => entitiesToHide.push(entityId));
          
          // 2. Add entities without referential if that option is unchecked
          if (!showEntitiesWithoutReferential) {
            // Get all entity IDs
            const allEntityIds = nodes.map(node => node.id);
            
            // Find entities without referential (not in the map or with null/empty refId)
            allEntityIds.forEach(entityId => {
              const refId = entityReferentialMap[entityId];
              if (!refId && !entitiesToHide.includes(entityId)) {
                entitiesToHide.push(entityId);
              }
            });
          }
          
          // Update hidden entities state
          setHiddenEntityIds(prev => {
            // Start with currently hidden entities
            const newHiddenIds = [...prev];
            
            // Add entities to hide if not already hidden
            entitiesToHide.forEach(entityId => {
              if (!newHiddenIds.includes(entityId)) {
                newHiddenIds.push(entityId);
              }
            });
            
            // Filter the hidden entities list
            return newHiddenIds.filter(entityId => {
              const refId = entityReferentialMap[entityId];
              
              // Keep in hidden list if:
              // 1. It has no referential and "show entities without referential" is off, OR
              // 2. It has a referential that's unselected, OR
              // 3. It was hidden manually (not through referential selection)
              return (!refId && !showEntitiesWithoutReferential) || 
                     (refId && unselectedReferentialIds.includes(refId)) || 
                     (prev.includes(entityId) && !Object.keys(entityReferentialMap).includes(entityId));
            });
          });
          
          console.log('Applied referential filter. Hidden entities:', entitiesToHide.length);
          setShowReferentialModal(false);
        }}
      />
    </div>
  );
};

// Wrapper component that provides the ReactFlowProvider
// Use React.memo to prevent unnecessary re-renders
const DiagramView: React.FC<DiagramViewProps> = React.memo((props) => {
  // Use a ref to track if the component has been mounted
  const mountedRef = React.useRef(false);
  
  // Add an effect to log when the wrapper component mounts
  React.useEffect(() => {
    console.log('🔍 DiagramView wrapper mounted');
  }, []);
  
  // Only render once to prevent infinite loops
  return (
    <ReactFlowProvider>
      <DiagramContent key={`diagram-${props.dataModelId}`} {...props} />
    </ReactFlowProvider>
  );
});

export default DiagramView;
