import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Referential {
  id: string;
  name: string;
  isSelected: boolean;
  entityCount?: number;
}

interface ReferentialSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  referentials: Referential[];
  showEntitiesWithoutReferential: boolean;
  entitiesWithoutReferentialCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleReferential: (id: string) => void;
  onToggleEntitiesWithoutReferential: () => void;
  onApply: () => void;
}

export function ReferentialSelectionModal({
  isOpen,
  onClose,
  referentials,
  showEntitiesWithoutReferential,
  entitiesWithoutReferentialCount,
  onSelectAll,
  onDeselectAll,
  onToggleReferential,
  onToggleEntitiesWithoutReferential,
  onApply,
}: ReferentialSelectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Display Referentials</DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-between mb-4">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={onDeselectAll}>
            Deselect All
          </Button>
        </div>
        
        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3">
            {/* Special checkbox for entities without referential */}
            <div className="flex items-center space-x-2 py-1 border-b border-gray-200 pb-3 mb-2">
              <Checkbox 
                id="entities-without-referential" 
                checked={showEntitiesWithoutReferential} 
                onCheckedChange={onToggleEntitiesWithoutReferential}
              />
              <Label 
                htmlFor="entities-without-referential"
                className="cursor-pointer flex-grow font-medium"
              >
                Entities without referential ({entitiesWithoutReferentialCount})
              </Label>
            </div>
            
            {/* Regular referentials */}
            {referentials.map((referential) => (
              <div key={referential.id} className="flex items-center space-x-2 py-1">
                <Checkbox 
                  id={`referential-${referential.id}`} 
                  checked={referential.isSelected} 
                  onCheckedChange={() => onToggleReferential(referential.id)}
                />
                <Label 
                  htmlFor={`referential-${referential.id}`}
                  className="cursor-pointer flex-grow"
                >
                  {referential.name} ({referential.entityCount || 0})
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
