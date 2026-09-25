// The QR sticker encodes a plain URL (/j/:token) — any phone's own camera
// app opens it directly, landing on RedeemTokenScreen. No in-app camera is
// needed for that path, so this screen's only interactive action is the
// access-code fallback. See docs/ARCHITECTURE.md section 4 ("QR encodes...
// no internal IDs are ever exposed") and RedeemTokenScreen.tsx.
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { card, primaryButton } from "../lib/styles";

export default function ConnectScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "var(--ra-space-page-gutter)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--ra-space-6)",
        justifyContent: "center",
      }}
    >
      <header style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>{t("onboarding.connectToHotel")}</h1>
      </header>

      <div style={{ ...card, padding: "var(--ra-space-6)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: "var(--ra-space-2)" }}>{"\u{1F4F7}"}</div>
        <p style={{ margin: 0, color: "var(--ra-color-text-secondary)" }}>{t("onboarding.scanQr")}</p>
        <p style={{ fontSize: "var(--ra-text-sm)", color: "var(--ra-color-text-secondary)" }}>
          {t("onboarding.scanInstructions")}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-3)" }}>
        <div style={{ flex: 1, height: 1, background: "var(--ra-color-border)" }} />
        <span style={{ color: "var(--ra-color-text-secondary)", fontSize: "var(--ra-text-sm)" }}>{t("common.or")}</span>
        <div style={{ flex: 1, height: 1, background: "var(--ra-color-border)" }} />
      </div>

      <button style={primaryButton} onClick={() => navigate("/connect/code")}>
        {t("onboarding.enterCode")}
      </button>
    </div>
  );
}
