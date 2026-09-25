import { useEffect, useState } from "react";
import type { ActorType, EventType, RequestStatus } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface HistoryEntry {
  id: string;
  eventType: EventType;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus | null;
  note: string | null;
  actorType: ActorType;
  actorName: string | null;
  createdAt: string;
}

/** The audit timeline — docs/ARCHITECTURE.md's "14:32 Request received /
 *  14:34 Accepted by Sarah / ..." example. Status-change rows are written
 *  automatically by the DB trigger; note/assignment rows by staff directly. */
export function useRequestHistory(requestId: string | null) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!requestId) {
      setHistory([]);
      return;
    }
    let cancelled = false;

    async function load() {
      const { data: rows } = await supabase
        .from("request_status_history")
        .select("id, event_type, from_status, to_status, note, actor_type, actor_staff_id, created_at")
        .eq("request_id", requestId)
        .order("created_at");
      if (cancelled || !rows) return;

      const staffIds = [...new Set(rows.filter((r) => r.actor_staff_id).map((r) => r.actor_staff_id as string))];
      const { data: staff } = staffIds.length
        ? await supabase.from("staff_users").select("id, full_name").in("id", staffIds)
        : { data: [] };
      const staffById = new Map((staff ?? []).map((s) => [s.id, s.full_name]));

      if (cancelled) return;
      setHistory(
        rows.map((r) => ({
          id: r.id,
          eventType: r.event_type,
          fromStatus: r.from_status,
          toStatus: r.to_status,
          note: r.note,
          actorType: r.actor_type,
          actorName: r.actor_staff_id ? (staffById.get(r.actor_staff_id) ?? null) : null,
          createdAt: r.created_at,
        })),
      );
    }
    void load();

    const channel = supabase
      .channel(`request-history-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_status_history", filter: `request_id=eq.${requestId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [requestId]);

  return history;
}
