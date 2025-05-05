"use client";

import React, { useState, useEffect } from "react";
import pluralize from "pluralize";

// Helper: turn cardinality and entity name into a phrase
function cardinalityToPhrase(cardinality: string | undefined, entityName: string, plural: boolean, isTargetEntity: boolean = false, forceJoinLogic: boolean = false): string {
  const isJoinEntity = entityName.includes('_');
  const entity = plural ? pluralize(entityName) : entityName;

  // If forceJoinLogic is set, apply strict join entity logic
  if (forceJoinLogic) {
    if (isTargetEntity) {
      // Standard entity side: always 0 or many
      return `0 or many ${entity}`;
    } else {
      // Join entity side: always 0 or 1
      return `0 or 1 ${entityName}`;
    }
  }

  // Standard cardinality handling
  if (!cardinality || cardinality === "1") return `only 1 ${entityName}`;
  if (["0..1"].includes(cardinality)) return `0 or 1 ${entityName}`;
  if (["0..n", "0..*"].includes(cardinality)) return `0 or more ${entity}`;
  if (["1..n", "1..*"].includes(cardinality)) return `1 or more ${entity}`;
  return `${cardinality} ${entity}`;
}

// Helper: plain English for both directions
function plainEnglishRelationship(source: string, target: string, sourceCard: string | undefined, targetCard: string | undefined): string {
  const isSourceJoinEntity = source.includes('_');
  const isTargetJoinEntity = target.includes('_');

  // If this is a join entity to standard entity relationship, force correct cardinality
  if ((isSourceJoinEntity && !isTargetJoinEntity) || (!isSourceJoinEntity && isTargetJoinEntity)) {
    // Join entity is always the source or target, standard entity is the other
    const sourceToTarget = `${source} can have ${cardinalityToPhrase(targetCard, target, true, false, true)}`;
    const targetToSource = `${target} can have ${cardinalityToPhrase(sourceCard, source, true, true, true)}`;
    return `${sourceToTarget}, and ${targetToSource}.`;
  }

  // Otherwise, use standard logic
  const sourceToTarget = `${source} can have ${cardinalityToPhrase(targetCard, target, true, false)}`;
  const targetToSource = `${target} can have ${cardinalityToPhrase(sourceCard, source, true, true)}`;
  return `${sourceToTarget}, and ${targetToSource}.`;
}

import { Button } from "@/components/ui/button";
import { PlusIcon, ExternalLinkIcon, ArrowRightIcon, ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface Relationship {
  id: string;
  name: string;
  sourceEntityId: string;
  sourceEntityName: string;
  targetEntityId: string;
  targetEntityName: string;
  isRequired: boolean;
  dataType: string;
  type: string;
  sourceCardinality?: string;
  targetCardinality?: string;
}

interface RelationshipTableProps {
  entityId: string;
  dataModelId: string;
  projectId: string;
}

export default function RelationshipTable({
  entityId,
  dataModelId,
  projectId,
}: RelationshipTableProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/relationships?entityId=${entityId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch relationships: ${response.statusText}`);
        }
        
        const data = await response.json();
        setRelationships(data.relationships || []);
      } catch (err) {
        console.error("Error fetching relationships:", err);
        setError("Failed to load relationships. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRelationships();
  }, [entityId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Relationships</h3>
          <Skeleton className="h-9 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border rounded-md p-4 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/15 text-destructive p-4 rounded-md">
        <p>{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Filter relationships where this entity is the source
  const outgoingRelationships = relationships.filter(
    (rel) => rel.sourceEntityId === entityId
  );

  // Filter relationships where this entity is the target
  const incomingRelationships = relationships.filter(
    (rel) => rel.targetEntityId === entityId
  );

  if (relationships.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Relationships</h3>
          <Button 
            size="sm" 
            onClick={() => {
              // Switch to the attributes tab and open foreign key modal
              const attributesTab = document.querySelector('[value="attributes"]');
              if (attributesTab) {
                (attributesTab as HTMLElement).click();
                // Wait for tab to change
                setTimeout(() => {
                  const addFkButton = document.querySelector('[data-add-fk-button]');
                  if (addFkButton) {
                    (addFkButton as HTMLElement).click();
                  }
                }, 100);
              }
            }}
            className="flex items-center gap-1"
          >
            <PlusIcon size={16} />
            Add Relationship
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No relationships found for this entity. Create a relationship by adding a foreign key.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Relationships</h3>
        <Button 
          size="sm" 
          onClick={() => {
            // Switch to the attributes tab and open foreign key modal
            const attributesTab = document.querySelector('[value="attributes"]');
            if (attributesTab) {
              (attributesTab as HTMLElement).click();
              // Wait for tab to change
              setTimeout(() => {
                const addFkButton = document.querySelector('[data-add-fk-button]');
                if (addFkButton) {
                  (addFkButton as HTMLElement).click();
                }
              }, 100);
            }
          }}
          className="flex items-center gap-1"
        >
          <PlusIcon size={16} />
          Add Relationship
        </Button>
      </div>

      {saveError && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded mb-2">
          {saveError}
        </div>
      )}
      {outgoingRelationships.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Outgoing Relationships</h4>
          {outgoingRelationships.map((rel, idx) => (
            <div key={rel.id} className="border border-border rounded-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{rel.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {rel.isRequired ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{rel.sourceEntityName}</span>
                    <ArrowRightIcon size={12} />
                    <span>{rel.targetEntityName}</span>
                  </div>
                  {/* Plain English relationship description for incoming relationships */}
                  <div className="mt-2 text-white text-base font-semibold">
                    {plainEnglishRelationship(rel.sourceEntityName, rel.targetEntityName, rel.sourceCardinality, rel.targetCardinality)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-xs text-muted-foreground">Source Cardinality:</label>
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={rel.sourceCardinality || ''}
                      disabled={savingId === rel.id}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setSavingId(rel.id);
                        setSaveError(null);
                        try {
                          const res = await fetch('/api/relationships', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: rel.id,
                              sourceCardinality: newValue,
                              targetCardinality: rel.targetCardinality,
                            }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Failed to update cardinality');
                          }
                          setRelationships((prev) => prev.map((r) =>
                            r.id === rel.id ? { ...r, sourceCardinality: newValue } : r
                          ));
                        } catch (err: any) {
                          setSaveError(err.message || 'Failed to update cardinality');
                        } finally {
                          setSavingId(null);
                        }
                      }}
                    >
                      <option value="">Select</option>
                      <option value="0..1">0..1</option>
                      <option value="1">1</option>
                      <option value="0..*">0..*</option>
                      <option value="1..*">1..*</option>
                      <option value="0..n">0..n</option>
                      <option value="1..n">1..n</option>
                    </select>
                    <label className="text-xs text-muted-foreground">Target Cardinality:</label>
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={rel.targetCardinality || ''}
                      disabled={savingId === rel.id}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setSavingId(rel.id);
                        setSaveError(null);
                        try {
                          const res = await fetch('/api/relationships', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: rel.id,
                              sourceCardinality: rel.sourceCardinality,
                              targetCardinality: newValue,
                            }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Failed to update cardinality');
                          }
                          setRelationships((prev) => prev.map((r) =>
                            r.id === rel.id ? { ...r, targetCardinality: newValue } : r
                          ));
                        } catch (err: any) {
                          setSaveError(err.message || 'Failed to update cardinality');
                        } finally {
                          setSavingId(null);
                        }
                      }}
                    >
                      <option value="">Select</option>
                      <option value="0..1">0..1</option>
                      <option value="1">1</option>
                      <option value="0..*">0..*</option>
                      <option value="1..*">1..*</option>
                      <option value="0..n">0..n</option>
                      <option value="1..n">1..n</option>
                    </select>
                  </div>
                </div>
                <Link
                  href={`/protected/projects/${projectId}/models/${dataModelId}/entities/${rel.targetEntityId}`}
                  className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                >
                  <span>View Target</span>
                  <ExternalLinkIcon size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {incomingRelationships.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Incoming Relationships</h4>
          {incomingRelationships.map((rel, idx) => (
            <div key={rel.id} className="border border-border rounded-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{rel.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {rel.isRequired ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{rel.sourceEntityName}</span>
                    <ArrowRightIcon size={12} />
                    <span>{rel.targetEntityName}</span>
                  </div>
                  {/* Plain English relationship description for incoming relationships */}
                  <div className="mt-2 text-white text-base font-semibold">
                    {plainEnglishRelationship(rel.sourceEntityName, rel.targetEntityName, rel.sourceCardinality, rel.targetCardinality)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-xs text-muted-foreground">Source Cardinality:</label>
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={rel.sourceCardinality || ''}
                      disabled={savingId === rel.id}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setSavingId(rel.id);
                        setSaveError(null);
                        try {
                          const res = await fetch('/api/relationships', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: rel.id,
                              sourceCardinality: newValue,
                              targetCardinality: rel.targetCardinality,
                            }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Failed to update cardinality');
                          }
                          setRelationships((prev) => prev.map((r) =>
                            r.id === rel.id ? { ...r, sourceCardinality: newValue } : r
                          ));
                        } catch (err: any) {
                          setSaveError(err.message || 'Failed to update cardinality');
                        } finally {
                          setSavingId(null);
                        }
                      }}
                    >
                      <option value="">Select</option>
                      <option value="0..1">0..1</option>
                      <option value="1">1</option>
                      <option value="0..*">0..*</option>
                      <option value="1..*">1..*</option>
                      <option value="0..n">0..n</option>
                      <option value="1..n">1..n</option>
                    </select>
                    <label className="text-xs text-muted-foreground">Target Cardinality:</label>
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={rel.targetCardinality || ''}
                      disabled={savingId === rel.id}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        setSavingId(rel.id);
                        setSaveError(null);
                        try {
                          const res = await fetch('/api/relationships', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: rel.id,
                              sourceCardinality: rel.sourceCardinality,
                              targetCardinality: newValue,
                            }),
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Failed to update cardinality');
                          }
                          setRelationships((prev) => prev.map((r) =>
                            r.id === rel.id ? { ...r, targetCardinality: newValue } : r
                          ));
                        } catch (err: any) {
                          setSaveError(err.message || 'Failed to update cardinality');
                        } finally {
                          setSavingId(null);
                        }
                      }}
                    >
                      <option value="">Select</option>
                      <option value="0..1">0..1</option>
                      <option value="1">1</option>
                      <option value="0..*">0..*</option>
                      <option value="1..*">1..*</option>
                      <option value="0..n">0..n</option>
                      <option value="1..n">1..n</option>
                    </select>
                  </div>
                </div>
                <Link
                  href={`/protected/projects/${projectId}/models/${dataModelId}/entities/${rel.sourceEntityId}`}
                  className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                >
                  <span>View Source</span>
                  <ExternalLinkIcon size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
