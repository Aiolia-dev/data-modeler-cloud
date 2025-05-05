"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

export function SettingsModal({ open, onOpenChange, projectId }: SettingsModalProps) {
  // State for active tab
  const [activeTab, setActiveTab] = useState("diagram");
  
  // Get settings from context
  const { diagramSettings, updateDiagramSettings, resetDiagramSettings, isDarkMode, toggleDarkMode } = useSettings();
  
  // Local state for diagram settings
  const [showEntityAttributes, setShowEntityAttributes] = useState(diagramSettings.showEntityAttributes);
  const [showPrimaryKeys, setShowPrimaryKeys] = useState(diagramSettings.showPrimaryKeys);
  const [showForeignKeys, setShowForeignKeys] = useState(diagramSettings.showForeignKeys);
  const [showStandardAttributes, setShowStandardAttributes] = useState(diagramSettings.showStandardAttributes);
  const [showRelationshipNames, setShowRelationshipNames] = useState(diagramSettings.showRelationshipNames);
  const [showCardinalityIndicators, setShowCardinalityIndicators] = useState(diagramSettings.showCardinalityIndicators);
  const [showForeignKeyIndicators, setShowForeignKeyIndicators] = useState(diagramSettings.showForeignKeyIndicators);
  const [showAttributeTypeMarkers, setShowAttributeTypeMarkers] = useState(diagramSettings.showAttributeTypeMarkers);
  
  // General settings
  const [darkMode, setDarkMode] = useState(isDarkMode);
  const [autoSave, setAutoSave] = useState(true);
  
  // User role state
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const { toast } = useToast();
  
  // Update local state when settings change or modal opens
  useEffect(() => {
    if (open) {
      setShowEntityAttributes(diagramSettings.showEntityAttributes);
      setShowPrimaryKeys(diagramSettings.showPrimaryKeys);
      setShowForeignKeys(diagramSettings.showForeignKeys);
      setShowStandardAttributes(diagramSettings.showStandardAttributes);
      setShowRelationshipNames(diagramSettings.showRelationshipNames);
      setShowCardinalityIndicators(diagramSettings.showCardinalityIndicators);
      setShowForeignKeyIndicators(diagramSettings.showForeignKeyIndicators);
      setShowAttributeTypeMarkers(diagramSettings.showAttributeTypeMarkers);
      setDarkMode(isDarkMode);
      
      // Fetch user role when modal opens
      if (projectId) {
        fetchUserRole();
      }
    }
  }, [open, diagramSettings, projectId, isDarkMode]);
  
  // Fetch the current user's role for this project
  const fetchUserRole = async () => {
    if (!projectId) return;
    
    setRoleLoading(true);
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return;
      }
      
      // Handle potential undefined email with null fallback
      setUserEmail(user.email || null);
      
      // Get user's role for this project
      const { data: membership, error: membershipError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('email', user.email)
        .single();
      
      if (membershipError) {
        console.error('Error fetching user role:', membershipError);
        return;
      }
      
      if (membership) {
        setUserRole(membership.role);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your role for this project.",
        variant: "destructive",
      });
    } finally {
      setRoleLoading(false);
    }
  };
  
  // Handle save - update settings in context and close modal
  const handleSave = () => {
    console.log("Saving settings...");
    
    // Update settings in context (which will save to localStorage)
    updateDiagramSettings({
      showEntityAttributes,
      showPrimaryKeys,
      showForeignKeys,
      showStandardAttributes,
      showRelationshipNames,
      showCardinalityIndicators,
      showForeignKeyIndicators,
      showAttributeTypeMarkers
    });
    
    // Update dark mode if changed
    if (darkMode !== isDarkMode) {
      toggleDarkMode();
    }
    
    // Close the modal
    onOpenChange(false);
    
    toast({
      title: "Settings saved",
      description: "Your settings have been updated.",
    });
  };
  
  // Handle reset to defaults
  const handleReset = () => {
    console.log("Resetting settings to defaults...");
    
    // Reset diagram settings in local state
    setShowEntityAttributes(true);
    setShowPrimaryKeys(true);
    setShowForeignKeys(true);
    setShowStandardAttributes(false);
    setShowRelationshipNames(true);
    setShowCardinalityIndicators(true);
    setShowForeignKeyIndicators(true);
    setShowAttributeTypeMarkers(true);
    
    // Reset general settings
    setDarkMode(true); // Default to dark mode
    setAutoSave(true);
    
    // If not in dark mode, toggle it back to dark
    if (!isDarkMode) {
      toggleDarkMode();
    }
    
    toast({
      title: "Settings reset",
      description: "Your settings have been reset to defaults.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-bold text-white">Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="diagram" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none bg-[#272E3F]">
            <TabsTrigger 
              value="general" 
              className="rounded-none data-[state=active]:bg-[#1E2330] data-[state=active]:text-white"
            >
              General
            </TabsTrigger>
            <TabsTrigger 
              value="diagram" 
              className="rounded-none data-[state=active]:bg-[#1E2330] data-[state=active]:text-white"
            >
              Diagram
            </TabsTrigger>
          </TabsList>
          
          {/* General Settings Tab */}
          <TabsContent value="general" className="p-6 pt-4">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-base text-white">Dark Mode</Label>
                <Switch 
                  id="dark-mode" 
                  checked={darkMode} 
                  onCheckedChange={(checked) => {
                    setDarkMode(checked);
                  }} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-save" className="text-base text-white">Auto-Save Changes</Label>
                <Switch 
                  id="auto-save" 
                  checked={autoSave} 
                  onCheckedChange={setAutoSave} 
                />
              </div>
              
              {/* User Role Badge */}
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Your Access Level</h3>
                <div className="flex items-center space-x-2">
                  {roleLoading ? (
                    <div className="text-sm text-gray-400">Loading...</div>
                  ) : userRole ? (
                    <>
                      <Badge 
                        className={`px-2 py-1 ${userRole === 'owner' ? 'bg-blue-600' : userRole === 'editor' ? 'bg-green-600' : 'bg-gray-600'}`}
                      >
                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      </Badge>
                      <span className="text-sm text-gray-400">{userEmail}</span>
                    </>
                  ) : (
                    <div className="text-sm text-gray-400">No role assigned</div>
                  )}
                </div>
              </div>
              
              {/* Additional general settings would go here */}
            </div>
          </TabsContent>
          
          {/* Diagram Settings Tab */}
          <TabsContent value="diagram" className="p-6 pt-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-white">Diagram Elements Visibility</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="entity-attributes" className="text-base text-white">Entity Attributes</Label>
                    <Switch 
                      id="entity-attributes" 
                      checked={showEntityAttributes} 
                      onCheckedChange={setShowEntityAttributes} 
                    />
                  </div>
                  
                  {showEntityAttributes && (
                    <div className="ml-6 p-4 bg-[#131824] rounded-md">
                      <p className="mb-2 text-sm text-gray-300">Show attributes by type:</p>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="primary-keys" 
                            checked={showPrimaryKeys} 
                            onCheckedChange={(checked) => setShowPrimaryKeys(checked as boolean)} 
                            className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label htmlFor="primary-keys" className="text-white">Primary Keys</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="foreign-keys" 
                            checked={showForeignKeys} 
                            onCheckedChange={(checked) => setShowForeignKeys(checked as boolean)} 
                            className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label htmlFor="foreign-keys" className="text-white">Foreign Keys</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="standard-attributes" 
                            checked={showStandardAttributes} 
                            onCheckedChange={(checked) => setShowStandardAttributes(checked as boolean)} 
                            className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Label htmlFor="standard-attributes" className="text-white">Standard Attributes</Label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="relationship-names" className="text-base text-white">Relationship Names</Label>
                    <Switch 
                      id="relationship-names" 
                      checked={showRelationshipNames} 
                      onCheckedChange={setShowRelationshipNames} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cardinality-indicators" className="text-base text-white">Cardinality Indicators</Label>
                    <Switch 
                      id="cardinality-indicators" 
                      checked={showCardinalityIndicators} 
                      onCheckedChange={setShowCardinalityIndicators} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="foreign-key-indicators" className="text-base text-white">Foreign Key Indicators</Label>
                    <Switch 
                      id="foreign-key-indicators" 
                      checked={showForeignKeyIndicators} 
                      onCheckedChange={setShowForeignKeyIndicators} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="attribute-type-markers" className="text-base text-white">Attribute Type Markers (PK, FK)</Label>
                    <Switch 
                      id="attribute-type-markers" 
                      checked={showAttributeTypeMarkers} 
                      onCheckedChange={setShowAttributeTypeMarkers} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between p-6 pt-4 bg-[#131824] border-t border-[#272E3F]">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-gray-600 hover:bg-[#272E3F] hover:text-white"
          >
            Cancel
          </Button>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="bg-transparent border-gray-600 hover:bg-[#272E3F] hover:text-white"
            >
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
