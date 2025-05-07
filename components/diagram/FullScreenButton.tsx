"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Maximize } from 'lucide-react';
import { Node, Edge } from 'reactflow';

interface FullScreenButtonProps {
  dataModelId: string;
  projectId: string;
  nodes: Node[];
  edges: Edge[];
}

/**
 * A button component that opens the diagram in a new window in fullscreen mode.
 * This approach doesn't modify the existing page but creates a dedicated fullscreen view.
 */
const FullScreenButton: React.FC<FullScreenButtonProps> = ({ 
  dataModelId, 
  projectId,
  nodes,
  edges
}) => {
  const handleOpenFullscreen = () => {
    // Create the URL for the fullscreen page with the necessary parameters
    const url = `/fullscreen-diagram?dataModelId=${dataModelId}&projectId=${projectId}`;
    
    // Serialize the current nodes and edges state to localStorage
    // This allows the fullscreen view to load the exact same diagram state
    localStorage.setItem(`diagram-state-${dataModelId}`, JSON.stringify({
      nodes,
      edges,
      timestamp: Date.now()
    }));
    
    // Open in a new window with fullscreen features
    window.open(
      url, 
      'DiagramFullscreen', 
      'width='+screen.width+',height='+screen.height+',toolbar=0,menubar=0,location=0,status=0'
    );
  };

  return (
    <Button
      size="icon"
      variant="outline"
      onClick={handleOpenFullscreen}
      title="Open in Fullscreen"
      className="ml-1"
    >
      <Maximize size={16} />
    </Button>
  );
};

export default FullScreenButton;