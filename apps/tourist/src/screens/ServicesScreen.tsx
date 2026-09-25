import { useTranslation } from "react-i18next";
import CategoryGrid from "../components/CategoryGrid";
import OtherRequestTile from "../components/OtherRequestTile";
import { useGuestSession } from "../guest/GuestSessionContext";
import { useServiceCategories } from "../hooks/useServiceCategories";

export default function ServicesScreen() {
  const { t, i18n } = useTranslation();
  const { hotel } = useGuestSession();
  const { categories, loading } = useServiceCategories(i18n.language, hotel?.defaultLocale ?? "en");

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "var(--ra-space-4) 0 0" }}>{t("nav.services")}</h1>
      {loading ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      ) : (
        <CategoryGrid categories={categories} trailing={<OtherRequestTile />} />
      )}
    </div>
  );
}
