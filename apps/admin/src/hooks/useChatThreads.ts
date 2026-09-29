// Open guest chat threads for the staff member's own hotel (RLS-scoped via
// auth_hotel_id() — see supabase/migrations/00000000000024_chat.sql), with
// the room number joined in since chat_threads only stores room_id.
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface ChatThreadRow {
  id: string;
  roomNumber: string;
  status: "open" | "closed";
  createdAt: string;
  lastMessageAt: string;
}

export function useChatThreads() {
  const [threads, setThreads] = useState<ChatThreadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: rows } = await supabase
        .from("chat_threads")
        .select("id, room_id, status, created_at, last_message_at")
        .eq("status", "open")
        .order("last_message_at", { ascending: false });
      if (cancelled) return;

      const roomIds = [...new Set((rows ?? []).map((r) => r.room_id))];
      let roomsById = new Map<string, string>();
      if (roomIds.length > 0) {
        const { data: rooms } = await supabase.from("rooms").select("id, number").in("id", roomIds);
        roomsById = new Map((rooms ?? []).map((r) => [r.id, r.number]));
      }

      setThreads(
        (rows ?? []).map((r) => ({
          id: r.id,
          roomNumber: roomsById.get(r.room_id) ?? "—",
          status: r.status,
          createdAt: r.created_at,
          lastMessageAt: r.last_message_at,
        })),
      );
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel("chat-threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { threads, loading };
}
