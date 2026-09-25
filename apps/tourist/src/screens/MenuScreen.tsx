import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGuestSession } from "../guest/GuestSessionContext";
import { useMenuCategories } from "../hooks/useMenuCategories";
import { card } from "../lib/styles";

export default function MenuScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hotel } = useGuestSession();
  const { categories, loading } = useMenuCategories(i18n.language, hotel?.defaultLocale ?? "en");

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "var(--ra-space-4) 0 0" }}>{t("menu.title")}</h1>
      {loading ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-3)" }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/menu/${cat.id}`)}
              style={{
                ...card,
                padding: "var(--ra-space-4)",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "var(--ra-text-lg)",
                fontWeight: 600,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
