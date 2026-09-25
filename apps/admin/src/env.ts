// Vite only exposes env vars prefixed VITE_. Both are public/safe to ship —
// see .env.example. Fail fast in dev if they're missing rather than
// surfacing a confusing runtime error later.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const touristAppUrl = (import.meta.env.VITE_TOURIST_APP_URL as string | undefined) ?? "http://localhost:5173";

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy apps/admin/.env.example to apps/admin/.env.local and fill in the values from Project Settings → API Keys.",
  );
}

export const env = { supabaseUrl, supabasePublishableKey, touristAppUrl };
