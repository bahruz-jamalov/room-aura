// Discovery only — Phase 2 scope. Phase 3 adds the "Send Request" action
// (quantity, note, submit) on top of this same list.
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { formatMoney } from "@room-aura/shared";
import { useGuestSession } from "../guest/GuestSessionContext";
import { useServicesByCategory } from "../hooks/useServicesByCategory";
import { card } from "../lib/styles";

export default function ServiceCategoryScreen() {
  const { categoryId = "" } = useParams<{ categoryId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hotel } = useGuestSession();
  const { services, loading } = useServicesByCategory(categoryId, i18n.language, hotel?.defaultLocale ?? "en");

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)", marginTop: "var(--ra-space-4)" }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          style={{ background: "none", border: "none", fontSize: "var(--ra-text-2xl)", cursor: "pointer", padding: 0 }}
        >
          ←
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      ) : services.length === 0 ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>—</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-3)" }}>
          {services.map((svc) => (
            <div key={svc.id} style={{ ...card, padding: "var(--ra-space-4)", display: "flex", gap: "var(--ra-space-3)" }}>
              {svc.imageUrl && (
                <img
                  src={svc.imageUrl}
                  alt={svc.name}
                  style={{ width: 72, height: 72, borderRadius: "var(--ra-radius-control)", objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--ra-space-2)" }}>
                  <strong>{svc.name}</strong>
                  <span style={{ color: "var(--ra-color-accent)", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {svc.isFree ? "Free" : formatMoney(svc.priceMinor, svc.currency, i18n.language)}
                  </span>
                </div>
                {svc.description && (
                  <p style={{ margin: "var(--ra-space-1) 0 0", color: "var(--ra-color-text-secondary)", fontSize: "var(--ra-text-sm)" }}>
                    {svc.description}
                  </p>
                )}
                {svc.expectedMinutes && (
                  <p style={{ margin: "var(--ra-space-1) 0 0", fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)" }}>
                    ~{svc.expectedMinutes} {t("common.minutes")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
