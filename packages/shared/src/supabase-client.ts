// Thin factory so both apps construct their Supabase client the same way.
// Takes the PUBLIC url + publishable/anon key only — these are safe to ship
// in a frontend bundle. RLS (supabase/migrations/00000000000009_rls_policies.sql)
// is what protects the data, never the secrecy of this key.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createRoomAuraClient(url: string, publishableKey: string): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error(
      "createRoomAuraClient: missing url or publishableKey. Check your app's VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY env vars.",
    );
  }
  return createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Guests are Supabase anonymous-auth users: no email/password, and
      // signInAnonymously() must be allowed to create one automatically for
      // a brand-new visitor rather than only reusing a stored session.
      detectSessionInUrl: false,
    },
  });
}
