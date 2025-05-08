import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { ShieldAlert } from "lucide-react";

export default async function DataModelPageServer({ params }: { params: { id: string; modelId: string } }) {
  const { id: projectId, modelId } = params;
  
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
      // User doesn't have access to this project - show unauthorized page immediately with direct HTML
      // This approach avoids any client-side components or redirects that could cause infinite loops
      return (
        <html>
          <head>
            <title>Unauthorized Access</title>
            <link rel="stylesheet" href="/globals.css" />
          </head>
          <body className="bg-gray-900">
            <div className="flex flex-col items-center justify-center min-h-screen px-4">
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
                  <a 
                    href="/protected"
                    className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md inline-block"
                  >
                    Return to Dashboard
                  </a>
                  <a 
                    href={`/protected/projects/${projectId}`}
                    className="w-full py-2 px-4 bg-transparent hover:bg-gray-700 text-white border border-gray-600 rounded-md inline-block"
                  >
                    Back to Project
                  </a>
                </div>
              </div>
            </div>
            <script dangerouslySetInnerHTML={{ __html: `
              // Stop all pending fetch requests
              window.stop();
            `}} />
          </body>
        </html>
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
      <html>
        <head>
          <title>Unauthorized Access</title>
          <link rel="stylesheet" href="/globals.css" />
        </head>
        <body className="bg-gray-900">
          <div className="flex flex-col items-center justify-center min-h-screen px-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center border border-gray-700">
              <div className="flex justify-center mb-6">
                <div className="bg-red-900/30 p-4 rounded-full">
                  <ShieldAlert className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Data Model Not Found</h1>
              <p className="text-gray-400 mb-6">
                The data model you're trying to access doesn't exist or you don't have permission to view it.
              </p>
              <div className="flex flex-col space-y-3">
                <a 
                  href="/protected"
                  className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md inline-block"
                >
                  Return to Dashboard
                </a>
                <a 
                  href={`/protected/projects/${projectId}`}
                  className="w-full py-2 px-4 bg-transparent hover:bg-gray-700 text-white border border-gray-600 rounded-md inline-block"
                >
                  Back to Project
                </a>
              </div>
            </div>
          </div>
          <script dangerouslySetInnerHTML={{ __html: `
            // Stop all pending fetch requests
            window.stop();
          `}} />
        </body>
      </html>
    );
  }
  
  // User has access to the project and the data model exists
  // Redirect to the original client component page
  return redirect(`/protected/projects/${projectId}/models/${modelId}/view`);
  
  // Note: You'll need to create a /view directory with a page.tsx file that contains the original client component
}
