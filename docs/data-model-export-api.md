# Data Model Export API Documentation

## Overview

The Data Model Export API allows users to export data models in various formats (JSON, CSV, and Excel). This API endpoint collects all relevant data for a data model, including entities, attributes, relationships, and referentials, and formats it according to the requested export format.

## API Endpoint

```
GET /api/projects/:projectId/models/:modelId/export
```

### Query Parameters

| Parameter | Type   | Description                                                |
|-----------|--------|------------------------------------------------------------|
| format    | string | The export format. Supported values: `json`, `csv`, `excel` |

### Response

The response will be a file download with the appropriate content type for the requested format:

- JSON: `application/json`
- CSV: `text/csv`
- Excel: `application/vnd.ms-excel`

## Export Formats

### JSON Format

The JSON export includes the complete data model with all related entities, attributes, relationships, and referentials. The structure is as follows:

```json
{
  "dataModel": {
    "id": "string",
    "name": "string",
    "description": "string",
    "project_id": "string",
    "created_at": "string",
    "updated_at": "string",
    "version": "string"
  },
  "entities": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "data_model_id": "string",
      "created_at": "string",
      "updated_at": "string",
      "referential_id": "string"
    }
  ],
  "attributes": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "data_type": "string",
      "entity_id": "string",
      "is_primary_key": boolean,
      "is_foreign_key": boolean,
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "relationships": [
    {
      "id": "string",
      "source_entity_id": "string",
      "target_entity_id": "string",
      "relationship_type": "string",
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "referentials": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "color": "string",
      "data_model_id": "string",
      "created_at": "string",
      "updated_at": "string"
    }
  ]
}
```

### CSV Format

The CSV export provides a flattened view of the data model, focusing on entities and their attributes. Each row represents an attribute within an entity, with the following columns:

- Entity Name
- Entity Description
- Attribute Name
- Attribute Type
- Attribute Description
- Is Primary Key
- Is Foreign Key

Entities with no attributes will have a single row with empty attribute fields.

### Excel Format

The Excel export provides the same data as the CSV format but with a different content type to trigger Excel application opening. In the current implementation, this is a CSV file with an Excel content type header. Future enhancements could include proper Excel formatting with multiple sheets for entities, attributes, relationships, and referentials.

## Error Handling

The API returns standard HTTP status codes:

- 200: Success
- 400: Bad request (e.g., unsupported format)
- 401: Unauthorized
- 404: Data model not found
- 500: Server error

Error responses are returned as JSON with the following structure:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Implementation Notes

- The API uses Supabase admin client to bypass RLS policies when fetching data.
- For large data models with many entities, the API optimizes relationship fetching to avoid query errors.
- All export formats include proper content disposition headers to trigger file downloads in the browser.

## Future Enhancements

- Implement proper Excel export using a library like exceljs for better formatting
- Add support for additional export formats (e.g., SQL DDL statements)
- Implement pagination for very large data models
- Add progress tracking for long-running exports
