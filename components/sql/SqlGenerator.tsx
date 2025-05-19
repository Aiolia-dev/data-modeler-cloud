"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CopyIcon, DownloadIcon, ChevronDownIcon, ChevronRightIcon, InfoIcon } from "lucide-react";
import { Entity } from "@/types/entity";
import Prism from 'prismjs';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import Editor from "@monaco-editor/react";
import { format } from "sql-formatter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EntityRelationshipMiniDiagram from "./EntityRelationshipMiniDiagram";

interface SqlGeneratorProps {
  entities: Entity[];
  dataModelId: string;
  projectId: string;
}

export interface EntityWithAttributes extends Entity {
  attributes: any[];
  attributeCount: number;
  foreignKeyCount: number;
  relationshipCount: number;
}

// Interface for SQL sections
interface SqlSection {
  id: string;
  title: string;
  content: string;
  type: 'header' | 'schema' | 'table' | 'comment' | 'index';
  expanded?: boolean;
}

// PostgreSQL version options
const postgresVersions = [
  { value: "15", label: "PostgreSQL 15" },
  { value: "14", label: "PostgreSQL 14" },
  { value: "13", label: "PostgreSQL 13" },
  { value: "12", label: "PostgreSQL 12" },
  { value: "11", label: "PostgreSQL 11" },
  { value: "10", label: "PostgreSQL 10" },
  { value: "9.6", label: "PostgreSQL 9.6" },
];

// Tooltip content for PostgreSQL options
const tooltipContent = {
  postgresVersion: "Select the PostgreSQL version for compatibility with specific features and syntax.",
  schemaName: "The schema is a namespace that contains named database objects such as tables, views, and functions.",
  includeComments: "Add descriptive comments to tables and columns in the generated SQL.",
  generateIndexes: "Create indexes on columns to improve query performance.",
  includeForeignKeys: "Add foreign key constraints to enforce referential integrity between tables.",
  editMode: "Switch to edit mode to manually modify the generated SQL with real-time validation."
};

export default function SqlGenerator({ entities, dataModelId, projectId }: SqlGeneratorProps) {
  const [entitiesWithAttributes, setEntitiesWithAttributes] = useState<EntityWithAttributes[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [schemaName, setSchemaName] = useState("public");
  const [databaseEngine, setDatabaseEngine] = useState("postgresql");
  const [postgresVersion, setPostgresVersion] = useState("15");
  const [includeComments, setIncludeComments] = useState(true);
  const [generateIndexes, setGenerateIndexes] = useState(true);
  const [includeForeignKeys, setIncludeForeignKeys] = useState(true);
  const [generatedSql, setGeneratedSql] = useState("");
  const [editableSql, setEditableSql] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [sqlValidationErrors, setSqlValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sqlSections, setSqlSections] = useState<SqlSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const sqlPreviewRef = useRef<HTMLPreElement>(null);
  const editorRef = useRef<any>(null);

  // State for model data and relationships
  const [modelRelationships, setModelRelationships] = useState<any[]>([]);
  
  // State for hover-based mini-diagram
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{x: number, y: number}>({x: 0, y: 0});

  // Fetch all data for the model in a single request
  useEffect(() => {
    const fetchAllModelData = async () => {
      try {
        console.log(`SQL Generator: Fetching all data for model ${dataModelId}`);
        
        // Use the all-data endpoint to get everything in one request
        const response = await fetch(`/api/models/${dataModelId}/all-data`);
        if (!response.ok) {
          throw new Error(`Failed to fetch all data for model ${dataModelId}`);
        }
        
        const modelData = await response.json();
        console.log(`SQL Generator: Received all data for model ${dataModelId}`, modelData);
        
        if (!modelData.entities || modelData.entities.length === 0) {
          console.warn('SQL Generator: No entities found in the model data');
          return;
        }
        
        // Store relationships for the mini-diagram
        if (modelData.relationships) {
          setModelRelationships(modelData.relationships);
        }
        
        // Process the entities with their attributes
        const processedEntities = modelData.entities.map((entity: any) => {
          // Find attributes for this entity
          const entityAttributes = modelData.attributes.filter(
            (attr: any) => attr.entity_id === entity.id
          );
          
          // Count foreign keys
          const foreignKeyCount = entityAttributes.filter(
            (attr: any) => attr.isForeignKey
          ).length;
          
          // Count relationships
          const relationships = modelData.relationships.filter(
            (rel: any) => rel.source_entity_id === entity.id || rel.target_entity_id === entity.id
          );
          
          return {
            ...entity,
            attributes: entityAttributes,
            attributeCount: entityAttributes.length,
            foreignKeyCount,
            relationshipCount: relationships.length
          };
        });
        
        console.log(`SQL Generator: Processed ${processedEntities.length} entities with their attributes`);
        setEntitiesWithAttributes(processedEntities);
        
        // Initialize all entities as selected
        const initialSelection: Record<string, boolean> = {};
        processedEntities.forEach((entity: any) => {
          initialSelection[entity.id] = true;
        });
        
        setSelectedEntities(initialSelection);
        setSelectAll(true);
        
        console.log('SQL Generator: Entity loading complete', {
          entitiesCount: processedEntities.length,
          selectedCount: processedEntities.length
        });
      } catch (error) {
        console.error("Error fetching all model data:", error);
      }
    };

    // Start the fetch process immediately
    fetchAllModelData();
  }, [dataModelId]);

  // Apply syntax highlighting when SQL is generated
  useEffect(() => {
    if (generatedSql && sqlPreviewRef.current) {
      Prism.highlightElement(sqlPreviewRef.current);
    }
  }, [generatedSql]);

  // Toggle select all entities
  const handleSelectAllToggle = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    const newSelectedEntities = { ...selectedEntities };
    entitiesWithAttributes.forEach(entity => {
      newSelectedEntities[entity.id] = newSelectAll;
    });
    
    setSelectedEntities(newSelectedEntities);
  };

  // Toggle individual entity selection
  const handleEntitySelect = (entityId: string) => {
    const newSelectedEntities = {
      ...selectedEntities,
      [entityId]: !selectedEntities[entityId]
    };
    
    setSelectedEntities(newSelectedEntities);
    
    // Check if all entities are selected
    const allSelected = entitiesWithAttributes.every(entity => newSelectedEntities[entity.id]);
    setSelectAll(allSelected);
  };

  // Toggle section expansion
  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Function to map our data types to PostgreSQL data types
  const mapDataTypeToPostgres = (attribute: any): string => {
    // Handle case where attribute might be missing properties
    if (!attribute) {
      console.warn('Received undefined attribute in mapDataTypeToPostgres');
      return 'TEXT';
    }
    
    // Get data type from the attribute
    // Check for both dataType and data_type to handle different API formats
    const dataType = attribute.dataType || attribute.data_type;
    const length = attribute.length;
    const precision = attribute.precision;
    const scale = attribute.scale;
    
    // Handle case where dataType is undefined or null
    if (!dataType) {
      console.warn('Attribute has undefined or null dataType:', attribute);
      return 'TEXT';
    }
    
    try {
      switch (dataType.toLowerCase()) {
        case 'varchar':
          return `VARCHAR(${length || 255})`;
        case 'char':
          return `CHAR(${length || 1})`;
        case 'text':
          return 'TEXT';
        case 'integer':
          return 'INTEGER';
        case 'bigint':
          return 'BIGINT';
        case 'decimal':
          return `DECIMAL(${precision || 10}, ${scale || 2})`;
        case 'float':
          return 'FLOAT';
        case 'double':
          return 'DOUBLE PRECISION';
        case 'boolean':
          return 'BOOLEAN';
        case 'date':
          return 'DATE';
        case 'time':
          return 'TIME';
        case 'datetime':
          return 'TIMESTAMP';
        case 'timestamp':
          return 'TIMESTAMP';
        case 'uuid':
          return 'UUID';
        case 'json':
          return 'JSON';
        case 'jsonb':
          return 'JSONB';
        case 'array':
          return 'TEXT[]'; // Default to text array, could be more specific
        case 'enum':
          // In a real implementation, you'd need to handle enum types properly
          return 'TEXT';
        default:
          console.warn(`Unknown data type: ${dataType}, defaulting to TEXT`);
          return 'TEXT';
      }
    } catch (error) {
      console.error('Error in mapDataTypeToPostgres:', error);
      return 'TEXT';
    }
  };

  // Generate SQL for the selected entities
  const generateSqlScript = (
    entities: EntityWithAttributes[],
    options: {
      schemaName: string;
      databaseEngine: string;
      includeComments: boolean;
      generateIndexes: boolean;
      includeForeignKeys: boolean;
    }
  ): string => {
    const { schemaName, includeComments, generateIndexes, includeForeignKeys } = options;
    
    let sql = '';
    const sections: SqlSection[] = [];
    
    // Add header comment
    const headerSection: SqlSection = {
      id: 'header',
      title: 'Header',
      content: `-- SQL Schema generated by Data Modeler Pro\n-- Generated on: ${new Date().toISOString()}\n\n`,
      type: 'header',
      expanded: true
    };
    sql += headerSection.content;
    sections.push(headerSection);
    
    // Create schema if not public
    if (schemaName !== 'public') {
      const schemaSection: SqlSection = {
        id: 'schema',
        title: 'Schema Definition',
        content: `-- Create schema if it doesn't exist\nCREATE SCHEMA IF NOT EXISTS ${schemaName};\n\n`,
        type: 'schema',
        expanded: true
      };
      sql += schemaSection.content;
      sections.push(schemaSection);
    }
    
    // Create tables
    entities.forEach(entity => {
      let tableContent = '';
      
      // Table comment
      if (includeComments) {
        tableContent += `-- Table: ${schemaName}.${entity.name}\n`;
        if (entity.description) {
          tableContent += `-- Description: ${entity.description}\n`;
        }
      }
      
      tableContent += `CREATE TABLE ${schemaName}.${entity.name} (\n`;
      
      // Add columns
      const columnDefinitions = entity.attributes.map(attr => {
        let columnDef = `  "${attr.name}" ${mapDataTypeToPostgres(attr)}`;
        
        // Add constraints
        if (attr.isPrimaryKey) {
          columnDef += ' PRIMARY KEY';
        }
        if (attr.isRequired && !attr.isPrimaryKey) {
          columnDef += ' NOT NULL';
        }
        if (attr.isUnique && !attr.isPrimaryKey) {
          columnDef += ' UNIQUE';
        }
        if (attr.defaultValue) {
          columnDef += ` DEFAULT ${attr.defaultValue}`;
        }
        
        // Add column comment
        if (includeComments && attr.description) {
          columnDef += ` -- ${attr.description}`;
        }
        
        return columnDef;
      });
      
      tableContent += columnDefinitions.join(',\n');
      
      // Add foreign key constraints if requested
      if (includeForeignKeys) {
        const foreignKeys = entity.attributes.filter(attr => 
          attr.isForeignKey && attr.referencedEntity && attr.referencedAttribute
        );
        
        if (foreignKeys.length > 0) {
          tableContent += ',\n';
          
          const fkDefinitions = foreignKeys.map(fk => {
            return `  CONSTRAINT "fk_${entity.name}_${fk.name}" FOREIGN KEY ("${fk.name}") ` +
                   `REFERENCES ${schemaName}.${fk.referencedEntity} ("${fk.referencedAttribute}") ` +
                   `ON DELETE ${fk.onDeleteAction || 'RESTRICT'} ` +
                   `ON UPDATE ${fk.onUpdateAction || 'RESTRICT'}`;
          });
          
          tableContent += fkDefinitions.join(',\n');
        }
      }
      
      tableContent += '\n);\n\n';
      
      // Create table section
      const tableSection: SqlSection = {
        id: `table-${entity.id}`,
        title: `Table: ${entity.name}`,
        content: tableContent,
        type: 'table',
        expanded: false
      };
      sql += tableContent;
      sections.push(tableSection);
      
      // Add table comment if requested
      if (includeComments && entity.description) {
        let commentContent = `COMMENT ON TABLE ${schemaName}.${entity.name} IS '${entity.description.replace(/'/g, "''")}';\n`;
        
        // Add column comments
        entity.attributes.forEach(attr => {
          if (attr.description) {
            commentContent += `COMMENT ON COLUMN ${schemaName}.${entity.name}."${attr.name}" IS '${attr.description.replace(/'/g, "''")}';\n`;
          }
        });
        
        commentContent += '\n';
        
        // Create comments section
        const commentSection: SqlSection = {
          id: `comment-${entity.id}`,
          title: `Comments: ${entity.name}`,
          content: commentContent,
          type: 'comment',
          expanded: false
        };
        sql += commentContent;
        sections.push(commentSection);
      }
      
      // Add indexes if requested
      if (generateIndexes) {
        const indexableAttributes = entity.attributes.filter(attr => 
          attr.indexable && !attr.isPrimaryKey // Primary keys are already indexed
        );
        
        if (indexableAttributes.length > 0) {
          let indexContent = '';
          
          indexableAttributes.forEach(attr => {
            indexContent += `CREATE INDEX "idx_${entity.name}_${attr.name}" ON ${schemaName}.${entity.name} ("${attr.name}");\n`;
          });
          
          indexContent += '\n';
          
          // Create indexes section
          const indexSection: SqlSection = {
            id: `index-${entity.id}`,
            title: `Indexes: ${entity.name}`,
            content: indexContent,
            type: 'index',
            expanded: false
          };
          sql += indexContent;
          sections.push(indexSection);
        }
      }
    });
    
    // Update SQL sections state
    setSqlSections(sections);
    
    // Initialize expanded sections
    const initialExpandedSections: Record<string, boolean> = {};
    sections.forEach(section => {
      initialExpandedSections[section.id] = section.expanded || false;
    });
    setExpandedSections(initialExpandedSections);
    
    return sql;
  };

  // Generate SQL for the selected entities
  const handleGenerateSql = () => {
    setLoading(true);
    
    try {
      const selectedEntityIds = Object.entries(selectedEntities)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => id);
      
      const selectedEntityObjects = entitiesWithAttributes.filter(entity => 
        selectedEntityIds.includes(entity.id)
      );
      
      const sql = generateSqlScript(selectedEntityObjects, {
        schemaName,
        databaseEngine,
        includeComments,
        generateIndexes,
        includeForeignKeys
      });
      
      setGeneratedSql(sql);
    } catch (error) {
      console.error("Error generating SQL:", error);
    } finally {
      setLoading(false);
    }
  };

  // Copy SQL to clipboard
  const handleCopySql = () => {
    navigator.clipboard.writeText(generatedSql)
      .then(() => {
        // You could add a toast notification here
        console.log("SQL copied to clipboard");
      })
      .catch(err => {
        console.error("Failed to copy SQL:", err);
      });
  };

  // Download SQL as a file
  const handleDownloadSql = () => {
    const filename = `${schemaName}_${new Date().toISOString().split('T')[0]}.sql`;
    const blob = new Blob([generatedSql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format SQL for better readability
  const formatSql = (sql: string): string => {
    try {
      return format(sql, {
        language: 'postgresql',
        tabWidth: 2,
        keywordCase: 'upper',
        linesBetweenQueries: 2
      });
    } catch (error) {
      console.error('Error formatting SQL:', error);
      return sql;
    }
  };

  // Handle SQL editor changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditableSql(value);
      validateSql(value);
    }
  };

  // Apply edited SQL
  const applyEditedSql = () => {
    setGeneratedSql(editableSql);
    setIsEditMode(false);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (!isEditMode) {
      // Entering edit mode
      setEditableSql(generatedSql);
    }
    setIsEditMode(!isEditMode);
  };

  // Validate SQL syntax
  const validateSql = (sql: string) => {
    // This is a simple validation. In a real app, you might want to use a more robust SQL parser
    const errors: string[] = [];
    
    // Check for basic syntax errors
    try {
      // Check for unmatched parentheses
      const openParens = (sql.match(/\(/g) || []).length;
      const closeParens = (sql.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push('Unmatched parentheses');
      }
      
      // Check for missing semicolons
      if (!sql.trim().endsWith(';') && sql.trim().length > 0) {
        errors.push('SQL statement should end with a semicolon');
      }
      
      // Check for common SQL keywords
      const statements = sql.split(';').filter(s => s.trim().length > 0);
      statements.forEach(statement => {
        const normalized = statement.trim().toUpperCase();
        if (!normalized.includes('CREATE TABLE') && 
            !normalized.includes('ALTER TABLE') && 
            !normalized.includes('CREATE INDEX') && 
            !normalized.includes('COMMENT ON') && 
            !normalized.includes('CREATE SCHEMA')) {
          errors.push('Statement missing valid PostgreSQL DDL keyword');
        }
      });
    } catch (error) {
      errors.push('Syntax error in SQL');
    }
    
    setSqlValidationErrors(errors);
  };

  // Add line numbers to SQL content
  const addLineNumbers = (content: string): React.ReactElement => {
    const lines = content.split('\n');
    return (
      <div className="flex">
        <div className="text-gray-500 pr-4 text-right select-none">
          {lines.map((_, i) => (
            <div key={i} className="line-number">{i + 1}</div>
          ))}
        </div>
        <pre className="flex-1 overflow-x-auto">
          {content}
        </pre>
      </div>
    );
  };

  // Render collapsible SQL section
  const renderSqlSection = (section: SqlSection): React.ReactElement => {
    const isExpanded = expandedSections[section.id] || false;
    
    return (
      <div key={section.id} className="mb-2">
        <div 
          className="flex items-center cursor-pointer p-2 bg-gray-700 hover:bg-gray-600 rounded-t-md"
          onClick={() => toggleSectionExpansion(section.id)}
        >
          {isExpanded ? (
            <ChevronDownIcon size={16} className="mr-2" />
          ) : (
            <ChevronRightIcon size={16} className="mr-2" />
          )}
          <span className="font-medium">{section.title}</span>
        </div>
        
        {isExpanded && (
          <div className="bg-gray-800 p-2 rounded-b-md border-l-2 border-blue-500">
            {addLineNumbers(section.content)}
          </div>
        )}
      </div>
    );
  };

  // Count selected entities
  const selectedCount = Object.values(selectedEntities).filter(Boolean).length;
  
  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">SQL Generation</h2>
      <p className="text-gray-400 mb-6">
        Convert your logical data model into PostgreSQL database scripts.
      </p>
      
      {/* Floating mini-diagram that appears when hovering over an entity */}
      {hoveredEntityId && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
          }}
        >
          <div className="w-96 rounded-md overflow-hidden bg-slate-900 border-2 border-blue-500 shadow-2xl">
            <div className="p-3 border-b border-blue-500 bg-blue-900/30">
              <h3 className="text-base font-semibold text-white flex items-center">
                <span className="mr-2 bg-blue-500 rounded-full p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 16v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2"></path>
                    <path d="M12 4 L12 14"></path>
                    <path d="M8 10 L16 10"></path>
                  </svg>
                </span>
                {entitiesWithAttributes.find(e => e.id === hoveredEntityId)?.name} Relationships
              </h3>
            </div>
            <div className="h-72 bg-slate-900">
              {entitiesWithAttributes.find(e => e.id === hoveredEntityId)?.relationshipCount ? (
                <EntityRelationshipMiniDiagram 
                  entity={entitiesWithAttributes.find(e => e.id === hoveredEntityId)!} 
                  allEntities={entitiesWithAttributes} 
                  relationships={modelRelationships} 
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No relationships found for this entity
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Left Panel - Entity Selection and Configuration */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Entity Selection</h3>
            <div className="flex items-center mb-4">
              <Checkbox 
                id="select-all" 
                checked={selectAll} 
                onCheckedChange={handleSelectAllToggle}
                className="mr-2"
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                {selectAll ? "Deselect All" : "Select All"} ({entitiesWithAttributes.length} entities)
              </Label>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {entitiesWithAttributes.map(entity => (
                <div 
                  key={entity.id} 
                  className="flex items-center p-2 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer"
                  onMouseEnter={(e) => {
                    setHoveredEntityId(entity.id);
                    // Calculate position for the mini-diagram
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoverPosition({
                      x: rect.right + 10, // 10px to the right of the entity item
                      y: rect.top
                    });
                  }}
                  onMouseLeave={() => setHoveredEntityId(null)}
                >
                  <Checkbox 
                    id={`entity-${entity.id}`} 
                    checked={selectedEntities[entity.id] || false} 
                    onCheckedChange={() => handleEntitySelect(entity.id)}
                    className="mr-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Label htmlFor={`entity-${entity.id}`} className="flex-1 text-sm font-medium">
                    {entity.name}
                  </Label>
                  <div className="flex items-center space-x-1">
                    <Badge variant="outline" className="bg-blue-500 text-white text-xs" title="Attributes">
                      {entity.attributeCount}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500 text-white text-xs" title="Foreign Keys">
                      {entity.foreignKeyCount}
                    </Badge>
                    <Badge variant="outline" className="bg-green-500 text-white text-xs" title="Relationships">
                      {entity.relationshipCount}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Configuration</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="database-engine">Database Engine</Label>
                <Select value={databaseEngine} onValueChange={setDatabaseEngine}>
                  <SelectTrigger id="database-engine">
                    <SelectValue placeholder="Select database engine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql" disabled>MySQL (Coming Soon)</SelectItem>
                    <SelectItem value="sqlserver" disabled>SQL Server (Coming Soon)</SelectItem>
                    <SelectItem value="oracle" disabled>Oracle (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="postgres-version">PostgreSQL Version</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon size={14} className="ml-2 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{tooltipContent.postgresVersion}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={postgresVersion} onValueChange={setPostgresVersion}>
                  <SelectTrigger id="postgres-version">
                    <SelectValue placeholder="Select PostgreSQL version" />
                  </SelectTrigger>
                  <SelectContent>
                    {postgresVersions.map(version => (
                      <SelectItem key={version.value} value={version.value}>
                        {version.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="schema-name">Schema Name</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon size={14} className="ml-2 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{tooltipContent.schemaName}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input 
                  id="schema-name" 
                  value={schemaName} 
                  onChange={(e) => setSchemaName(e.target.value)}
                  placeholder="e.g. public, myschema"
                />
              </div>
              
              <Accordion type="single" collapsible className="w-full border-none">
                <AccordionItem value="advanced-options" className="border-none">
                  <AccordionTrigger className="py-2 text-sm font-medium">
                    Advanced Options
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-comments" 
                        checked={includeComments} 
                        onCheckedChange={(checked) => setIncludeComments(!!checked)}
                      />
                      <div className="flex items-center">
                        <Label htmlFor="include-comments" className="text-sm">
                          Include comments in SQL
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon size={12} className="ml-1 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{tooltipContent.includeComments}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="generate-indexes" 
                        checked={generateIndexes} 
                        onCheckedChange={(checked) => setGenerateIndexes(!!checked)}
                      />
                      <div className="flex items-center">
                        <Label htmlFor="generate-indexes" className="text-sm">
                          Generate indexes
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon size={12} className="ml-1 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{tooltipContent.generateIndexes}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-foreign-keys" 
                        checked={includeForeignKeys} 
                        onCheckedChange={(checked) => setIncludeForeignKeys(!!checked)}
                      />
                      <div className="flex items-center">
                        <Label htmlFor="include-foreign-keys" className="text-sm">
                          Include foreign key constraints
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon size={12} className="ml-1 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{tooltipContent.includeForeignKeys}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
          
          <div className="mt-auto">
            <Button 
              onClick={handleGenerateSql} 
              disabled={selectedCount === 0 || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Generating..." : `Generate SQL for ${selectedCount} ${selectedCount === 1 ? 'Entity' : 'Entities'}`}
            </Button>
          </div>
        </div>
                {/* Right Panel - SQL Preview */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">SQL Preview</h3>
            <div className="flex space-x-2">
              {generatedSql && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleEditMode}
                        className="flex items-center gap-1"
                      >
                        {isEditMode ? "View Mode" : "Edit SQL"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltipContent.editMode}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopySql} 
                disabled={!generatedSql}
                className="flex items-center gap-1"
              >
                <CopyIcon size={14} />
                Copy
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadSql} 
                disabled={!generatedSql}
                className="flex items-center gap-1"
              >
                <DownloadIcon size={14} />
                Download
              </Button>
            </div>
          </div>
          
          {generatedSql ? (
            <div className="bg-gray-900 p-4 rounded-md overflow-auto flex-1">
              {isEditMode ? (
                <div className="flex flex-col h-full">
                  <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={editableSql}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      automaticLayout: true
                    }}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                  />
                  {sqlValidationErrors.length > 0 && (
                    <div className="mt-2 p-2 bg-red-900/50 rounded-md">
                      <h4 className="text-sm font-semibold text-red-400">Validation Errors:</h4>
                      <ul className="text-xs text-red-300 list-disc pl-4 mt-1">
                        {sqlValidationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2 flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={applyEditedSql}
                      disabled={sqlValidationErrors.length > 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Apply Changes
                    </Button>
                  </div>
                </div>
              ) : sqlSections.length > 0 ? (
                <div className="space-y-2">
                  {sqlSections.map(section => renderSqlSection(section))}
                </div>
              ) : (
                <pre 
                  ref={sqlPreviewRef}
                  className="language-sql text-green-400 font-mono text-sm"
                >
                  {generatedSql}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-gray-400 mb-2">
                {selectedCount === 0 
                  ? "Select at least one entity to generate SQL" 
                  : "Click 'Generate SQL' to preview the database script"}
              </p>
              {selectedCount > 0 && (
                <Button 
                  onClick={handleGenerateSql} 
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? "Generating..." : "Generate SQL"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Add custom styles for line numbers */}
      <style jsx global>{`
        .line-number {
          min-width: 1.5rem;
          opacity: 0.5;
          user-select: none;
        }
        
        pre.language-sql {
          color: #f8f8f2;
          background: none;
          font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
          text-align: left;
          white-space: pre;
          word-spacing: normal;
          word-break: normal;
          word-wrap: normal;
          line-height: 1.5;
          tab-size: 4;
          hyphens: none;
        }
        
        /* Enhance syntax highlighting colors for better contrast */
        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: #8292a2;
        }
        
        .token.punctuation {
          color: #f8f8f2;
        }
        
        .token.namespace {
          opacity: .7;
        }
        
        .token.property,
        .token.tag,
        .token.constant,
        .token.symbol,
        .token.deleted {
          color: #ff79c6;
        }
        
        .token.boolean,
        .token.number {
          color: #bd93f9;
        }
        
        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          color: #50fa7b;
        }
        
        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
          color: #f8f8f2;
        }
        
        .token.atrule,
        .token.attr-value,
        .token.keyword {
          color: #66d9ef;
        }
        
        .token.function,
        .token.class-name {
          color: #ffb86c;
        }
        
        .token.regex,
        .token.important,
        .token.variable {
          color: #f1fa8c;
        }
      `}</style>
    </div>
  );
}
