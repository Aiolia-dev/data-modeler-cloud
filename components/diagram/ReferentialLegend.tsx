"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  if (!visible || referentials.length === 0) {
    return null;
  }

  return (
    <div className="absolute left-0 top-[80px] bottom-0 w-48 bg-gray-900/80 backdrop-blur-sm border-r border-gray-800 z-10 overflow-hidden rounded-tr-md">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Referentials Legend</h3>
        <ScrollArea className="h-[calc(100vh-330px)]">
          <div className="space-y-2">
            {referentials.map((ref) => (
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
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
