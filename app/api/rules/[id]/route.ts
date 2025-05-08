import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// GET /api/rules/[id] - Get a specific rule by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Fetch the rule
    const { data, error } = await supabase
      .from("rules")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }
      console.error("Error fetching rule:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error fetching rule:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PATCH /api/rules/[id] - Update a specific rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const body = await request.json();

    // Only update fields that are provided
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.rule_type !== undefined) updates.rule_type = body.rule_type;
    if (body.entity_id !== undefined) updates.entity_id = body.entity_id;
    if (body.attribute_id !== undefined) updates.attribute_id = body.attribute_id;
    if (body.condition_expression !== undefined) updates.condition_expression = body.condition_expression;
    if (body.action_expression !== undefined) updates.action_expression = body.action_expression;
    if (body.severity !== undefined) updates.severity = body.severity;
    if (body.is_enabled !== undefined) updates.is_enabled = body.is_enabled;
    if (body.dependencies !== undefined) updates.dependencies = body.dependencies;
    updates.updated_at = new Date().toISOString();
    
    // Update data_model_id if entity_id or attribute_id is changing
    if (body.entity_id !== undefined || body.attribute_id !== undefined) {
      // Determine which ID to use for fetching the data model
      let entityIdToUse = body.entity_id;
      
      // If entity_id is not provided but attribute_id is, get the entity_id from the attribute
      if (!entityIdToUse && body.attribute_id !== undefined) {
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

        if (attributeData) {
          entityIdToUse = attributeData.entity_id;
        }
      }
      
      // If we have an entity ID, fetch its data_model_id
      if (entityIdToUse) {
        const { data: entityData, error: entityError } = await supabase
          .from("entities")
          .select("data_model_id")
          .eq("id", entityIdToUse)
          .single();

        if (entityError) {
          console.error("Error fetching entity data:", entityError);
          return NextResponse.json(
            { error: "Failed to fetch entity data" },
            { status: 500 }
          );
        }

        if (entityData) {
          updates.data_model_id = entityData.data_model_id;
          console.log(`Updating data_model_id to ${updates.data_model_id} for rule ${id}`);
        }
      }
    }

    console.log('Updating rule with data:', updates);

    // Validate rule_type if provided
    if (body.rule_type) {
      const validRuleTypes = ["validation", "business", "automation"];
      if (!validRuleTypes.includes(body.rule_type)) {
        return NextResponse.json(
          { error: "Invalid rule_type. Must be one of: validation, business, automation" },
          { status: 400 }
        );
      }
    }

    // Severity field is now optional, but still validate if provided
    if (body.severity) {
      const validSeverities = ["error", "warning", "info"];
      if (!validSeverities.includes(body.severity)) {
        return NextResponse.json(
          { error: "Invalid severity. Must be one of: error, warning, info" },
          { status: 400 }
        );
      }
    }

    // Update the rule
    const { data, error } = await supabase
      .from("rules")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating rule:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error("Unexpected error updating rule:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE /api/rules/[id] - Delete a specific rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Delete the rule
    const { error } = await supabase.from("rules").delete().eq("id", id);

    if (error) {
      console.error("Error deleting rule:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error deleting rule:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
