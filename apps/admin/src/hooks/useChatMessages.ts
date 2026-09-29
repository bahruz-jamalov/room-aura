import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface ChatMessageRow {
  id: string;
  senderType: "guest" | "staff";
  staffName: string | null;
  body: string;
  createdAt: string;
}

export function useChatMessages(threadId: string) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: rows } = await supabase
        .from("chat_messages")
        .select("id, sender_type, staff_user_id, body, created_at")
        .eq("thread_id", threadId)
        .order("created_at");
      if (cancelled) return;

      const staffIds = [...new Set((rows ?? []).filter((r) => r.staff_user_id).map((r) => r.staff_user_id as string))];
      let staffNamesById = new Map<string, string>();
      if (staffIds.length > 0) {
        const { data: staff } = await supabase.from("staff_users").select("id, full_name").in("id", staffIds);
        staffNamesById = new Map((staff ?? []).map((s) => [s.id, s.full_name]));
      }

      setMessages(
        (rows ?? []).map((r) => ({
          id: r.id,
          senderType: r.sender_type,
          staffName: r.staff_user_id ? (staffNamesById.get(r.staff_user_id) ?? "Staff") : null,
          body: r.body,
          createdAt: r.created_at,
        })),
      );
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel(`chat-messages-${threadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  return { messages, loading };
}
