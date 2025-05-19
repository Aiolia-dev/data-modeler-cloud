# SQL Generator Documentation

## Overview

The SQL Generator is a powerful feature of Data Modeler Pro that allows users to convert their visual data models into executable PostgreSQL database scripts. This tool bridges the gap between visual modeling and database implementation, enabling seamless transitions from design to deployment.

## Features

### Entity Selection

- **Individual Entity Selection**: Choose specific entities to include in your SQL script
- **Select/Deselect All**: Quickly select or deselect all entities with a single click
- **Entity Information Display**: View the number of attributes, foreign keys, and relationships for each entity

### Configuration Options

- **Schema Name**: Define the PostgreSQL schema where tables will be created
- **PostgreSQL Version**: Select from different PostgreSQL versions (9.6 through 15) for compatibility
- **Include Comments**: Option to include descriptive comments in the generated SQL
- **Generate Indexes**: Automatically create appropriate indexes for better query performance
- **Include Foreign Keys**: Generate foreign key constraints based on entity relationships

### SQL Preview and Editing

- **Syntax Highlighting**: Color-coded SQL for better readability
- **Direct Editing**: Edit the generated SQL directly with real-time validation
- **Format SQL**: Automatically format SQL for better readability
- **Copy to Clipboard**: Easily copy the entire SQL script
- **Download SQL**: Save the SQL script as a file

### Mini-Diagram Feature

- **Relationship Visualization**: Hover over an entity to see a mini-diagram of its relationships
- **Interactive Display**: The mini-diagram shows the entity's connections to other entities
- **Visual Consistency**: Uses the same design language as the main diagram for familiarity

## Usage Guide

### Generating SQL Scripts

1. Navigate to the SQL Generator tab in the Data Modeler Pro interface
2. Select the entities you want to include in your SQL script
3. Configure the options according to your requirements:
   - Set the schema name (defaults to "public")
   - Choose PostgreSQL version
   - Toggle options for comments, indexes, and foreign keys
4. Click "Generate SQL" to create the script
5. Review the generated SQL in the preview panel

### Using the Mini-Diagram Feature

1. Hover over any entity in the entity list
2. A mini-diagram will appear showing the entity's relationships
3. The primary entity (the one you're hovering over) will be highlighted in blue
4. Related entities will be shown with their relationship types and cardinality

### Editing and Exporting SQL

1. Click "Edit SQL" to make manual adjustments to the generated script
2. Use the "Format SQL" button to improve readability after editing
3. Click "Apply Changes" to save your edits
4. Use "Copy SQL" to copy the script to your clipboard
5. Click "Download SQL" to save the script as a .sql file

## Technical Implementation

### SQL Generation Logic

The SQL Generator creates database scripts following PostgreSQL best practices:

1. **Table Creation**: Generates `CREATE TABLE` statements with appropriate column definitions
2. **Data Types**: Maps conceptual data types to PostgreSQL-specific types
3. **Constraints**: Adds primary key, unique, and not null constraints as defined in the model
4. **Foreign Keys**: Creates foreign key constraints with appropriate referential actions
5. **Comments**: Adds descriptive comments to tables and columns when enabled
6. **Indexes**: Generates appropriate indexes for searchable fields

### Mini-Diagram Implementation

The mini-diagram feature uses React Flow to render a simplified version of the entity-relationship diagram:

1. **Node Rendering**: Displays entities as nodes with appropriate styling
2. **Edge Rendering**: Shows relationships as edges with cardinality indicators
3. **Layout Algorithm**: Positions the primary entity in the center with related entities around it
4. **Visual Styling**: Uses consistent color coding and visual language from the main diagram

## Future Enhancements

The SQL Generator will continue to evolve with planned enhancements:

1. **Additional Database Support**: Extend support to MySQL, SQL Server, and Oracle
2. **Advanced Indexing Options**: More granular control over index generation
3. **Script Execution**: Direct execution of SQL scripts against connected databases
4. **Schema Comparison**: Compare generated SQL with existing database schemas
5. **Relationship-Driven Foreign Keys**: Enhanced generation of foreign keys based on relationship definitions in the model
6. **Join Table Generation**: Automatic creation of join tables for many-to-many relationships

## Troubleshooting

### Common Issues

1. **Missing Foreign Keys**: Ensure that relationships are properly defined in the data model
2. **Data Type Mapping**: If you see unexpected data types, check the attribute definitions
3. **SQL Validation Errors**: Review the error messages in the editor for specific syntax issues

### Getting Help

If you encounter any issues with the SQL Generator:

1. Check the documentation for guidance
2. Look for similar issues in the community forum
3. Contact support with specific details about your problem

## Conclusion

The SQL Generator is a powerful tool that streamlines the process of converting data models into functional database schemas. By providing a visual-to-SQL bridge, it reduces development time and minimizes errors in database implementation.
