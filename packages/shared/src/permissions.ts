// Client-side mirror of the RLS policy matrix — docs/ARCHITECTURE.md
// section 7. This is UI gating ONLY (hide/disable buttons a call would be
// rejected for anyway). It is not the security boundary: Postgres RLS
// (supabase/migrations/00000000000009_rls_policies.sql) is, and every
// permission below has a corresponding policy that enforces it for real
// regardless of what the client does.

import type { StaffRole } from "./types/enums";

export interface StaffIdentity {
  role: StaffRole;
  departmentId: string | null;
}

function isAdminOrManager(staff: StaffIdentity): boolean {
  return staff.role === "hotel_admin" || staff.role === "manager";
}

export const permissions = {
  canViewDashboard: (_staff: StaffIdentity) => true,

  /** Admin/manager see every department's requests; plain staff see only their own. */
  canViewRequest: (staff: StaffIdentity, requestDepartmentId: string) =>
    isAdminOrManager(staff) || staff.departmentId === requestDepartmentId,

  canActOnRequest: (staff: StaffIdentity, requestDepartmentId: string) =>
    isAdminOrManager(staff) || staff.departmentId === requestDepartmentId,

  canManageCatalogue: (staff: StaffIdentity) => isAdminOrManager(staff),
  canManageFaqs: (staff: StaffIdentity) => isAdminOrManager(staff),
  canManageRoomsAndDepartments: (staff: StaffIdentity) => isAdminOrManager(staff),
  canManageRoutingRules: (staff: StaffIdentity) => isAdminOrManager(staff),

  canManageStaff: (staff: StaffIdentity) => staff.role === "hotel_admin",
  canManageAccessTokens: (staff: StaffIdentity) => staff.role === "hotel_admin",
  canManageHotelSettings: (staff: StaffIdentity) => staff.role === "hotel_admin",

  /** Plain Staff does not get analytics or feedback — see the roles matrix. */
  canViewAnalytics: (staff: StaffIdentity) => isAdminOrManager(staff),
  canViewFeedback: (staff: StaffIdentity) => isAdminOrManager(staff),
} as const;
