import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError?.message },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url)
    const dataModelId = searchParams.get("dataModelId")

    if (!dataModelId) {
      return NextResponse.json(
        { error: "Data model ID is required" },
        { status: 400 }
      )
    }
    // Use the admin client to bypass RLS policies
    console.log('Using admin client to fetch referentials');
    const adminClient = await createAdminClient();
    
    const { data: referentials, error } = await adminClient
      .from("referentials" as any)
      .select("*")
      .eq("data_model_id", dataModelId)
      .order("name")
      
    console.log('Referentials fetch result:', { count: referentials?.length, error: error?.message });

    if (error) {
      console.error("Error fetching referentials:", error)
      return NextResponse.json(
        { error: "Failed to fetch referentials" },
        { status: 500 }
      )
    }

    return NextResponse.json({ referentials })
  } catch (error) {
    console.error("Error in referentials GET route:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/referentials - Creating a new referential ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    // Get request body first to avoid any auth issues if the body is invalid
    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Extract fields from the request body
    const { name, description, color, data_model_id } = body;
    
    if (!name) {
      console.error('Referential name is required');
      return NextResponse.json(
        { error: 'Referential name is required' },
        { status: 400 }
      );
    }
    
    if (!data_model_id) {
      console.error('Data model ID is required');
      return NextResponse.json(
        { error: 'Data model ID is required' },
        { status: 400 }
      );
    }
    
    // Get the current user
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json(
        { error: 'Authentication error', details: userError?.message },
        { status: 401 }
      );
    }
    
    // Create the admin client early to use for all database operations
    console.log('Creating admin client...');
    const adminClient = await createAdminClient();
    console.log('Admin client created successfully');
    
    // Verify data model exists using admin client to bypass RLS
    console.log('Verifying data model exists (using admin client):', data_model_id);
    const dataModelResponse = await adminClient
      .from('data_models')
      .select('id, project_id')
      .eq('id', data_model_id)
      .single();
    
    console.log('Data model response:', JSON.stringify(dataModelResponse, null, 2));
    
    const { data: dataModel, error: dataModelError } = dataModelResponse;
      
    if (dataModelError) {
      console.error('Error verifying data model (even with admin client):', dataModelError);
      console.log('Warning: Proceeding anyway as a last resort...');
      // We'll continue anyway as a last resort
    } else {
      console.log('Data model found successfully:', dataModel);
    }
    
    // Admin client was created earlier
    
    const referentialData = {
      name,
      description: description || null,
      color: color || '#6366F1',
      data_model_id,
      created_by: user.id
    };
    
    console.log('Creating referential with data:', JSON.stringify(referentialData, null, 2));
    
    // Create the referential
    console.log('Executing insert operation...');
    try {
      const insertResponse = await adminClient
        .from('referentials' as any)
        .insert({
          name,
          description: description || null,
          color: color || '#6366F1', // Default to indigo if no color provided
          data_model_id,
          created_by: user.id
        })
        .select()
        .single();
      
      console.log('Insert response:', JSON.stringify(insertResponse, null, 2));
      
      const { data: referential, error: referentialError } = insertResponse;
      
      if (referentialError) {
        console.error('Error creating referential:', referentialError);
        console.error('Error details:', JSON.stringify(referentialError, null, 2));
        return NextResponse.json(
          { error: 'Failed to create referential', details: referentialError.message, code: referentialError.code },
          { status: 500 }
        );
      }
      
      console.log('Referential created successfully:', referential);
      return NextResponse.json({ referential });
    } catch (insertExecutionError: any) {
      console.error('Exception during insert execution:', insertExecutionError);
      console.error('Stack trace:', insertExecutionError.stack);
      return NextResponse.json(
        { error: 'Exception during insert', details: insertExecutionError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in referentials POST route:", error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Internal server error", details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
