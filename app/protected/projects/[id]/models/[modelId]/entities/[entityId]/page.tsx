import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import EntityDetailClient from "./EntityDetailClient";

export default async function EntityDetailPage({ params }: { params: Promise<{ id: string; modelId: string; entityId: string }> }) {
  const { id: projectId, modelId, entityId } = await params;
  
  // Authenticate the user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect("/sign-in");
  }
  
  // Check if user has access to this project
  const adminClient = await createAdminClient();
  const isSuperuser = user.user_metadata?.is_superuser === 'true';
  
  if (!isSuperuser) {
    const { data: memberData, error: memberError } = await adminClient
      .from('project_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', projectId);
    
    if (memberError || !memberData || memberData.length === 0) {
      return redirect(`/protected/projects/${projectId}`);
    }
  }
  
  // Fetch entity data directly on the server
  const { data: entity, error: entityError } = await adminClient
    .from('entities')
    .select('*')
    .eq('id', entityId)
    .eq('data_model_id', modelId)
    .single();
    
  if (entityError) {
    console.error('Error fetching entity:', entityError);
    // We'll let the client component handle the error display
  }
  
  // Fetch attributes
  const { data: attributes, error: attributesError } = await adminClient
    .from('attributes')
    .select('*')
    .eq('entity_id', entityId)
    .order('is_primary_key', { ascending: false })
    .order('name');
    
  if (attributesError) {
    console.error('Error fetching attributes:', attributesError);
    // We'll let the client component handle the error display
  }
  
  return (
    <EntityDetailClient
      projectId={projectId}
      modelId={modelId}
    />
  );
}
