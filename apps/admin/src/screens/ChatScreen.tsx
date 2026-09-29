import { useState } from "react";
import ChatThreadPanel from "../components/ChatThreadPanel";
import { useChatThreads } from "../hooks/useChatThreads";
import { card } from "../lib/styles";

export default function ChatScreen() {
  const { threads, loading } = useChatThreads();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Live Chat</h1>
      <p style={{ color: "var(--ra-color-text-secondary)", marginTop: -8 }}>
        Guests land here when the in-app assistant can't answer their question.
      </p>

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Room", "Started", "Last message"].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : threads.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No open conversations.
                </td>
              </tr>
            ) : (
              threads.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  style={{ borderTop: "1px solid var(--ra-color-border)", cursor: "pointer" }}
                >
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>Room {t.roomNumber}</td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>
                    {new Date(t.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>
                    {new Date(t.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <ChatThreadPanel
          threadId={selectedId}
          roomNumber={threads.find((t) => t.id === selectedId)?.roomNumber ?? "—"}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
