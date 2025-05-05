import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Fetch validation roles from the database
    const { data: roles, error } = await supabase
      .from("validation_roles")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error fetching validation roles:", error);
      return NextResponse.json({ error: "Failed to fetch validation roles" }, { status: 500 });
    }
    
    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Unexpected error in validation roles API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
