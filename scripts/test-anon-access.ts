// ROOM-AURA — sanity check that needs no seed data and no secrets at all:
// with the publishable key but NO session (no sign-in, no guest, no staff),
// RLS should default-deny everything except the one globally-readable table
// (languages). This is provable the moment migrations are pushed, before
// any demo data or staff accounts exist.
//
//   export SUPABASE_URL=https://xxxx.supabase.co
//   export SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
//   pnpm exec tsx scripts/test-anon-access.ts

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in the environment.");
  process.exit(1);
}

const client = createClient(url, anonKey, { auth: { persistSession: false } });

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

const SHOULD_BE_EMPTY_FOR_ANONYMOUS = [
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
  "guest_sessions",
] as const;

async function main() {
  console.log("No session at all (not even guest anonymous auth) — checking default-deny...\n");

  const { data: langs, error: langError } = await client.from("languages").select("code");
  if (langError) {
    check("languages table is publicly readable", false, langError.message);
  } else {
    check("languages table is publicly readable", (langs?.length ?? 0) === 9, `got ${langs?.length} row(s), expected 9`);
  }

  for (const table of SHOULD_BE_EMPTY_FOR_ANONYMOUS) {
    const { data, error } = await client.from(table).select("*").limit(1);
    if (error) {
      check(`${table}: no access without a session`, true);
      continue;
    }
    check(`${table}: no access without a session`, (data?.length ?? 0) === 0, `leaked ${data?.length} row(s)`);
  }

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.error("\nDEFAULT-DENY CHECK FAILED.");
    process.exit(1);
  }
  console.log("\nDefault-deny holds with zero seed data: only the language catalogue is publicly readable.");
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
