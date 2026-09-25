// Client-side call to the translate-content edge function — see
// docs/ARCHITECTURE.md section 9 for why translation happens server-side
// even though the mock provider needs no secret key: it's what keeps the
// swap to a real provider a same-file, same-call-site change later.
import { supabase } from "../supabase";

export interface TranslateResult {
  text: string;
  sourceLocale: string;
  targetLocale: string;
  provider: string;
  isMock: boolean;
}

export async function translateContent(text: string, sourceLocale: string, targetLocale: string): Promise<TranslateResult> {
  const { data, error } = await supabase.functions.invoke<TranslateResult>("translate-content", {
    body: { text, sourceLocale, targetLocale },
  });
  if (error || !data) {
    // Translation failing must never block the request itself — the guest's
    // message still has to reach the hotel. Fall back to the original text.
    return { text, sourceLocale, targetLocale, provider: "none", isMock: true };
  }
  return data;
}
