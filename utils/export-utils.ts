/**
 * Utility functions for exporting data model information
 */

import { createAdminClient } from '@/utils/supabase/admin';
import ExcelJS from 'exceljs';

// Define attribute interface based on the actual database schema
interface Attribute {
  id: string;
  name: string;
  description: string | null;
  data_type: string;
  length: number | null;
  is_unique: boolean;
  default_value: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  entity_id: string;
  created_at: string;
  updated_at: string;
  // These fields may or may not exist in your schema - using optional properties
  referenced_entity_id?: string | null;
  is_required?: boolean;
  is_mandatory?: boolean; // Alternative name for is_required in some schemas
}

// Type definitions for the export data
interface ExportAttribute {
  Entity: string;
  AttributeName: string;
  IsStandardAttribute: boolean;
  IsForeignKey: boolean;
  IsRequired: boolean;
  IsUnique: boolean;
  DataType: string;
  ReferencedEntity: string | null;
}

/**
 * Fetches all entities and their attributes for a data model
 */
export async function fetchDataModelForExport(dataModelId: string): Promise<ExportAttribute[]> {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  
  if (isBrowser) {
    // In browser environment, use fetch API instead of direct Supabase client
    return await fetchDataModelViaAPI(dataModelId);
  }
  
  // Server-side export using admin client
  const adminClient = createAdminClient();
  const exportData: ExportAttribute[] = [];
  
  try {
    // Fetch all entities for this data model
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('*')
      .eq('data_model_id', dataModelId)
      .order('name');
    
    if (entitiesError) {
      console.error('Error fetching entities for export:', entitiesError);
      throw new Error(`Failed to fetch entities: ${entitiesError.message}`);
    }
    
    // Create a map of entity IDs to names for reference
    const entityMap: Record<string, string> = {};
    entities.forEach(entity => {
      entityMap[entity.id] = entity.name;
    });
    
    // Fetch all attributes for all entities
    for (const entity of entities) {
      const { data: attributes, error: attributesError } = await adminClient
        .from('attributes')
        .select('*')
        .eq('entity_id', entity.id)
        .order('name');
      
      if (attributesError) {
        console.error(`Error fetching attributes for entity ${entity.name}:`, attributesError);
        continue; // Skip this entity but continue with others
      }
      
      // Transform attributes to export format
      for (const attribute of attributes) {
        // Get the referenced entity name if this is a foreign key
        let referencedEntityName = null;
        if (attribute.is_foreign_key && (attribute as any).referenced_entity_id) {
          referencedEntityName = entityMap[(attribute as any).referenced_entity_id] || null;
        }
        
        exportData.push({
          Entity: entity.name,
          AttributeName: attribute.name,
          IsStandardAttribute: !attribute.is_primary_key && !attribute.is_foreign_key,
          IsForeignKey: attribute.is_foreign_key,
          IsRequired: (attribute as any).is_required || attribute.is_mandatory || false,
          IsUnique: attribute.is_unique,
          DataType: attribute.data_type,
          ReferencedEntity: referencedEntityName
        });
      }
    }
    
    return exportData;
  } catch (error) {
    console.error('Error in fetchDataModelForExport:', error);
    throw error;
  }
}

/**
 * Fetches data model for export using API endpoints instead of direct Supabase access
 * This is used in browser environments where service role key is not available
 */
async function fetchDataModelViaAPI(dataModelId: string): Promise<ExportAttribute[]> {
  const exportData: ExportAttribute[] = [];
  
  try {
    // Fetch all entities for this data model
    const entitiesResponse = await fetch(`/api/entities?dataModelId=${dataModelId}`);
    if (!entitiesResponse.ok) {
      throw new Error(`Failed to fetch entities: ${entitiesResponse.statusText}`);
    }
    
    const entitiesData = await entitiesResponse.json();
    const entities = entitiesData.entities || [];
    
    // Create a map of entity IDs to names for reference
    const entityMap: Record<string, string> = {};
    entities.forEach((entity: any) => {
      entityMap[entity.id] = entity.name;
    });
    
    // Fetch attributes for each entity
    for (const entity of entities) {
      const attributesResponse = await fetch(`/api/attributes?entityId=${entity.id}`);
      if (!attributesResponse.ok) {
        console.error(`Failed to fetch attributes for entity ${entity.name}: ${attributesResponse.statusText}`);
        continue; // Skip this entity but continue with others
      }
      
      const attributesData = await attributesResponse.json();
      const attributes = attributesData.attributes || [];
      
      // Transform attributes to export format
      for (const attribute of attributes) {
        // Get the referenced entity name if this is a foreign key
        let referencedEntityName = null;
        if (attribute.is_foreign_key && attribute.referenced_entity_id) {
          referencedEntityName = entityMap[attribute.referenced_entity_id] || null;
        }
        
        exportData.push({
          Entity: entity.name,
          AttributeName: attribute.name,
          IsStandardAttribute: !attribute.is_primary_key && !attribute.is_foreign_key,
          IsForeignKey: attribute.is_foreign_key,
          IsRequired: attribute.is_required || false,
          IsUnique: attribute.is_unique,
          DataType: attribute.data_type,
          ReferencedEntity: referencedEntityName
        });
      }
    }
    
    return exportData;
  } catch (error) {
    console.error('Error in fetchDataModelViaAPI:', error);
    throw error;
  }
}

/**
 * Exports the data model in the specified format
 */
export async function exportDataModel(dataModelId: string, format: 'csv' | 'excel' | 'json' | 'svg'): Promise<void> {
  try {
    // Extract the project ID from the URL
    const urlParts = window.location.pathname.split('/');
    const projectIdIndex = urlParts.findIndex(part => part === 'projects') + 1;
    const projectId = urlParts[projectIdIndex];
    
    if (!projectId) {
      throw new Error('Could not determine project ID from URL');
    }
    
    console.log(`Exporting data model ${dataModelId} from project ${projectId} in format ${format}`);
    
    // Use the new batch export API endpoint
    const exportResponse = await fetch(`/api/projects/${projectId}/models/${dataModelId}/export?format=${format}`);
    
    if (!exportResponse.ok) {
      // Try to get error details if available
      try {
        const errorData = await exportResponse.json();
        throw new Error(errorData.error || `Export failed with status: ${exportResponse.status}`);
      } catch (parseError) {
        // If we can't parse the error as JSON, use the status text
        throw new Error(`Export failed: ${exportResponse.statusText}`);
      }
    }
    
    // Get the response as a blob
    const blob = await exportResponse.blob();
    
    // Get filename from Content-Disposition header if available
    let filename = '';
    const contentDisposition = exportResponse.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    // If no filename in header, generate one
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `data-model-${dataModelId}.${format}`;
    }
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    console.log(`Successfully exported data model as ${filename}`);

  } catch (error) {
    console.error('Error exporting data model:', error);
    throw error;
  }
}

/**
 * Converts an array of objects to CSV format
 */
export function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const csvRows = [headers.join(',')];
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle special cases like booleans, nulls, etc.
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      // Escape quotes and wrap in quotes if the value contains commas or quotes
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Creates a CSV file with the data model information and triggers download
 * @param data The data to export
 * @param filename The name of the file to create
 */
export async function createCsvFile(data: ExportAttribute[], filename: string): Promise<void> {
  try {
    // Convert data to CSV format
    const csvContent = convertToCSV(data);
    
    // Create a blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Add link to document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error creating CSV file:', error);
    throw error;
  }
}

/**
 * Downloads data as a CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Set link properties
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add link to document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Creates an SVG file from the current diagram view
 * @param svgElement The SVG element to export
 * @param filename The name of the file to create
 */
export async function createSvgFile(svgElement: SVGElement | null, filename: string): Promise<void> {
  try {
    if (!svgElement) {
      throw new Error('No SVG element provided for export');
    }

    // Clone the SVG element to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // Add styling to ensure the SVG looks good when exported
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .react-flow__node {
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .react-flow__edge path {
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .react-flow__edge-text {
        font-size: 12px;
        fill: #333;
      }
      .entity-node {
        background-color: #fff;
        border: 1px solid #ddd;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .entity-node-header {
        background-color: #4a6fa5;
        color: white;
        padding: 8px;
        font-weight: bold;
      }
      .entity-node-content {
        padding: 8px;
      }
    `;
    clonedSvg.appendChild(style);
    
    // Set width and height attributes if they don't exist
    if (!clonedSvg.hasAttribute('width')) {
      clonedSvg.setAttribute('width', '1200');
    }
    if (!clonedSvg.hasAttribute('height')) {
      clonedSvg.setAttribute('height', '800');
    }
    
    // Set viewBox if it doesn't exist
    if (!clonedSvg.hasAttribute('viewBox')) {
      const width = clonedSvg.getAttribute('width') || '1200';
      const height = clonedSvg.getAttribute('height') || '800';
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    
    // Add a white background
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', 'white');
    clonedSvg.insertBefore(background, clonedSvg.firstChild);
    
    // Add a title with the filename
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = filename.replace('.svg', '');
    clonedSvg.insertBefore(title, clonedSvg.firstChild);
    
    // Convert SVG to a string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);
    
    // Add XML declaration and doctype
    svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + 
               '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' + 
               svgString;
    
    // Create a blob with the SVG content
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Add link to document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error creating SVG file:', error);
    throw error;
  }
}

/**
 * Creates a JSON file with the complete data model information in the same format as ExampleFullModel.json
 * @param dataModel The data model object
 * @param entities The entities array with their attributes
 * @param filename The name of the file to create
 */
export async function createJsonFile(dataModel: any, entities: any[], filename: string): Promise<void> {
  try {
    // Create the JSON structure that matches ExampleFullModel.json
    const jsonData = {
      project: {
        name: dataModel.name || 'Untitled Project',
        description: dataModel.description || '',
        createdBy: dataModel.createdBy || '',
        id: dataModel.id,
        createdAt: dataModel.createdAt,
        updatedAt: dataModel.updatedAt,
        gitlabRepo: null,
        version: '1',
        localFilePath: filename
      },
      dataModel: {
        entities: entities.map(entity => {
          // Get the entity's attributes and format them correctly
          const attributes = entity.attributes || [];
          
          return {
            id: entity.id,
            name: entity.name,
            description: entity.description || '',
            attributes: attributes.map((attr: any) => ({
              id: attr.id,
              name: attr.name,
              dataType: attr.dataType,
              isPrimaryKey: attr.isPrimaryKey || false,
              isNullable: attr.isNullable !== false, // Default to true if not specified
              isUnique: attr.isUnique || false,
              isForeignKey: attr.isForeignKey || false,
              referencesEntityId: attr.referencedEntityId || null,
              referencesAttributeId: attr.referencedAttributeId || null,
              defaultValue: attr.defaultValue || '',
              description: attr.description || '',
              validationStatus: attr.validationStatus || 'Draft',
              isMandatory: !attr.isNullable,
              isCalculated: attr.isCalculated || false,
              businessRules: attr.businessRules || ''
            })),
            position: entity.position || { x: 0, y: 0 },
            color: entity.color || '#4a6fa5',
            borderColor: entity.borderColor || '#3498db',
            isJoinTable: entity.isJoinTable || false,
            updatedAt: entity.updatedAt || new Date().toISOString(),
            referential: entity.referential || ''
          };
        })
      }
    };
    
    // Convert the JSON object to a string
    const jsonString = JSON.stringify(jsonData, null, 2);
    
    // Create a blob with the JSON content
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Add link to document, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error creating JSON file:', error);
    throw error;
  }
}

/**
 * Creates an Excel file with the data model information and applies formatting
 * - Primary keys: yellow background
 * - Foreign keys: light blue background
 * - Entity headers: blue background
 * - Boolean values: checkmarks and X marks
 */
export async function createExcelFile(data: ExportAttribute[], filename: string): Promise<void> {
  // Create a new workbook and add a worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Model');
  
  // Add title row with model name
  const titleRow = worksheet.addRow(['Data Model - FC Version']);
  worksheet.mergeCells('A1:H1');
  titleRow.height = 30;
  titleRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 16 };
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' } // Dark green
  };
  titleRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  
  // Define columns with keys for data binding
  worksheet.columns = [
    { key: 'Entity', width: 20 },
    { key: 'AttributeName', width: 25 },
    { key: 'IsStandardAttribute', width: 22 },
    { key: 'IsForeignKey', width: 15 },
    { key: 'IsRequired', width: 15 },
    { key: 'IsUnique', width: 15 },
    { key: 'DataType', width: 15 },
    { key: 'ReferencedEntity', width: 20 },
  ];
  
  // Add column headers manually with proper labels and icons
  const headerCells = [
    { column: 'A', text: 'Entity', icon: '📋' },
    { column: 'B', text: 'AttributeName', icon: '' },
    { column: 'C', text: 'IsStandardAttribute', icon: '' },
    { column: 'D', text: 'IsForeignKey', icon: '' },
    { column: 'E', text: 'IsRequired', icon: '' },
    { column: 'F', text: 'IsUnique', icon: '' },
    { column: 'G', text: 'DataType', icon: '' },
    { column: 'H', text: 'ReferencedEntity', icon: '' },
  ];
  
  // Add a header description row (row 3) to explain what each column means
  const headerDescriptionRow = worksheet.addRow([
    '',
    '',
    'Standard attribute?',
    'Foreign key?',
    'Required?',
    'Unique?',
    '',
    ''
  ]);
  
  // Style the header description row
  headerDescriptionRow.height = 18;
  headerDescriptionRow.eachCell((cell, colNumber) => {
    // Only style cells with content
    if (cell.value) {
      cell.font = { italic: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.alignment = { horizontal: 'center' };
    }
  });
  
  // Apply the same background color as the header row
  headerDescriptionRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A4B8A' } // Navy blue
  };
  
  // Add borders to the header description row
  headerDescriptionRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // We'll set the current row counter after the headers
  
  // Add the headers to row 2
  headerCells.forEach(header => {
    const cell = worksheet.getCell(`${header.column}2`);
    if (header.icon) {
      cell.value = { 
        richText: [
          { text: `${header.text} `, font: { bold: true, color: { argb: 'FFFFFFFF' } } },
          { text: header.icon, font: { bold: true, color: { argb: 'FFFFFFFF' } } }
        ]
      };
    } else {
      cell.value = header.text;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }
  });
  
  // Add header row with styling (row 2 now because of title)
  const headerRow = worksheet.getRow(2);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1A4B8A' } // Navy blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add borders to the header row
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Group data by entity for entity headers
  const entitiesSeen = new Set<string>();
  const groupedData: Record<string, ExportAttribute[]> = {};
  
  data.forEach(item => {
    if (!groupedData[item.Entity]) {
      groupedData[item.Entity] = [];
    }
    groupedData[item.Entity].push(item);
  });
  
  // Current row index (starting after headers and description row)
  let currentRow = 4;
  
  // Process each entity group
  Object.entries(groupedData).forEach(([entityName, attributes]) => {
    // Add entity header
    const entityHeaderRow = worksheet.addRow([entityName]);
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    entityHeaderRow.height = 24;
    entityHeaderRow.font = { bold: true, size: 12 };
    entityHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9EB3D9' } // Light blue for entity headers
    };
    entityHeaderRow.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    entityHeaderRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    currentRow++;
    
    // Add attributes for this entity
    attributes.forEach(item => {
      // Convert boolean values to checkmarks and X marks
      const rowData = {
        Entity: item.Entity,
        AttributeName: item.AttributeName,
        IsStandardAttribute: item.IsStandardAttribute ? '✓' : 'x',
        IsForeignKey: item.IsForeignKey ? '✓' : 'x',
        IsRequired: item.IsRequired ? '✓' : 'x',
        IsUnique: item.IsUnique ? '✓' : 'x',
        DataType: item.DataType,
        ReferencedEntity: item.ReferencedEntity || ''
      };
      
      const row = worksheet.addRow(rowData);
      row.height = 22;
      
      // Style the row based on attribute type
      let rowColor = '';
      
      // Primary key (yellow)
      if (!item.IsStandardAttribute && !item.IsForeignKey && item.AttributeName.toLowerCase() === 'id') {
        rowColor = 'FFFFF2CC'; // Light yellow
      }
      // Foreign key (light blue)
      else if (item.IsForeignKey) {
        rowColor = 'FFD6E8FF'; // Light blue
      }
      
      if (rowColor) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowColor }
          };
        });
      }
      
      // Add borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Center boolean values
        if (typeof cell.value === 'string' && (cell.value === '✓' || cell.value === 'x')) {
          cell.alignment = { horizontal: 'center' };
          // Color the checkmarks and X marks
          if (cell.value === '✓') {
            cell.font = { color: { argb: 'FF008000' } }; // Green for checkmarks
          } else {
            cell.font = { color: { argb: 'FFFF0000' } }; // Red for X marks
          }
        }
      });
      
      // Make referenced entity cells clickable (hyperlinks)
      if (item.ReferencedEntity) {
        const referencedEntityCell = row.getCell(8); // ReferencedEntity column
        referencedEntityCell.font = { color: { argb: 'FF0000FF' }, underline: true };
      }
      
      currentRow++;
    });
    
    // Add empty row after each entity group
    worksheet.addRow([]);
    currentRow++;
  });
  
  // Add legend
  currentRow += 2; // Skip a row
  const legendTitleRow = worksheet.addRow(['Legend:']);
  legendTitleRow.font = { bold: true };
  currentRow++;
  
  // Primary Key legend
  const primaryKeyRow = worksheet.addRow(['', 'Primary Key']);
  primaryKeyRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF2CC' } // Light yellow
  };
  primaryKeyRow.getCell(1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  currentRow++;
  
  // Foreign Key legend
  const foreignKeyRow = worksheet.addRow(['', 'Foreign Key']);
  foreignKeyRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6E8FF' } // Light blue
  };
  foreignKeyRow.getCell(1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  currentRow++;
  
  // TRUE legend
  const trueRow = worksheet.addRow(['✓', 'TRUE']);
  trueRow.getCell(1).font = { color: { argb: 'FF008000' } }; // Green
  trueRow.getCell(1).alignment = { horizontal: 'center' };
  currentRow++;
  
  // FALSE legend
  const falseRow = worksheet.addRow(['x', 'FALSE']);
  falseRow.getCell(1).font = { color: { argb: 'FFFF0000' } }; // Red
  falseRow.getCell(1).alignment = { horizontal: 'center' };
  
  // Add tabs at the bottom
  worksheet.addRow([]);
  worksheet.addRow([]);
  const tabsRow = worksheet.addRow(['Data Model', 'ERD', 'Dictionary']);
  tabsRow.height = 24;
  
  // Style the tabs
  tabsRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' } // Light gray
  };
  tabsRow.getCell(1).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  tabsRow.getCell(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' } // Light gray
  };
  tabsRow.getCell(2).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  tabsRow.getCell(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' } // Light gray
  };
  tabsRow.getCell(3).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Create a blob with the Excel content
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Create a download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Set link properties
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add link to document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
