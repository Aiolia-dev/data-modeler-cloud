"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type OptimizationAlgorithm = "sugiyama" | "referential" | "option3";

interface OptimizationSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAlgorithm: (algorithm: OptimizationAlgorithm) => void;
}

export function OptimizationSelectionModal({
  open,
  onOpenChange,
  onSelectAlgorithm,
}: OptimizationSelectionModalProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<OptimizationAlgorithm>("sugiyama");

  const handleConfirm = () => {
    onSelectAlgorithm(selectedAlgorithm);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Select Optimization Algorithm
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup
            value={selectedAlgorithm}
            onValueChange={(value) => setSelectedAlgorithm(value as OptimizationAlgorithm)}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-3 rounded-md hover:bg-gray-800/50 cursor-pointer">
              <RadioGroupItem
                value="sugiyama"
                id="sugiyama"
                className="border-gray-500 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
              />
              <div className="space-y-1.5">
                <Label
                  htmlFor="sugiyama"
                  className="text-base font-medium cursor-pointer"
                >
                  Sugiyama Algorithm
                </Label>
                <p className="text-sm text-gray-400">
                  Hierarchical layout that minimizes edge crossings and organizes entities in layers.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-md hover:bg-gray-800/50 cursor-pointer">
              <RadioGroupItem
                value="referential"
                id="referential"
                className="border-gray-500 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
              />
              <div className="space-y-1.5">
                <Label
                  htmlFor="referential"
                  className="text-base font-medium cursor-pointer"
                >
                  By Referential Cluster
                </Label>
                <p className="text-sm text-gray-400">
                  Groups entities by their referential assignments for better domain organization.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-md hover:bg-gray-800/50 cursor-pointer">
              <RadioGroupItem
                value="option3"
                id="option3"
                className="border-gray-500 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
              />
              <div className="space-y-1.5">
                <Label
                  htmlFor="option3"
                  className="text-base font-medium cursor-pointer"
                >
                  Option 3
                </Label>
                <p className="text-sm text-gray-400">
                  Alternative optimization method (details to be provided).
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between border-t border-gray-800 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-gray-600 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Apply Optimization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
