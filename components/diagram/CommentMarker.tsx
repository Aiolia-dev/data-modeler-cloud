"use client";

import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_email?: string;
  position_x?: number;
  position_y?: number;
  entity_id?: string;
  attribute_id?: string;
  relationship_id?: string;
  data_model_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CommentNodeData {
  comment: Comment;
  userEmail: string;
  onCommentClick?: (comment: Comment) => void;
}

// CommentNode is a React Flow node type that renders a comment marker
export function CommentNode({ data }: NodeProps<CommentNodeData>) {
  const { comment, userEmail, onCommentClick } = data;
  const [showPreview, setShowPreview] = React.useState(false);
  
  // Format the comment content for preview (truncate if too long)
  const previewContent = comment.content.length > 100 
    ? `${comment.content.substring(0, 100)}...` 
    : comment.content;
  
  // Format the date for display
  const formattedDate = comment.created_at 
    ? new Date(comment.created_at).toLocaleDateString() 
    : '';
  
  return (
    <div className="comment-node relative cursor-move" title="Click to view or edit. Drag to reposition.">
      {/* This is an invisible handle that allows the node to be connected */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md border-2 border-white"
        style={{ 
          backgroundColor: comment.user_email ? getColorFromEmail(comment.user_email) : getColorFromEmail(userEmail),
          cursor: 'pointer'
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onCommentClick) onCommentClick(comment);
        }}
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        {comment.user_email 
          ? getInitials(comment.user_email) 
          : getInitials(userEmail)}
      </div>
      
      {/* Comment preview tooltip */}
      {showPreview && (
        <div 
          className="absolute z-50 bg-white dark:bg-gray-800 p-3 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 w-64"
          style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' }}
          onClick={(e) => {
            e.stopPropagation();
            onCommentClick?.(comment);
          }}
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex justify-between">
            <span>{comment.user_email || 'Unknown user'}</span>
            <span>{formattedDate}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{previewContent}</p>
          <div className="text-xs text-blue-500 mt-1 cursor-pointer">Click to view or edit</div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

// Helper function to convert comments to React Flow nodes
export function commentsToNodes(comments: Comment[], userEmail: string, onCommentClick?: (comment: Comment) => void) {
  console.log('Converting comments to nodes, input comments:', comments.length);
  
  // Log each comment's position for debugging
  comments.forEach((comment, index) => {
    console.log(`Comment ${index} (${comment.id}):`, {
      content: comment.content?.substring(0, 20) + '...',
      position_x: comment.position_x,
      position_y: comment.position_y,
      user_email: comment.user_email
    });
  });
  
  const filteredComments = comments.filter(comment => {
    const hasPosition = comment.position_x != null && comment.position_y != null;
    if (!hasPosition) {
      console.log(`Comment ${comment.id} filtered out - missing position:`, {
        position_x: comment.position_x,
        position_y: comment.position_y
      });
    }
    return hasPosition;
  });
  
  console.log('Filtered comments with positions:', filteredComments.length);
  
  const nodes = filteredComments.map(comment => {
    // Ensure position values are numbers
    const posX = Number(comment.position_x);
    const posY = Number(comment.position_y);
    
    console.log(`Creating node for comment ${comment.id} at position:`, { x: posX, y: posY });
    
    return {
      id: `comment-${comment.id}`,
      type: 'commentNode',
      position: { x: posX, y: posY },
      data: {
        comment,
        userEmail,
        onCommentClick
      },
      // Allow comments to be dragged but not selected
      selectable: false,
      draggable: true,
    };
  });
  
  console.log('Created comment nodes:', nodes.length);
  return nodes;
}


// Helper functions moved outside the component to avoid recreation on each render
// Get the first 3 letters of the user's email or use initials
function getInitials(email: string) {
  if (!email) return '?';
  
  // If email has @ symbol, get first 3 chars before @
  if (email.includes('@')) {
    return email.split('@')[0].substring(0, 3).toUpperCase();
  }
  
  // Otherwise just get first 3 chars
  return email.substring(0, 3).toUpperCase();
}

// Generate a consistent color based on the user's email
function getColorFromEmail(email: string) {
  const colors = [
    '#FF5630', // red
    '#FF8B00', // orange
    '#FFAB00', // yellow
    '#36B37E', // green
    '#00B8D9', // blue
    '#6554C0', // purple
    '#6B778C', // gray
  ];
  
  // Simple hash function to get consistent index
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
