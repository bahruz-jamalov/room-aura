// Generic right-hand drawer for Phase 6 admin forms (add/edit department,
// room, service, staff member, etc.) — same positioning/chrome as
// RequestDetailPanel, factored out so every config screen doesn't repeat it.
import type { ReactNode } from "react";

export default function SidePanel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        maxWidth: "100vw",
        background: "var(--ra-color-surface)",
        borderLeft: "1px solid var(--ra-color-border)",
        boxShadow: "var(--ra-shadow-lg)",
        overflowY: "auto",
        zIndex: "var(--ra-z-modal)",
        padding: "var(--ra-space-6)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--ra-space-4)" }}>
        <h2 style={{ margin: 0, fontSize: "var(--ra-text-xl)" }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "var(--ra-text-xl)", cursor: "pointer" }}>
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "var(--ra-space-4)" }}>
      <span style={{ display: "block", fontSize: "var(--ra-text-sm)", fontWeight: 600, marginBottom: "var(--ra-space-2)" }}>{label}</span>
      {children}
    </label>
  );
}
