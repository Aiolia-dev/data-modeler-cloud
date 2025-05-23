"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import ReactDOM from 'react-dom';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/settings-context';
import { Trash2, Pen, Copy, PlusCircle, KeyRound, Database } from 'lucide-react';
import AttributeModal from '@/components/entity/attribute-modal';
import ForeignKeyModal from '@/components/entity/foreign-key-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AttributeTooltip } from './AttributeTooltip';
import QuickEditAttributeModal from './QuickEditAttributeModal';

// Define types if they're not imported from external files
interface AttributeData {
  id: string;
  name: string;
  dataType: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isRequired?: boolean;
  isUnique?: boolean;
  description?: string;
  referencedEntity?: string;
  rules?: number;
  referencedBy?: number;
  usageEntities?: string[];
}

interface EntityNodeData {
  id: string;
  name: string;
  description?: string;
  attributes: Array<{
    id: string;
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
    referenced_entity_id?: string;
  }>;
  undimmedHandles?: string[];
  dimmed?: boolean;
  entity_type?: 'standard' | 'join';
  join_entities?: string[];
  referential_id?: string | null;
  referential_color?: string;
}

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

  // State for attribute tooltip and quick edit modal
  const [hoveredAttribute, setHoveredAttribute] = useState<AttributeData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
  const [attributeRules, setAttributeRules] = useState<Record<string, number>>({});
  const [attributeReferences, setAttributeReferences] = useState<Record<string, number>>({});
  const [entityNames, setEntityNames] = useState<Record<string, string>>({});
  const [attributeUsage, setAttributeUsage] = useState<Record<string, string[]>>({});
  const [selectedAttribute, setSelectedAttribute] = useState<AttributeData | null>(null);
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  
  // State for new attribute and foreign key modals
  const [showNewAttributeModal, setShowNewAttributeModal] = useState(false);
  const [showForeignKeyModal, setShowForeignKeyModal] = useState(false);
  
  // Fetch rules, reference counts, and entity names when selected
  React.useEffect(() => {
    if (selected && data.id) {
      const fetchEntityData = async () => {
        try {
          // Fetch rules for this entity
          const rulesResponse = await fetch(`/api/rules?entityId=${data.id}`);
          if (rulesResponse.ok) {
            const rulesData = await rulesResponse.json();
            
            // Count rules per attribute
            const rulesByAttribute: Record<string, number> = {};
            
            // First, check for rules that directly reference attributes by ID
            rulesData.forEach((rule: any) => {
              if (rule.attribute_id) {
                rulesByAttribute[rule.attribute_id] = (rulesByAttribute[rule.attribute_id] || 0) + 1;
              }
            });
            
            // Then, process rules that mention attributes in their expressions
            rulesData.forEach((rule: any) => {
              // Skip rules that already have an attribute_id to avoid double counting
              if (rule.attribute_id) return;
              
              // Extract attribute names from rule expressions
              const attributeMatches = [...(rule.condition_expression || '').matchAll(/\b([A-Za-z0-9_]+)\b/g)];
              
              // For each attribute name match, find the corresponding attribute ID
              attributeMatches.forEach(match => {
                const attrName = match[1];
                
                // Find the attribute with this name
                const matchingAttr = data.attributes.find(attr => 
                  attr.name.toLowerCase() === attrName.toLowerCase()
                );
                
                // If we found a matching attribute, increment its rule count
                if (matchingAttr) {
                  rulesByAttribute[matchingAttr.id] = (rulesByAttribute[matchingAttr.id] || 0) + 1;
                }
              });
            });
            
            console.log('Rules by attribute ID:', rulesByAttribute);
            setAttributeRules(rulesByAttribute);
          }
          
          // Fetch reference counts for attributes in this entity
          const referencesResponse = await fetch(`/api/attribute-references?entityId=${data.id}`);
          if (referencesResponse.ok) {
            const referencesData = await referencesResponse.json();
            if (referencesData.referenceCounts) {
              console.log('References by attribute ID:', referencesData.referenceCounts);
              setAttributeReferences(referencesData.referenceCounts);
            }
          }
          
          // Collect all referenced entity IDs from attributes
          const referencedEntityIds = new Set<string>();
          data.attributes.forEach(attr => {
            if ((attr.isForeignKey || attr.is_foreign_key) && attr.referencedEntity) {
              referencedEntityIds.add(attr.referencedEntity);
            } else if ((attr.isForeignKey || attr.is_foreign_key) && attr.referenced_entity_id) {
              referencedEntityIds.add(attr.referenced_entity_id);
            }
          });
          
          // If we have referenced entities, fetch their names
          if (referencedEntityIds.size > 0) {
            const entityIdsArray = Array.from(referencedEntityIds);
            const entityNamesResponse = await fetch(`/api/entity-names?ids=${entityIdsArray.join(',')}`);
            if (entityNamesResponse.ok) {
              const entityNamesData = await entityNamesResponse.json();
              if (entityNamesData.entityNames) {
                console.log('Entity names:', entityNamesData.entityNames);
                setEntityNames(entityNamesData.entityNames);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching entity data:', error);
        }
      };
      
      fetchEntityData();
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
                  onMouseEnter={async (e) => {
                    // Only show tooltip if the entity is selected
                    if (selected) {
                      // Get actual rule count for this attribute
                      const ruleCount = attributeRules[attr.id] || 0;
                      
                      // For foreign keys, fetch all entities that use this attribute name
                      let usageEntities: string[] = [];
                      if (isForeignKey && dataModelId) {
                        try {
                          // Check if we already have the usage data for this attribute name
                          if (!attributeUsage[attr.name]) {
                            const response = await fetch(`/api/attribute-usage?name=${attr.name}&dataModelId=${dataModelId}`);
                            if (response.ok) {
                              const data = await response.json();
                              if (data.entities && data.entities.length > 0) {
                                // Store the entity names that use this attribute
                                const entityNames = data.entities.map((entity: any) => entity.name);
                                setAttributeUsage(prev => ({
                                  ...prev,
                                  [attr.name]: entityNames
                                }));
                                usageEntities = entityNames;
                              }
                            }
                          } else {
                            usageEntities = attributeUsage[attr.name];
                          }
                        } catch (error) {
                          console.error('Error fetching attribute usage:', error);
                        }
                      }
                      
                      // Create enhanced attribute data for the tooltip with actual data
                      const enhancedAttr: AttributeData = {
                        id: attr.id,
                        name: attr.name,
                        dataType: attr.dataType || attr.data_type || '',
                        isPrimaryKey: isPrimaryKey,
                        isForeignKey: isForeignKey,
                        isRequired: isRequired,
                        isUnique: isUnique,
                        referencedEntity: attr.referencedEntity 
                          ? entityNames[attr.referencedEntity] || attr.referencedEntity 
                          : attr.referenced_entity_id 
                            ? entityNames[attr.referenced_entity_id] || attr.referenced_entity_id 
                            : undefined,
                        // Use the actual description from the database if available
                        description: attr.description || '',
                        // Use actual rule count
                        rules: ruleCount,
                        // Use actual reference count for primary keys
                        referencedBy: isPrimaryKey ? (attributeReferences[attr.id] || 0) : 0,
                        // Add the usage entities for foreign keys
                        usageEntities: isForeignKey ? usageEntities : undefined
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
                  onClick={() => {
                    // Only open edit modal if the entity is selected
                    if (selected) {
                      // Get actual rule count for this attribute
                      const ruleCount = attributeRules[attr.id] || 0;
                      
                      // Create enhanced attribute data for the modal
                      const enhancedAttr: AttributeData = {
                        id: attr.id,
                        name: attr.name,
                        dataType: attr.dataType || attr.data_type || '',
                        isPrimaryKey: isPrimaryKey,
                        isForeignKey: isForeignKey,
                        isRequired: isRequired,
                        isUnique: isUnique,
                        referencedEntity: attr.referencedEntity,
                        description: attr.description || '',
                        rules: ruleCount
                      };
                      
                      // Set the selected attribute and open the modal
                      setSelectedAttribute(enhancedAttr);
                      setShowQuickEditModal(true);
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
        
        {/* Add new attribute dropdown menu - only shown when entity is selected */}
        {selected && (
          <div className="flex justify-center mt-2 mb-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Add attribute options"
                >
                  <PlusCircle className="w-4 h-4 text-gray-300" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56 bg-gray-800 border-gray-700 text-gray-200">
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-700"
                  onClick={() => setShowNewAttributeModal(true)}
                >
                  <Database className="w-4 h-4" />
                  <span>Create standard attribute</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-700"
                  onClick={() => setShowForeignKeyModal(true)}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Create foreign key</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Attribute Tooltip - only show when entity is selected */}
        {selected && hoveredAttribute && tooltipPosition && ReactDOM.createPortal(
          <AttributeTooltip
            attribute={hoveredAttribute}
            entityName={data.name}
            position={tooltipPosition}
            onViewDetails={(attributeId: string) => {
              console.log('View details for attribute:', attributeId);
              // Navigate to attribute details page
              if (projectId && dataModelId && data.id) {
                window.location.href = `/protected/projects/${projectId}/models/${dataModelId}/entities/${data.id}/attributes/${attributeId}`;
              }
            }}
            onViewRelations={(attributeId: string) => {
              console.log('View relations for attribute:', attributeId);
              // This would typically show a modal or navigate to a relations view
            }}
            onGoToReferencedEntity={(entityName: string) => {
              console.log('Go to referenced entity:', entityName);
              // Find the entity by name and select it
              // This would typically involve finding the node ID and selecting it in the diagram
            }}
            onQuickEdit={(attributeId: string) => {
              console.log('Quick edit attribute:', attributeId);
              // Find the attribute by ID and open the quick edit modal
              const attr = data.attributes.find(a => a.id === attributeId);
              if (attr) {
                // Get actual rule count for this attribute
                const ruleCount = attributeRules[attr.id] || 0;
                
                // Create enhanced attribute data for the modal
                const isPrimaryKey = attr.isPrimaryKey || attr.is_primary_key;
                const isForeignKey = attr.isForeignKey || attr.is_foreign_key;
                const isRequired = attr.isRequired || attr.is_required;
                const isUnique = attr.isUnique || attr.is_unique;
                
                const enhancedAttr: AttributeData = {
                  id: attr.id,
                  name: attr.name,
                  dataType: attr.dataType || attr.data_type || '',
                  isPrimaryKey: isPrimaryKey,
                  isForeignKey: isForeignKey,
                  isRequired: isRequired,
                  isUnique: isUnique,
                  referencedEntity: attr.referencedEntity,
                  description: attr.description || '',
                  rules: ruleCount
                };
                
                // Set the selected attribute and open the modal
                setSelectedAttribute(enhancedAttr);
                setShowQuickEditModal(true);
              }
            }}
          />,
          document.getElementById('overlay-root') as HTMLElement
        )}
        
        {/* Quick Edit Attribute Modal */}
        {selected && selectedAttribute && ReactDOM.createPortal(
          <QuickEditAttributeModal
            open={showQuickEditModal}
            onOpenChange={setShowQuickEditModal}
            attribute={selectedAttribute}
            entityName={data.name}
            onSave={async (attributeData) => {
              console.log('Saving attribute:', attributeData);
              try {
                // Call the API to update the attribute
                const response = await fetch(`/api/attributes/${attributeData.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: attributeData.name,
                    description: attributeData.description,
                    dataType: attributeData.dataType,
                    isRequired: attributeData.isRequired,
                    isUnique: attributeData.isUnique,
                  }),
                });
                
                if (!response.ok) {
                  throw new Error('Failed to update attribute');
                }
                
                // Update the attribute in the node data
                const updatedAttributes = data.attributes.map(attr => {
                  if (attr.id === attributeData.id) {
                    return {
                      ...attr,
                      name: attributeData.name,
                      description: attributeData.description,
                      dataType: attributeData.dataType,
                      isRequired: attributeData.isRequired,
                      is_required: attributeData.isRequired,
                      isUnique: attributeData.isUnique,
                      is_unique: attributeData.isUnique,
                    };
                  }
                  return attr;
                });
                
                // Dispatch a custom event to update the node data
                const event = new CustomEvent('attribute-updated', {
                  detail: {
                    entityId: data.id,
                    attributes: updatedAttributes,
                  },
                });
                document.dispatchEvent(event);
                
                console.log('Attribute updated successfully');
              } catch (error) {
                console.error('Error updating attribute:', error);
                throw error;
              }
            }}
          />,
          document.getElementById('overlay-root') as HTMLElement
        )}
        
        {/* New Attribute Modal */}
        {selected && ReactDOM.createPortal(
          <AttributeModal
            open={showNewAttributeModal}
            onOpenChange={setShowNewAttributeModal}
            entityId={data.id}
            dataModelId={dataModelId}
            projectId={projectId}
            onSave={async (attributeData) => {
              console.log('Creating new attribute:', attributeData);
              try {
                // Get current attributes first
                const getResponse = await fetch(`/api/projects/${projectId}/models/${dataModelId}/entities/${data.id}/attributes`);
                if (!getResponse.ok) {
                  throw new Error('Failed to fetch current attributes');
                }
                
                const { attributes: currentAttributes } = await getResponse.json();
                console.log('Current attributes:', currentAttributes);
                
                // Prepare the new attribute in the correct format
                const newAttributeData = {
                  name: attributeData.name,
                  description: attributeData.description,
                  data_type: attributeData.dataType, // Note: using data_type instead of dataType
                  is_required: attributeData.isRequired, // Note: using is_required instead of isRequired
                  is_unique: attributeData.isUnique,
                  default_value: attributeData.defaultValue,
                  length: attributeData.length,
                  is_primary_key: attributeData.isPrimaryKey,
                  is_foreign_key: attributeData.isForeignKey,
                  // No need to include entity_id as it's in the URL
                };
                
                // Add the new attribute to the existing ones
                const updatedAttributes = [...currentAttributes, newAttributeData];
                
                // Call the API to update the attributes array
                const response = await fetch(`/api/projects/${projectId}/models/${dataModelId}/entities/${data.id}/attributes`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    attributes: updatedAttributes
                  }),
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to create attribute');
                }
                
                // Get the updated attributes from the response
                const { attributes: newAttributes } = await response.json();
                console.log('New attribute created:', newAttributes);
                
                // Find the newly created attribute (should be the last one)
                const newAttribute = newAttributes[newAttributes.length - 1];
                
                // Update the node data with all attributes from the response
                const nodeUpdatedAttributes = data.attributes.map(attr => ({
                  ...attr
                }));
                
                // Add the new attribute to the node data
                nodeUpdatedAttributes.push({
                  id: newAttribute.id,
                  name: newAttribute.name,
                  dataType: newAttribute.data_type,
                  description: newAttribute.description,
                  isRequired: newAttribute.is_required,
                  is_required: newAttribute.is_required,
                  isUnique: newAttribute.is_unique,
                  is_unique: newAttribute.is_unique,
                  isPrimaryKey: newAttribute.is_primary_key,
                  is_primary_key: newAttribute.is_primary_key,
                  isForeignKey: newAttribute.is_foreign_key,
                  is_foreign_key: newAttribute.is_foreign_key,
                });
                
                // Dispatch a custom event to update the node data
                const event = new CustomEvent('attribute-updated', {
                  detail: {
                    entityId: data.id,
                    attributes: nodeUpdatedAttributes,
                  },
                });
                document.dispatchEvent(event);
                
                console.log('Attribute created and node updated successfully');
              } catch (error) {
                console.error('Error creating attribute:', error);
                throw error;
              }
            }}
          />,
          document.getElementById('overlay-root') as HTMLElement
        )}
        
        {/* Foreign Key Modal */}
        {selected && ReactDOM.createPortal(
          <ForeignKeyModal
            open={showForeignKeyModal}
            onOpenChange={setShowForeignKeyModal}
            entityId={data.id}
            dataModelId={dataModelId}
            projectId={projectId}
            onSave={async (foreignKeyData) => {
              console.log('Creating new foreign key:', foreignKeyData);
              try {
                // Instead of using the PUT endpoint for attributes, we'll use the dedicated
                // POST endpoint for creating attributes which also handles relationships
                const response = await fetch('/api/attributes', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: foreignKeyData.name,
                    description: foreignKeyData.description,
                    dataType: 'integer', // Foreign keys are typically integers
                    entityId: data.id,
                    isRequired: foreignKeyData.isRequired,
                    isForeignKey: true,
                    referencedEntityId: foreignKeyData.referencedEntityId,
                  }),
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to create foreign key');
                }
                
                // Get the updated attributes from the response
                const responseData = await response.json();
                const newAttributes = responseData.attributes || [];
                console.log('New foreign key created:', newAttributes);
                
                // Find the newly created foreign key (should be the last one)
                const newForeignKey = newAttributes.length > 0 ? newAttributes[newAttributes.length - 1] : null;
                
                // If we couldn't get the new foreign key from the response, don't proceed with UI updates
                if (!newForeignKey) {
                  console.warn('Foreign key was created but response did not contain the expected data');
                  return;
                }
                
                // Update the node data with all attributes from the response
                const nodeUpdatedAttributes = data.attributes.map(attr => ({
                  ...attr
                }));
                
                // Add the new foreign key to the node data
                nodeUpdatedAttributes.push({
                  id: newForeignKey.id,
                  name: newForeignKey.name,
                  dataType: newForeignKey.data_type,
                  description: newForeignKey.description,
                  isRequired: newForeignKey.is_required,
                  is_required: newForeignKey.is_required,
                  isUnique: newForeignKey.is_unique,
                  is_unique: newForeignKey.is_unique,
                  isPrimaryKey: newForeignKey.is_primary_key,
                  is_primary_key: newForeignKey.is_primary_key,
                  isForeignKey: true,
                  is_foreign_key: true,
                  referencedEntity: newForeignKey.referenced_entity_id,
                });
                
                // Dispatch a custom event to update the node data
                const event = new CustomEvent('attribute-updated', {
                  detail: {
                    entityId: data.id,
                    attributes: nodeUpdatedAttributes,
                  },
                });
                document.dispatchEvent(event);
                
                console.log('Foreign key created and node updated successfully');
              } catch (error) {
                console.error('Error creating foreign key:', error);
                throw error;
              }
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
