// Mirrors the Postgres enums in supabase/migrations/00000000000002_enums.sql
// exactly. If you add a value here, add it in that migration too (and vice
// versa) — these two are meant to never drift.

export const HOTEL_STATUS = ["active", "inactive", "trial"] as const;
export type HotelStatus = (typeof HOTEL_STATUS)[number];

export const HOTEL_PLAN = ["pilot", "pro", "enterprise"] as const;
export type HotelPlan = (typeof HOTEL_PLAN)[number];

// role x department is the whole permission model — see permissions.ts.
export const STAFF_ROLE = ["hotel_admin", "manager", "staff"] as const;
export type StaffRole = (typeof STAFF_ROLE)[number];

export const STAFF_STATUS = ["active", "inactive"] as const;
export type StaffStatus = (typeof STAFF_STATUS)[number];

export const CATEGORY_TYPE = ["standard", "menu"] as const;
export type CategoryType = (typeof CATEGORY_TYPE)[number];

export const REQUEST_KIND = ["service", "freetext", "order"] as const;
export type RequestKind = (typeof REQUEST_KIND)[number];

export const REQUEST_STATUS = [
  "new",
  "accepted",
  "in_progress",
  "on_the_way",
  "completed",
  "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUS)[number];

export const ACTOR_TYPE = ["guest", "staff", "system"] as const;
export type ActorType = (typeof ACTOR_TYPE)[number];

export const EVENT_TYPE = ["status_change", "note", "assignment", "estimate"] as const;
export type EventType = (typeof EVENT_TYPE)[number];

export const PAYMENT_METHOD = ["charge_to_room", "pay_at_hotel"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const MENU_ITEM_STATUS = ["available", "sold_out", "hidden"] as const;
export type MenuItemStatus = (typeof MENU_ITEM_STATUS)[number];

export const ACCESS_KIND = ["hotel", "room", "access_code"] as const;
export type AccessKind = (typeof ACCESS_KIND)[number];

export const NOTIFICATION_AUDIENCE = ["guest", "staff"] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCE)[number];

export const SUPPORTED_LANGUAGES = ["en", "az", "tr", "ru", "ar", "zh", "fr", "de", "es"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: readonly LanguageCode[] = ["ar"];
export function isRtl(locale: string): boolean {
  return (RTL_LANGUAGES as readonly string[]).includes(locale);
}
