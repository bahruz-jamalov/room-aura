// Phase 1 proof-of-foundation screen: the language picker, wired to real
// i18n + RTL flipping + the tourist design tokens. This is NOT the full
// onboarding flow (hotel/room QR connection is Phase 2 — it needs guest
// anonymous auth and the redeem-access edge function, neither built yet).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_OPTIONS, changeLanguage, initI18n } from "@room-aura/i18n";

initI18n("en");

export default function App() {
  const { t, i18n } = useTranslation();
  const [locale, setLocale] = useState(i18n.language);

  async function selectLanguage(code: string) {
    await changeLanguage(code);
    setLocale(code);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "var(--ra-space-page-gutter)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--ra-space-6)",
      }}
    >
      <header style={{ textAlign: "center", marginTop: "var(--ra-space-10)" }}>
        <h1 style={{ fontSize: "var(--ra-text-3xl)", margin: 0, color: "var(--ra-color-accent)" }}>{t("app.name")}</h1>
        <p style={{ color: "var(--ra-color-text-secondary)", fontSize: "var(--ra-text-lg)" }}>
          {t("onboarding.chooseLanguage")}
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "var(--ra-space-3)",
        }}
      >
        {LANGUAGE_OPTIONS.map((lang) => (
          <button
            key={lang.code}
            onClick={() => void selectLanguage(lang.code)}
            style={{
              minHeight: "var(--ra-min-target)",
              padding: "var(--ra-space-4)",
              borderRadius: "var(--ra-radius-card)",
              border:
                locale === lang.code
                  ? "2px solid var(--ra-color-accent)"
                  : "1px solid var(--ra-color-border)",
              background: locale === lang.code ? "var(--ra-color-accent-soft)" : "var(--ra-color-surface)",
              color: "var(--ra-color-text-primary)",
              fontSize: "var(--ra-text-lg)",
              cursor: "pointer",
              boxShadow: "var(--ra-shadow-sm)",
            }}
          >
            {lang.nameNative}
          </button>
        ))}
      </div>

      <footer style={{ marginTop: "auto", textAlign: "center", color: "var(--ra-color-text-secondary)" }}>
        <p>{t("onboarding.connectToHotel")} — {t("common.loading")}</p>
        <p style={{ fontSize: "var(--ra-text-xs)" }}>Phase 2 builds the QR / access code connection flow here.</p>
      </footer>
    </div>
  );
}
