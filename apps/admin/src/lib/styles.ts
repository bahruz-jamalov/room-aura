import type { CSSProperties } from "react";

export const primaryButton: CSSProperties = {
  minHeight: "var(--ra-min-target)",
  padding: "0 var(--ra-space-4)",
  border: "none",
  borderRadius: "var(--ra-radius-control)",
  background: "var(--ra-color-accent)",
  color: "var(--ra-color-accent-contrast)",
  fontSize: "var(--ra-text-sm)",
  fontWeight: 600,
  cursor: "pointer",
};

export const secondaryButton: CSSProperties = {
  ...primaryButton,
  background: "var(--ra-color-surface)",
  color: "var(--ra-color-text-primary)",
  border: "1px solid var(--ra-color-border)",
};

export const dangerButton: CSSProperties = {
  ...primaryButton,
  background: "var(--ra-color-danger)",
};

export const textInput: CSSProperties = {
  width: "100%",
  minHeight: "var(--ra-min-target)",
  padding: "0 var(--ra-space-3)",
  border: "1px solid var(--ra-color-border)",
  borderRadius: "var(--ra-radius-control)",
  fontSize: "var(--ra-text-sm)",
  background: "var(--ra-color-surface)",
  color: "var(--ra-color-text-primary)",
};

export const selectInput: CSSProperties = { ...textInput };

export const card: CSSProperties = {
  background: "var(--ra-color-surface)",
  border: "1px solid var(--ra-color-border)",
  borderRadius: "var(--ra-radius-card)",
  boxShadow: "var(--ra-shadow-sm)",
};

export const statusColors: Record<string, string> = {
  new: "var(--ra-status-new)",
  accepted: "var(--ra-status-accepted)",
  in_progress: "var(--ra-status-in-progress)",
  on_the_way: "var(--ra-status-on-the-way)",
  completed: "var(--ra-status-completed)",
  cancelled: "var(--ra-status-cancelled)",
};
