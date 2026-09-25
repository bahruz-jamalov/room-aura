// Where a scanned room QR actually lands: /j/:token. This is the whole
// "scan QR" mechanism — see ConnectScreen.tsx for why there's no in-app
// camera. A room token needs no extra input, so this redeems automatically
// on mount and drops the guest straight onto Home.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useGuestSession } from "../guest/GuestSessionContext";
import { primaryButton } from "../lib/styles";

export default function RedeemTokenScreen() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { redeemAccess } = useGuestSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setError(t("onboarding.invalidCode"));
        return;
      }
      const result = await redeemAccess(token, undefined, i18n.language);
      if (cancelled) return;
      if (result) {
        setError(t("onboarding.invalidCode"));
        return;
      }
      navigate("/home", { replace: true });
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "var(--ra-space-page-gutter)",
        textAlign: "center",
      }}
    >
      {error ? (
        <div>
          <p style={{ color: "var(--ra-color-danger)" }}>{error}</p>
          <button style={primaryButton} onClick={() => navigate("/connect/code")}>
            {t("onboarding.enterCode")}
          </button>
        </div>
      ) : (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("onboarding.connecting")}</p>
      )}
    </div>
  );
}
