<h1 align="center">Data Modeler Cloud</h1>

<p align="center">
 A modern data modeling application built with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#database-schema"><strong>Database Schema</strong></a> ·
  <a href="#setup"><strong>Setup</strong></a> ·
  <a href="#development"><strong>Development</strong></a> ·
  <a href="#deployment"><strong>Deployment</strong></a>
</p>
<br/>

## Features

- **Modern Data Modeling**: Create complex data models with hundreds of entities
- **Project Management**: Create and manage multiple projects
- **Collaborative Editing**: Invite team members with different access roles
- **Rich Entity Attributes**: Define attributes with various data types and constraints
- **Relationship Mapping**: Create and visualize relationships between entities
- **Comments & Documentation**: Add comments to entities, attributes, and relationships
- **Audit Logging**: Track all changes made to your data models
- **Export & Import**: Share your data models via JSON export/import
- **Authentication**: Secure user authentication via Supabase Auth
- **Modern UI**: Built with Next.js, Tailwind CSS, and shadcn/ui components

## Database Schema

The application uses the following Supabase database schema:

1. **users** (handled by Supabase Auth)
   - id (primary key)
   - email
   - name
   - created_at
   - last_login

---

## User Presence for Collaboration

The application supports real-time project-level user presence tracking to enable collaborative features (e.g., showing which users are online in a project).

### `user_presence` Table
| Column        | Type      | Description                                 |
|--------------|-----------|---------------------------------------------|
| id           | uuid      | Primary key                                 |
| user_id      | uuid      | Foreign key to `auth.users`                 |
| project_id   | uuid      | Foreign key to `projects`                   |
| last_seen_at | timestamptz | Last activity timestamp in the project      |
| is_online    | boolean   | Whether the user is currently online        |

- Unique constraint on (`user_id`, `project_id`) ensures one presence record per user per project.

### API Endpoints
- `POST /api/user-presence` – Upsert (insert/update) a presence record for a user in a project
- `GET /api/user-presence?projectId=...` – List all users currently online in a project
- `PATCH /api/user-presence/offline` – Set a user as offline for a given project

### Usage
- When a user enters a project, the frontend upserts their presence and updates `last_seen_at` every 30–60 seconds.
- On logout or tab close, the frontend sets `is_online` to `false`.
- The UI subscribes to changes in the `user_presence` table (via Supabase Realtime) to display avatars of online users in the project.
- Users are considered online if `is_online` is `true` and `last_seen_at` is within the last 2 minutes.

---

2. **projects**
   - id (primary key)
   - name
   - description
   - created_at
   - updated_at
   - created_by (user_id foreign key)

3. **project_members**
   - id (primary key)
   - project_id (foreign key)
   - user_id (foreign key) 
   - role (owner, editor, viewer)
   - joined_at

4. **data_models**
   - id (primary key)
   - project_id (foreign key)
   - name
   - description
   - created_at
   - updated_at
   - created_by (user_id foreign key)
   - version

5. **entities**
   - id (primary key)
   - data_model_id (foreign key)
   - name
   - description
   - position_x
   - position_y
   - created_at
   - updated_at

6. **attributes**
   - id (primary key)
   - entity_id (foreign key)
   - name
   - data_type (text, number, boolean, date, etc.)
   - description
   - is_primary_key (boolean)
   - is_foreign_key (boolean)
   - referenced_entity_id (foreign key to entities, nullable)
   - is_unique (boolean)
   - is_required (boolean)
   - default_value (text, optional)
   - length (integer, optional)
   - is_calculated (boolean)
   - calculation_rule (text, optional)
   - dependent_attribute_id (self-reference, optional)
   - created_at
   - updated_at

7. **relationships**
   - id (primary key)
   - data_model_id (foreign key)
   - source_entity_id (foreign key)
   - target_entity_id (foreign key)
   - source_attribute_id (foreign key)
   - target_attribute_id (foreign key)
   - relationship_type (one-to-one, one-to-many, many-to-many)
   - name
   - created_at
   - updated_at

8. **comments**
   - id (primary key)
   - entity_id (foreign key, nullable)
   - attribute_id (foreign key, nullable)
   - relationship_id (foreign key, nullable)
   - user_id (foreign key)
   - content
   - created_at
   - updated_at

9. **audit_logs**
   - id (primary key)
   - user_id (foreign key)
   - data_model_id (foreign key)
   - entity_id (foreign key, nullable)
   - attribute_id (foreign key, nullable)
   - relationship_id (foreign key, nullable)
   - action_type (create, update, delete)
   - previous_value (JSON)
   - new_value (JSON)
   - timestamp

## Setup

1. Create a Supabase project at [database.new](https://database.new)

2. Set up your environment variables:
   - Copy `.env.local` file in the root directory
   - Update with your Supabase project credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Set up the database schema:
   - Navigate to the SQL editor in your Supabase dashboard
   - Run the SQL script located at `supabase/migrations/20250416_initial_schema.sql`

## Development

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. Set up your environment variables:
   - Make sure to add the Supabase service role key to your `.env.local` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```
   This is required for the admin client to bypass RLS policies.

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## RLS Policy Configuration

This application uses Row Level Security (RLS) policies in Supabase to control access to data. If you encounter issues with infinite recursion in RLS policies, refer to the documentation in `docs/RLS_POLICY_FIX.md` for the solution.

The application implements an admin client approach that bypasses RLS policies using the Supabase service role key. This is a temporary solution until the proper RLS policies can be applied through Supabase migrations.

## Deployment

You can deploy this application to Vercel:

1. Push your code to a GitHub repository
2. Import the project into Vercel
3. Set the environment variables in the Vercel dashboard
4. Deploy

Alternatively, you can use the Supabase Vercel Integration for automatic environment variable configuration.

## Implementation Details

### Entity Management

The entity management functionality is a core feature of the Data Modeler Cloud application, allowing users to define their data model's structure with proper relationships and constraints.

#### Components

1. **Entity Creation Modal** (`components/entity/entity-modal.tsx`)
   - Provides a form for creating new entities
   - Supports basic entity properties (name, description)
   - Configures primary key type (auto-increment, UUID, custom)
   - Implements form validation

2. **Entity Detail View** (`components/entity/entity-detail.tsx`)
   - Displays detailed information about a selected entity
   - Organizes entity aspects into tabs (attributes, relationships, indexes, validation)
   - Provides interfaces for editing and deleting entities

3. **Attribute Management** (`components/entity/attribute-form.tsx`)
   - Manages entity attributes including regular fields and foreign keys
   - Supports various data types and constraints
   - Handles attribute validation

#### API Endpoints

The application implements several API endpoints for entity management:

1. **Entity Creation** (`app/api/entities/route.ts`)
   - Creates new entities in the Supabase database
   - Automatically creates primary key attributes based on user selection
   - Handles validation and error reporting

2. **Entity Attributes** (`app/api/projects/[id]/models/[modelId]/entities/[entityId]/attributes/route.ts`)
   - Manages attributes associated with entities
   - Supports CRUD operations for attributes

3. **Entity Operations** (`app/api/projects/[id]/models/[modelId]/entities/[entityId]/route.ts`)
   - Handles fetching, updating, and deleting individual entities

### Recent Fixes and Improvements

#### Entity Creation API Fix

We resolved an issue with the entity creation API where it was attempting to use a `created_by` column that doesn't exist in the database schema. The fix involved:

1. Removing the `created_by` field from the entity data object in the API endpoint
2. Removing the `created_by` field from the attribute data object for primary keys
3. Ensuring the API correctly handles all required fields according to the database schema

#### UI Layout Improvements

We improved the application layout to make better use of screen space:

1. Modified the main layout to use the full width of the screen instead of being constrained to a fixed width
2. Replaced the `max-w-5xl` constraint with a full-width layout using horizontal padding
3. Adjusted the navigation bar to also use the full width of the screen

#### Supabase Integration

The application uses Supabase for backend services, with a few special considerations:

1. **Admin Client**: We implemented a workaround for Supabase RLS policy issues by creating an admin client that bypasses Row Level Security using the service role key
2. **Database Schema**: Ensured the application code aligns with the actual database schema in Supabase
3. **Error Handling**: Improved error reporting for database operations to help diagnose issues

#### Diagram View Enhancements

**2025-04-20: Recent UX and Feature Improvements**

- **Entity Deletion UX Improvements:**
  - Added a confirmation modal for entity deletion.
  - Integrated entity deletion with Supabase, including use of the admin client to bypass Row Level Security (RLS) policies.
  - Improved error handling and user feedback for deletion operations.
  - Fixed contextual menu to display and trigger deletion correctly.

- **Diagram Viewport Preservation:**
  - When deleting an entity, the diagram now preserves the user's viewport (position and zoom) after refresh, ensuring a seamless user experience.
  - Uses React Flow's `getViewport` and `setViewport` to capture and restore the view.

- **Robust Entity Focusing (Eye Icon):**
  - Clicking the eye icon next to an entity or navigating with a `selectedEntity` query parameter will reliably center and focus the diagram on the selected entity.
  - The implementation uses a state flag to ensure that the diagram only attempts to center after all nodes have loaded, and only once per selection. This prevents missed or repeated focusing, even if the diagram loads asynchronously or the node data arrives after navigation.
  - This logic guarantees that users are always taken directly to the relevant entity in the diagram, improving navigation and user experience.

- **Event-driven Diagram Refresh:**
  - The diagram listens for a `diagram-entity-deleted` event and refreshes automatically, immediately reflecting entity deletions without requiring a manual reload.

- **Enhanced Relationship Edge Routing:**
  - Improved anchor point selection for relationship lines, ensuring edges connect at the most logical points between entities.
  - Dynamic recalculation of edges when entities are moved, so relationships always follow the shortest, most logical path.


We fixed and enhanced the diagram view functionality to provide a better visual representation of data models:

1. **Fixed Infinite Loop Issue**: Resolved an issue causing infinite rendering loops in the React Flow diagram implementation by:
   - Adding proper render control mechanisms with React.memo and useRef
   - Using predefined nodeTypes and edgeTypes objects to prevent recreation on each render
   - Implementing proper cleanup functions in useEffect hooks

2. **Entity Position Persistence**:
   - Fixed the position update functionality to correctly save entity positions when dragged
   - Updated the API endpoint to use PATCH method for position updates
   - Implemented proper error handling for position update operations

3. **Relationship Visualization**:
   - Enhanced the diagram to properly display relationships between entities
   - Implemented both explicit foreign key detection (using is_foreign_key flag and referenced_entity_id)
   - Added proper edge routing for relationship lines with intelligent anchor point selection
   - Improved the visual appearance of relationship edges with better styling

4. **Container Size Optimization**:
   - Adjusted the container height to use the full available screen space
   - Changed from a fixed height to a dynamic calculation: h-[calc(100vh-180px)]
   - Improved the user experience for complex diagrams with many entities

#### Relationship Management Implementation

We implemented a comprehensive relationship management system to visualize and manage entity relationships:

1. **Relationships API Endpoint** (`app/api/relationships/route.ts`):
   - Created a new endpoint to fetch relationships based on foreign keys
   - Supports filtering by entity ID or data model ID
   - Returns formatted relationship data with source and target entity information

2. **Relationship Table Component** (`components/entity/relationship-table.tsx`):
   - Displays both incoming and outgoing relationships for an entity
   - Shows relationship details including name, required status, and connected entities
   - Provides links to navigate to related entities for easy exploration
   - Includes loading states and error handling

3. **Foreign Key Enhancement**:
   - Added support for the referenced_entity_id column in the attributes table
   - Improved the foreign key creation workflow with better UI integration
   - Enhanced the attribute table to properly display foreign key relationships

4. **Entity Detail Integration**:
   - Updated the entity detail view to include the relationship table in the Relationships tab
   - Implemented proper state management for relationship updates
   - Added navigation between the Attributes and Relationships tabs for a seamless workflow
