// Guest CONTENT (hotel/service/menu names) resolution order, per
// docs/ARCHITECTURE.md section 3: requested locale -> hotel default_locale
// -> 'en'. This is a client-side convenience read; the same fallback logic
// would apply just as well server-side later if we move it into a view.
export function resolveTranslation<T extends { locale: string }>(
  translations: T[],
  preferredLocale: string,
  fallbackLocale: string,
): T | undefined {
  return (
    translations.find((t) => t.locale === preferredLocale) ??
    translations.find((t) => t.locale === fallbackLocale) ??
    translations.find((t) => t.locale === "en") ??
    translations[0]
  );
}
