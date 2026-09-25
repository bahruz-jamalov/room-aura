import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface AdminRoom {
  id: string;
  number: string;
  floor_id: string | null;
  floor_label: string | null;
  is_active: boolean;
  hasActiveGuestSession: boolean;
}

/** Rooms joined with floor label and current occupancy, client-side (same
 *  pattern as useRequestsQueue). RLS scopes rooms/floors/guest_sessions to
 *  the caller's own hotel. */
export function useRoomsAdmin() {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: roomRows }, { data: floorRows }, { data: sessionRows }] = await Promise.all([
      supabase.from("rooms").select("id, number, floor_id, is_active").order("number"),
      supabase.from("floors").select("id, number, label"),
      supabase.from("guest_sessions").select("room_id").is("revoked_at", null).gt("expires_at", new Date().toISOString()),
    ]);

    const floorLabels = new Map((floorRows ?? []).map((f) => [f.id, f.label ?? `Floor ${f.number}`]));
    const occupiedRoomIds = new Set((sessionRows ?? []).map((s) => s.room_id));

    setRooms(
      (roomRows ?? []).map((r) => ({
        id: r.id,
        number: r.number,
        floor_id: r.floor_id,
        floor_label: r.floor_id ? (floorLabels.get(r.floor_id) ?? null) : null,
        is_active: r.is_active,
        hasActiveGuestSession: occupiedRoomIds.has(r.id),
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rooms, loading, reload };
}
