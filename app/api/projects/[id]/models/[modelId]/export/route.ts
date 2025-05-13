import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import ExcelJS from 'exceljs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id, modelId } = await params;
    const projectId = id;
    
    // Get the format from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    
    console.log(`GET /api/projects/${projectId}/models/${modelId}/export?format=${format} - Exporting data model`);
    
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.error('No user found');
      return NextResponse.json(
        { error: 'Unauthorized - No user found' },
        { status: 401 }
      );
    }
    
    console.log('User authenticated:', user.id);
    
    // Use the admin client to bypass RLS policies
    const adminClient = createAdminClient();
    
    // Fetch the data model
    const { data: dataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .select('*')
      .eq('id', modelId)
      .eq('project_id', projectId)
      .single();
    
    if (dataModelError) {
      console.error('Error fetching data model:', dataModelError);
      if (dataModelError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Data model not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch data model', details: dataModelError.message },
        { status: 500 }
      );
    }
    
    // Fetch entities for this data model
    const { data: entities, error: entitiesError } = await adminClient
      .from('entities')
      .select('*')
      .eq('data_model_id', modelId)
      .order('name');
    
    if (entitiesError) {
      console.error('Error fetching entities:', entitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch entities', details: entitiesError.message },
        { status: 500 }
      );
    }
    
    // Fetch attributes for all entities in this data model
    const { data: attributes, error: attributesError } = await adminClient
      .from('attributes')
      .select('*')
      .in('entity_id', entities?.map(e => e.id) || []);
    
    if (attributesError) {
      console.error('Error fetching attributes:', attributesError);
      return NextResponse.json(
        { error: 'Failed to fetch attributes', details: attributesError.message },
        { status: 500 }
      );
    }
    
    // Fetch relationships for all entities in this data model
    const entityIds = entities?.map(e => e.id) || [];
    let relationships: any[] = [];
    let relationshipsError = null;
    
    if (entityIds.length > 0) {
      const { data, error } = await adminClient
        .from('relationships')
        .select('*')
        .or(`source_entity_id.in.(${entityIds.join(',')}),target_entity_id.in.(${entityIds.join(',')})`);
      
      relationships = data || [];
      relationshipsError = error;
    }
    
    if (relationshipsError) {
      console.error('Error fetching relationships:', relationshipsError);
      return NextResponse.json(
        { error: 'Failed to fetch relationships', details: relationshipsError.message },
        { status: 500 }
      );
    }
    
    // Fetch referentials for this data model
    // Using any type to handle potential schema differences
    const { data: referentials, error: referentialsError } = await adminClient
      .from('referentials' as any)
      .select('*')
      .eq('data_model_id', modelId);
    
    if (referentialsError) {
      console.error('Error fetching referentials:', referentialsError);
      return NextResponse.json(
        { error: 'Failed to fetch referentials', details: referentialsError.message },
        { status: 500 }
      );
    }
    
    // Prepare the complete data model for export
    const completeDataModel = {
      dataModel,
      entities: entities || [],
      attributes: attributes || [],
      relationships: relationships || [],
      referentials: referentials || []
    };
    
    // Handle different export formats
    if (format === 'json') {
      // For JSON format, return the data as is
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', `attachment; filename="data-model-${modelId}.json"`);
      
      return new NextResponse(JSON.stringify(completeDataModel, null, 2), {
        status: 200,
        headers
      });
    } else if (format === 'csv') {
      // For CSV format, convert entities and attributes to CSV
      let csv = 'Entity Name,Entity Description,Attribute Name,Attribute Type,Attribute Description,Is Primary Key,Is Foreign Key\n';
      
      for (const entity of entities || []) {
        const entityAttributes = (attributes || []).filter(attr => attr.entity_id === entity.id);
        
        if (entityAttributes.length === 0) {
          // Entity with no attributes
          csv += `"${entity.name || ''}","${entity.description || ''}","","","","",""\n`;
        } else {
          // Entity with attributes
          for (const attr of entityAttributes) {
            csv += `"${entity.name || ''}","${entity.description || ''}","${attr.name || ''}","${attr.data_type || ''}","${attr.description || ''}","${attr.is_primary_key ? 'Yes' : 'No'}","${attr.is_foreign_key ? 'Yes' : 'No'}"\n`;
          }
        }
      }
      
      const headers = new Headers();
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', `attachment; filename="data-model-${modelId}.csv"`);
      
      return new NextResponse(csv, {
        status: 200,
        headers
      });
    } else if (format === 'excel') {
      // For Excel format, create a proper Excel file using ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Data Modeler Cloud';
      workbook.lastModifiedBy = 'Data Modeler Cloud';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Add a worksheet
      const worksheet = workbook.addWorksheet('Data Model');
      
      // Define columns
      worksheet.columns = [
        { header: 'Entity Name', key: 'entityName', width: 20 },
        { header: 'Entity Description', key: 'entityDescription', width: 30 },
        { header: 'Attribute Name', key: 'attributeName', width: 20 },
        { header: 'Attribute Type', key: 'attributeType', width: 15 },
        { header: 'Attribute Description', key: 'attributeDescription', width: 30 },
        { header: 'Is Primary Key', key: 'isPrimaryKey', width: 15 },
        { header: 'Is Foreign Key', key: 'isForeignKey', width: 15 },
        { header: 'Is Required', key: 'isRequired', width: 15 },
        { header: 'Is Unique', key: 'isUnique', width: 15 }
      ];
      
      // Style the header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' } // Blue header
      };
      headerRow.alignment = { horizontal: 'center' };
      
      // Add data rows
      let currentRow = 2;
      let currentEntityName = '';
      
      // Group by entity for better readability
      for (const entity of entities || []) {
        const entityAttributes = (attributes || []).filter(attr => attr.entity_id === entity.id);
        
        // If this is a new entity, add a separator row
        if (currentEntityName !== '' && currentEntityName !== entity.name) {
          const separatorRow = worksheet.addRow({});
          currentRow++;
        }
        
        currentEntityName = entity.name;
        
        if (entityAttributes.length === 0) {
          // Entity with no attributes
          const row = worksheet.addRow({
            entityName: entity.name || '',
            entityDescription: entity.description || '',
            attributeName: '',
            attributeType: '',
            attributeDescription: '',
            isPrimaryKey: '',
            isForeignKey: '',
            isRequired: '',
            isUnique: ''
          });
          
          // Style entity row
          row.getCell('entityName').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E1F2' } // Light blue for entity rows
          };
          
          currentRow++;
        } else {
          // Entity with attributes
          for (const attr of entityAttributes) {
            const row = worksheet.addRow({
              entityName: entity.name || '',
              entityDescription: entity.description || '',
              attributeName: attr.name || '',
              attributeType: attr.data_type || '',
              attributeDescription: attr.description || '',
              isPrimaryKey: attr.is_primary_key ? 'Yes' : 'No',
              isForeignKey: attr.is_foreign_key ? 'Yes' : 'No',
              isRequired: (attr as any).is_required || attr.is_mandatory ? 'Yes' : 'No',
              isUnique: attr.is_unique ? 'Yes' : 'No'
            });
            
            // Style rows based on attribute type
            if (attr.is_primary_key) {
              // Primary key styling
              row.getCell('attributeName').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF2CC' } // Light yellow for primary keys
              };
              row.getCell('isPrimaryKey').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF2CC' }
              };
            } else if (attr.is_foreign_key) {
              // Foreign key styling
              row.getCell('attributeName').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD6E8FF' } // Light blue for foreign keys
              };
              row.getCell('isForeignKey').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD6E8FF' }
              };
            }
            
            // Style Yes/No cells
            ['isPrimaryKey', 'isForeignKey', 'isRequired', 'isUnique'].forEach(key => {
              const cell = row.getCell(key);
              cell.alignment = { horizontal: 'center' };
              if (cell.value === 'Yes') {
                cell.font = { color: { argb: 'FF008000' } }; // Green for Yes
              } else if (cell.value === 'No') {
                cell.font = { color: { argb: 'FF808080' } }; // Gray for No
              }
            });
            
            currentRow++;
          }
        }
      }
      
      // Add borders to all cells
      for (let i = 1; i <= currentRow - 1; i++) {
        const row = worksheet.getRow(i);
        row.eachCell({ includeEmpty: true }, cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
      
      // Add a legend
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
      
      // Generate Excel file as buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      headers.set('Content-Disposition', `attachment; filename="data-model-${modelId}.xlsx"`);
      
      return new NextResponse(buffer, {
        status: 200,
        headers
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported export format. Supported formats: json, csv, excel' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(`Error in GET /api/projects/[id]/models/[modelId]/export:`, error);
    return NextResponse.json(
      { error: 'Failed to export data model', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
