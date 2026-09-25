// ROOM-AURA — i18next setup shared by both apps.
// UI strings live here as JSON per locale (packages/i18n/locales). Guest
// CONTENT (hotel/service/menu names) lives in the database's *_translations
// tables instead — see docs/ARCHITECTURE.md section 3. Different problems,
// different mechanisms.

import i18next, { type i18n } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en/common.json";
import az from "../locales/az/common.json";
import tr from "../locales/tr/common.json";
import ru from "../locales/ru/common.json";
import ar from "../locales/ar/common.json";
import zh from "../locales/zh/common.json";
import fr from "../locales/fr/common.json";
import de from "../locales/de/common.json";
import es from "../locales/es/common.json";

export const LANGUAGE_OPTIONS = [
  { code: "en", nameEn: "English", nameNative: "English", isRtl: false },
  { code: "az", nameEn: "Azerbaijani", nameNative: "Azərbaycanca", isRtl: false },
  { code: "tr", nameEn: "Turkish", nameNative: "Türkçe", isRtl: false },
  { code: "ru", nameEn: "Russian", nameNative: "Русский", isRtl: false },
  { code: "ar", nameEn: "Arabic", nameNative: "العربية", isRtl: true },
  { code: "zh", nameEn: "Chinese", nameNative: "中文", isRtl: false },
  { code: "fr", nameEn: "French", nameNative: "Français", isRtl: false },
  { code: "de", nameEn: "German", nameNative: "Deutsch", isRtl: false },
  { code: "es", nameEn: "Spanish", nameNative: "Español", isRtl: false },
] as const;

export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];

const resources = {
  en: { common: en },
  az: { common: az },
  tr: { common: tr },
  ru: { common: ru },
  ar: { common: ar },
  zh: { common: zh },
  fr: { common: fr },
  de: { common: de },
  es: { common: es },
};

export function isRtlLocale(locale: string): boolean {
  return LANGUAGE_OPTIONS.some((l) => l.code === locale && l.isRtl);
}

/** Applies dir="rtl"/"ltr" to <html> — call this on every language change,
 *  not just at startup, so switching to/from Arabic flips layout live. */
export function applyDocumentDirection(locale: string) {
  if (typeof document === "undefined") return;
  document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
  document.documentElement.lang = locale;
}

export function initI18n(defaultLocale: string = "en"): i18n {
  void i18next.use(initReactI18next).init({
    resources,
    lng: defaultLocale,
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });
  applyDocumentDirection(defaultLocale);
  return i18next;
}

export function changeLanguage(locale: string): Promise<unknown> {
  applyDocumentDirection(locale);
  return i18next.changeLanguage(locale);
}

export { i18next };
