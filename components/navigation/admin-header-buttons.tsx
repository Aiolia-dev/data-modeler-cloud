"use client";

import { useEffect, useState } from "react";
import { ShieldIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function AdminHeaderButtons() {
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSuperuser() {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      
      if (data?.user) {
        setIsSuperuser(data.user.user_metadata?.is_superuser === "true");
      }
      
      setIsLoading(false);
    }

    checkSuperuser();
  }, []);

  if (isLoading || !isSuperuser) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="bg-transparent dark:bg-yellow-600/20 text-amber-700 dark:text-yellow-400 py-0.5 px-2 rounded-md text-xs font-medium border border-amber-300 dark:border-yellow-600/30 shadow-sm">
        Superuser
      </div>
      <Link href="/admin-direct">
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2 bg-amber-50 dark:bg-transparent border-amber-300 dark:border-yellow-600/50 text-amber-700 dark:text-yellow-500 hover:text-amber-800 dark:hover:text-yellow-400 hover:bg-amber-100 dark:hover:bg-yellow-600/10 shadow-sm"
        >
          <ShieldIcon size={16} />
          Admin Area
        </Button>
      </Link>
    </div>
  );
}
