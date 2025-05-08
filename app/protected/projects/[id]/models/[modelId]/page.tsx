import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { createAdminClient } from "@/utils/supabase/admin";
import DataModelWrapper from "@/components/data-model/DataModelWrapper";

export default async function DataModelPageServer({ params }: { params: Promise<{ id: string; modelId: string }> }) {
  const { id: projectId, modelId } = await params;
  
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check if the user has access to this project
  const adminClient = await createAdminClient();
  
  // Check if user is a superuser
  const isSuperuser = user.user_metadata?.is_superuser === 'true';
  
  // If user is not a superuser, check if they are a member of the project
  if (!isSuperuser) {
    // Check if user is a member of the project
    const { data: memberData, error: memberError } = await adminClient
      .from('project_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', projectId);
      
    if (memberError || !memberData || memberData.length === 0) {
      // User doesn't have access to this project - show unauthorized page immediately
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 px-4">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center border border-gray-700">
            <div className="flex justify-center mb-6">
              <div className="bg-red-900/30 p-4 rounded-full">
                <ShieldAlert className="h-12 w-12 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Unauthorized Access</h1>
            <p className="text-gray-400 mb-6">
              You don't have permission to access this data model. Please contact the project owner if you believe this is an error.
            </p>
            <div className="flex flex-col space-y-3">
              <Link href="/protected">
                <Button 
                  className="w-full bg-gray-700 hover:bg-gray-600 mb-2"
                >
                  Return to Dashboard
                </Button>
              </Link>
              <Link href={`/protected`}>
                <Button 
                  className="w-full bg-gray-700 hover:bg-gray-600"
                  variant="outline"
                >
                  Back to Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }
  
  // Also check if the data model exists and belongs to this project
  const { data: dataModel, error: dataModelError } = await adminClient
    .from('data_models')
    .select('id')
    .eq('id', modelId)
    .eq('project_id', projectId)
    .single();
  
  if (dataModelError || !dataModel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 px-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center border border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="bg-red-900/30 p-4 rounded-full">
              <ShieldAlert className="h-12 w-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Data Model Not Found</h1>
          <p className="text-gray-400 mb-6">
            The data model you're trying to access doesn't exist or doesn't belong to this project.
          </p>
          <div className="flex flex-col space-y-3">
            <Link href="/protected">
              <Button 
                className="w-full bg-gray-700 hover:bg-gray-600 mb-2"
              >
                Return to Dashboard
              </Button>
            </Link>
            <Link href={`/protected/projects/${projectId}`}>
              <Button 
                className="w-full bg-gray-700 hover:bg-gray-600"
                variant="outline"
              >
                Back to Project
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // User has access to the project and the data model exists
  return <DataModelWrapper projectId={projectId} modelId={modelId} />;

}
