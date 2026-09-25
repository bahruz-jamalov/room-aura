import type { CSSProperties } from "react";

export const primaryButton: CSSProperties = {
  width: "100%",
  minHeight: "var(--ra-min-target)",
  border: "none",
  borderRadius: "var(--ra-radius-control)",
  background: "var(--ra-color-accent)",
  color: "var(--ra-color-accent-contrast)",
  fontSize: "var(--ra-text-lg)",
  fontWeight: 600,
  cursor: "pointer",
};

export const secondaryButton: CSSProperties = {
  ...primaryButton,
  background: "var(--ra-color-surface)",
  color: "var(--ra-color-text-primary)",
  border: "1px solid var(--ra-color-border)",
};

export const textInput: CSSProperties = {
  width: "100%",
  minHeight: "var(--ra-min-target)",
  padding: "0 var(--ra-space-3)",
  border: "1px solid var(--ra-color-border)",
  borderRadius: "var(--ra-radius-control)",
  fontSize: "var(--ra-text-lg)",
  background: "var(--ra-color-surface)",
  color: "var(--ra-color-text-primary)",
};

export const card: CSSProperties = {
  background: "var(--ra-color-surface)",
  border: "1px solid var(--ra-color-border)",
  borderRadius: "var(--ra-radius-card)",
  boxShadow: "var(--ra-shadow-sm)",
};
