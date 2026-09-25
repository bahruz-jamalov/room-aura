// Left sidebar + top bar, per docs/ARCHITECTURE.md section 6. `enabled`
// tracks build progress (Phase 4: Dashboard/Requests; Phase 6: config
// screens); `visible` mirrors the role matrix in packages/shared/src/
// permissions.ts so a plain staff member never even sees a nav item RLS
// would reject anyway. Screens not yet built stay enabled: false and
// render as inert placeholders, same choice as the tourist app's 5-tab
// nav in Phase 2.
import type { ReactNode } from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { permissions } from "@room-aura/shared";
import { useAuth, type StaffProfile } from "../auth/AuthContext";
import { useNewRequestsCount } from "../hooks/useNewRequestsCount";
import LoginScreen from "../screens/LoginScreen";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", enabled: true, visible: () => true },
  { to: "/requests", label: "Requests", enabled: true, visible: () => true },
  { to: "/orders", label: "Orders", enabled: false, visible: () => true },
  { to: "/services", label: "Services", enabled: true, visible: () => true },
  { to: "/menu", label: "Food & Drinks", enabled: true, visible: () => true },
  { to: "/rooms", label: "Rooms", enabled: true, visible: (s: StaffProfile) => permissions.canManageRoomsAndDepartments(s) },
  { to: "/departments", label: "Departments", enabled: true, visible: (s: StaffProfile) => permissions.canManageRoomsAndDepartments(s) },
  { to: "/staff", label: "Staff", enabled: true, visible: (s: StaffProfile) => permissions.canManageStaff(s) },
  { to: "/feedback", label: "Feedback", enabled: true, visible: (s: StaffProfile) => permissions.canViewFeedback(s) },
  { to: "/analytics", label: "Analytics", enabled: true, visible: (s: StaffProfile) => permissions.canViewAnalytics(s) },
  { to: "/access", label: "QR / Access", enabled: true, visible: (s: StaffProfile) => permissions.canManageAccessTokens(s) },
  { to: "/settings", label: "Settings", enabled: false, visible: () => true },
] as const;

export default function AdminLayout() {
  const { session, staff } = useAuth();

  if (session === undefined) return <Centered>Loading…</Centered>;
  if (!session) return <LoginScreen />;
  if (!staff) return <Centered>Loading…</Centered>;

  const items = NAV_ITEMS.filter((item) => item.visible(staff));

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: "var(--ra-color-surface)",
          borderRight: "1px solid var(--ra-color-border)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "var(--ra-space-6) var(--ra-space-5)", fontWeight: 700, fontSize: "var(--ra-text-lg)" }}>
          ROOM-AURA
        </div>
        <nav style={{ display: "flex", flexDirection: "column", padding: "0 var(--ra-space-3)", gap: 2 }}>
          {items.map((item) =>
            item.enabled ? (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  padding: "var(--ra-space-3) var(--ra-space-3)",
                  borderRadius: "var(--ra-radius-control)",
                  textDecoration: "none",
                  fontSize: "var(--ra-text-sm)",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--ra-color-accent)" : "var(--ra-color-text-primary)",
                  background: isActive ? "var(--ra-color-accent-soft)" : "transparent",
                })}
              >
                {item.label}
              </NavLink>
            ) : (
              <span
                key={item.to}
                style={{
                  padding: "var(--ra-space-3) var(--ra-space-3)",
                  fontSize: "var(--ra-text-sm)",
                  color: "var(--ra-color-text-secondary)",
                  opacity: 0.6,
                  cursor: "default",
                }}
              >
                {item.label}
              </span>
            ),
          )}
        </nav>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar />
        <main style={{ flex: 1, padding: "var(--ra-space-page-gutter)", overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  const { staff, signOut } = useAuth();
  const newCount = useNewRequestsCount();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--ra-space-3) var(--ra-space-6)",
        borderBottom: "1px solid var(--ra-color-border)",
        background: "var(--ra-color-surface)",
        position: "relative",
        zIndex: "var(--ra-z-toast)", // above the detail panel (--ra-z-modal), so Sign out stays reachable while it's open
      }}
    >
      <div
        style={{
          fontWeight: 600,
          flex: "1 1 auto",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {staff?.hotelName}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-3)", flexShrink: 0, whiteSpace: "nowrap" }}>
        {newCount > 0 && (
          <span
            style={{
              background: "var(--ra-status-new)",
              color: "#fff",
              borderRadius: "var(--ra-radius-full)",
              padding: "2px 10px",
              fontSize: "var(--ra-text-xs)",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {newCount} new
          </span>
        )}
        <span
          style={{
            fontSize: "var(--ra-text-sm)",
            color: "var(--ra-color-text-secondary)",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {staff?.fullName} · {staff?.role}
          {staff?.departmentName ? ` · ${staff.departmentName}` : ""}
        </span>
        <button
          onClick={() => void signOut()}
          style={{
            background: "none",
            border: "none",
            color: "var(--ra-color-accent)",
            cursor: "pointer",
            fontSize: "var(--ra-text-sm)",
            flexShrink: 0,
            padding: 0,
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: "var(--ra-color-text-secondary)" }}>
      {children}
    </div>
  );
}

// "/" always redirects into the app shell — AdminLayout itself renders
// LoginScreen when there's no session, so this doesn't need to know which.
export function RootRedirect() {
  return <Navigate to="/dashboard" replace />;
}
