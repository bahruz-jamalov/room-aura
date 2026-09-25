// Hand-written row types mirroring the Postgres schema (supabase/migrations).
// Field names are snake_case on purpose — they match the Postgres columns
// and what supabase-js returns, so there is no mapping layer to keep in
// sync. These can be swapped for `supabase gen types typescript` output
// later without changing any call site, since the shapes match.

import type {
  AccessKind,
  ActorType,
  CategoryType,
  EventType,
  HotelPlan,
  HotelStatus,
  LanguageCode,
  MenuItemStatus,
  NotificationAudience,
  PaymentMethod,
  RequestKind,
  RequestStatus,
  StaffRole,
  StaffStatus,
} from "./enums";

export interface Language {
  code: LanguageCode;
  name_en: string;
  name_native: string;
  is_rtl: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Hotel {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  default_locale: LanguageCode;
  supported_locales: LanguageCode[];
  currency: string;
  logo_url: string | null;
  status: HotelStatus;
  plan: HotelPlan;
  created_at: string;
  updated_at: string;
}

export interface HotelSettings {
  hotel_id: string;
  about: string | null;
  address: string | null;
  contact_phone: string | null;
  checkin_time: string | null;
  checkout_time: string | null;
  amenities: unknown[];
  guest_session_ttl_hours: number;
  freetext_department_id: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  updated_at: string;
}

export interface Department {
  id: string;
  hotel_id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Floor {
  id: string;
  hotel_id: string;
  number: number;
  label: string | null;
  sort_order: number;
}

export interface Room {
  id: string;
  hotel_id: string;
  floor_id: string | null;
  number: string;
  is_active: boolean;
  created_at: string;
}

export interface StaffUser {
  id: string;
  hotel_id: string;
  department_id: string | null;
  role: StaffRole;
  full_name: string;
  email: string;
  status: StaffStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  hotel_id: string;
  category_type: CategoryType;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ServiceCategoryTranslation {
  category_id: string;
  hotel_id: string;
  locale: LanguageCode;
  name: string;
  description: string | null;
}

export interface Service {
  id: string;
  hotel_id: string;
  category_id: string;
  department_id: string;
  image_url: string | null;
  is_free: boolean;
  price_minor: number;
  currency: string;
  expected_minutes: number | null;
  opening_hours: unknown | null;
  allows_quantity: boolean;
  max_quantity: number;
  allows_note: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceTranslation {
  service_id: string;
  hotel_id: string;
  locale: LanguageCode;
  name: string;
  description: string | null;
}

export interface MenuCategory {
  id: string;
  hotel_id: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MenuCategoryTranslation {
  menu_category_id: string;
  hotel_id: string;
  locale: LanguageCode;
  name: string;
}

export interface MenuItem {
  id: string;
  hotel_id: string;
  menu_category_id: string;
  image_url: string | null;
  price_minor: number;
  currency: string;
  prep_minutes: number | null;
  allergens: string[];
  status: MenuItemStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemTranslation {
  menu_item_id: string;
  hotel_id: string;
  locale: LanguageCode;
  name: string;
  description: string | null;
}

export interface AccessToken {
  id: string;
  hotel_id: string;
  room_id: string | null;
  kind: AccessKind;
  token_hash: string;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface GuestSession {
  id: string;
  hotel_id: string;
  room_id: string;
  auth_user_id: string;
  locale: LanguageCode;
  source: AccessKind;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

export interface Request {
  id: string;
  hotel_id: string;
  room_id: string;
  guest_session_id: string;
  number: string;
  kind: RequestKind;
  service_id: string | null;
  department_id: string;
  status: RequestStatus;
  quantity: number;
  guest_note: string | null;
  original_text: string | null;
  original_locale: LanguageCode | null;
  translated_text: string | null;
  translation_provider: string | null;
  translation_is_mock: boolean;
  assigned_to: string | null;
  estimated_minutes: number | null;
  accepted_at: string | null;
  started_at: string | null;
  on_the_way_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestStatusHistoryEntry {
  id: string;
  request_id: string;
  hotel_id: string;
  event_type: EventType;
  from_status: RequestStatus | null;
  to_status: RequestStatus | null;
  note: string | null;
  actor_type: ActorType;
  actor_staff_id: string | null;
  created_at: string;
}

export interface Order {
  id: string; // == requests.id
  hotel_id: string;
  payment_method: PaymentMethod;
  subtotal_minor: number;
  total_minor: number;
  currency: string;
  item_count: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  hotel_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  unit_price_minor: number;
  quantity: number;
  line_total_minor: number;
  note: string | null;
}

export interface Feedback {
  id: string;
  request_id: string;
  hotel_id: string;
  guest_session_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  effort_score: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  locale: LanguageCode | null;
  created_at: string;
}

export interface Notification {
  id: string;
  hotel_id: string;
  audience: NotificationAudience;
  guest_session_id: string | null;
  staff_user_id: string | null;
  department_id: string | null;
  request_id: string | null;
  type_key: string;
  params: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface RoutingRule {
  id: string;
  hotel_id: string;
  keyword: string;
  department_id: string;
  priority: number;
}
