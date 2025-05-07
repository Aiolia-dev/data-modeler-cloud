"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileTextIcon, GitBranchIcon, ArrowRightIcon, PenIcon } from 'lucide-react';

export interface AttributeData {
  id: string;
  name: string;
  dataType: string;
  isPrimaryKey?: boolean;
  is_primary_key?: boolean;
  isForeignKey?: boolean;
  is_foreign_key?: boolean;
  isRequired?: boolean;
  is_required?: boolean;
  isUnique?: boolean;
  is_unique?: boolean;
  referencedEntity?: string;
  description?: string;
  rules?: number;
  referencedBy?: number;
}

interface AttributeTooltipProps {
  attribute: AttributeData;
  entityName: string;
  position: { x: number; y: number };
  onViewDetails?: (attributeId: string) => void;
  onViewRelations?: (attributeId: string) => void;
  onGoToReferencedEntity?: (entityName: string) => void;
  onQuickEdit?: (attributeId: string) => void;
}

export const AttributeTooltip: React.FC<AttributeTooltipProps> = ({
  attribute,
  entityName,
  position,
  onViewDetails,
  onViewRelations,
  onGoToReferencedEntity,
  onQuickEdit
}) => {
  // Normalize attribute properties
  const isPrimaryKey = attribute.isPrimaryKey || attribute.is_primary_key;
  const isForeignKey = attribute.isForeignKey || attribute.is_foreign_key;
  const isRequired = attribute.isRequired || attribute.is_required;
  const isUnique = attribute.isUnique || attribute.is_unique;
  
  return (
    <div 
      className="absolute z-50 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-4 w-80"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(20px, -50%)'
      }}
    >
      {/* Connecting line */}
      <div 
        className="absolute w-5 h-0.5 bg-gray-700"
        style={{
          left: '-20px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      ></div>
      
      {/* Header Section */}
      <div className="mb-3 border-b border-gray-700 pb-2">
        <h3 className="text-lg font-semibold text-white">{attribute.name}</h3>
        <p className="text-sm text-gray-400">in {entityName}</p>
      </div>
      
      {/* Technical Specifications */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-400 mb-1">Data Type:</p>
          <Badge 
            variant="outline" 
            className={`bg-opacity-20 ${getDataTypeColor(attribute.dataType)}`}
          >
            {attribute.dataType || 'Unknown'}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Key Type:</p>
          {isPrimaryKey && (
            <Badge className="bg-purple-600 text-white">Primary Key</Badge>
          )}
          {isForeignKey && (
            <Badge className="bg-blue-600 text-white">Foreign Key</Badge>
          )}
          {!isPrimaryKey && !isForeignKey && (
            <Badge variant="outline" className="text-gray-400">Standard</Badge>
          )}
        </div>
      </div>
      
      {/* Constraints */}
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-1">Constraints:</p>
        <div className="flex flex-wrap gap-1">
          {isRequired && (
            <Badge variant="outline" className="border-red-500 text-red-400">Required</Badge>
          )}
          {isUnique && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-400">Unique</Badge>
          )}
          {!isRequired && !isUnique && (
            <span className="text-sm text-gray-400">None</span>
          )}
        </div>
      </div>
      
      {/* Contextual Information */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {attribute.rules !== undefined && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Rules:</p>
            <Badge variant="secondary" className="bg-gray-800">
              {attribute.rules} {attribute.rules === 1 ? 'rule' : 'rules'}
            </Badge>
          </div>
        )}
        {attribute.referencedBy !== undefined && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Referenced By:</p>
            <Badge variant="secondary" className="bg-gray-800">
              {attribute.referencedBy} {attribute.referencedBy === 1 ? 'entity' : 'entities'}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Foreign Key Reference */}
      {isForeignKey && attribute.referencedEntity && (
        <div className="mb-3 p-2 bg-blue-900 bg-opacity-20 border border-blue-800 rounded">
          <p className="text-xs text-gray-400 mb-1">References:</p>
          <p className="text-sm text-white">{attribute.referencedEntity}</p>
        </div>
      )}
      
      {/* Description */}
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-1">Description:</p>
        <p className="text-sm text-gray-300">
          {attribute.description || `${attribute.name} field in ${entityName}`}
        </p>
      </div>
      
      {/* Quick Actions */}
      <div className="flex gap-2 mt-4">
        {/* Quick Edit Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 text-xs text-green-400 border-green-800"
          onClick={() => onQuickEdit?.(attribute.id)}
        >
          <PenIcon className="h-3 w-3 mr-1" />
          Quick Edit
        </Button>
        
        {isForeignKey && attribute.referencedEntity && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs text-blue-400 border-blue-800"
            onClick={() => onGoToReferencedEntity?.(attribute.referencedEntity!)}
          >
            <ArrowRightIcon className="h-3 w-3 mr-1" />
            Go to Ref
          </Button>
        )}
      </div>
    </div>
  );
};

// Helper function to get color based on data type
function getDataTypeColor(dataType: string | undefined): string {
  if (!dataType) return 'bg-gray-600 text-gray-200';
  
  const type = dataType.toLowerCase();
  if (type.includes('int') || type.includes('number') || type.includes('float') || type.includes('decimal')) {
    return 'bg-green-600 text-green-200';
  } else if (type.includes('varchar') || type.includes('text') || type.includes('char') || type.includes('string')) {
    return 'bg-blue-600 text-blue-200';
  } else if (type.includes('date') || type.includes('time')) {
    return 'bg-yellow-600 text-yellow-200';
  } else if (type.includes('bool')) {
    return 'bg-purple-600 text-purple-200';
  } else if (type.includes('uuid') || type.includes('id')) {
    return 'bg-indigo-600 text-indigo-200';
  } else {
    return 'bg-gray-600 text-gray-200';
  }
}
