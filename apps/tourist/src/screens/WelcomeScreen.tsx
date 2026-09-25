import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LANGUAGE_OPTIONS, changeLanguage } from "@room-aura/i18n";

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  async function selectLanguage(code: string) {
    await changeLanguage(code);
    navigate("/connect");
  }

  return (
    <div style={{ minHeight: "100vh", padding: "var(--ra-space-page-gutter)" }}>
      <header style={{ textAlign: "center", marginTop: "var(--ra-space-10)", marginBottom: "var(--ra-space-6)" }}>
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
                i18n.language === lang.code
                  ? "2px solid var(--ra-color-accent)"
                  : "1px solid var(--ra-color-border)",
              background: i18n.language === lang.code ? "var(--ra-color-accent-soft)" : "var(--ra-color-surface)",
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
    </div>
  );
}
