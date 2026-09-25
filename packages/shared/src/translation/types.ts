// The translation provider interface — docs/ARCHITECTURE.md section 9.
// One interface, swappable implementations. The mock is what runs in
// dev/demo; a real provider (Claude) can be dropped in later behind the
// same shape with no schema change and no call-site change.

import type { LanguageCode } from "../types/enums";

export interface TranslationResult {
  text: string;
  sourceLocale: LanguageCode | string;
  targetLocale: LanguageCode | string;
  /** e.g. 'mock', 'claude'. Persisted on requests.translation_provider. */
  provider: string;
  /** Persisted on requests.translation_is_mock — the amber "Mock translation"
   *  badge in the admin reads this. Never allow this to be ambiguous. */
  isMock: boolean;
  confidence?: number;
}

export interface TranslateInput {
  text: string;
  /** Omit to let the provider detect it. */
  sourceLocale?: LanguageCode | string;
  targetLocale: LanguageCode | string;
}

export interface TranslationProvider {
  translate(input: TranslateInput): Promise<TranslationResult>;
}
