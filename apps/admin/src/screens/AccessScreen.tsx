// /access — hotel QR, per-room QR, temporary access codes: generate,
// preview, download PNG, deactivate, regenerate (docs/ARCHITECTURE.md
// section 6). Hotel-admin only.
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { AccessKind } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import SidePanel, { FormField } from "../components/SidePanel";
import { env } from "../env";
import { useAccessTokensAdmin, type AdminAccessToken } from "../hooks/useAccessTokensAdmin";
import { useRoomsAdmin } from "../hooks/useRoomsAdmin";
import { randomAccessCode, randomUrlToken, sha256Hex } from "../lib/accessTokens";
import { card, dangerButton, primaryButton, secondaryButton, selectInput, textInput } from "../lib/styles";
import { supabase } from "../supabase";

const KIND_LABELS: Record<AccessKind, string> = {
  hotel: "Hotel-wide QR",
  room: "Room QR",
  access_code: "Access code",
};

export default function AccessScreen() {
  const { staff } = useAuth();
  const { tokens, loading, reload } = useAccessTokensAdmin();
  const { rooms } = useRoomsAdmin();
  const [creating, setCreating] = useState(false);
  const [reveal, setReveal] = useState<{ label: string; kind: AccessKind; rawValue: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleActive(token: AdminAccessToken) {
    const { error: updateError } = await supabase.from("access_tokens").update({ is_active: !token.is_active }).eq("id", token.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setError(null);
    await reload();
  }

  async function handleRegenerate(token: AdminAccessToken) {
    if (!staff) return;
    if (!confirm(`Regenerate "${token.label ?? KIND_LABELS[token.kind]}"? The old QR/code stops working immediately.`)) return;

    const rawValue = token.kind === "access_code" ? randomAccessCode() : randomUrlToken();
    const tokenHash = await sha256Hex(rawValue);

    const { error: insertError } = await supabase.from("access_tokens").insert({
      hotel_id: staff.hotelId,
      room_id: token.room_id,
      kind: token.kind,
      token_hash: tokenHash,
      label: token.label,
      created_by: staff.id,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await supabase.from("access_tokens").update({ is_active: false }).eq("id", token.id);
    setError(null);
    setReveal({ label: token.label ?? KIND_LABELS[token.kind], kind: token.kind, rawValue });
    await reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>QR / Access</h1>
        <button style={primaryButton} onClick={() => setCreating(true)}>
          + Generate
        </button>
      </div>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Type", "Room", "Label", "Status", "Last used", ""].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : tokens.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No QR codes or access codes yet.
                </td>
              </tr>
            ) : (
              tokens.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{KIND_LABELS[t.kind]}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{t.roomNumber ?? "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{t.label ?? "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{t.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>
                    {t.last_used_at ? new Date(t.last_used_at).toLocaleString() : "Never"}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    {t.is_active && (
                      <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => void handleRegenerate(t)}>
                        Regenerate
                      </button>
                    )}
                    <button style={t.is_active ? dangerButton : secondaryButton} onClick={() => void handleToggleActive(t)}>
                      {t.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && staff && (
        <GenerateForm
          hotelId={staff.hotelId}
          staffId={staff.id}
          rooms={rooms}
          onClose={() => setCreating(false)}
          onGenerated={async (label, kind, rawValue) => {
            setCreating(false);
            setReveal({ label, kind, rawValue });
            await reload();
          }}
        />
      )}

      {reveal && <RevealPanel reveal={reveal} onClose={() => setReveal(null)} />}
    </div>
  );
}

function GenerateForm({
  hotelId,
  staffId,
  rooms,
  onClose,
  onGenerated,
}: {
  hotelId: string;
  staffId: string;
  rooms: { id: string; number: string }[];
  onClose: () => void;
  onGenerated: (label: string, kind: AccessKind, rawValue: string) => void;
}) {
  const [kind, setKind] = useState<AccessKind>("room");
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (kind === "room" && !roomId) {
      setError("Choose a room.");
      return;
    }
    setBusy(true);
    setError(null);

    const rawValue = kind === "access_code" ? randomAccessCode() : randomUrlToken();
    const tokenHash = await sha256Hex(rawValue);
    const finalLabel = label.trim() || null;

    const { error: insertError } = await supabase.from("access_tokens").insert({
      hotel_id: hotelId,
      room_id: kind === "room" ? roomId : null,
      kind,
      token_hash: tokenHash,
      label: finalLabel,
      created_by: staffId,
    });

    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onGenerated(finalLabel ?? KIND_LABELS[kind], kind, rawValue);
  }

  return (
    <SidePanel title="Generate Access" onClose={onClose}>
      <FormField label="Type">
        <select style={selectInput} value={kind} onChange={(e) => setKind(e.target.value as AccessKind)}>
          <option value="room">Room QR</option>
          <option value="hotel">Hotel-wide QR</option>
          <option value="access_code">Access code</option>
        </select>
      </FormField>
      {kind === "room" && (
        <FormField label="Room">
          <select style={selectInput} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.number}
              </option>
            ))}
          </select>
        </FormField>
      )}
      <FormField label="Label (optional)">
        <input style={textInput} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Front desk printout" />
      </FormField>

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? "Generating…" : "Generate"}
      </button>
    </SidePanel>
  );
}

function RevealPanel({
  reveal,
  onClose,
}: {
  reveal: { label: string; kind: AccessKind; rawValue: string };
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const isCode = reveal.kind === "access_code";
  const joinUrl = `${env.touristAppUrl}/j/${reveal.rawValue}`;
  const qrContent = isCode ? reveal.rawValue : joinUrl;

  useEffect(() => {
    if (isCode) return;
    let cancelled = false;
    QRCode.toDataURL(qrContent, { width: 320, margin: 2 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [qrContent, isCode]);

  return (
    <SidePanel title={reveal.label} onClose={onClose}>
      <p style={{ fontSize: "var(--ra-text-sm)", color: "var(--ra-color-text-secondary)" }}>
        This is shown once — only its hash is stored. Save or print it now.
      </p>

      {isCode ? (
        <div
          style={{
            ...card,
            padding: "var(--ra-space-5)",
            textAlign: "center",
            fontSize: "var(--ra-text-2xl)",
            fontWeight: 700,
            letterSpacing: "0.15em",
            marginBottom: "var(--ra-space-4)",
          }}
        >
          {reveal.rawValue}
        </div>
      ) : (
        qrDataUrl && (
          <div style={{ textAlign: "center", marginBottom: "var(--ra-space-4)" }}>
            <img src={qrDataUrl} alt="QR code" style={{ width: 240, height: 240 }} />
            <div style={{ fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)", wordBreak: "break-all", marginTop: "var(--ra-space-2)" }}>
              {joinUrl}
            </div>
          </div>
        )
      )}

      <div style={{ display: "flex", gap: "var(--ra-space-2)" }}>
        <button style={secondaryButton} onClick={() => void navigator.clipboard.writeText(isCode ? reveal.rawValue : joinUrl)}>
          Copy
        </button>
        {qrDataUrl && !isCode && (
          <a
            href={qrDataUrl}
            download={`${reveal.label.replace(/\s+/g, "-").toLowerCase()}-qr.png`}
            style={{ ...secondaryButton, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Download PNG
          </a>
        )}
      </div>
    </SidePanel>
  );
}
