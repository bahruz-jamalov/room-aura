// Guest CONTENT (hotel/service/menu names) resolution order, mirroring
// apps/tourist/src/lib/resolveTranslation.ts: requested locale -> hotel
// default_locale -> 'en' -> first available.
T? resolveTranslation<T>(
  List<T> translations,
  String Function(T) localeOf,
  String preferredLocale,
  String fallbackLocale,
) {
  for (final t in translations) {
    if (localeOf(t) == preferredLocale) return t;
  }
  for (final t in translations) {
    if (localeOf(t) == fallbackLocale) return t;
  }
  for (final t in translations) {
    if (localeOf(t) == 'en') return t;
  }
  return translations.isEmpty ? null : translations.first;
}
