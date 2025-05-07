"use client";

import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { useSettings } from '@/contexts/settings-context';

interface RelationshipEdgeData {
  sourceCardinality: string;
  targetCardinality: string;
  label?: string;
  dimmed?: boolean;
  sourceSelected?: boolean;
  targetSelected?: boolean;
  sourceEntityName?: string;
  targetEntityName?: string;
}

const RelationshipEdge: React.FC<EdgeProps<RelationshipEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style = {},
}) => {
  const dimmed = data?.dimmed ?? false;
  const sourceSelected = data?.sourceSelected ?? false;
  const targetSelected = data?.targetSelected ?? false;
  
  // Edge should be highlighted if it's selected or if one of its connected entities is selected
  const shouldHighlight = selected || sourceSelected || targetSelected;
  // Defensive: fallback to Position.Right/Left if undefined (for backward compatibility)
  const safeSourcePosition = sourcePosition ?? 'right';
  const safeTargetPosition = targetPosition ?? 'left';

  // Use the safe positions in getBezierPath
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: safeSourcePosition,
    targetX,
    targetY,
    targetPosition: safeTargetPosition,
  });

  // Default cardinality values if not provided
  const sourceCardinality = data?.sourceCardinality || '0..N';
  const targetCardinality = data?.targetCardinality || '1..1';
  const label = data?.label || '';
  const sourceEntityName = data?.sourceEntityName || 'Source entity';
  const targetEntityName = data?.targetEntityName || 'Target entity';
  
  // Create human-readable cardinality descriptions
  const formatCardinality = (cardinality: string): string => {
    switch (cardinality) {
      case '0..1': return 'zero or one';
      case '1..1': return 'exactly one';
      case '0..N': return 'zero or many';
      case '1..N': return 'one or many';
      default: return cardinality;
    }
  };
  
  const sourceCardinalityText = formatCardinality(sourceCardinality);
  const targetCardinalityText = formatCardinality(targetCardinality);
  
  // Create the relationship description
  const relationshipDescription = `${sourceEntityName} can have ${targetCardinalityText} ${targetEntityName} and ${targetEntityName} can have ${sourceCardinalityText} ${sourceEntityName}`;
  
  // Get settings from context
  const { diagramSettings } = useSettings();
  
  // Use settings for visibility
  const showCardinality = diagramSettings.showCardinalityIndicators;
  const showRelationshipName = diagramSettings.showRelationshipNames;

  // Calculate positions for cardinality labels
  // Position the source cardinality near the source node
  const sourceCardinalityX = sourceX + (targetX - sourceX) * 0.15;
  const sourceCardinalityY = sourceY + (targetY - sourceY) * 0.15;

  // Position the target cardinality near the target node
  const targetCardinalityX = sourceX + (targetX - sourceX) * 0.85;
  const targetCardinalityY = sourceY + (targetY - sourceY) * 0.85;

  return (
    <>
      <g className="relationship-edge-group">
        <path
          className="relationship-edge-path"
          d={edgePath}
          stroke={shouldHighlight ? '#38bdf8' : '#32314F'}
          strokeWidth={shouldHighlight ? 3 : 2}
          fill="none"
          markerEnd="url(#arrowhead)"
          style={{
            opacity: dimmed ? 0.4 : 1,
            transition: 'all 0.2s',
          }}
        />
      </g>
      <EdgeLabelRenderer>
        {/* Source cardinality label - only shown if showCardinality is true */}
        {showCardinality && (
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
        )}
        {/* Target cardinality label - only shown if showCardinality is true */}
        {showCardinality && (
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
        )}
        {/* Relationship name label - only shown if showRelationshipName is true */}
        {label && showRelationshipName && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: shouldHighlight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.7)',
              color: shouldHighlight ? '#3b82f6' : 'white',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              pointerEvents: 'all',
              border: shouldHighlight ? '1px solid #3b82f6' : 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              zIndex: 900,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        )}
        
        {/* Relationship tooltip - only shown when edge is highlighted */}
        {shouldHighlight && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 30}px)`,
              background: 'rgba(30, 41, 59, 0.9)',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              maxWidth: '300px',
              textAlign: 'center',
              pointerEvents: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 1000,
              whiteSpace: 'normal',
            }}
            className="nodrag nopan"
          >
            {relationshipDescription}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default RelationshipEdge;
