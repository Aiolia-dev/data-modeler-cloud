'use client';

import { usePathname } from "next/navigation";
import HeaderAuthClient from "./header-auth-client";
import { EnvVarWarning } from "./env-var-warning";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";

export default function ConditionalHeaderAuth() {
  const pathname = usePathname();
  
  // Always show the auth UI in the main layout
  // We've removed it from the protected layout
  
  return !hasEnvVars ? <EnvVarWarning /> : <HeaderAuthClient />;
}
