# Authentication and Permission System Documentation

## Overview

The Data Modeler Cloud application implements a robust, multi-layered authentication and permission system that ensures users can only access UI elements and API endpoints appropriate for their role. This document outlines the architecture, components, and flow of the permission system to serve as a reference for future development and maintenance.

## Table of Contents

1. [Role Definitions](#role-definitions)
2. [Permission Actions](#permission-actions)
3. [Authentication Architecture](#authentication-architecture)
4. [Permission Context](#permission-context)
5. [Server-Side Permission Enforcement](#server-side-permission-enforcement)
6. [Client-Side Permission Enforcement](#client-side-permission-enforcement)
7. [Superuser Handling](#superuser-handling)
8. [Debugging Tools](#debugging-tools)
9. [Security Considerations](#security-considerations)
10. [Common Patterns and Best Practices](#common-patterns-and-best-practices)

## Role Definitions

The application defines the following user roles:

| Role | Description |
|------|-------------|
| `viewer` | Can view projects and data models but cannot make changes |
| `editor` | Can view and edit projects and data models but cannot delete them |
| `owner` | Has full control over specific projects they own |
| `admin` | Has full control over all projects (equivalent to superuser) |

These roles are defined in `context/permission-context.tsx`:

```typescript
export type UserRole = 'viewer' | 'editor' | 'owner' | 'admin';
```

## Permission Actions

The system defines specific actions that can be performed within the application:

| Action | Description |
|--------|-------------|
| `create` | Create new resources (projects, data models, entities) |
| `read` | View resources |
| `update` | Modify existing resources |
| `delete` | Remove resources |
| `view` | View-specific UI elements |
| `edit` | Edit-specific UI elements |

These actions are defined in `context/permission-context.tsx`:

```typescript
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'view' | 'edit';
```

## Role-Permission Mapping

Each role is granted a specific set of permissions:

```typescript
export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  viewer: ['read', 'view'],
  editor: ['create', 'read', 'update', 'view', 'edit'],
  owner: ['create', 'read', 'update', 'delete', 'view', 'edit'],
  admin: ['create', 'read', 'update', 'delete', 'view', 'edit'],
} as const;
```

## Authentication Architecture

The authentication system consists of multiple layers that work together to provide a secure and consistent user experience:

### 1. Auth Context (`context/auth-context.tsx`)

The Auth Context serves as the central source of truth for authentication state:

- Manages user authentication state
- Handles session management
- Provides user metadata including superuser status
- Offers methods for refreshing the session

Key properties:
- `user`: The current authenticated user
- `session`: The current Supabase session
- `isAuthenticated`: Whether the user is authenticated
- `isSuperuser`: Whether the user has superuser privileges
- `refreshSession()`: Method to refresh the authentication session

### 2. Auth Middleware (`middleware/auth-middleware.ts`)

The Auth Middleware intercepts requests to protected routes:

- Validates authentication for protected routes
- Refreshes sessions automatically
- Redirects unauthenticated users to the login page
- Logs detailed authentication information for debugging

### 3. Auth Sync Provider (`components/ui/auth-sync-provider.tsx`)

The Auth Sync Provider ensures consistency between contexts:

- Synchronizes state between Auth Context and Permission Context
- Resolves inconsistencies by prioritizing direct API calls
- Provides a fallback mechanism for authentication state

### 4. Auth Hooks (`hooks/use-auth-sync.ts`)

Custom hooks that simplify authentication state management:

- `useAuthSync()`: Synchronizes authentication state between contexts
- Handles edge cases and inconsistencies in authentication state

## Permission Context

The Permission Context (`context/permission-context.tsx`) manages user permissions throughout the application:

### Key Components

- `PermissionProvider`: React context provider that manages permission state
- `usePermissions()`: Hook to access permission context
- `hasPermission()`: Method to check if a user can perform a specific action

### Permission State

The Permission Context maintains the following state:

- `isAuthenticated`: Whether the user is authenticated
- `isSuperuser`: Whether the user has superuser privileges
- `userId` and `userEmail`: User identification
- `projectPermissions`: Array of projects and the user's role in each
- `currentProjectId`: Currently selected project
- `currentProjectRole`: User's role in the current project

### Permission Checking

The `hasPermission()` method is the core of the permission system:

```typescript
const hasPermission = (action: PermissionAction, projectId?: string) => {
  // Not authenticated users have no permissions
  if (!isAuthenticated) {
    return false;
  }
  
  // Superusers always have all permissions
  if (isSuperuser) {
    return true;
  }
  
  // Determine which project to check
  const targetProjectId = projectId || currentProjectId;
  
  if (!targetProjectId) {
    return false;
  }
  
  // Find the user's role for this project
  const permission = projectPermissions.find(p => p.projectId === targetProjectId);
  
  if (!permission) {
    return false;
  }
  
  // Check if the role has the required permission
  return ROLE_PERMISSIONS[permission.role].includes(action);
};
```

## Server-Side Permission Enforcement

Server-side permission enforcement happens in several places:

### 1. Role Check Middleware (`middleware/role-check.ts`)

This middleware enforces permissions for API routes:

- `getProjectRole()`: Determines a user's role for a specific project
- `isMethodAllowedForRole()`: Checks if a user can perform a specific HTTP method
- Handles superuser status with special privileges

Example implementation:
```typescript
export async function getProjectRole(userId: string, projectId: string) {
  // Check if user is superuser
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error(`[getProjectRole] Error getting user: ${userError.message}`);
    throw new Error('Failed to get user');
  }
  
  // Superuser check
  if (user.user_metadata?.is_superuser === "true" || user.user_metadata?.is_superuser === true) {
    console.log(`[getProjectRole] User is superuser, granting admin role`);
    return { role: 'admin' };
  }
  
  // Check project membership
  // ... (project-specific role determination)
}
```

### 2. API Route Handlers

API routes enforce permissions before performing operations:

```typescript
// Example from a DELETE endpoint
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    
    // Get the user's role for this project
    const { role } = await getProjectRole(userId, projectId);
    
    // Check if the user can delete projects
    if (!isMethodAllowedForRole(role, 'DELETE')) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this project' },
        { status: 403 }
      );
    }
    
    // Proceed with deletion
    // ...
  } catch (error) {
    // ...
  }
}
```

## Client-Side Permission Enforcement

Client-side permission enforcement controls UI elements:

### 1. Component-Level Permissions

Components use the `usePermissions()` hook to check permissions:

```typescript
function ProjectMenuItems({ project }) {
  const { hasPermission } = usePermissions();
  
  const canEdit = hasPermission('edit', project.id);
  const canDelete = hasPermission('delete', project.id);
  
  return (
    <>
      <Button disabled={!canEdit} onClick={handleEdit}>
        Edit
      </Button>
      <Button disabled={!canDelete} onClick={handleDelete}>
        Delete
      </Button>
    </>
  );
}
```

### 2. Page-Level Permissions

Protected pages check permissions before rendering content:

```typescript
function DataModelPage() {
  const { hasPermission, isAuthenticated, loading } = usePermissions();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <LoginRedirect />;
  }
  
  const canViewModels = hasPermission('view');
  
  if (!canViewModels) {
    return <AccessDenied />;
  }
  
  return <DataModelContent />;
}
```

## Superuser Handling

Superusers (users with `is_superuser: true` in their metadata) receive special handling:

- They bypass normal permission checks
- They have access to all actions across all projects
- Their status is checked in multiple places for redundancy

The superuser check is implemented in both client and server code:

```typescript
// Client-side check in permission-context.tsx
if (isSuperuser || authIsSuperuser) {
  console.log('PERMISSION CHECK: User is superuser, granting permission');
  return true;
}

// Server-side check in role-check.ts
if (user.user_metadata?.is_superuser === "true" || user.user_metadata?.is_superuser === true) {
  console.log(`[getProjectRole] User is superuser, granting admin role`);
  return { role: 'admin' };
}
```

## Debugging Tools

The application includes specialized debugging tools:

### 1. Auth Debug Component (`components/ui/auth-debug.tsx`)

Displays detailed authentication information:
- Authentication status
- Superuser status
- User information
- Session details
- User metadata

### 2. Permission Debug Component (`components/ui/permission-debug.tsx`)

Shows permission-related information:
- Permission context state
- Auth context state
- User metadata
- Project permissions

These components can be toggled on/off in the UI and provide valuable insights for troubleshooting authentication and permission issues.

## Security Considerations

The permission system is designed with several security principles in mind:

### 1. Defense in Depth

Multiple layers of permission checks ensure that even if one layer is bypassed, others will still prevent unauthorized access:
- UI element disabling
- Client-side permission checks
- Server-side middleware validation
- Database-level permission enforcement

### 2. Server Authority

While client-side checks improve user experience, all security-critical decisions are made on the server:
- Client-side checks are for UI purposes only
- Server-side checks are the ultimate authority
- API endpoints validate permissions independently

### 3. Least Privilege

Users are given only the permissions they need:
- Viewers can only view content
- Editors can edit but not delete
- Only owners and admins can delete resources

### 4. Audit Logging

Extensive logging helps track permission-related activities:
- Authentication events are logged
- Permission checks are logged with detailed context
- Error conditions are logged with stack traces

## Common Patterns and Best Practices

When implementing new features, follow these patterns:

### 1. UI Elements

For UI elements that should be conditionally displayed or enabled:

```typescript
function ActionButton({ projectId }) {
  const { hasPermission } = usePermissions();
  const canPerformAction = hasPermission('action', projectId);
  
  return (
    <Button 
      disabled={!canPerformAction}
      tooltip={!canPerformAction ? "You don't have permission" : undefined}
      onClick={handleAction}
    >
      Perform Action
    </Button>
  );
}
```

### 2. API Routes

For new API routes that require permission checks:

```typescript
export async function handler(req, res) {
  try {
    // Get user ID from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = session.user.id;
    const projectId = req.params.projectId;
    
    // Check permissions
    const { role } = await getProjectRole(userId, projectId);
    if (!isMethodAllowedForRole(role, req.method)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Proceed with the operation
    // ...
  } catch (error) {
    // Handle errors
  }
}
```

### 3. Adding New Roles or Permissions

When adding new roles or permissions:

1. Update the type definitions in `context/permission-context.tsx`
2. Update the `ROLE_PERMISSIONS` mapping
3. Update the `isMethodAllowedForRole` function in the middleware
4. Add appropriate UI checks for the new permissions

## Conclusion

The authentication and permission system in Data Modeler Cloud provides a secure, flexible framework for controlling access to resources. By following the patterns and practices outlined in this document, you can maintain and extend the system while ensuring consistent security enforcement throughout the application.

For any questions or issues related to the permission system, refer to the debug components and server logs for detailed information about the current state of permissions and authentication.
