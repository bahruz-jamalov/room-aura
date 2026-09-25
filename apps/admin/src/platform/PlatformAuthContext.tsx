// Platform admin identity — deliberately separate from the hotel-staff
// AuthContext. A platform admin is ROOM-AURA's own staff, not a hotel role
// (docs/ARCHITECTURE.md section 4/7): same Supabase Auth (email+password),
// a different profile table (platform_admins, not staff_users), and its
// own RLS ("platform admin reads own row", migration 00000000000020).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export interface PlatformProfile {
  userId: string;
  fullName: string;
  email: string;
}

interface PlatformAuthContextValue {
  session: Session | null | undefined; // undefined = still loading
  platformAdmin: PlatformProfile | null | undefined; // undefined = still checking, null = not a platform admin
  signOut: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [platformAdmin, setPlatformAdmin] = useState<PlatformProfile | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setPlatformAdmin(session === null ? null : undefined);
      return;
    }
    let cancelled = false;
    supabase
      .from("platform_admins")
      .select("user_id, full_name")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setPlatformAdmin(data ? { userId: data.user_id, fullName: data.full_name, email: session.user.email ?? "" } : null);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<PlatformAuthContextValue>(
    () => ({
      session,
      platformAdmin,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, platformAdmin],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth must be used within a PlatformAuthProvider");
  return ctx;
}
