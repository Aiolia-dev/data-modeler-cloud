import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

// GET /api/rules/all - Get all rules for a given data model
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dataModelId = searchParams.get("dataModelId");

    // Validate that dataModelId is provided
    if (!dataModelId) {
      return NextResponse.json(
        { error: "dataModelId is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching all rules for data model: ${dataModelId}`);

    // Create Supabase client
    const supabase = createAdminClient();

    // First, get all entities in this data model
    const { data: entities, error: entitiesError } = await supabase
      .from("entities")
      .select("id, name")
      .eq("data_model_id", dataModelId);

    if (entitiesError) {
      console.error("Error fetching entities:", entitiesError);
      return NextResponse.json(
        { error: entitiesError.message },
        { status: 500 }
      );
    }

    if (!entities || entities.length === 0) {
      console.log("No entities found in this data model");
      return NextResponse.json([]);
    }

    console.log(`Found ${entities.length} entities in data model ${dataModelId}`);
    
    // Get all entity IDs
    const entityIds = entities.map(entity => entity.id);
    
    // Fetch all rules for these entities
    const { data: rules, error: rulesError } = await supabase
      .from("rules")
      .select("*")
      .in("entity_id", entityIds);

    if (rulesError) {
      console.error("Error fetching rules:", rulesError);
      return NextResponse.json(
        { error: rulesError.message },
        { status: 500 }
      );
    }

    // Add entity names to the rules
    const rulesWithEntityNames = rules.map(rule => {
      const entity = entities.find(e => e.id === rule.entity_id);
      return {
        ...rule,
        entityName: entity ? entity.name : "Unknown Entity"
      };
    });

    console.log(`Found ${rulesWithEntityNames.length} rules across all entities`);

    return NextResponse.json(rulesWithEntityNames);
  } catch (error) {
    console.error("Unexpected error fetching rules:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
