import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGuestSession, type RedeemErrorCode } from "../guest/GuestSessionContext";
import { card, primaryButton, textInput } from "../lib/styles";

const ERROR_KEYS: Record<RedeemErrorCode, string> = {
  invalid_code: "onboarding.invalidCode",
  expired_code: "onboarding.invalidCode",
  room_not_found: "onboarding.invalidCode",
  room_required: "onboarding.invalidCode",
  bad_request: "onboarding.invalidCode",
  unauthorized: "onboarding.invalidCode",
  server_error: "onboarding.invalidCode",
  network_error: "onboarding.invalidCode",
};

export default function ConnectCodeScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { redeemAccess } = useGuestSession();
  const [code, setCode] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await redeemAccess(code.trim(), roomNumber.trim(), i18n.language);
    setSubmitting(false);
    if (result) {
      setError(t(ERROR_KEYS[result]));
      return;
    }
    navigate("/home", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", padding: "var(--ra-space-page-gutter)" }}>
      <header style={{ textAlign: "center", margin: "var(--ra-space-10) 0 var(--ra-space-6)" }}>
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>{t("onboarding.enterCode")}</h1>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{ ...card, padding: "var(--ra-space-6)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}
      >
        <label>
          <span style={{ display: "block", marginBottom: "var(--ra-space-1)" }}>{t("onboarding.enterCode")}</span>
          <input
            required
            autoFocus
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={textInput}
            placeholder="AB12CD34"
          />
        </label>
        <label>
          <span style={{ display: "block", marginBottom: "var(--ra-space-1)" }}>{t("home.room")}</span>
          <input
            required
            inputMode="numeric"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            style={textInput}
            placeholder="508"
          />
        </label>

        {error && (
          <p style={{ color: "var(--ra-color-danger)", margin: 0 }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} style={primaryButton}>
          {submitting ? t("onboarding.connecting") : t("common.confirm")}
        </button>
      </form>
    </div>
  );
}
