import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface AdminFloor {
  id: string;
  number: number;
  label: string | null;
  sort_order: number;
}

/** RLS scopes this to the caller's own hotel. */
export function useFloorsAdmin() {
  const [floors, setFloors] = useState<AdminFloor[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("floors").select("id, number, label, sort_order").order("sort_order");
    setFloors(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { floors, loading, reload };
}
