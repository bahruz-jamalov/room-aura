// Mock translation provider — docs/ARCHITECTURE.md section 9.
//
// Carries a small seeded dictionary (including the exact Azerbaijani
// end-to-end demo sentence from the spec) for phrases we want to demo
// convincingly, and otherwise returns an OBVIOUSLY-mock string. Nobody
// should ever mistake this for a real translation — that's the point.

import type { TranslateInput, TranslationProvider, TranslationResult } from "./types";

interface SeededPhrase {
  sourceLocale: string;
  targetLocale: string;
  match: string; // normalised (trimmed, lowercased) source text
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

export class MockTranslationProvider implements TranslationProvider {
  async translate(input: TranslateInput): Promise<TranslationResult> {
    const normalised = normalise(input.text);
    const seeded = SEEDED_PHRASES.find(
      (p) => p.match === normalised && (!input.sourceLocale || p.sourceLocale === input.sourceLocale),
    );

    if (seeded) {
      return {
        text: seeded.translated,
        sourceLocale: seeded.sourceLocale,
        targetLocale: input.targetLocale,
        provider: "mock",
        isMock: true,
        confidence: 1,
      };
    }

    const sourceLabel = input.sourceLocale ?? "auto";
    return {
      text: `[mock ${sourceLabel}→${input.targetLocale}] ${input.text}`,
      sourceLocale: input.sourceLocale ?? "unknown",
      targetLocale: input.targetLocale,
      provider: "mock",
      isMock: true,
    };
  }
}
