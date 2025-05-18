import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { supabase } = await createMiddlewareClient(request);
  let sessionResult = null;
  let error = null;
  if (supabase) {
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      sessionResult = data.session;
      error = sessionError;
    } catch (e) {
      error = e;
    }
  }
  const cookies = request.cookies.getAll();
  return NextResponse.json({
    cookies,
    session: sessionResult,
    error,
  });
}
