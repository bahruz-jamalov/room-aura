import { useCallback, useEffect, useState } from "react";
import type { StaffRole, StaffStatus } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface AdminStaffMember {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  department_id: string | null;
  departmentName: string | null;
  status: StaffStatus;
}

/** RLS scopes this to the caller's own hotel roster. */
export function useStaffAdmin() {
  const [staff, setStaff] = useState<AdminStaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: staffRows }, { data: departmentRows }] = await Promise.all([
      supabase.from("staff_users").select("id, full_name, email, role, department_id, status").order("full_name"),
      supabase.from("departments").select("id, name"),
    ]);
    const departmentNames = new Map((departmentRows ?? []).map((d) => [d.id, d.name]));
    setStaff(
      (staffRows ?? []).map((s) => ({
        ...s,
        departmentName: s.department_id ? (departmentNames.get(s.department_id) ?? null) : null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { staff, loading, reload };
}
