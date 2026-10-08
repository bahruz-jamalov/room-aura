import { describe, expect, it } from "vitest";
import { permissions, type StaffIdentity } from "./permissions";

const hotelAdmin: StaffIdentity = { role: "hotel_admin", departmentId: null };
const manager: StaffIdentity = { role: "manager", departmentId: null };
const staffInHousekeeping: StaffIdentity = { role: "staff", departmentId: "housekeeping-id" };
const staffInSpa: StaffIdentity = { role: "staff", departmentId: "spa-id" };

describe("canViewRequest / canActOnRequest", () => {
  it("lets hotel_admin and manager act on any department's requests", () => {
    expect(permissions.canViewRequest(hotelAdmin, "housekeeping-id")).toBe(true);
    expect(permissions.canActOnRequest(manager, "spa-id")).toBe(true);
  });

  it("lets plain staff act only on their own department's requests", () => {
    expect(permissions.canViewRequest(staffInHousekeeping, "housekeeping-id")).toBe(true);
    expect(permissions.canActOnRequest(staffInHousekeeping, "housekeeping-id")).toBe(true);
  });

  it("blocks plain staff from a different department's requests", () => {
    expect(permissions.canViewRequest(staffInSpa, "housekeeping-id")).toBe(false);
    expect(permissions.canActOnRequest(staffInSpa, "housekeeping-id")).toBe(false);
  });
});

describe("role-gated capabilities", () => {
  it("reserves staff/access-token/hotel-settings management for hotel_admin only", () => {
    expect(permissions.canManageStaff(hotelAdmin)).toBe(true);
    expect(permissions.canManageStaff(manager)).toBe(false);
    expect(permissions.canManageAccessTokens(manager)).toBe(false);
    expect(permissions.canManageHotelSettings(staffInHousekeeping)).toBe(false);
  });

  it("gives catalogue/FAQ/rooms/routing management to admin and manager, not plain staff", () => {
    for (const check of [
      permissions.canManageCatalogue,
      permissions.canManageFaqs,
      permissions.canManageRoomsAndDepartments,
      permissions.canManageRoutingRules,
    ]) {
      expect(check(hotelAdmin)).toBe(true);
      expect(check(manager)).toBe(true);
      expect(check(staffInHousekeeping)).toBe(false);
    }
  });

  it("hides analytics and feedback from plain staff", () => {
    expect(permissions.canViewAnalytics(staffInHousekeeping)).toBe(false);
    expect(permissions.canViewFeedback(staffInHousekeeping)).toBe(false);
    expect(permissions.canViewAnalytics(manager)).toBe(true);
    expect(permissions.canViewFeedback(hotelAdmin)).toBe(true);
  });

  it("lets everyone view the dashboard", () => {
    expect(permissions.canViewDashboard(staffInHousekeeping)).toBe(true);
  });
});
