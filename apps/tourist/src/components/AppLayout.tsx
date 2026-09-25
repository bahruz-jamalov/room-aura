import { Navigate, Outlet } from "react-router-dom";
import { useGuestSession } from "../guest/GuestSessionContext";
import BottomNav from "./BottomNav";

/** Wraps every screen that needs an active guest session. Redirects to
 *  onboarding if the session is missing, expired or revoked — RLS would
 *  have refused the reads anyway, but this avoids a flash of empty screens. */
export default function AppLayout() {
  const { status } = useGuestSession();

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--ra-color-text-secondary)" }}>
        …
      </div>
    );
  }
  if (status === "unauthenticated") return <Navigate to="/welcome" replace />;

  return (
    <div style={{ paddingBottom: "calc(var(--ra-min-target) + var(--ra-space-6))" }}>
      <Outlet />
      <BottomNav />
    </div>
  );
}
