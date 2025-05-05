"use client";

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { AttributeTooltip, AttributeData } from './AttributeTooltip';
import { useSettings } from '@/contexts/settings-context';

interface EntityNodeData {
  id: string;
  name: string;
  description?: string;
  attributes: Array<{
    id: string;
    name: string;
    dataType: string;
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
  undimmedHandles?: string[];

  dimmed?: boolean;
  entity_type?: 'standard' | 'join';
  join_entities?: string[];
  referential_id?: string | null;
  referential_color?: string;
}

import ReactDOM from 'react-dom';
import { Trash2, Pen, Copy } from 'lucide-react';

const EntityNode: React.FC<NodeProps<EntityNodeData>> = ({ data, selected }) => {
  const dimmed = data.dimmed;
  console.log('[EntityNode Render] Entity:', data.id, 'Dimmed:', dimmed);
  
  // Get settings from context
  const { diagramSettings } = useSettings();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{x: number, y: number} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Get projectId and dataModelId from URL path segments
  let projectId = '';
  let dataModelId = '';
  if (typeof window !== 'undefined') {
    // Extract from URL path like /protected/projects/{projectId}/models/{dataModelId}
    const url = window.location.pathname;
    console.log('Current URL path:', url);
    
    // Use regex to extract IDs from the URL path
    const projectMatch = url.match(/\/projects\/([^/]+)/);
    const modelMatch = url.match(/\/models\/([^/\?]+)/);
    
    projectId = projectMatch ? projectMatch[1] : '';
    dataModelId = modelMatch ? modelMatch[1] : '';
    
    console.log('Extracted IDs from URL path:', { projectId, dataModelId });
  }


  // Close menu on click outside or Escape
  React.useEffect(() => {
    if (!menuOpen) return;
    
    // Only close the menu if the click is outside the menu
    const handleClick = (e: MouseEvent) => {
      // Check if we're clicking inside the overlay-root element
      const overlayRoot = document.getElementById('overlay-root');
      if (overlayRoot && overlayRoot.contains(e.target as Node)) {
        console.log('Click inside overlay-root, not closing menu');
        return; // Don't close the menu if clicking inside the overlay
      }
      console.log('Click outside menu, closing');
      setMenuOpen(false);
    };
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('Escape pressed, closing menu');
        setMenuOpen(false);
      }
    };
    
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  // State for attribute tooltip
  const [hoveredAttribute, setHoveredAttribute] = useState<AttributeData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
  const [attributeRules, setAttributeRules] = useState<Record<string, number>>({});
  
  // Fetch rules for this entity when selected
  React.useEffect(() => {
    if (selected && data.id) {
      const fetchRulesForEntity = async () => {
        try {
          // Fetch rules for this entity
          const response = await fetch(`/api/rules?entityId=${data.id}`);
          if (response.ok) {
            const rulesData = await response.json();
            
            // Count rules per attribute
            const rulesByAttribute: Record<string, number> = {};
            
            // Process each rule to see which attributes it affects
            rulesData.forEach((rule: any) => {
              // Extract attribute names from rule expressions
              // This is a simplified approach - in a real implementation, you would parse the rule expressions properly
              const attributeMatches = [...(rule.condition_expression || '').matchAll(/\b([A-Za-z0-9_]+)\b/g)];
              
              // Count each attribute mention
              attributeMatches.forEach(match => {
                const attrName = match[1];
                // Check if this is actually an attribute name in this entity
                const isAttribute = data.attributes.some(attr => 
                  attr.name.toLowerCase() === attrName.toLowerCase()
                );
                
                if (isAttribute) {
                  rulesByAttribute[attrName] = (rulesByAttribute[attrName] || 0) + 1;
                }
              });
            });
            
            setAttributeRules(rulesByAttribute);
          }
        } catch (error) {
          console.error('Error fetching rules for entity:', error);
        }
      };
      
      fetchRulesForEntity();
    }
  }, [selected, data.id, data.attributes]);

  // Sort attributes to show primary keys first, then foreign keys, then others
  const sortedAttributes = [...data.attributes].sort((a, b) => {
    if (a.isPrimaryKey && !b.isPrimaryKey) return -1;
    if (!a.isPrimaryKey && b.isPrimaryKey) return 1;
    if (a.isForeignKey && !b.isForeignKey) return -1;
    if (!a.isForeignKey && b.isForeignKey) return 1;
    return a.name.localeCompare(b.name);
  });

  // Function to handle the delete action
  const handleDelete = async () => {
    setDeleting(true);
    try {
      console.log('Deleting entity:', {
        projectId,
        dataModelId,
        entityId: data.id
      });
      
      // Make sure we have all required parameters
      if (!projectId || !dataModelId || !data.id) {
        console.error('Missing required parameters for entity deletion', {
          projectId,
          dataModelId,
          entityId: data.id
        });
        alert('Cannot delete entity: Missing project or model information');
        return;
      }

      // Call the API to delete the entity
      const resp = await fetch(`/api/projects/${projectId}/models/${dataModelId}/entities/${data.id}`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Parse the response to get detailed error information
      const result = await resp.json();
      
      if (resp.ok) {
        console.log('Entity deleted successfully');
        setShowDeleteConfirm(false);
        setMenuOpen(false);
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('diagram-entity-deleted'));
      } else {
        console.error('Failed to delete entity:', result);
        alert(`Failed to delete entity: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
      alert(`Error deleting entity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Delete Confirmation Modal - Rendered in overlay-root with higher z-index */}
      {(showDeleteConfirm && typeof window !== 'undefined' && (console.log('Rendering delete confirmation modal'), true)) &&
        ReactDOM.createPortal(
          <div 
            className="fixed inset-0 flex items-center justify-center bg-black/40" 
            style={{ zIndex: 2147483648 }} /* One higher than contextual menu */
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowDeleteConfirm(false);
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl p-6 w-[340px] relative" 
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <div className="font-semibold text-lg text-gray-900 mb-2">Delete Entity?</div>
              <div className="text-gray-700 mb-4">Are you sure you want to permanently delete <span className='font-bold'>{data.name}</span> and all its attributes?</div>
              <div className="flex gap-3 justify-end">
                <button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowDeleteConfirm(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDelete();
                  }}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.getElementById('overlay-root') as HTMLElement
        )
      }
      <div
        className={`entity-node w-[300px] ${selected ? 'selected' : ''} rounded-md overflow-hidden shadow-md ${data.entity_type === 'join' ? 'bg-[#2a3045]' : 'bg-gray-800'} ${selected ? 'border-primary' : data.entity_type === 'join' ? 'border-gray-400' : 'border-gray-700'}`}
        style={{
          opacity: dimmed ? 0.4 : 1,
          transition: 'opacity 0.2s',
          ...(data.entity_type === 'join' ? { 
            backgroundImage: 'linear-gradient(to bottom, #2a3045, #1e2232)',
            borderStyle: 'dashed',
            borderWidth: '2px',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
          } : {})
        }}
        onContextMenu={e => {
          if (selected) {
            e.preventDefault();
            setMenuOpen(true);
            setMenuPos({ x: e.clientX, y: e.clientY });
          }
        }}
      >
        {/* Entity Header */}
        <div 
          className={`entity-header p-3 font-medium text-gray-100 flex justify-between items-center`}
          style={{ 
            backgroundColor: data.entity_type === 'join' ? '#3a4055' : (data.referential_color || '#374151')
          }}>
          <span>{data.name}</span>
          {data.entity_type === 'join' && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-500/30 text-blue-200 border-blue-400/40 font-semibold">
              JOIN
            </Badge>
          )}
        </div>

        {/* Entity Attributes - only shown if showEntityAttributes is true */}
        {diagramSettings.showEntityAttributes && (
          <div className="entity-attributes p-2 text-sm">
            {sortedAttributes.length === 0 ? (
              <div className="text-gray-400 italic text-xs p-1">No attributes</div>
            ) : (
              sortedAttributes.map((attr) => {
              const isPrimaryKey = attr.isPrimaryKey || attr.is_primary_key;
              const isForeignKey = attr.isForeignKey || attr.is_foreign_key;
              const isRequired = attr.isRequired || attr.is_required;
              const isUnique = attr.isUnique || attr.is_unique;
              const isStandardAttribute = !isPrimaryKey && !isForeignKey;
              
              // Skip attributes based on visibility settings
              if (
                (isPrimaryKey && !diagramSettings.showPrimaryKeys) ||
                (isForeignKey && !diagramSettings.showForeignKeys) ||
                (isStandardAttribute && !diagramSettings.showStandardAttributes)
              ) {
                return null;
              }
              
              return (
                <div 
                  key={attr.id} 
                  className={`px-2 py-1 flex items-center gap-2 ${isPrimaryKey ? 'bg-purple-950 bg-opacity-30' : isForeignKey ? 'bg-blue-950 bg-opacity-30' : ''} hover:bg-gray-700 transition-colors cursor-pointer`}
                  onMouseEnter={(e) => {
                    // Only show tooltip if the entity is selected
                    if (selected) {
                      // Get actual rule count for this attribute
                      const ruleCount = attributeRules[attr.name] || 0;
                      
                      // Create enhanced attribute data for the tooltip with actual data
                      const enhancedAttr: AttributeData = {
                        id: attr.id,
                        name: attr.name,
                        dataType: attr.dataType || attr.data_type || '',
                        isPrimaryKey: isPrimaryKey,
                        isForeignKey: isForeignKey,
                        isRequired: isRequired,
                        isUnique: isUnique,
                        referencedEntity: attr.referencedEntity,
                        // Use the actual description from the database if available
                        description: attr.description || '',
                        // Use actual rule count
                        rules: ruleCount,
                        // For referenced by, we could fetch this data similarly
                        referencedBy: isForeignKey ? 0 : 0
                      };
                      setHoveredAttribute(enhancedAttr);
                      setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }
                  }}
                  onMouseLeave={() => {
                    if (selected) {
                      setHoveredAttribute(null);
                    }
                  }}
                >
                  <div className="flex-1 flex items-center gap-1">
                    {isPrimaryKey && <span className="text-purple-400 text-xs">🔑</span>}
                    {isForeignKey && <span className="text-blue-400 text-xs">🔗</span>}
                    <span className={`${isPrimaryKey ? 'text-purple-300' : isForeignKey ? 'text-blue-300' : 'text-white'}`}>
                      {attr.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">{attr.dataType}</div>
                  <div className="flex gap-1">
                    {isRequired && <Badge variant="outline" className="h-4 text-[0.6rem] px-1 py-0 border-red-500 text-red-400">Req</Badge>}
                    {isUnique && <Badge variant="outline" className="h-4 text-[0.6rem] px-1 py-0 border-yellow-500 text-yellow-400">Unq</Badge>}
                  </div>
                </div>
              );
              })
            )}
          </div>
        )}

        {/* Connection Handles - with unique IDs and dimming logic */}
        {/* Map for Position enum to avoid TS error */}
        {(['top', 'right', 'bottom', 'left'] as const).map((pos) => (
          <Handle
            key={`source-${pos}`}
            type="source"
            position={
              pos === 'top'
                ? Position.Top
                : pos === 'right'
                ? Position.Right
                : pos === 'bottom'
                ? Position.Bottom
                : Position.Left
            }
            id={pos}
            className="w-3 h-3 bg-gray-500"
            style={{
              opacity:
                data.undimmedHandles && !data.undimmedHandles.includes(`source-${pos}`)
                  ? 0.4
                  : 1,
              transition: 'opacity 0.2s',
              zIndex: 10,
            }}
          />
        ))}
        {(['top', 'right', 'bottom', 'left'] as const).map((pos) => (
          <Handle
            key={`target-${pos}`}
            type="target"
            position={
              pos === 'top'
                ? Position.Top
                : pos === 'right'
                ? Position.Right
                : pos === 'bottom'
                ? Position.Bottom
                : Position.Left
            }
            id={pos}
            className="w-3 h-3 bg-gray-500"
            style={{
              opacity:
                data.undimmedHandles && !data.undimmedHandles.includes(`target-${pos}`)
                  ? 0.4
                  : 1,
              transition: 'opacity 0.2s',
              zIndex: 10,
            }}
          />
        ))}

        {/* Attribute Tooltip - only show when entity is selected */}
        {selected && hoveredAttribute && tooltipPosition && ReactDOM.createPortal(
          <AttributeTooltip
            attribute={hoveredAttribute}
            entityName={data.name}
            position={tooltipPosition}
            onViewDetails={(attributeId) => {
              console.log('View details for attribute:', attributeId);
              // Navigate to attribute details page
              if (projectId && dataModelId && data.id) {
                window.location.href = `/protected/projects/${projectId}/models/${dataModelId}/entities/${data.id}/attributes/${attributeId}`;
              }
            }}
            onViewRelations={(attributeId) => {
              console.log('View relations for attribute:', attributeId);
              // This would typically show a modal or navigate to a relations view
            }}
            onGoToReferencedEntity={(entityName) => {
              console.log('Go to referenced entity:', entityName);
              // Find the entity by name and select it
              // This would typically involve finding the node ID and selecting it in the diagram
            }}
          />,
          document.getElementById('overlay-root') as HTMLElement
        )}
        
        {/* Floating Contextual Menu - Disabled */}
        {/* Menu with pen, trash, and duplicate icons has been intentionally disabled */}
      </div>
    </>
  );
};

export default memo(EntityNode);
