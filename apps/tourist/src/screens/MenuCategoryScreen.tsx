import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { formatMoney } from "@room-aura/shared";
import { useCart } from "../cart/CartContext";
import { useGuestSession } from "../guest/GuestSessionContext";
import { useMenuItems } from "../hooks/useMenuItems";
import { card, primaryButton } from "../lib/styles";

export default function MenuCategoryScreen() {
  const { menuCategoryId = "" } = useParams<{ menuCategoryId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hotel } = useGuestSession();
  const { items, loading } = useMenuItems(menuCategoryId, i18n.language, hotel?.defaultLocale ?? "en");
  const { items: cartItems, addItem, itemCount } = useCart();

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "var(--ra-space-4)" }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          style={{ background: "none", border: "none", fontSize: "var(--ra-text-2xl)", cursor: "pointer", padding: 0 }}
        >
          ←
        </button>
        {itemCount > 0 && (
          <button onClick={() => navigate("/cart")} style={{ ...primaryButton, width: "auto", padding: "0 var(--ra-space-4)" }}>
            {t("cart.title")} ({itemCount})
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-3)" }}>
          {items.map((item) => {
            const inCart = cartItems.find((c) => c.menuItemId === item.id);
            const soldOut = item.status === "sold_out";
            return (
              <div key={item.id} style={{ ...card, padding: "var(--ra-space-4)", opacity: soldOut ? 0.6 : 1 }}>
                <div style={{ display: "flex", gap: "var(--ra-space-3)" }}>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: 64, height: 64, borderRadius: "var(--ra-radius-control)", objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>{item.name}</strong>
                      <span style={{ color: "var(--ra-color-accent)", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {formatMoney(item.priceMinor, item.currency, i18n.language)}
                      </span>
                    </div>
                    {item.description && (
                      <p style={{ margin: "var(--ra-space-1) 0 0", color: "var(--ra-color-text-secondary)", fontSize: "var(--ra-text-sm)" }}>
                        {item.description}
                      </p>
                    )}
                    {item.allergens.length > 0 && (
                      <p style={{ margin: "var(--ra-space-1) 0 0", fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)" }}>
                        {item.allergens.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  disabled={soldOut}
                  onClick={() =>
                    addItem(
                      { menuItemId: item.id, name: item.name, priceMinor: item.priceMinor, currency: item.currency },
                      1,
                    )
                  }
                  style={{ ...primaryButton, width: "100%", marginTop: "var(--ra-space-3)" }}
                >
                  {soldOut ? t("menu.soldOut") : inCart ? `${t("cart.addToCart")} (${inCart.quantity})` : t("cart.addToCart")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
