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
    console.log(`[checkProjectRole] Checking role for project ID: ${projectId}`);
    console.log(`[checkProjectRole] Required roles: ${requiredRoles.join(', ')}`);
    
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error(`[checkProjectRole] Authentication error: ${userError?.message}`);
      return { hasAccess: false, error: 'Not authenticated' };
    }
    
    console.log(`[checkProjectRole] Current user: ${user.email} (${user.id})`);
    
    // Check if user is a superuser (always has access)
    if (user.user_metadata?.is_superuser === "true") {
      console.log(`[checkProjectRole] User is superuser, granting admin role`);
      return { hasAccess: true, userRole: 'admin' };
    }
    
    // Always use admin client to bypass RLS
    const adminClient = (await import('@/utils/supabase/admin')).createAdminClient();
    
    // Check if user is the project creator
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();
    
    if (projectError) {
      console.error(`[checkProjectRole] Project not found: ${projectError.message}`);
      return { hasAccess: false, error: 'Project not found' };
    }
    
    // Project creator has admin access
    if (project.created_by === user.id) {
      console.log(`[checkProjectRole] User is project creator, granting admin role`);
      return { hasAccess: true, userRole: 'admin' };
    }
    
    // Check user's role in project_members
    const { data: membership, error: membershipError } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError) {
      console.error(`[checkProjectRole] Error checking membership: ${membershipError.message}`);
      return { hasAccess: false, error: 'Error checking project membership' };
    }
    
    if (!membership) {
      console.error(`[checkProjectRole] User is not a member of this project`);
      return { hasAccess: false, error: 'Not a member of this project' };
    }
    
    console.log(`[checkProjectRole] User has role: ${membership.role} for project ${projectId}`);
    
    // Check if user's role is in the required roles
    const hasAccess = requiredRoles.includes(membership.role as UserRole);
    
    console.log(`[checkProjectRole] Has access: ${hasAccess} (required roles: ${requiredRoles.join(', ')})`);
    
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
    console.log(`[getDataModelRole] Checking role for data model ID: ${dataModelId}`);
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error(`[getDataModelRole] No authenticated user found`);
      return { error: 'Authentication required' };
    }
    
    console.log(`[getDataModelRole] Current user: ${user.email} (${user.id})`);
    
    // Check if user is a superuser (always has access)
    if (user.user_metadata?.is_superuser === "true") {
      console.log(`[getDataModelRole] User is superuser, granting admin role`);
      return { role: 'admin' };
    }
    
    // Always use admin client to bypass RLS
    const adminClient = (await import('@/utils/supabase/admin')).createAdminClient();
    
    // Get the project ID for this data model
    const { data: dataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .select('project_id')
      .eq('id', dataModelId)
      .single();
    
    if (dataModelError || !dataModel) {
      console.error(`[getDataModelRole] Data model not found: ${dataModelError?.message}`);
      return { error: 'Data model not found' };
    }
    
    console.log(`[getDataModelRole] Found data model with project_id: ${dataModel.project_id}`);
    
    // Check if user is the project creator (implicit admin)
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('created_by')
      .eq('id', dataModel.project_id)
      .single();
    
    if (projectError || !project) {
      console.error(`[getDataModelRole] Project not found: ${projectError?.message}`);
      return { error: 'Project not found' };
    }
    
    if (project.created_by === user.id) {
      console.log(`[getDataModelRole] User is project creator, granting admin role`);
      return { role: 'admin' };
    }
    
    // Check if user is a member of this project
    const { data: membership, error: membershipError } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', dataModel.project_id)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError) {
      console.error(`[getDataModelRole] Error checking project membership: ${membershipError.message}`);
      return { error: 'Error checking project membership' };
    }
    
    if (!membership) {
      console.error(`[getDataModelRole] User is not a member of this project`);
      return { error: 'Not a member of this project' };
    }
    
    console.log(`[getDataModelRole] User has role '${membership.role}' for this project`);
    return { role: membership.role as UserRole };
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
    console.log(`[getEntityRole] Checking role for entity ID: ${entityId}`);
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error(`[getEntityRole] No authenticated user found`);
      return { error: 'Authentication required' };
    }
    
    console.log(`[getEntityRole] Current user: ${user.email} (${user.id})`);
    
    // Check if user is a superuser (always has access)
    if (user.user_metadata?.is_superuser === "true") {
      console.log(`[getEntityRole] User is superuser, granting admin role`);
      return { role: 'admin' };
    }
    
    // Always use admin client to bypass RLS when fetching entity data
    const adminClient = (await import('@/utils/supabase/admin')).createAdminClient();
    
    // Get the entity and its data model ID
    const { data: entity, error: entityError } = await adminClient
      .from('entities')
      .select('data_model_id')
      .eq('id', entityId)
      .single();
    
    if (entityError || !entity) {
      console.error(`[getEntityRole] Entity not found: ${entityError?.message}`);
      return { error: 'Entity not found' };
    }
    
    console.log(`[getEntityRole] Found entity with data_model_id: ${entity.data_model_id}`);
    
    // Get the data model's project ID
    const { data: dataModel, error: dataModelError } = await adminClient
      .from('data_models')
      .select('project_id')
      .eq('id', entity.data_model_id)
      .single();
    
    if (dataModelError || !dataModel) {
      console.error(`[getEntityRole] Data model not found: ${dataModelError?.message}`);
      return { error: 'Data model not found' };
    }
    
    console.log(`[getEntityRole] Found data model with project_id: ${dataModel.project_id}`);
    
    // Check if user is the project creator (implicit admin)
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('created_by')
      .eq('id', dataModel.project_id)
      .single();
    
    if (projectError || !project) {
      console.error(`[getEntityRole] Project not found: ${projectError?.message}`);
      return { error: 'Project not found' };
    }
    
    if (project.created_by === user.id) {
      console.log(`[getEntityRole] User is project creator, granting admin role`);
      return { role: 'admin' };
    }
    
    // Check if user is a member of this project
    const { data: membership, error: membershipError } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', dataModel.project_id)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError) {
      console.error(`[getEntityRole] Error checking project membership: ${membershipError.message}`);
      return { error: 'Error checking project membership' };
    }
    
    if (!membership) {
      console.error(`[getEntityRole] User is not a member of this project`);
      return { error: 'Not a member of this project' };
    }
    
    console.log(`[getEntityRole] User has role '${membership.role}' for this project`);
    return { role: membership.role as UserRole };
  } catch (error) {
    console.error('Error getting entity role:', error);
    return { error: 'Error checking permissions' };
  }
}

/**
 * Helper function to get a user's role for a project
 */
export async function getProjectRole(
  projectId: string
): Promise<{ role?: UserRole; error?: string }> {
  try {
    console.log(`[getProjectRole] Checking role for project ID: ${projectId}`);
    const adminClient = (await import('@/utils/supabase/admin')).createAdminClient();
    
    // Get current user
    const { data: { user } } = await adminClient.auth.getUser();
    
    if (!user) {
      console.error(`[getProjectRole] No authenticated user found`);
      return { error: 'Authentication required' };
    }
    
    console.log(`[getProjectRole] Current user: ${user.email} (${user.id})`);
    
    // Check if user is a superuser (always has access)
    if (user.user_metadata?.is_superuser === "true") {
      console.log(`[getProjectRole] User is superuser, granting admin role`);
      return { role: 'admin' };
    }
    
    // Check if user is the project creator (implicit admin)
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      console.error(`[getProjectRole] Project not found: ${projectError?.message}`);
      return { error: 'Project not found' };
    }
    
    if (project.created_by === user.id) {
      console.log(`[getProjectRole] User is project creator, granting admin role`);
      return { role: 'admin' };
    }
    
    // Check if user is a member of this project
    const { data: membership, error: membershipError } = await adminClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();
    
    if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
      console.error(`[getProjectRole] Error checking project membership: ${membershipError.message}`);
      return { error: 'Error checking project membership' };
    }
    
    if (!membership) {
      console.error(`[getProjectRole] User is not a member of this project`);
      return { error: 'Not a member of this project' };
    }
    
    console.log(`[getProjectRole] User has role '${membership.role}' for this project`);
    return { role: membership.role as UserRole };
  } catch (error) {
    console.error('Error getting project role:', error);
    return { error: 'Error checking permissions' };
  }
}

/**
 * Middleware to check if the current request method is allowed for the user's role
 */
export function isMethodAllowedForRole(method: string, role?: string): boolean {
  console.log(`[isMethodAllowedForRole] Checking if method ${method} is allowed for role ${role}`);
  
  if (!role) {
    console.log(`[isMethodAllowedForRole] No role provided, denying access`);
    return false;
  }
  
  let isAllowed = false;
  
  switch (role) {
    case 'admin':
      // Admins can do everything
      isAllowed = true;
      console.log(`[isMethodAllowedForRole] Admin role, allowing all methods`);
      break;
    case 'editor':
      // Editors can GET, POST, PUT/PATCH, but not DELETE
      isAllowed = ['GET', 'POST', 'PUT', 'PATCH'].includes(method);
      console.log(`[isMethodAllowedForRole] Editor role, ${isAllowed ? 'allowing' : 'denying'} ${method} method`);
      break;
    case 'viewer':
      // Viewers can only GET
      isAllowed = method === 'GET';
      console.log(`[isMethodAllowedForRole] Viewer role, ${isAllowed ? 'allowing' : 'denying'} ${method} method`);
      break;
    default:
      console.log(`[isMethodAllowedForRole] Unknown role '${role}', denying access`);
      isAllowed = false;
  }
  
  return isAllowed;
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
