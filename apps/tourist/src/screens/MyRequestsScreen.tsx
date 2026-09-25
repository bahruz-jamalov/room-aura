// Placeholder — request creation and tracking are Phase 3. The tab exists
// now so the navigation shell matches the final IA from the start.
import { useTranslation } from "react-i18next";

export default function MyRequestsScreen() {
  const { t } = useTranslation();
  return (
    <div style={{ padding: "var(--ra-space-page-gutter)" }}>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "var(--ra-space-4) 0 var(--ra-space-6)" }}>{t("nav.myRequests")}</h1>
      <p style={{ color: "var(--ra-color-text-secondary)", textAlign: "center", marginTop: "var(--ra-space-16)" }}>
        No requests yet.
      </p>
    </div>
  );
}
