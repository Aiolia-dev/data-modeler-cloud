import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export type UserRole = 'viewer' | 'editor' | 'admin';

/**
 * Middleware to check if a user has the required role for a project
 * @param projectId The project ID to check permissions for
 * @param requiredRoles Array of roles that are allowed to access the resource
 */
export async function checkProjectRole(
  projectId: string,
  requiredRoles: UserRole[]
): Promise<{ hasAccess: boolean; userRole?: string; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { hasAccess: false, error: 'Not authenticated' };
    }
    
    // Check if user is a superuser (always has access)
    if (user.user_metadata?.is_superuser === "true") {
      return { hasAccess: true, userRole: 'admin' };
    }
    
    // Check if user is the project creator
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      return { hasAccess: false, error: 'Project not found' };
    }
    
    // Project creator has admin access
    if (project.created_by === user.id) {
      return { hasAccess: true, userRole: 'admin' };
    }
    
    // Check user's role in project_members
    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError || !membership) {
      return { hasAccess: false, error: 'Not a member of this project' };
    }
    
    // Check if user's role is in the required roles
    const hasAccess = requiredRoles.includes(membership.role as UserRole);
    
    return { 
      hasAccess, 
      userRole: membership.role,
      error: hasAccess ? undefined : `Role '${membership.role}' does not have sufficient permissions`
    };
  } catch (error) {
    console.error('Error checking project role:', error);
    return { hasAccess: false, error: 'Error checking permissions' };
  }
}

/**
 * Helper function to get a user's role for a data model
 */
export async function getDataModelRole(
  dataModelId: string
): Promise<{ role?: UserRole; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get the project ID for this data model
    const { data: dataModel, error: dataModelError } = await supabase
      .from('data_models')
      .select('project_id')
      .eq('id', dataModelId)
      .single();
    
    if (dataModelError || !dataModel) {
      return { error: 'Data model not found' };
    }
    
    // Check role for the project
    const { hasAccess, userRole, error } = await checkProjectRole(
      dataModel.project_id,
      ['viewer', 'editor', 'admin']
    );
    
    if (!hasAccess) {
      return { error };
    }
    
    return { role: userRole as UserRole };
  } catch (error) {
    console.error('Error getting data model role:', error);
    return { error: 'Error checking permissions' };
  }
}

/**
 * Helper function to get a user's role for an entity
 */
export async function getEntityRole(
  entityId: string
): Promise<{ role?: UserRole; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get the data model ID for this entity
    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('data_model_id')
      .eq('id', entityId)
      .single();
    
    if (entityError || !entity) {
      return { error: 'Entity not found' };
    }
    
    // Check role for the data model
    return await getDataModelRole(entity.data_model_id);
  } catch (error) {
    console.error('Error getting entity role:', error);
    return { error: 'Error checking permissions' };
  }
}

/**
 * Middleware to check if the current request method is allowed for the user's role
 */
export function isMethodAllowedForRole(method: string, role?: string): boolean {
  if (!role) return false;
  
  switch (role) {
    case 'admin':
      // Admins can do everything
      return true;
    case 'editor':
      // Editors can GET, POST, PUT/PATCH, but not DELETE
      return ['GET', 'POST', 'PUT', 'PATCH'].includes(method);
    case 'viewer':
      // Viewers can only GET
      return method === 'GET';
    default:
      return false;
  }
}

/**
 * API route handler that checks if a user has the required role for a project
 * and if the request method is allowed for that role
 */
export async function withRoleCheck(
  req: NextRequest,
  projectId: string
): Promise<NextResponse | null> {
  const method = req.method;
  
  // Determine required roles based on method
  let requiredRoles: UserRole[] = [];
  
  switch (method) {
    case 'GET':
      requiredRoles = ['viewer', 'editor', 'admin'];
      break;
    case 'POST':
    case 'PUT':
    case 'PATCH':
      requiredRoles = ['editor', 'admin'];
      break;
    case 'DELETE':
      requiredRoles = ['admin'];
      break;
    default:
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
  }
  
  // Check if user has the required role
  const { hasAccess, userRole, error } = await checkProjectRole(projectId, requiredRoles);
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: error || 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  // If we get here, the user has the required role
  return null; // Continue to the API handler
}
