import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface StaffOption {
  id: string;
  fullName: string;
}

/** Staff assignable to a request in this department — admin/manager (who
 *  see every department) plus anyone actually in it. RLS scopes the read to
 *  the caller's own hotel roster. */
export function useStaffInDepartment(departmentId: string | null) {
  const [staff, setStaff] = useState<StaffOption[]>([]);

  useEffect(() => {
    if (!departmentId) {
      setStaff([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("staff_users")
      .select("id, full_name, role")
      .eq("status", "active")
      .or(`department_id.eq.${departmentId},role.in.(hotel_admin,manager)`)
      .then(({ data }) => {
        if (!cancelled) setStaff((data ?? []).map((s) => ({ id: s.id, fullName: s.full_name })));
      });
    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  return staff;
}
