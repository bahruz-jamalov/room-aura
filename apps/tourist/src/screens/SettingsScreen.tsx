import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LANGUAGE_OPTIONS, changeLanguage } from "@room-aura/i18n";
import { useGuestSession } from "../guest/GuestSessionContext";
import { card, secondaryButton } from "../lib/styles";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { room, setLocale, endSession } = useGuestSession();

  async function handleSelectLanguage(code: string) {
    await changeLanguage(code);
    await setLocale(code);
  }

  async function handleEndSession() {
    await endSession();
    navigate("/welcome", { replace: true });
  }

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-6)" }}>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "var(--ra-space-4) 0 0" }}>{t("nav.settings")}</h1>

      {room && (
        <div style={{ ...card, padding: "var(--ra-space-4)" }}>
          <span style={{ color: "var(--ra-color-text-secondary)" }}>{t("home.room")}</span>
          <strong style={{ display: "block", fontSize: "var(--ra-text-lg)" }}>{room.number}</strong>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: "var(--ra-text-lg)" }}>{t("settings.language")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--ra-space-2)" }}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.code}
              onClick={() => void handleSelectLanguage(lang.code)}
              style={{
                minHeight: "var(--ra-min-target)",
                borderRadius: "var(--ra-radius-control)",
                border:
                  i18n.language === lang.code ? "2px solid var(--ra-color-accent)" : "1px solid var(--ra-color-border)",
                background: i18n.language === lang.code ? "var(--ra-color-accent-soft)" : "var(--ra-color-surface)",
                cursor: "pointer",
              }}
            >
              {lang.nameNative}
            </button>
          ))}
        </div>
      </div>

      <button style={secondaryButton} onClick={() => void handleEndSession()}>
        {t("settings.endSession")}
      </button>
    </div>
  );
}
