import { useState, type FormEvent } from "react";
import { supabase } from "../supabase";
import { primaryButton, textInput } from "../lib/styles";

export default function PlatformLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setSubmitting(false);
  }

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          maxWidth: "90vw",
          background: "var(--ra-color-surface)",
          border: "1px solid var(--ra-color-border)",
          borderRadius: "var(--ra-radius-card)",
          padding: "var(--ra-space-8)",
          boxShadow: "var(--ra-shadow-md)",
        }}
      >
        <h1 style={{ fontSize: "var(--ra-text-xl)", marginBottom: "var(--ra-space-1)" }}>ROOM-AURA</h1>
        <p style={{ color: "var(--ra-color-text-secondary)", marginTop: 0, marginBottom: "var(--ra-space-6)" }}>Platform sign in</p>

        <label style={{ display: "block", marginBottom: "var(--ra-space-4)" }}>
          <span style={{ display: "block", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-1)" }}>Email</span>
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} style={textInput} />
        </label>
        <label style={{ display: "block", marginBottom: "var(--ra-space-4)" }}>
          <span style={{ display: "block", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-1)" }}>Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={textInput}
          />
        </label>

        {error && (
          <p style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)" }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} style={{ ...primaryButton, width: "100%" }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
