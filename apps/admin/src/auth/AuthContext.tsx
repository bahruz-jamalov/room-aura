// Staff identity for the whole admin app. Mirrors the "resolved by RLS, not
// chosen by the client" pattern from the Phase 1 checkpoint screen: the
// staff's hotel/role/department come from staff_users, never from anything
// the client asserts.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { StaffRole } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface StaffProfile {
  id: string;
  hotelId: string;
  hotelName: string;
  departmentId: string | null;
  departmentName: string | null;
  role: StaffRole;
  fullName: string;
  email: string;
}

interface AuthContextValue {
  session: Session | null | undefined; // undefined = still loading
  staff: StaffProfile | null;
  isAdminOrManager: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [staff, setStaff] = useState<StaffProfile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setStaff(null);
      return;
    }
    let cancelled = false;
    async function load() {
      const { data: staffRow } = await supabase
        .from("staff_users")
        .select("id, hotel_id, department_id, role, full_name, email")
        .eq("id", session!.user.id)
        .single();
      if (!staffRow || cancelled) return;

      const [{ data: hotel }, { data: department }] = await Promise.all([
        supabase.from("hotels").select("name").eq("id", staffRow.hotel_id).single(),
        staffRow.department_id
          ? supabase.from("departments").select("name").eq("id", staffRow.department_id).single()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;

      setStaff({
        id: staffRow.id,
        hotelId: staffRow.hotel_id,
        hotelName: hotel?.name ?? "",
        departmentId: staffRow.department_id,
        departmentName: department?.name ?? null,
        role: staffRow.role,
        fullName: staffRow.full_name,
        email: staffRow.email,
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      staff,
      isAdminOrManager: staff?.role === "hotel_admin" || staff?.role === "manager",
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, staff],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
