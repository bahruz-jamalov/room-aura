// Client-side token generation for /access — mirrors scripts/seed.ts's
// sha256Hex/randomAccessCode exactly. hotel_admin already has direct INSERT
// rights on access_tokens via RLS, so unlike Staff invites this needs no
// edge function: the raw value is generated and hashed right here, shown to
// the admin once, and only the hash ever reaches the database.
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Human-typeable: excludes ambiguous characters (0/O, 1/I). */
export function randomAccessCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

/** Opaque URL-safe token for QR-encoded hotel/room links (/j/:token). */
export function randomUrlToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
