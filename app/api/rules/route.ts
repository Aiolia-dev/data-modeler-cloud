import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// GET /api/rules - Get all rules for a given entity, attribute, or data model
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityId = searchParams.get("entityId");
    const attributeId = searchParams.get("attributeId");
    const dataModelId = searchParams.get("dataModelId");
    const ruleType = searchParams.get("ruleType");
    const countOnly = searchParams.get("count") === "true";

    // Validate that at least one filter is provided
    if (!entityId && !attributeId && !dataModelId) {
      return NextResponse.json(
        { error: "Either entityId, attributeId, or dataModelId is required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createAdminClient();

    // Start building the query
    let query = supabase.from("rules").select(countOnly ? "id" : "*");

    // Apply filters
    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    if (attributeId) {
      query = query.eq("attribute_id", attributeId);
    }

    if (dataModelId) {
      console.log(`Fetching rules for data model: ${dataModelId}`);
      try {
        // Validate UUID format to prevent database errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(dataModelId)) {
          query = query.eq("data_model_id", dataModelId);
        } else {
          console.warn(`Invalid UUID format for dataModelId: ${dataModelId}`);
          // Return empty array instead of error for invalid UUID
          return NextResponse.json(countOnly ? { count: 0 } : []);
        }
      } catch (error) {
        console.error("Error processing dataModelId:", error);
        // Return empty array instead of error
        return NextResponse.json(countOnly ? { count: 0 } : []);
      }
    }

    if (ruleType && ['validation', 'business', 'automation'].includes(ruleType)) {
      query = query.eq("rule_type", ruleType as 'validation' | 'business' | 'automation');
    }

    // If count only, get the count
    if (countOnly) {
      const { data, error, count } = await query.count('exact');
      
      if (error) {
        console.error("Error counting rules:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      console.log(`Counted ${count} rules matching the criteria`);
      return NextResponse.json({ count: count || 0 });
    }
    
    // Otherwise, get the full data
    // Order by created_at
    query = query.order("created_at", { ascending: false });

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching rules:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Found ${data?.length || 0} rules matching the criteria`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error fetching rules:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// POST /api/rules - Create a new rule
export async function POST(request: NextRequest) {
  console.log('POST /api/rules - Creating new rule');
  try {
    const supabase = createAdminClient();
    
    // Fix the TypeScript error by properly awaiting the client creation
    const client = await createClient();
    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user.id;
    console.log('User ID from session:', userId);

    // Get request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body));
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields for all rule types
    const basicRequiredFields = [
      "name",
      "rule_type",
      "action_expression",
    ];
    
    // Validate basic required fields
    for (const field of basicRequiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Validate condition_expression only for validation rules
    if (body.rule_type === 'validation' && !body.condition_expression) {
      return NextResponse.json(
        { error: `Missing required field: condition_expression` },
        { status: 400 }
      );
    }

    // Validate that either entityId or attributeId is provided
    if (!body.entity_id && !body.attribute_id) {
      return NextResponse.json(
        { error: "Either entity_id or attribute_id is required" },
        { status: 400 }
      );
    }

    // Validate rule_type
    const validRuleTypes = ["validation", "business", "automation"];
    if (!validRuleTypes.includes(body.rule_type)) {
      return NextResponse.json(
        { error: "Invalid rule_type. Must be one of: validation, business, automation" },
        { status: 400 }
      );
    }

    // Validate severity if provided
    if (body.severity) {
      const validSeverities = ["error", "warning", "info"];
      if (!validSeverities.includes(body.severity)) {
        return NextResponse.json(
          { error: "Invalid severity. Must be one of: error, warning, info" },
          { status: 400 }
        );
      }
    }

    // Get the data_model_id from the entity_id if provided
    let data_model_id = null;
    if (body.entity_id) {
      // Fetch the entity to get its data_model_id
      const { data: entityData, error: entityError } = await supabase
        .from("entities")
        .select("data_model_id")
        .eq("id", body.entity_id)
        .single();

      if (entityError) {
        console.error("Error fetching entity data:", entityError);
        return NextResponse.json(
          { error: "Failed to fetch entity data" },
          { status: 500 }
        );
      }

      if (entityData) {
        data_model_id = entityData.data_model_id;
        console.log(`Found data_model_id ${data_model_id} for entity ${body.entity_id}`);
      }
    } else if (body.attribute_id) {
      // If entity_id is not provided but attribute_id is, get the entity_id from the attribute
      // and then get the data_model_id from the entity
      const { data: attributeData, error: attributeError } = await supabase
        .from("attributes")
        .select("entity_id")
        .eq("id", body.attribute_id)
        .single();

      if (attributeError) {
        console.error("Error fetching attribute data:", attributeError);
        return NextResponse.json(
          { error: "Failed to fetch attribute data" },
          { status: 500 }
        );
      }

      if (attributeData && attributeData.entity_id) {
        const { data: entityData, error: entityError } = await supabase
          .from("entities")
          .select("data_model_id")
          .eq("id", attributeData.entity_id)
          .single();

        if (entityError) {
          console.error("Error fetching entity data from attribute:", entityError);
          return NextResponse.json(
            { error: "Failed to fetch entity data from attribute" },
            { status: 500 }
          );
        }

        if (entityData) {
          data_model_id = entityData.data_model_id;
          console.log(`Found data_model_id ${data_model_id} for attribute ${body.attribute_id} via entity ${attributeData.entity_id}`);
        }
      }
    }

    // Prepare rule data
    const ruleData: any = {
      name: body.name,
      description: body.description || null,
      rule_type: body.rule_type,
      entity_id: body.entity_id || null,
      attribute_id: body.attribute_id || null,
      condition_expression: body.condition_expression,
      action_expression: body.action_expression,
      is_enabled: body.is_enabled !== undefined ? body.is_enabled : true,
      dependencies: body.dependencies || null,
      created_by: userId || null,
      data_model_id: data_model_id // Add the data_model_id
    };
    
    // Only add severity if provided
    if (body.severity) {
      ruleData.severity = body.severity;
    }
    
    console.log('Creating rule with data:', ruleData);

    // Log the rule data being inserted
    console.log('Rule data to insert:', JSON.stringify(ruleData));
    
    // Insert rule into database
    const { data, error } = await supabase.from("rules").insert(ruleData).select();

    if (error) {
      console.error("Error creating rule:", error);
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code 
      }, { status: 500 });
    }
    
    console.log('Rule created successfully:', data?.[0]?.id);

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Unexpected error creating rule:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', errorMessage, errorStack);
    
    return NextResponse.json(
      { error: "An unexpected error occurred", details: errorMessage },
      { status: 500 }
    );
  }
}
