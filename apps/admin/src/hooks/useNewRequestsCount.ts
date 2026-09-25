import { useEffect, useState } from "react";
import { supabase } from "../supabase";

/** Live "new requests" counter for the top bar — RLS already scopes this to
 *  the caller's own hotel/department, so no manual filter is needed. */
export function useNewRequestsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { count: c } = await supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "new");
      if (!cancelled) setCount(c ?? 0);
    }
    void load();

    const channel = supabase
      .channel("new-requests-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
