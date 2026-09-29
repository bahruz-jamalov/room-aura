import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useChatMessages } from "../hooks/useChatMessages";
import { primaryButton, secondaryButton, textInput } from "../lib/styles";
import { supabase } from "../supabase";
import SidePanel from "./SidePanel";

export default function ChatThreadPanel({
  threadId,
  roomNumber,
  onClose,
}: {
  threadId: string;
  roomNumber: string;
  onClose: () => void;
}) {
  const { staff } = useAuth();
  const { messages, loading } = useChatMessages(threadId);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSend() {
    const body = reply.trim();
    if (!body || !staff) return;
    setBusy(true);
    await supabase.from("chat_messages").insert({
      thread_id: threadId,
      hotel_id: staff.hotelId,
      sender_type: "staff",
      staff_user_id: staff.id,
      body,
    });
    setReply("");
    setBusy(false);
  }

  async function handleClose() {
    setBusy(true);
    await supabase.from("chat_threads").update({ status: "closed" }).eq("id", threadId);
    setBusy(false);
    onClose();
  }

  return (
    <SidePanel title={`Room ${roomNumber}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-3)", marginBottom: "var(--ra-space-4)" }}>
        {loading ? (
          <p style={{ color: "var(--ra-color-text-secondary)" }}>Loading…</p>
        ) : messages.length === 0 ? (
          <p style={{ color: "var(--ra-color-text-secondary)" }}>No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{ alignSelf: m.senderType === "staff" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
              <div
                style={{
                  background: m.senderType === "staff" ? "var(--ra-color-accent-soft)" : "var(--ra-color-surface-sunken)",
                  borderRadius: "var(--ra-radius-control)",
                  padding: "var(--ra-space-2) var(--ra-space-3)",
                }}
              >
                {m.body}
              </div>
              <div style={{ fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)", marginTop: 2 }}>
                {m.senderType === "staff" ? m.staffName : "Guest"} ·{" "}
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))
        )}
      </div>

      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Type a reply…"
        rows={3}
        style={{ ...textInput, width: "100%", resize: "vertical", marginBottom: "var(--ra-space-3)" }}
      />
      <div style={{ display: "flex", gap: "var(--ra-space-2)" }}>
        <button disabled={busy || !reply.trim()} onClick={() => void handleSend()} style={primaryButton}>
          Send
        </button>
        <button disabled={busy} onClick={() => void handleClose()} style={secondaryButton}>
          Close conversation
        </button>
      </div>
    </SidePanel>
  );
}
