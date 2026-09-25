// ROOM-AURA — translate-content edge function.
//
// Deliberately the ONLY place translation happens, even though the mock
// provider needs no secret key — this is what makes swapping to a real
// provider later (docs/ARCHITECTURE.md section 9) a same-file change with
// no call-site change in either app. Runs with the anon key only (no
// service role needed): it reads nothing and writes nothing, it just
// translates text. The caller still inserts the `requests` row themselves,
// through their own RLS-scoped session.
//
// Mirrors packages/shared/src/translation/mock.ts's seeded phrases — kept
// duplicated on purpose (Deno can't cleanly import that Node workspace
// package) rather than sharing code across runtimes for a handful of lines.
// Keep the two in sync if you add phrases.
//
// Contract:
//   POST { text: string, sourceLocale?: string, targetLocale: string }
//   Authorization: Bearer <any authenticated JWT — guest or staff>
//
// Deploy: supabase functions deploy translate-content

import { corsHeaders } from "../_shared/cors.ts";

interface SeededPhrase {
  sourceLocale: string;
  targetLocale: string;
  match: string;
  translated: string;
}

const SEEDED_PHRASES: SeededPhrase[] = [
  {
    sourceLocale: "az",
    targetLocale: "en",
    match: "otağıma iki əlavə dəsmal gətirə bilərsiniz?",
    translated: "Could you please bring two additional towels to my room?",
  },
  {
    sourceLocale: "az",
    targetLocale: "en",
    match: "otağımda kondisioner işləmir",
    translated: "The air conditioner in my room is not working",
  },
  {
    sourceLocale: "ru",
    targetLocale: "en",
    match: "принесите, пожалуйста, два дополнительных полотенца",
    translated: "Please bring two additional towels",
  },
  {
    sourceLocale: "ar",
    targetLocale: "en",
    match: "هل يمكنكم إحضار منشفتين إضافيتين لغرفتي؟",
    translated: "Could you bring two additional towels to my room?",
  },
];

function normalise(text: string): string {
  return text.trim().toLowerCase();
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null);
  const text: string | undefined = body?.text;
  const sourceLocale: string | undefined = body?.sourceLocale;
  const targetLocale: string | undefined = body?.targetLocale;
  if (!text || !targetLocale) return json({ error: "bad_request" }, 400);

  const normalised = normalise(text);
  const seeded = SEEDED_PHRASES.find((p) => p.match === normalised && (!sourceLocale || p.sourceLocale === sourceLocale));

  if (seeded) {
    return json(
      {
        text: seeded.translated,
        sourceLocale: seeded.sourceLocale,
        targetLocale,
        provider: "mock",
        isMock: true,
        confidence: 1,
      },
      200,
    );
  }

  return json(
    {
      text: `[mock ${sourceLocale ?? "auto"}→${targetLocale}] ${text}`,
      sourceLocale: sourceLocale ?? "unknown",
      targetLocale,
      provider: "mock",
      isMock: true,
    },
    200,
  );
});
