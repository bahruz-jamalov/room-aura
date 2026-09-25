// ROOM-AURA — automated tenant-isolation test (Phase 1 exit criterion).
//
// "A Hotel A staff JWT issuing a query against Hotel B must return 0 rows,
// and an insert/update targeting Hotel B must be rejected." This script
// proves that through the REAL path a browser would use: PostgREST + RLS
// under a genuine staff JWT — not a raw SQL check against the database.
//
// Needs only the public URL + anon/publishable key (safe to embed) plus
// scripts/.demo-ids.json, written by `pnpm seed`. Run `pnpm seed` first.
//
//   export SUPABASE_URL=https://xxxx.supabase.co
//   export SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
//   pnpm test:isolation

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEMO_PASSWORD, HOTEL_A_STAFF, HOTEL_B_STAFF } from "./demo-data";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in the environment.");
  process.exit(1);
}

const idsPath = fileURLToPath(new URL("./.demo-ids.json", import.meta.url));
let ids: { hotelA: { id: string }; hotelB: { id: string } };
try {
  ids = JSON.parse(readFileSync(idsPath, "utf-8"));
} catch {
  console.error(`Could not read ${idsPath}. Run \`pnpm seed\` first.`);
  process.exit(1);
}

const TENANT_TABLES = [
  "hotels",
  "hotel_settings",
  "departments",
  "floors",
  "rooms",
  "staff_users",
  "service_categories",
  "services",
  "menu_categories",
  "menu_items",
  "requests",
  "orders",
  "order_items",
  "feedback",
  "notifications",
  "routing_rules",
  "access_tokens",
] as const;

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

/** hotel_id-keyed tables all have that column directly, per docs/ARCHITECTURE.md's
 *  "denormalised deliberately" rule — so one loop covers the whole tenant surface. */
async function assertNoLeak(client: SupabaseClient, hotelLabel: string, foreignHotelId: string) {
  for (const table of TENANT_TABLES) {
    const idColumn = table === "hotels" ? "id" : "hotel_id";
    const { data, error } = await client.from(table).select("*").eq(idColumn, foreignHotelId);
    if (error) {
      // A policy that denies outright (e.g. access_tokens has no guest/other-tenant
      // policy at all) can surface as an error rather than an empty array — both
      // outcomes mean "no leak", so only a NON-empty result is a real failure.
      check(`${hotelLabel}: ${table} — foreign-tenant query blocked`, true);
      continue;
    }
    check(`${hotelLabel}: ${table} — foreign-tenant query returns 0 rows`, (data?.length ?? 0) === 0, `got ${data?.length} row(s)`);
  }
}

async function assertOwnHotelOnly(client: SupabaseClient, hotelLabel: string, ownHotelId: string) {
  const { data, error } = await client.from("hotels").select("id");
  if (error) {
    check(`${hotelLabel}: unfiltered hotels select`, false, error.message);
    return;
  }
  check(
    `${hotelLabel}: unfiltered hotels select returns exactly own hotel`,
    (data?.length ?? 0) === 1 && data?.[0]?.id === ownHotelId,
    `got ${JSON.stringify(data)}`,
  );
}

async function assertCrossTenantWriteRejected(client: SupabaseClient, hotelLabel: string, foreignHotelId: string) {
  const { data: insertData, error: insertError } = await client
    .from("departments")
    .insert({ hotel_id: foreignHotelId, code: "isolation-probe", name: "Isolation Probe" })
    .select();
  check(
    `${hotelLabel}: cross-tenant department INSERT rejected`,
    !!insertError || (insertData?.length ?? 0) === 0,
    insertError ? undefined : `insert silently succeeded: ${JSON.stringify(insertData)}`,
  );

  const { data: updateData, error: updateError } = await client
    .from("hotels")
    .update({ name: "HACKED" })
    .eq("id", foreignHotelId)
    .select();
  check(
    `${hotelLabel}: cross-tenant hotel UPDATE affects 0 rows`,
    !!updateError || (updateData?.length ?? 0) === 0,
    updateError ? undefined : `update silently succeeded: ${JSON.stringify(updateData)}`,
  );
}

async function main() {
  console.log("Signing in as Hotel A admin (Aura Grand Hotel)...");
  const hotelAAdmin = await signIn(HOTEL_A_STAFF[0].email);
  console.log("Signing in as Hotel B admin (Bosporus Hotel)...");
  const hotelBAdmin = await signIn(HOTEL_B_STAFF[0].email);

  console.log("\n--- Hotel A admin probing Hotel B ---");
  await assertNoLeak(hotelAAdmin, "Hotel A admin", ids.hotelB.id);
  await assertOwnHotelOnly(hotelAAdmin, "Hotel A admin", ids.hotelA.id);
  await assertCrossTenantWriteRejected(hotelAAdmin, "Hotel A admin", ids.hotelB.id);

  console.log("\n--- Hotel B admin probing Hotel A (reciprocal check) ---");
  await assertNoLeak(hotelBAdmin, "Hotel B admin", ids.hotelA.id);
  await assertOwnHotelOnly(hotelBAdmin, "Hotel B admin", ids.hotelB.id);
  await assertCrossTenantWriteRejected(hotelBAdmin, "Hotel B admin", ids.hotelA.id);

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.error("\nTENANT ISOLATION TEST FAILED.");
    process.exit(1);
  }
  console.log("\nTenant isolation holds: Hotel A and Hotel B cannot read or write each other's data.");
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
