// ROOM-AURA — shared demo/test fixtures for scripts/seed.ts and
// scripts/test-isolation.ts. Two hotels on purpose: Hotel A (Aura Grand,
// the real demo tenant) and Hotel B (Bosporus, mentioned in
// docs/ARCHITECTURE.md's own Super Admin example data) exist specifically
// so the isolation test has a second tenant to try to leak into.
//
// These are demo/pilot-facing credentials for a non-production database,
// not real user secrets — see docs/DEMO_CREDENTIALS.md.

export const DEMO_PASSWORD = "RoomAura!Demo1";

// ROOM-AURA company staff, not a hotel role — grants access to /platform
// only (docs/ARCHITECTURE.md section 6/7).
export const PLATFORM_ADMIN = {
  email: "super@roomaura.demo",
  fullName: "Room Aura Ops",
} as const;

export const HOTEL_A = {
  slug: "aura-grand",
  name: "Aura Grand Hotel",
  city: "Dubai",
  country: "United Arab Emirates",
  timezone: "Asia/Dubai",
  defaultLocale: "en",
  supportedLocales: ["en", "az", "tr", "ru", "ar", "zh", "fr", "de", "es"],
  currency: "AED",
} as const;

export const HOTEL_B = {
  slug: "bosporus",
  name: "Bosporus Hotel",
  city: "Istanbul",
  country: "Turkey",
  timezone: "Europe/Istanbul",
  defaultLocale: "en",
  supportedLocales: ["en", "tr"],
  currency: "TRY",
} as const;

export const HOTEL_A_DEPARTMENTS = [
  { code: "reception", name: "Reception" },
  { code: "housekeeping", name: "Housekeeping" },
  { code: "fnb", name: "Food & Beverage" },
  { code: "maintenance", name: "Maintenance" },
  { code: "guest_relations", name: "Guest Relations" },
  { code: "spa", name: "Spa" },
  { code: "transportation", name: "Transportation" },
] as const;

export const HOTEL_B_DEPARTMENTS = [
  { code: "reception", name: "Reception" },
  { code: "housekeeping", name: "Housekeeping" },
] as const;

export const HOTEL_A_ROOMS = [
  { floorNumber: 5, number: "508" }, // the room used in the spec's end-to-end demo test
  { floorNumber: 5, number: "509" },
  { floorNumber: 12, number: "1204" },
] as const;

export const HOTEL_B_ROOMS = [{ floorNumber: 3, number: "310" }] as const;

export interface DemoStaff {
  email: string;
  fullName: string;
  role: "hotel_admin" | "manager" | "staff";
  departmentCode: string | null;
}

export const HOTEL_A_STAFF: DemoStaff[] = [
  { email: "admin@auragrand.demo", fullName: "Amira Hassan", role: "hotel_admin", departmentCode: null },
  { email: "sarah@auragrand.demo", fullName: "Sarah Nguyen", role: "staff", departmentCode: "housekeeping" },
];

export const HOTEL_B_STAFF: DemoStaff[] = [
  { email: "admin@bosporus.demo", fullName: "Emre Yildiz", role: "hotel_admin", departmentCode: null },
];
