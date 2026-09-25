// Route guard for Phase 6 config screens. Hiding a nav item in AdminLayout
// only stops a click — a staff member typing /departments into the address
// bar would still hit the screen (RLS would reject their mutations, but
// they'd see a broken form instead of just not being there). This makes the
// same permissions.ts check redirect instead.
import { Navigate } from "react-router-dom";
import type { StaffIdentity } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";

export default function RequireCapability({
  check,
  children,
}: {
  check: (staff: StaffIdentity) => boolean;
  children: React.ReactNode;
}) {
  const { staff } = useAuth();
  if (!staff) return null;
  if (!check(staff)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
