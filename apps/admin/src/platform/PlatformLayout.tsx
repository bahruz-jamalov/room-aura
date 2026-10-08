// /platform shell — distinct layout from the hotel AdminLayout
// (docs/ARCHITECTURE.md section 6: "SUPER ADMIN ... distinct layout").
import { NavLink, Outlet } from "react-router-dom";
import { usePlatformAuth } from "./PlatformAuthContext";
import PlatformLoginScreen from "./PlatformLoginScreen";

const NAV_ITEMS = [
  { to: "/platform/hotels", label: "Hotels" },
  { to: "/platform/catalog", label: "Explore the City" },
  { to: "/platform/analytics", label: "Analytics" },
] as const;

export default function PlatformLayout() {
  const { session, platformAdmin, signOut } = usePlatformAuth();

  if (session === undefined) return <Centered>Loading…</Centered>;
  if (!session) return <PlatformLoginScreen />;
  if (platformAdmin === undefined) return <Centered>Loading…</Centered>;
  if (platformAdmin === null) {
    return (
      <Centered>
        <p style={{ marginBottom: "var(--ra-space-4)" }}>This account isn't a platform admin.</p>
        <button onClick={() => void signOut()} style={{ background: "none", border: "none", color: "var(--ra-color-accent)", cursor: "pointer" }}>
          Sign out
        </button>
      </Centered>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: "var(--ra-color-text-primary)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "var(--ra-space-6) var(--ra-space-5)", fontWeight: 700, fontSize: "var(--ra-text-lg)" }}>
          ROOM-AURA <span style={{ opacity: 0.6, fontWeight: 500, fontSize: "var(--ra-text-sm)" }}>Platform</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", padding: "0 var(--ra-space-3)", gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: "var(--ra-space-3) var(--ra-space-3)",
                borderRadius: "var(--ra-radius-control)",
                textDecoration: "none",
                fontSize: "var(--ra-text-sm)",
                fontWeight: isActive ? 600 : 500,
                color: "#fff",
                background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--ra-space-3) var(--ra-space-6)",
            borderBottom: "1px solid var(--ra-color-border)",
            background: "var(--ra-color-surface)",
          }}
        >
          <div style={{ fontWeight: 600 }}>Super Admin</div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-3)" }}>
            <span style={{ fontSize: "var(--ra-text-sm)", color: "var(--ra-color-text-secondary)" }}>{platformAdmin.fullName}</span>
            <button
              onClick={() => void signOut()}
              style={{ background: "none", border: "none", color: "var(--ra-color-accent)", cursor: "pointer", fontSize: "var(--ra-text-sm)" }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main style={{ flex: 1, padding: "var(--ra-space-page-gutter)", overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: "var(--ra-color-text-secondary)", textAlign: "center" }}>
      {children}
    </div>
  );
}
