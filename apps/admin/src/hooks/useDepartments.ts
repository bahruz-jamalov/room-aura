import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface DepartmentOption {
  id: string;
  name: string;
}

/** RLS scopes this to the caller's own hotel — see "staff reads own hotel
 *  departments" in 00000000000009_rls_policies.sql. */
export function useDepartments() {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("departments")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => {
        if (!cancelled) setDepartments(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return departments;
}
