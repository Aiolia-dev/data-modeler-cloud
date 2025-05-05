"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileIcon, FileSpreadsheetIcon, FileText, File, FileJson } from "lucide-react";

export type ExportFormat = "csv" | "excel" | "json";

interface ExportModelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: ExportFormat) => void;
  projectId: string;
  dataModelId: string;
}

export function ExportModelModal({
  open,
  onOpenChange,
  onExport,
  projectId,
  dataModelId,
}: ExportModelModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await onExport(selectedFormat);
      onOpenChange(false);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl">Export Data Model</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose a format to export your data model
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedFormat}
            onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2 rounded-md border border-gray-700 p-3 hover:bg-gray-800">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileIcon className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-medium">CSV File</p>
                  <p className="text-xs text-gray-400">Export as comma-separated values</p>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 rounded-md border border-gray-700 p-3 hover:bg-gray-800">
              <RadioGroupItem value="excel" id="excel" />
              <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileSpreadsheetIcon className="h-5 w-5 text-green-400" />
                <div>
                  <p className="font-medium">Excel File</p>
                  <p className="text-xs text-gray-400">Export as Excel spreadsheet with formatting</p>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 rounded-md border border-gray-700 p-3 hover:bg-gray-800">
              <RadioGroupItem value="json" id="json" />
              <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileJson className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-medium">JSON File</p>
                  <p className="text-xs text-gray-400">Export as complete data model JSON</p>
                </div>
              </Label>
            </div>
            

          </RadioGroup>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded-md mb-4 text-sm">
            <p className="font-semibold mb-1">Export failed</p>
            <p>{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-700"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
