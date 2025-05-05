"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, TableIcon, DownloadIcon, SettingsIcon } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";

interface DataModel {
  id: string;
  name: string;
  description: string | null;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: string;
}

interface Entity {
  id: string;
  name: string;
  description: string | null;
  data_model_id: string;
  created_at: string;
  updated_at: string;
}

interface DataModelTabsProps {
  dataModel: DataModel;
  entities: Entity[];
}

export default function DataModelTabs({ dataModel, entities }: DataModelTabsProps) {
  const [activeTab, setActiveTab] = useState("entities");

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div></div> {/* Empty div for spacing */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <DownloadIcon size={16} />
            Export
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <SettingsIcon size={16} />
            Settings
          </Button>
        </div>
      </div>
      
      <Tabs.Root defaultValue="entities" onValueChange={setActiveTab}>
        <Tabs.List className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-4">
          <Tabs.Trigger 
            value="entities" 
            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Entities
          </Tabs.Trigger>
          <Tabs.Trigger 
            value="diagram"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            Diagram
          </Tabs.Trigger>
          <Tabs.Trigger 
            value="sql"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            SQL
          </Tabs.Trigger>
        </Tabs.List>
        
        <Tabs.Content value="entities" className="mt-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Entities</h2>
            <Button className="flex items-center gap-2">
              <PlusIcon size={16} />
              Add Entity
            </Button>
          </div>
          
          {entities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted rounded-full p-6 mb-4">
                <TableIcon size={48} className="text-muted-foreground" />
              </div>
              <h2 className="text-xl font-medium mb-2">No entities yet</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Start building your data model by adding entities.
              </p>
              <Button className="flex items-center gap-2">
                <PlusIcon size={16} />
                Create First Entity
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entities.map((entity) => (
                <div 
                  key={entity.id} 
                  className="border rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <h3 className="font-medium text-lg">{entity.name}</h3>
                  {entity.description && (
                    <p className="text-muted-foreground text-sm mt-1">{entity.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>
        
        <Tabs.Content value="diagram" className="mt-2">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              Entity relationship diagram will be displayed here once you have entities.
            </p>
          </div>
        </Tabs.Content>
        
        <Tabs.Content value="sql" className="mt-2">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              SQL schema will be generated here based on your data model.
            </p>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
