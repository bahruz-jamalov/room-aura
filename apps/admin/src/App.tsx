// Phase 1 proof-of-foundation screen: real staff login against the linked
// Supabase project, then a read that only succeeds because RLS resolved the
// caller's own hotel/department. The full Requests/Dashboard IA is Phase 4 —
// this page exists to verify authentication + RLS actually work end to end,
// not to be the admin app.
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Department, Hotel, StaffUser } from "@room-aura/shared";
import { supabase } from "./supabase";

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Centered>Loading…</Centered>;
  return session ? <Dashboard session={session} /> : <LoginForm />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: "var(--ra-color-text-secondary)" }}>
      {children}
    </div>
  );
}

function LoginForm() {
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
    <Centered>
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
        <p style={{ color: "var(--ra-color-text-secondary)", marginTop: 0, marginBottom: "var(--ra-space-6)" }}>
          Hotel Admin sign in
        </p>

        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </Field>

        {error && (
          <p style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)" }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Centered>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "var(--ra-space-4)" }}>
      <span style={{ display: "block", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-1)" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "var(--ra-min-target)",
  padding: "0 var(--ra-space-3)",
  border: "1px solid var(--ra-color-border)",
  borderRadius: "var(--ra-radius-control)",
  fontSize: "var(--ra-text-base)",
  background: "var(--ra-color-surface)",
  color: "var(--ra-color-text-primary)",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "var(--ra-min-target)",
  border: "none",
  borderRadius: "var(--ra-radius-control)",
  background: "var(--ra-color-accent)",
  color: "var(--ra-color-accent-contrast)",
  fontSize: "var(--ra-text-base)",
  fontWeight: 600,
  cursor: "pointer",
};

function Dashboard({ session }: { session: Session }) {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: staffRow, error: staffError } = await supabase
        .from("staff_users")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (staffError) {
        if (!cancelled) setError(staffError.message);
        return;
      }
      if (cancelled) return;
      setStaff(staffRow as StaffUser);

      const { data: hotelRow } = await supabase.from("hotels").select("*").eq("id", staffRow.hotel_id).single();
      if (!cancelled) setHotel(hotelRow as Hotel);

      if (staffRow.department_id) {
        const { data: deptRow } = await supabase
          .from("departments")
          .select("*")
          .eq("id", staffRow.department_id)
          .single();
        if (!cancelled) setDepartment(deptRow as Department);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session.user.id]);

  return (
    <div style={{ maxWidth: 560, margin: "var(--ra-space-16) auto", padding: "0 var(--ra-space-4)" }}>
      <h1 style={{ fontSize: "var(--ra-text-2xl)" }}>ROOM-AURA Admin</h1>
      <p style={{ color: "var(--ra-color-text-secondary)" }}>
        Phase 1 checkpoint: this page proves staff authentication and Row Level Security work end to end. The full
        operations dashboard is built in Phase 4.
      </p>

      {error && (
        <p style={{ color: "var(--ra-color-danger)" }} role="alert">
          {error}
        </p>
      )}

      {staff && (
        <div
          style={{
            background: "var(--ra-color-surface)",
            border: "1px solid var(--ra-color-border)",
            borderRadius: "var(--ra-radius-card)",
            padding: "var(--ra-space-6)",
            marginTop: "var(--ra-space-6)",
          }}
        >
          <Row label="Signed in as" value={`${staff.full_name} <${staff.email}>`} />
          <Row label="Role" value={staff.role} />
          <Row label="Department" value={department?.name ?? "— (all departments)"} />
          <Row label="Hotel (resolved by RLS, not chosen by you)" value={hotel?.name ?? "loading…"} />
        </div>
      )}

      <button
        onClick={() => void supabase.auth.signOut()}
        style={{ ...buttonStyle, width: "auto", padding: "0 var(--ra-space-6)", marginTop: "var(--ra-space-6)" }}
      >
        Sign out
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--ra-space-2) 0" }}>
      <span style={{ color: "var(--ra-color-text-secondary)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
