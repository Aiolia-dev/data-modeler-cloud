'use client';

import { usePathname } from "next/navigation";
import HeaderAuthClient from "./header-auth-client";
import { EnvVarWarning } from "./env-var-warning";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";

export default function ConditionalHeaderAuth() {
  const pathname = usePathname();
  
  // Hide the auth UI in the main layout when on protected pages
  // since the protected layout will show its own auth UI
  if (pathname.startsWith('/protected')) {
    return null;
  }
  
  return !hasEnvVars ? <EnvVarWarning /> : <HeaderAuthClient />;
}
