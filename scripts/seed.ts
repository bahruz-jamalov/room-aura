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

async function upsertRooms(hotelId: string, rooms: readonly { floorNumber: number; number: string }[]) {
  const floorIds: Record<number, string> = {};
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
    if (!existingRoom) {
      const { error } = await admin
        .from("rooms")
        .insert({ hotel_id: hotelId, floor_id: floorIds[room.floorNumber], number: room.number });
      if (error) throw error;
    }
  }
  console.log(`  ${rooms.length} room(s) ready`);
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
  await upsertRooms(hotelAId, HOTEL_A_ROOMS);
  await upsertStaff(hotelAId, hotelADepts, HOTEL_A_STAFF);

  console.log("\nSeeding Hotel B — Bosporus Hotel");
  const hotelBId = await upsertHotel(HOTEL_B);
  const hotelBDepts = await upsertDepartments(hotelBId, HOTEL_B_DEPARTMENTS);
  await upsertRooms(hotelBId, HOTEL_B_ROOMS);
  await upsertStaff(hotelBId, hotelBDepts, HOTEL_B_STAFF);

  // Non-secret IDs only (no keys, no passwords) — lets test-isolation.ts
  // target a real cross-tenant ID without itself needing the service role.
  const outPath = fileURLToPath(new URL("./.demo-ids.json", import.meta.url));
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        hotelA: { id: hotelAId, departments: hotelADepts },
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
