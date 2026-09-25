// ROOM-AURA — demo/tenant-isolation-test data seeder.
//
// Uses the SERVICE ROLE key (bypasses RLS by design — this is the one place
// that's supposed to). Never commit that key; export it in your own shell:
//
//   export SUPABASE_URL=https://xxxx.supabase.co
//   export SUPABASE_SERVICE_ROLE_KEY=eyJ...
//   pnpm seed
//
// Idempotent: safe to re-run. Looks up by unique key (slug / email / code)
// before inserting, and upserts settings-style rows.

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEMO_PASSWORD,
  HOTEL_A,
  HOTEL_A_DEPARTMENTS,
  HOTEL_A_ROOMS,
  HOTEL_A_STAFF,
  HOTEL_B,
  HOTEL_B_DEPARTMENTS,
  HOTEL_B_ROOMS,
  HOTEL_B_STAFF,
  type DemoStaff,
} from "./demo-data";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.\n" +
      "Export them in your own shell first (see the comment at the top of this file) — never paste the service role key into chat.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertHotel(input: typeof HOTEL_A | typeof HOTEL_B): Promise<string> {
  const { data: existing } = await admin.from("hotels").select("id").eq("slug", input.slug).maybeSingle();
  if (existing) {
    console.log(`  hotel "${input.name}" already exists (${existing.id})`);
    return existing.id as string;
  }
  const { data, error } = await admin
    .from("hotels")
    .insert({
      slug: input.slug,
      name: input.name,
      city: input.city,
      country: input.country,
      timezone: input.timezone,
      default_locale: input.defaultLocale,
      supported_locales: input.supportedLocales,
      currency: input.currency,
      status: "active",
      plan: "pilot",
    })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`  created hotel "${input.name}" (${data.id})`);

  const { error: settingsError } = await admin.from("hotel_settings").insert({ hotel_id: data.id });
  if (settingsError) throw settingsError;

  return data.id as string;
}

async function upsertDepartments(
  hotelId: string,
  departments: readonly { code: string; name: string }[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const [i, dept] of departments.entries()) {
    const { data: existing } = await admin
      .from("departments")
      .select("id")
      .eq("hotel_id", hotelId)
      .eq("code", dept.code)
      .maybeSingle();
    if (existing) {
      map[dept.code] = existing.id as string;
      continue;
    }
    const { data, error } = await admin
      .from("departments")
      .insert({ hotel_id: hotelId, code: dept.code, name: dept.name, sort_order: i })
      .select("id")
      .single();
    if (error) throw error;
    map[dept.code] = data.id as string;
  }
  console.log(`  ${departments.length} department(s) ready`);
  return map;
}

async function upsertRooms(
  hotelId: string,
  rooms: readonly { floorNumber: number; number: string }[],
): Promise<Record<string, string>> {
  const floorIds: Record<number, string> = {};
  const roomIds: Record<string, string> = {};
  for (const room of rooms) {
    if (!floorIds[room.floorNumber]) {
      const { data: existingFloor } = await admin
        .from("floors")
        .select("id")
        .eq("hotel_id", hotelId)
        .eq("number", room.floorNumber)
        .maybeSingle();
      if (existingFloor) {
        floorIds[room.floorNumber] = existingFloor.id as string;
      } else {
        const { data, error } = await admin
          .from("floors")
          .insert({ hotel_id: hotelId, number: room.floorNumber })
          .select("id")
          .single();
        if (error) throw error;
        floorIds[room.floorNumber] = data.id as string;
      }
    }

    const { data: existingRoom } = await admin
      .from("rooms")
      .select("id")
      .eq("hotel_id", hotelId)
      .eq("number", room.number)
      .maybeSingle();
    if (existingRoom) {
      roomIds[room.number] = existingRoom.id as string;
    } else {
      const { data, error } = await admin
        .from("rooms")
        .insert({ hotel_id: hotelId, floor_id: floorIds[room.floorNumber], number: room.number })
        .select("id")
        .single();
      if (error) throw error;
      roomIds[room.number] = data.id as string;
    }
  }
  console.log(`  ${rooms.length} room(s) ready`);
  return roomIds;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Human-typeable: excludes ambiguous characters (0/O, 1/I). */
function randomAccessCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

type AccessKind = "hotel" | "room" | "access_code";

/**
 * Rotates the token on every run (re-seeding always produces a fresh, valid
 * raw value in .demo-ids.json) rather than trying to recover an old raw
 * token — which is impossible by design, since only the hash is stored.
 */
async function upsertAccessToken(
  hotelId: string,
  kind: AccessKind,
  roomId: string | null,
  label: string,
  rawToken: string,
): Promise<void> {
  const tokenHash = sha256Hex(rawToken);
  const { data: existing } = await admin
    .from("access_tokens")
    .select("id")
    .eq("hotel_id", hotelId)
    .eq("label", label)
    .maybeSingle();
  if (existing) {
    const { error } = await admin
      .from("access_tokens")
      .update({ token_hash: tokenHash, kind, room_id: roomId, is_active: true })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await admin
      .from("access_tokens")
      .insert({ hotel_id: hotelId, room_id: roomId, kind, token_hash: tokenHash, label, is_active: true });
    if (error) throw error;
  }
  console.log(`  access token "${label}" ready`);
}

async function setFreetextDepartment(hotelId: string, departmentId: string): Promise<void> {
  const { error } = await admin
    .from("hotel_settings")
    .update({ freetext_department_id: departmentId })
    .eq("hotel_id", hotelId);
  if (error) throw error;
  console.log("  freetext default department set");
}

async function setFnbDepartment(hotelId: string, departmentId: string): Promise<void> {
  const { error } = await admin.from("hotel_settings").update({ fnb_department_id: departmentId }).eq("hotel_id", hotelId);
  if (error) throw error;
  console.log("  F&B default department set");
}

/** The "Food & Drinks" tile in the Home grid — a service_categories row
 *  with category_type='menu'. Tapping it opens /menu (menu_categories +
 *  menu_items), not a services list. See docs/ARCHITECTURE.md's Home
 *  mockup, which lists "Food & Drinks" alongside Housekeeping etc. */
async function upsertMenuTile(hotelId: string, icon: string, translations: Record<string, { name: string }>) {
  const { count } = await admin
    .from("service_categories")
    .select("id", { count: "exact", head: true })
    .eq("hotel_id", hotelId)
    .eq("category_type", "menu");
  if (count && count > 0) {
    console.log("  Food & Drinks tile already seeded, skipping");
    return;
  }
  const { data: cat, error } = await admin
    .from("service_categories")
    .insert({ hotel_id: hotelId, category_type: "menu", icon })
    .select("id")
    .single();
  if (error) throw error;
  for (const [locale, t] of Object.entries(translations)) {
    const { error: trError } = await admin
      .from("service_category_translations")
      .insert({ category_id: cat.id, locale, name: t.name });
    if (trError) throw trError;
  }
  console.log("  Food & Drinks tile ready");
}

interface DemoMenuCategorySeed {
  translations: Record<string, { name: string }>;
  items: {
    priceMinor: number;
    currency: string;
    prepMinutes?: number;
    allergens?: string[];
    translations: Record<string, { name: string; description?: string }>;
  }[];
}

/** Coarse idempotency, same reasoning as upsertCatalogue. */
async function upsertMenu(hotelId: string, categories: DemoMenuCategorySeed[]) {
  const { count } = await admin
    .from("menu_categories")
    .select("id", { count: "exact", head: true })
    .eq("hotel_id", hotelId);
  if (count && count > 0) {
    console.log("  menu already seeded, skipping");
    return;
  }

  for (const cat of categories) {
    const { data: catRow, error: catError } = await admin
      .from("menu_categories")
      .insert({ hotel_id: hotelId })
      .select("id")
      .single();
    if (catError) throw catError;

    for (const [locale, t] of Object.entries(cat.translations)) {
      const { error: trError } = await admin
        .from("menu_category_translations")
        .insert({ menu_category_id: catRow.id, locale, name: t.name });
      if (trError) throw trError;
    }
    console.log(`  menu category "${cat.translations.en?.name}" ready`);

    for (const item of cat.items) {
      const { data: itemRow, error: itemError } = await admin
        .from("menu_items")
        .insert({
          hotel_id: hotelId,
          menu_category_id: catRow.id,
          price_minor: item.priceMinor,
          currency: item.currency,
          prep_minutes: item.prepMinutes ?? null,
          allergens: item.allergens ?? [],
          status: "available",
        })
        .select("id")
        .single();
      if (itemError) throw itemError;

      for (const [locale, t] of Object.entries(item.translations)) {
        const { error: trError } = await admin
          .from("menu_item_translations")
          .insert({ menu_item_id: itemRow.id, locale, name: t.name, description: t.description ?? null });
        if (trError) throw trError;
      }
      console.log(`  menu item "${item.translations.en?.name}" ready`);
    }
  }
}

async function upsertRoutingRule(hotelId: string, keyword: string, departmentId: string, priority: number) {
  const { data: existing } = await admin
    .from("routing_rules")
    .select("id")
    .eq("hotel_id", hotelId)
    .eq("keyword", keyword)
    .maybeSingle();
  if (existing) return;
  const { error } = await admin.from("routing_rules").insert({ hotel_id: hotelId, keyword, department_id: departmentId, priority });
  if (error) throw error;
  console.log(`  routing rule "${keyword}" -> department ready`);
}

interface DemoCategorySeed {
  icon: string;
  translations: Record<string, { name: string; description?: string }>;
  services: {
    departmentCode: string;
    isFree: boolean;
    priceMinor?: number;
    currency?: string;
    expectedMinutes?: number;
    allowsQuantity?: boolean;
    maxQuantity?: number;
    translations: Record<string, { name: string; description?: string }>;
  }[];
}

/**
 * Minimal hotel-controlled catalogue so Phase 3's structured-request flow
 * (and the spec's free-text end-to-end demo, which routes to Housekeeping)
 * has something real to point at. The full catalogue admin UI is Phase 6 —
 * this is just enough data to exercise the guest-side flow now.
 *
 * Idempotency is coarse on purpose: if this hotel has ANY category already,
 * assume the catalogue was seeded before and skip entirely, rather than
 * diffing category-by-category.
 */
async function upsertCatalogue(hotelId: string, departmentIds: Record<string, string>, categories: DemoCategorySeed[]) {
  const { count } = await admin
    .from("service_categories")
    .select("id", { count: "exact", head: true })
    .eq("hotel_id", hotelId);
  if (count && count > 0) {
    console.log("  catalogue already seeded, skipping");
    return;
  }

  for (const cat of categories) {
    const { data: catRow, error: catError } = await admin
      .from("service_categories")
      .insert({ hotel_id: hotelId, category_type: "standard", icon: cat.icon })
      .select("id")
      .single();
    if (catError) throw catError;

    for (const [locale, t] of Object.entries(cat.translations)) {
      const { error: trError } = await admin
        .from("service_category_translations")
        .insert({ category_id: catRow.id, locale, name: t.name, description: t.description ?? null });
      if (trError) throw trError;
    }
    console.log(`  category "${cat.translations.en?.name}" ready`);

    for (const svc of cat.services) {
      const { data: svcRow, error: svcError } = await admin
        .from("services")
        .insert({
          hotel_id: hotelId,
          category_id: catRow.id,
          department_id: departmentIds[svc.departmentCode],
          is_free: svc.isFree,
          price_minor: svc.priceMinor ?? 0,
          currency: svc.currency ?? "USD",
          expected_minutes: svc.expectedMinutes ?? null,
          allows_quantity: svc.allowsQuantity ?? false,
          max_quantity: svc.maxQuantity ?? 1,
        })
        .select("id")
        .single();
      if (svcError) throw svcError;

      for (const [locale, t] of Object.entries(svc.translations)) {
        const { error: trError } = await admin
          .from("service_translations")
          .insert({ service_id: svcRow.id, locale, name: t.name, description: t.description ?? null });
        if (trError) throw trError;
      }
      console.log(`  service "${svc.translations.en?.name}" ready`);
    }
  }
}

async function getOrCreateAuthUser(email: string): Promise<string> {
  // The admin SDK has no getUserByEmail in every CLI version, so page
  // through listUsers rather than assume one call covers it.
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) break;
    page += 1;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function upsertStaff(hotelId: string, departmentIds: Record<string, string>, staff: DemoStaff[]) {
  for (const s of staff) {
    const authUserId = await getOrCreateAuthUser(s.email);
    const departmentId = s.departmentCode ? departmentIds[s.departmentCode] : null;

    const { data: existing } = await admin.from("staff_users").select("id").eq("id", authUserId).maybeSingle();
    if (existing) continue;

    const { error } = await admin.from("staff_users").insert({
      id: authUserId,
      hotel_id: hotelId,
      department_id: departmentId,
      role: s.role,
      full_name: s.fullName,
      email: s.email,
      status: "active",
    });
    if (error) throw error;
    console.log(`  staff "${s.fullName}" <${s.email}> (${s.role}) ready`);
  }
}

async function main() {
  console.log("Seeding Hotel A — Aura Grand Hotel");
  const hotelAId = await upsertHotel(HOTEL_A);
  const hotelADepts = await upsertDepartments(hotelAId, HOTEL_A_DEPARTMENTS);
  const hotelARooms = await upsertRooms(hotelAId, HOTEL_A_ROOMS);
  await upsertStaff(hotelAId, hotelADepts, HOTEL_A_STAFF);

  // Room 508's QR — the room used in the spec's end-to-end demo. The QR
  // encodes the tourist app's /j/<token> URL; scanning it with any phone
  // camera opens that URL directly, no in-app scanner needed.
  const room508Token = randomBytes(24).toString("base64url");
  await upsertAccessToken(hotelAId, "room", hotelARooms["508"], "Room 508 QR (demo)", room508Token);

  // A hotel-wide code for the "Enter Access Code" path — short and
  // human-typeable, since a guest has to read it off a card, not scan it.
  const hotelACode = randomAccessCode();
  await upsertAccessToken(hotelAId, "access_code", null, "Hotel-wide access code (demo)", hotelACode);

  // Free-text ("Other Request") default routing — Guest Relations catches
  // anything the keyword table below doesn't match. See docs/ARCHITECTURE.md
  // section 9.
  await setFreetextDepartment(hotelAId, hotelADepts["guest_relations"]);
  await upsertRoutingRule(hotelAId, "towel", hotelADepts["housekeeping"], 10);
  await upsertRoutingRule(hotelAId, "clean", hotelADepts["housekeeping"], 10);
  await upsertRoutingRule(hotelAId, "pillow", hotelADepts["housekeeping"], 10);
  await upsertRoutingRule(hotelAId, "air condition", hotelADepts["maintenance"], 10);
  await upsertRoutingRule(hotelAId, "transfer", hotelADepts["transportation"], 10);

  // Minimal catalogue — just enough to exercise the structured-request flow
  // and match the spec's Housekeeping example. Phase 6 builds the real
  // admin UI for hotels to manage this themselves.
  await upsertCatalogue(hotelAId, hotelADepts, [
    {
      icon: "\u{1F9FA}",
      translations: {
        en: { name: "Housekeeping" },
        az: { name: "Otaq xidməti" },
      },
      services: [
        {
          departmentCode: "housekeeping",
          isFree: true,
          expectedMinutes: 10,
          allowsQuantity: true,
          maxQuantity: 5,
          translations: {
            en: { name: "Extra Towels" },
            az: { name: "Əlavə dəsmal" },
          },
        },
        {
          departmentCode: "housekeeping",
          isFree: true,
          expectedMinutes: 15,
          translations: {
            en: { name: "Room Cleaning" },
            az: { name: "Otağın təmizlənməsi" },
          },
        },
      ],
    },
  ]);

  // Phase 5 — ordering. "Club Sandwich, 25 AED" matches the spec's second
  // end-to-end demo exactly.
  await setFnbDepartment(hotelAId, hotelADepts["fnb"]);
  await upsertMenuTile(hotelAId, "\u{1F37D}️", {
    en: { name: "Food & Drinks" },
    az: { name: "Yemək və İçki" },
  });
  await upsertMenu(hotelAId, [
    {
      translations: { en: { name: "Main Courses" }, az: { name: "Əsas yeməklər" } },
      items: [
        {
          priceMinor: 2500,
          currency: "AED",
          prepMinutes: 15,
          allergens: ["gluten", "dairy"],
          translations: {
            en: { name: "Club Sandwich", description: "Chicken, lettuce, tomato and cheese" },
            az: { name: "Klub sendviçi", description: "Toyuq, kahı, pomidor və pendir" },
          },
        },
      ],
    },
    {
      translations: { en: { name: "Cold Drinks" }, az: { name: "Soyuq içkilər" } },
      items: [
        {
          priceMinor: 800,
          currency: "AED",
          prepMinutes: 5,
          translations: {
            en: { name: "Fresh Orange Juice" },
            az: { name: "Təzə portağal şirəsi" },
          },
        },
      ],
    },
  ]);

  console.log("\nSeeding Hotel B — Bosporus Hotel");
  const hotelBId = await upsertHotel(HOTEL_B);
  const hotelBDepts = await upsertDepartments(hotelBId, HOTEL_B_DEPARTMENTS);
  await upsertRooms(hotelBId, HOTEL_B_ROOMS);
  await upsertStaff(hotelBId, hotelBDepts, HOTEL_B_STAFF);

  // Non-secret IDs, PLUS the raw access tokens — these last two ARE
  // sensitive (they're literally what a guest scans/types to get in), but
  // this file is gitignored and lives only on the seeder's machine. This is
  // the one and only place the raw values exist outside a guest's own QR
  // sticker/card — the database stores only their hash, by design.
  const outPath = fileURLToPath(new URL("./.demo-ids.json", import.meta.url));
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        hotelA: {
          id: hotelAId,
          departments: hotelADepts,
          rooms: hotelARooms,
          room508Token,
          accessCode: hotelACode,
        },
        hotelB: { id: hotelBId, departments: hotelBDepts },
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${outPath}`);

  console.log("\nDone. Demo staff password for every account:", DEMO_PASSWORD);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
