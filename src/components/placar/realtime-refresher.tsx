"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Listens for changes to reservas/baixas and refreshes the server-rendered placar. */
export function RealtimeRefresher({ sorteioId }: { sorteioId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`placar-${sorteioId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lotes_cartelas",
          filter: `sorteio_id=eq.${sorteioId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "baixas_cartelas" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sorteioId, router]);

  return null;
}
