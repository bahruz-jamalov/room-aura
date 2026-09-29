// ROOM-AURA — delete-account edge function.
//
// Apple App Store Guideline 5.1.1(v): an app that lets guests create an
// account must let them delete it from inside the app. The client SDK
// can't delete an auth.users row itself (needs the admin API), so this is
// the one place account deletion happens — verifies the caller's own JWT,
// then deletes exactly that user via the service role.
//
// Contract:
//   POST (no body)
//   Authorization: Bearer <guest's own JWT>
//
// Deploy: supabase functions deploy delete-account

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    // Verify the caller is who they claim to be, using their own JWT —
    // never trust a user id passed in the request body.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "unauthorized" }, 401);

    // Privileged client — bypasses RLS deliberately, exactly here.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // guest_sessions.auth_user_id has no ON DELETE CASCADE from auth.users
    // (Postgres can't reach into the auth schema for that), so drop it
    // explicitly first or it's left orphaned pointing at a deleted user.
    const { error: sessionDeleteError } = await admin
      .from("guest_sessions")
      .delete()
      .eq("auth_user_id", user.id);
    if (sessionDeleteError) return json({ error: "server_error" }, 500);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) return json({ error: "server_error" }, 500);

    return json({ ok: true }, 200);
  } catch (err) {
    console.error(err);
    return json({ error: "server_error" }, 500);
  }
});
