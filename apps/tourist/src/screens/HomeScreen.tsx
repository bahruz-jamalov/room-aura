import { useTranslation } from "react-i18next";
import CategoryGrid from "../components/CategoryGrid";
import OtherRequestTile from "../components/OtherRequestTile";
import { useGuestSession } from "../guest/GuestSessionContext";
import { useServiceCategories } from "../hooks/useServiceCategories";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { hotel, room } = useGuestSession();
  const { categories, loading } = useServiceCategories(i18n.language, hotel?.defaultLocale ?? "en");

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-6)" }}>
      <header style={{ textAlign: "center", marginTop: "var(--ra-space-6)" }}>
        {hotel?.logoUrl && (
          <img src={hotel.logoUrl} alt={hotel.name} style={{ height: 48, marginBottom: "var(--ra-space-3)" }} />
        )}
        <p style={{ margin: 0, color: "var(--ra-color-text-secondary)" }}>{t("home.welcomeTo")}</p>
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "0 0 var(--ra-space-2)" }}>{hotel?.name}</h1>
        {room && (
          <span
            style={{
              display: "inline-block",
              padding: "var(--ra-space-1) var(--ra-space-4)",
              borderRadius: "var(--ra-radius-full)",
              background: "var(--ra-color-accent-soft)",
              color: "var(--ra-color-accent)",
              fontWeight: 600,
            }}
          >
            {t("home.room")} {room.number}
          </span>
        )}
      </header>

      <h2 style={{ fontSize: "var(--ra-text-xl)", margin: 0 }}>{t("home.howCanWeHelp")}</h2>

      {loading ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      ) : (
        <CategoryGrid categories={categories} trailing={<OtherRequestTile />} />
      )}
    </div>
  );
}
