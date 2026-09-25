import { useCallback, useEffect, useState } from "react";
import type { AccessKind } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface AdminAccessToken {
  id: string;
  kind: AccessKind;
  room_id: string | null;
  roomNumber: string | null;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

/** RLS scopes this to the caller's own hotel (hotel_admin only — see
 *  "hotel admin manages own hotel access tokens"). */
export function useAccessTokensAdmin() {
  const [tokens, setTokens] = useState<AdminAccessToken[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: tokenRows }, { data: roomRows }] = await Promise.all([
      supabase
        .from("access_tokens")
        .select("id, kind, room_id, label, is_active, expires_at, last_used_at, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("rooms").select("id, number"),
    ]);
    const roomNumbers = new Map((roomRows ?? []).map((r) => [r.id, r.number]));
    setTokens((tokenRows ?? []).map((t) => ({ ...t, roomNumber: t.room_id ? (roomNumbers.get(t.room_id) ?? null) : null })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tokens, loading, reload };
}
