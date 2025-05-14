import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas';
import { EntityNode } from '@/components/diagram/EntityNode';
import { RelationshipEdge } from '@/components/diagram/RelationshipEdge';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

type ModelPreviewProps = {
  previewData: {
    entities: any[];
    attributes: Record<string, any[]>;
    referentials: any[];
    relationships: any[];
    rules: any[];
  };
};

export function ModelPreview({ previewData }: ModelPreviewProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('diagram');

  // Prepare the diagram data when the preview data changes
  useEffect(() => {
    if (!previewData) return;

    // Create nodes for each entity
    const diagramNodes = previewData.entities.map((entity) => ({
      id: entity.id,
      type: 'entityNode',
      position: { x: entity.position_x || 100, y: entity.position_y || 100 },
      data: {
        entity,
        attributes: previewData.attributes[entity.id] || [],
        referential: previewData.referentials.find((ref) => ref.id === entity.referential_id),
      },
    }));

    // Create edges for each relationship
    const diagramEdges = previewData.relationships.map((relationship) => ({
      id: relationship.id || `edge-${relationship.source_entity_id}-${relationship.target_entity_id}`,
      source: relationship.source_entity_id,
      target: relationship.target_entity_id,
      type: 'relationshipEdge',
      data: {
        relationship,
        sourceEntity: previewData.entities.find((e) => e.id === relationship.source_entity_id),
        targetEntity: previewData.entities.find((e) => e.id === relationship.target_entity_id),
      },
    }));

    setNodes(diagramNodes);
    setEdges(diagramEdges);
  }, [previewData]);

  // Define the node types for ReactFlow
  const nodeTypes = {
    entityNode: EntityNode,
  };

  // Define the edge types for ReactFlow
  const edgeTypes = {
    relationshipEdge: RelationshipEdge,
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Model Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="diagram">
              Diagram
              <Badge variant="secondary" className="ml-2">
                {previewData.entities.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="entities">
              Entities
              <Badge variant="secondary" className="ml-2">
                {previewData.entities.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="relationships">
              Relationships
              <Badge variant="secondary" className="ml-2">
                {previewData.relationships.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="referentials">
              Referentials
              <Badge variant="secondary" className="ml-2">
                {previewData.referentials.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diagram" className="h-[500px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </TabsContent>

          <TabsContent value="entities">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewData.entities.map((entity) => (
                <Card key={entity.id} className="p-4">
                  <h3 className="text-lg font-semibold">{entity.name}</h3>
                  <p className="text-sm text-muted-foreground">{entity.description || 'No description'}</p>
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Attributes:</h4>
                    <ul className="mt-1 space-y-1">
                      {(previewData.attributes[entity.id] || []).map((attr) => (
                        <li key={attr.id || attr.name} className="text-sm">
                          <span className="font-mono">{attr.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({attr.data_type})
                            {attr.is_primary_key && ' 🔑'}
                            {attr.is_required && ' *'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="relationships">
            <div className="space-y-2">
              {previewData.relationships.map((relationship) => {
                const sourceEntity = previewData.entities.find(
                  (e) => e.id === relationship.source_entity_id
                );
                const targetEntity = previewData.entities.find(
                  (e) => e.id === relationship.target_entity_id
                );
                return (
                  <Card key={relationship.id || `${relationship.source_entity_id}-${relationship.target_entity_id}`} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{sourceEntity?.name || 'Unknown'}</span>
                        <span className="mx-2">→</span>
                        <span className="font-medium">{targetEntity?.name || 'Unknown'}</span>
                      </div>
                      <Badge>{relationship.relationship_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {relationship.name || `Relationship between ${sourceEntity?.name || 'Unknown'} and ${targetEntity?.name || 'Unknown'}`}
                    </p>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="referentials">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewData.referentials.map((referential) => (
                <Card key={referential.id} className="p-4">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{ backgroundColor: referential.color }}
                    ></div>
                    <h3 className="text-lg font-semibold">{referential.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {referential.description || 'No description'}
                  </p>
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Entities:</h4>
                    <ul className="mt-1 space-y-1">
                      {previewData.entities
                        .filter((entity) => entity.referential_id === referential.id)
                        .map((entity) => (
                          <li key={entity.id} className="text-sm">
                            {entity.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
