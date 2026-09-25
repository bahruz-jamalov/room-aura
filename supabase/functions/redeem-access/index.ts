// ROOM-AURA — redeem-access edge function.
//
// The ONE place a guest's raw QR token or access code ever touches a
// server. Turns it into a guest_sessions row. Runs with the service role
// key (auto-injected by the platform — never set manually) because
// access_tokens has no guest RLS policy at all and guest_sessions has no
// guest INSERT policy, by design (docs/ARCHITECTURE.md section 4).
//
// Contract:
//   POST { token: string, roomNumber?: string, locale: string }
//   Authorization: Bearer <anonymous-user JWT> (from supabase.auth.signInAnonymously())
//
// roomNumber is required when the token is hotel-wide (kind 'hotel' or
// 'access_code') and ignored when it's a room QR (kind 'room' already
// carries the room). This is the one extra bit of typing a lobby code
// costs over a room QR — see docs/ARCHITECTURE.md's "Room-specific QR
// should automatically identify: Hotel, Room".
//
// Deploy: supabase functions deploy redeem-access
// (No local Deno/Docker needed — the CLI bundles remotely.)

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const DEFAULT_SESSION_TTL_HOURS = 72;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    // Verify the caller is a real (anonymous) auth user — not a service
    // client just claiming to be one — using their own JWT.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const token: string | undefined = body?.token;
    const roomNumber: string | undefined = body?.roomNumber;
    const locale: string | undefined = body?.locale;
    if (!token || !locale) return json({ error: "bad_request" }, 400);

    // Privileged client — bypasses RLS deliberately, exactly here.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const tokenHash = await sha256Hex(token);
    const { data: accessToken, error: tokenError } = await admin
      .from("access_tokens")
      .select("id, hotel_id, room_id, kind, is_active, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) return json({ error: "server_error" }, 500);
    if (!accessToken || !accessToken.is_active) return json({ error: "invalid_code" }, 404);
    if (accessToken.expires_at && new Date(accessToken.expires_at) <= new Date()) {
      return json({ error: "expired_code" }, 404);
    }

    let roomId = accessToken.room_id as string | null;
    if (accessToken.kind !== "room") {
      if (!roomNumber) return json({ error: "room_required" }, 400);
      const { data: room, error: roomError } = await admin
        .from("rooms")
        .select("id")
        .eq("hotel_id", accessToken.hotel_id)
        .eq("number", roomNumber)
        .eq("is_active", true)
        .maybeSingle();
      if (roomError) return json({ error: "server_error" }, 500);
      if (!room) return json({ error: "room_not_found" }, 404);
      roomId = room.id;
    }

    const { data: settings } = await admin
      .from("hotel_settings")
      .select("guest_session_ttl_hours")
      .eq("hotel_id", accessToken.hotel_id)
      .maybeSingle();
    const ttlHours = settings?.guest_session_ttl_hours ?? DEFAULT_SESSION_TTL_HOURS;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    // Upsert on auth_user_id (unique): a guest re-scanning or refreshing
    // gets their session renewed/moved rather than a duplicate-key error.
    const { data: session, error: sessionError } = await admin
      .from("guest_sessions")
      .upsert(
        {
          hotel_id: accessToken.hotel_id,
          room_id: roomId,
          auth_user_id: user.id,
          locale,
          source: accessToken.kind,
          expires_at: expiresAt,
          last_seen_at: new Date().toISOString(),
          revoked_at: null,
        },
        { onConflict: "auth_user_id" },
      )
      .select("id, hotel_id, room_id, locale, expires_at")
      .single();

    if (sessionError || !session) return json({ error: "server_error" }, 500);

    void admin.from("access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", accessToken.id);

    const [{ data: hotel }, { data: room }] = await Promise.all([
      admin.from("hotels").select("name, logo_url, default_locale, currency").eq("id", session.hotel_id).single(),
      admin.from("rooms").select("number").eq("id", session.room_id).single(),
    ]);

    return json(
      {
        guestSessionId: session.id,
        hotelId: session.hotel_id,
        hotelName: hotel?.name ?? null,
        hotelLogoUrl: hotel?.logo_url ?? null,
        roomNumber: room?.number ?? null,
        locale: session.locale,
        expiresAt: session.expires_at,
      },
      200,
    );
  } catch (err) {
    console.error(err);
    return json({ error: "server_error" }, 500);
  }
});
