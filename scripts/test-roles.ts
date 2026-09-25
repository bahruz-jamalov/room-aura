// ROOM-AURA — automated role-permission test (Phase 9 hardening).
//
// The tenant-isolation suite (test-isolation.ts) proves Hotel A can't see
// Hotel B. This proves the OTHER half of docs/ARCHITECTURE.md section 7's
// matrix: within one hotel, hotel_admin/manager/staff each get exactly the
// access the roles × department table says they should, enforced by RLS
// (not just hidden in the UI — permissions.ts is cosmetic, this is real).
//
// Needs only the public URL + anon/publishable key plus scripts/.demo-ids.json
// (written by `pnpm seed`, which must have been run after this phase's
// manager account was added to demo-data.ts).
//
//   export SUPABASE_URL=https://xxxx.supabase.co
//   export SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
//   pnpm test:roles

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEMO_PASSWORD, HOTEL_A_STAFF } from "./demo-data";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in the environment.");
  process.exit(1);
}

const idsPath = fileURLToPath(new URL("./.demo-ids.json", import.meta.url));
let ids: { hotelA: { id: string; departments: Record<string, string> } };
try {
  ids = JSON.parse(readFileSync(idsPath, "utf-8"));
} catch {
  console.error(`Could not read ${idsPath}. Run \`pnpm seed\` first.`);
  process.exit(1);
}

const hotelId = ids.hotelA.id;
const housekeepingId = ids.hotelA.departments["housekeeping"];
const maintenanceId = ids.hotelA.departments["maintenance"];

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

/** admin/manager: can see every department's requests (needs at least two
 *  departments represented in real data — Hotel A's demo data has both
 *  Housekeeping and Maintenance requests). staff: only their own. */
async function assertRequestVisibility(client: SupabaseClient, label: string, expectAllDepartments: boolean, ownDepartmentId: string) {
  const { data, error } = await client.from("requests").select("department_id");
  if (error) {
    check(`${label}: can read requests`, false, error.message);
    return;
  }
  const departmentIds = new Set((data ?? []).map((r) => r.department_id));
  if (expectAllDepartments) {
    check(`${label}: sees requests from more than one department`, departmentIds.size > 1, `saw ${departmentIds.size} department(s)`);
  } else {
    check(
      `${label}: sees only own department's requests`,
      departmentIds.size === 0 || (departmentIds.size === 1 && departmentIds.has(ownDepartmentId)),
      `saw departments ${JSON.stringify([...departmentIds])}`,
    );
  }
}

/** A no-op UPDATE (same value back) still requires the WHERE clause to
 *  match under RLS — 0 rows means the department boundary held. The target
 *  request id/value are looked up via an admin-privileged client, not the
 *  client under test: staff's own read scope can't even see a Maintenance
 *  row to begin with, so self-discovery would just make this probe
 *  degenerate into "skip" for staff instead of actually proving the
 *  boundary holds when the id IS known (e.g. guessed or leaked). */
async function assertRequestUpdateScope(
  client: SupabaseClient,
  label: string,
  canUpdateForeign: boolean,
  foreignRequest: { id: string; estimated_minutes: number | null },
) {
  const { data, error } = await client
    .from("requests")
    .update({ estimated_minutes: foreignRequest.estimated_minutes })
    .eq("id", foreignRequest.id)
    .select();
  const affected = !error && (data?.length ?? 0) > 0;
  check(
    `${label}: ${canUpdateForeign ? "can" : "cannot"} update a Maintenance-department request`,
    affected === canUpdateForeign,
    error?.message ?? `affected ${data?.length ?? 0} row(s)`,
  );
}

async function assertCatalogueWrite(client: SupabaseClient, label: string, canWrite: boolean) {
  const { data, error } = await client
    .from("service_categories")
    .insert({ hotel_id: hotelId, category_type: "standard", icon: "🧪", is_active: false, sort_order: 999 })
    .select();
  const succeeded = !error && (data?.length ?? 0) > 0;
  check(`${label}: ${canWrite ? "can" : "cannot"} create a service category`, succeeded === canWrite, error?.message);
  if (succeeded && data) await client.from("service_categories").delete().eq("id", data[0].id);
}

async function assertDepartmentWrite(client: SupabaseClient, label: string, canWrite: boolean) {
  const { data, error } = await client
    .from("departments")
    .insert({ hotel_id: hotelId, code: `role-probe-${Date.now()}`, name: "Role Probe", is_active: false, sort_order: 999 })
    .select();
  const succeeded = !error && (data?.length ?? 0) > 0;
  check(`${label}: ${canWrite ? "can" : "cannot"} create a department`, succeeded === canWrite, error?.message);
  if (succeeded && data) await client.from("departments").delete().eq("id", data[0].id);
}

async function assertStaffWrite(client: SupabaseClient, label: string, canWrite: boolean, sarahId: string) {
  const { data: before } = await client.from("staff_users").select("full_name").eq("id", sarahId).single();
  const { data, error } = await client.from("staff_users").update({ full_name: before?.full_name ?? "Sarah Nguyen" }).eq("id", sarahId).select();
  const succeeded = !error && (data?.length ?? 0) > 0;
  check(`${label}: ${canWrite ? "can" : "cannot"} update staff_users`, succeeded === canWrite, error?.message);
}

async function assertAccessTokenWrite(client: SupabaseClient, label: string, canWrite: boolean) {
  const { data, error } = await client
    .from("access_tokens")
    .insert({ hotel_id: hotelId, kind: "access_code", token_hash: `role-probe-${Date.now()}`, is_active: false })
    .select();
  const succeeded = !error && (data?.length ?? 0) > 0;
  check(`${label}: ${canWrite ? "can" : "cannot"} create an access token`, succeeded === canWrite, error?.message);
  if (succeeded && data) await client.from("access_tokens").delete().eq("id", data[0].id);
}

async function assertHotelSettingsWrite(client: SupabaseClient, label: string, canWrite: boolean) {
  const { data: before } = await client.from("hotel_settings").select("about").eq("hotel_id", hotelId).single();
  const { data, error } = await client.from("hotel_settings").update({ about: before?.about ?? null }).eq("hotel_id", hotelId).select();
  const succeeded = !error && (data?.length ?? 0) > 0;
  check(`${label}: ${canWrite ? "can" : "cannot"} update hotel_settings`, succeeded === canWrite, error?.message);
}

async function assertFeedbackVisibility(client: SupabaseClient, label: string, canView: boolean) {
  const { data, error } = await client.from("feedback").select("id");
  if (canView) {
    check(`${label}: can read feedback`, !error, error?.message);
  } else {
    const blocked = !!error || (data?.length ?? 0) === 0;
    check(`${label}: cannot read feedback`, blocked, error ? undefined : `got ${data?.length} row(s)`);
  }
}

async function main() {
  const admin = HOTEL_A_STAFF.find((s) => s.role === "hotel_admin")!;
  const manager = HOTEL_A_STAFF.find((s) => s.role === "manager")!;
  const staff = HOTEL_A_STAFF.find((s) => s.role === "staff")!;

  console.log("Signing in as hotel_admin, manager, and staff (Aura Grand Hotel)...");
  const adminClient = await signIn(admin.email);
  const managerClient = await signIn(manager.email);
  const staffClient = await signIn(staff.email);

  const { data: staffRow } = await adminClient.from("staff_users").select("id").eq("email", staff.email).single();
  const sarahId = staffRow!.id;

  const { data: foreignRequest } = await adminClient
    .from("requests")
    .select("id, estimated_minutes")
    .eq("department_id", maintenanceId)
    .limit(1)
    .maybeSingle();
  if (!foreignRequest) {
    console.error("No Maintenance-department request found in demo data — run `pnpm seed` first.");
    process.exit(1);
  }

  console.log("\n--- hotel_admin ---");
  await assertRequestVisibility(adminClient, "hotel_admin", true, housekeepingId);
  await assertRequestUpdateScope(adminClient, "hotel_admin", true, foreignRequest);
  await assertCatalogueWrite(adminClient, "hotel_admin", true);
  await assertDepartmentWrite(adminClient, "hotel_admin", true);
  await assertStaffWrite(adminClient, "hotel_admin", true, sarahId);
  await assertAccessTokenWrite(adminClient, "hotel_admin", true);
  await assertHotelSettingsWrite(adminClient, "hotel_admin", true);
  await assertFeedbackVisibility(adminClient, "hotel_admin", true);

  console.log("\n--- manager ---");
  await assertRequestVisibility(managerClient, "manager", true, housekeepingId);
  await assertRequestUpdateScope(managerClient, "manager", true, foreignRequest);
  await assertCatalogueWrite(managerClient, "manager", true);
  await assertDepartmentWrite(managerClient, "manager", true);
  await assertStaffWrite(managerClient, "manager", false, sarahId);
  await assertAccessTokenWrite(managerClient, "manager", false);
  await assertHotelSettingsWrite(managerClient, "manager", false);
  await assertFeedbackVisibility(managerClient, "manager", true);

  console.log("\n--- staff (Housekeeping) ---");
  await assertRequestVisibility(staffClient, "staff", false, housekeepingId);
  await assertRequestUpdateScope(staffClient, "staff", false, foreignRequest);
  await assertCatalogueWrite(staffClient, "staff", false);
  await assertDepartmentWrite(staffClient, "staff", false);
  await assertStaffWrite(staffClient, "staff", false, sarahId);
  await assertAccessTokenWrite(staffClient, "staff", false);
  await assertHotelSettingsWrite(staffClient, "staff", false);
  await assertFeedbackVisibility(staffClient, "staff", false);

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.error("\nROLE PERMISSION TEST FAILED.");
    process.exit(1);
  }
  console.log("\nRole boundaries hold: hotel_admin/manager/staff each get exactly the access docs/ARCHITECTURE.md section 7 specifies.");
}

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
