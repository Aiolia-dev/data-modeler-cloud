# Join Entity Creation

## Overview

The Data Modeler Cloud application provides multiple ways to create join entities (junction tables) that connect two existing entities in a many-to-many relationship. This document explains how to create join entities using both the graphical user interface and the Natural Language Interface.

## What is a Join Entity?

A join entity (also known as a junction table or associative entity) is used to connect two entities in a many-to-many relationship. For example, if a Student can enroll in multiple Courses, and a Course can have multiple Students, you would create a join entity (e.g., StudentCourse) to represent this relationship.

## Creating Join Entities via the UI

You can create join entities directly from the canvas context menu:

1. Right-click on an empty area of the canvas
2. Click on the link (chain) icon in the circular context menu
3. Select the entities to join in the modal that appears
4. Provide a name for the join entity
5. Click "Create" to create the join entity

The system will automatically:
- Create the join entity with the specified name
- Create a primary key attribute (id) for the join entity
- Create foreign key attributes referencing the primary keys of the joined entities
- Establish many-to-many relationships between the join entity and the joined entities

## Creating Join Entities via Natural Language Interface

The Natural Language Interface allows you to create join entities using simple English commands:

1. Navigate to the Natural Language Interface by clicking on the "Natural Language" link in the sidebar
2. Type a command such as:
   - "Create a join entity between Student and Course"
   - "Make a junction table linking Product and Category called ProductCategory"
   - "Create a many-to-many relationship between Employee and Project using a join entity"
   - "Add a join entity called OrderItem to connect Order and Product"
3. Review the visual preview showing the proposed join entity with its relationships
4. Click "Apply Changes" to create the join entity

### Example

If you type: "Create a join entity called StudentCourse between Student and Course"

The system will:
1. Identify the source entity (Student) and target entity (Course)
2. Generate a preview showing the proposed join entity with its relationships
3. After confirmation, create the join entity with:
   - A primary key attribute (id)
   - Foreign key attributes (idStudent and idCourse)
   - Many-to-many relationships to both Student and Course entities

## Best Practices

- Use descriptive names for join entities that reflect their purpose (e.g., StudentCourse, OrderItem)
- Ensure that the entities you want to join already exist in your data model
- Consider adding additional attributes to join entities when they need to store more information about the relationship (e.g., enrollment date, quantity)
- Use the visual preview to verify the structure before applying changes

## Troubleshooting

If you encounter issues when creating join entities:

- Verify that both source and target entities exist in your data model
- Check that you have the necessary permissions to modify the data model
- Ensure that the join entity name is unique within your data model
- If using the Natural Language Interface, try rephrasing your request to be more specific
