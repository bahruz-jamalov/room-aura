// ROOM-AURA — invite-staff edge function.
//
// staff_users.id is a foreign key straight to auth.users(id) — there's no
// separate "invite" table. Creating a staff member therefore means creating
// an auth.users row first, which needs the admin SDK (service role); the
// admin app's browser session only ever holds the publishable/anon key, so
// this has to happen server-side, the same reason redeem-access exists.
//
// This project has no SMTP configured for Supabase Auth's own invite
// emails (a real production pilot would use inviteUserByEmail instead), so
// the pattern here matches scripts/seed.ts: create the user with a
// generated temporary password and hand it back to the calling hotel_admin
// once, to share with the new staff member out of band. The new staff
// member is expected to change it after first sign-in (no forced-reset
// flow yet — POST-MVP alongside real email delivery).
//
// Contract:
//   POST { email, fullName, role, departmentId? }
//   Authorization: Bearer <hotel_admin's own JWT>
//
// Deploy: supabase functions deploy invite-staff

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const STAFF_ROLES = ["hotel_admin", "manager", "staff"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "Ra-" + Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Only a hotel_admin may create staff — mirrors "hotel admin manages
    // own hotel roster" in 00000000000009_rls_policies.sql. Re-derived here
    // from the caller's own row rather than trusted from the request body.
    const { data: callerStaff, error: callerStaffError } = await admin
      .from("staff_users")
      .select("hotel_id, role")
      .eq("id", caller.id)
      .single();
    if (callerStaffError || !callerStaff || callerStaff.role !== "hotel_admin") {
      return json({ error: "forbidden" }, 403);
    }

    const body = await req.json().catch(() => null);
    const email: string | undefined = body?.email?.trim().toLowerCase();
    const fullName: string | undefined = body?.fullName?.trim();
    const role: StaffRole | undefined = body?.role;
    const departmentId: string | null = body?.departmentId ?? null;

    if (!email || !fullName || !role || !STAFF_ROLES.includes(role)) {
      return json({ error: "bad_request" }, 400);
    }
    if (role === "staff" && !departmentId) {
      return json({ error: "department_required_for_staff_role" }, 400);
    }
    if (departmentId) {
      const { data: department } = await admin
        .from("departments")
        .select("id")
        .eq("id", departmentId)
        .eq("hotel_id", callerStaff.hotel_id)
        .maybeSingle();
      if (!department) return json({ error: "department_not_found" }, 404);
    }

    const password = randomPassword();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      const message = createError?.message ?? "";
      if (message.toLowerCase().includes("already been registered")) {
        return json({ error: "email_already_registered" }, 409);
      }
      return json({ error: "server_error" }, 500);
    }

    const { error: staffInsertError } = await admin.from("staff_users").insert({
      id: created.user.id,
      hotel_id: callerStaff.hotel_id,
      department_id: departmentId,
      role,
      full_name: fullName,
      email,
      status: "active",
    });
    if (staffInsertError) {
      // Roll back the orphaned auth user rather than leave a login with no
      // staff row (which would fail AuthContext's lookup silently forever).
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "server_error" }, 500);
    }

    return json({ id: created.user.id, tempPassword: password }, 200);
  } catch (err) {
    console.error(err);
    return json({ error: "server_error" }, 500);
  }
});
