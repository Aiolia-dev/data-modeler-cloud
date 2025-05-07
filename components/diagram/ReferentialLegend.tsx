"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Referential {
  id: string;
  name: string;
  color: string;
  entityCount?: number;
}

interface ReferentialLegendProps {
  referentials: Referential[];
  visible: boolean;
}

export function ReferentialLegend({ referentials, visible }: ReferentialLegendProps) {
  // Only hide if not visible, but show even when there are no referentials
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute left-0 top-[80px] bottom-0 w-48 bg-gray-900/80 backdrop-blur-sm border-r border-gray-800 z-10 overflow-hidden rounded-tr-md">
      <div className="p-4">
        {/* Diagram Info Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Diagram Legend</h3>
          <div className="space-y-3">
            <div className="ml-2.5">
              <h4 className="text-xs font-medium text-gray-300 mb-1">Entity Nodes</h4>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-sm bg-gray-700 border border-gray-600 flex-shrink-0" />
                <span className="text-xs text-gray-300">Standard Entity</span>
              </div>
            </div>
            
            <div className="ml-2.5">
              <h4 className="text-xs font-medium text-gray-300 mb-1">Attributes</h4>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-400 text-xs">🔑</span>
                <span className="text-xs text-purple-300">Primary Key</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-400 text-xs">🔗</span>
                <span className="text-xs text-blue-300">Foreign Key</span>
              </div>
            </div>
            
            <div className="ml-2.5">
              <h4 className="text-xs font-medium text-gray-300 mb-1">Attribute Labels</h4>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="h-4 text-[0.6rem] px-1 py-0 border-red-500 text-red-400">Req</Badge>
                <span className="text-xs text-gray-300">Required</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="h-4 text-[0.6rem] px-1 py-0 border-yellow-500 text-yellow-400">Unq</Badge>
                <span className="text-xs text-gray-300">Unique</span>
              </div>
            </div>
            
            <div className="ml-2.5">
              <h4 className="text-xs font-medium text-gray-300 mb-1">Relationships</h4>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-300">Relationship</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Referentials Legend Section */}
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Referentials Legend</h3>
        <ScrollArea className="h-[calc(100vh-500px)]">
          <div className="space-y-2 ml-2.5">
            {referentials.length > 0 ? (
              referentials.map((ref) => (
                <div key={ref.id} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: ref.color || '#374151' }}
                  />
                  <span className="text-xs text-gray-300 truncate" title={ref.name}>
                    {ref.name}
                  </span>
                  {ref.entityCount !== undefined && (
                    <span className="text-xs text-gray-500 ml-auto">
                      ({ref.entityCount})
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 italic">
                No referentials defined yet
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
