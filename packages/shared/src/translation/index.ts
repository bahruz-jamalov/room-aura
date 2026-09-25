export type { TranslateInput, TranslationProvider, TranslationResult } from "./types";
export { MockTranslationProvider } from "./mock";

// Selected by an env var INSIDE the edge function that calls this — never in
// a frontend bundle, since a real provider needs a server-side API key.
// See docs/ARCHITECTURE.md section 9. Only 'mock' exists until we wire a
// real provider (Claude), at which point this switch grows one more case
// and nothing else in the codebase changes.
import { MockTranslationProvider } from "./mock";
import type { TranslationProvider } from "./types";

export function getTranslationProvider(providerName: string = "mock"): TranslationProvider {
  switch (providerName) {
    case "mock":
      return new MockTranslationProvider();
    default:
      throw new Error(`Unknown translation provider: "${providerName}"`);
  }
}
