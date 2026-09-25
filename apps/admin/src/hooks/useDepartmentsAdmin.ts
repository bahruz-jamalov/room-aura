import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface AdminDepartment {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

/** Full department rows (incl. inactive) for the /departments config screen.
 *  RLS already scopes this to the caller's own hotel. */
export function useDepartmentsAdmin() {
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("departments").select("id, code, name, is_active, sort_order").order("sort_order");
    setDepartments(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { departments, loading, reload };
}
