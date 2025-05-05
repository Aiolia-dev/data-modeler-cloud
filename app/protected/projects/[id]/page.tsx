import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, PlusIcon, DatabaseIcon } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { notFound } from "next/navigation";

export default async function ProjectPage({ params: paramsInput }: { params: { id: string } }) {
  // Properly await the params object
  const params = await Promise.resolve(paramsInput);
  const { id } = params;
  
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch project details and data models using the API
  let project: any;
  let dataModels: any[] = [];
  
  try {
    // Use the server-side API directly instead of fetch
    const adminClient = (await import('@/utils/supabase/admin')).createAdminClient();
    
    // Fetch project details
    const { data: projectData, error: projectError } = await adminClient
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (projectError) {
      throw new Error(`Failed to fetch project: ${projectError.message}`);
    }
    
    project = projectData;
    
    // Fetch data models for this project
    const { data: dataModelsData, error: dataModelsError } = await adminClient
      .from('data_models')
      .select('*')
      .eq('project_id', id)
      .order('updated_at', { ascending: false });
    
    if (dataModelsError) {
      throw new Error(`Failed to fetch data models: ${dataModelsError.message}`);
    }
    
    dataModels = dataModelsData || [];
    
    if (!project) {
      return notFound();
    }

  } catch (error) {
    console.error('Error fetching project:', error);
    return (
      <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
        <div className="flex items-center gap-2">
          <Link href="/protected" className="hover:opacity-70">
            <ArrowLeftIcon size={20} />
          </Link>
          <h1 className="text-3xl font-bold">Error</h1>
        </div>
        <div className="bg-destructive/15 text-destructive p-6 rounded-md mb-4 max-w-lg">
          <h2 className="text-xl font-medium mb-2">Error Loading Project</h2>
          <p className="mb-4">There was a problem loading the project details.</p>
          <Link href="/protected">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Link href="/protected" className="hover:opacity-70">
          <ArrowLeftIcon size={20} />
        </Link>
        <h1 className="text-3xl font-bold">{project.name}</h1>
      </div>

      {project.description && (
        <div className="max-w-3xl">
          <p className="text-muted-foreground">{project.description}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Data Models</h2>
        <Link href={`/protected/projects/${params.id}/models/new`}>
          <Button className="flex items-center gap-2">
            <PlusIcon size={16} />
            New Data Model
          </Button>
        </Link>
      </div>

      {dataModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-muted rounded-full p-6 mb-4">
            <DatabaseIcon size={48} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-medium mb-2">No data models yet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Create your first data model to start designing your database schema.
          </p>
          <Link href={`/protected/projects/${params.id}/models/new`}>
            <Button className="flex items-center gap-2">
              <PlusIcon size={16} />
              Create Data Model
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataModels.map((model: any) => (
            <Link 
              href={`/protected/projects/${params.id}/models/${model.id}`} 
              key={model.id}
              className="group"
            >
              <div className="border rounded-lg p-6 h-full flex flex-col hover:border-primary hover:shadow-md transition-all">
                <h3 className="text-xl font-medium mb-2 group-hover:text-primary">{model.name}</h3>
                {model.description && (
                  <p className="text-muted-foreground mb-4 flex-grow">{model.description}</p>
                )}
                <div className="flex justify-between text-xs text-muted-foreground mt-4">
                  <span>Updated {formatDistanceToNow(new Date(model.updated_at), { addSuffix: true })}</span>
                  <span>Version {model.version}</span>
                </div>
              </div>
            </Link>
          ))}
          
          <Link href={`/protected/projects/${params.id}/models/new`} className="group">
            <div className="border border-dashed rounded-lg p-6 h-full flex flex-col items-center justify-center hover:border-primary hover:shadow-md transition-all">
              <div className="bg-muted rounded-full p-4 mb-4">
                <PlusIcon size={24} className="text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="text-muted-foreground group-hover:text-primary">Create New Data Model</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}


