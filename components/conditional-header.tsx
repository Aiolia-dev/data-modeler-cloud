"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";

interface ConditionalHeaderProps {
  hasEnvVars: boolean;
}

export default function ConditionalHeader({ hasEnvVars }: ConditionalHeaderProps) {
  const pathname = usePathname();
  const [showHeader, setShowHeader] = useState(false);
  
  useEffect(() => {
    // Only show the header if we're not on the home page
    setShowHeader(pathname !== '/');
  }, [pathname]);
  
  if (!showHeader) {
    return null;
  }
  
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full px-5 flex justify-between items-center p-3 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <Link href={"/"}>DataModel Pro</Link>
        </div>
        {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
      </div>
    </nav>
  );
}
