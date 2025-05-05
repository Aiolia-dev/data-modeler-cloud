# Data Modeler Cloud Permission System

This document explains the role-based access control (RBAC) system implemented in the Data Modeler Cloud application, which determines how UI elements are enabled or disabled based on a user's role within a project.

## Overview

The permission system is built around a React context (`PermissionContext`) that provides information about the current user's authentication status, project permissions, and role. This context is used throughout the application to conditionally render UI elements based on the user's permissions.

## User Roles

The application uses three roles:

- **viewer**: Can view data models, entities, and diagrams but cannot make changes
- **editor**: Can create, edit, and delete entities, attributes, and relationships
- **owner**: Has full access to the project, including managing project members and settings

These roles are stored in the `project_members` table in Supabase, which associates users with projects and their respective roles.

## Permission Context

The permission context (`/context/permission-context.tsx`) is the central component of the permission system. It provides:

1. Authentication status (`isAuthenticated`)
2. Current user's role for a specific project (`userRole`)
3. A function to check if a user has permission to perform a specific action (`hasPermission`)

### Role Permissions Mapping

The context defines a mapping of roles to permissions:

```typescript
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  viewer: ['view'],
  editor: ['view', 'edit', 'create'],
  owner: ['view', 'edit', 'create', 'delete', 'manage']
};
```

This mapping determines which actions each role can perform.

## Permission Components

### PermissionButton

The `PermissionButton` component (`/components/ui/permission-button.tsx`) is a wrapper around the standard Button component that automatically disables itself if the user doesn't have permission to perform the action. It takes:

- `action`: The action to check permission for (e.g., 'create', 'edit', 'delete')
- `projectId`: The ID of the project to check permissions for
- `disabledMessage`: A custom message to show when the button is disabled

Example usage:

```tsx
<PermissionButton
  action="create"
  projectId={projectId}
  disabledMessage="Viewers can only view entities, not create them"
>
  + Add Entity
</PermissionButton>
```

## Permission Hooks

### usePermissions

The `usePermissions` hook provides access to the permission context, including:

- `isAuthenticated`: Whether the user is authenticated
- `userRole`: The user's role for the current project
- `hasPermission`: A function to check if the user has permission to perform an action

Example usage:

```tsx
const { hasPermission } = usePermissions();
const canEdit = hasPermission('edit', projectId);
```

### useViewerCheck

The `useViewerCheck` hook (`/hooks/use-viewer-check.ts`) is a simplified hook that checks if the user is a viewer for a specific project. It uses the `hasPermission` function from the permission context.

Example usage:

```tsx
const isViewer = useViewerCheck(projectId);
```

## Implementation Examples

### Diagram Context Menu

In the diagram view, the edit and delete icons in the node context menu are disabled for users with the "viewer" role:

```tsx
// Check if user has edit permission for this project
const canEdit = hasPermission('edit', projectId);

// For the delete and edit options, check permissions
if (option.key === 'delete' || option.key === 'edit') {
  return {
    ...option,
    icon: option.key === 'delete' ? 
      <Trash2 size={16} className={canEdit ? '' : 'opacity-50'} /> : 
      <Edit size={16} className={canEdit ? '' : 'opacity-50'} />,
    label: canEdit ? 
      (option.key === 'delete' ? 'Delete Entity' : 'Edit Entity') : 
      (option.key === 'delete' ? 'Delete Entity (Requires Editor Role)' : 'Edit Entity (Requires Editor Role)'),
    onClick: canEdit ? () => option.onClick(node) : undefined,
  };
}
```

### Entity Attributes

In the entity detail view, the checkboxes for isRequired and isUnique are disabled for viewers:

```tsx
<Checkbox
  checked={attribute.is_required}
  disabled={isViewer}
  onCheckedChange={(checked) => handleRequiredChange(attribute.id, !!checked)}
/>
```

## Best Practices

1. **Use the PermissionButton component** for actions that should be disabled based on user permissions
2. **Use the hasPermission function** for conditional rendering of UI elements
3. **Check permissions at the component level** rather than hiding entire pages or sections
4. **Provide clear feedback** to users about why certain actions are disabled

## Security Considerations

While the permission system controls the UI, it's important to note that it's also backed by server-side permission checks in the API routes. This ensures that even if a user bypasses the UI restrictions, they still cannot perform unauthorized actions.

The server-side permission checks are implemented in the API routes using the `getEntityRole` and `isMethodAllowedForRole` functions from the `role-check.ts` middleware.
