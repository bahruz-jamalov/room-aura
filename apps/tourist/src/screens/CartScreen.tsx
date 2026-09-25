// Places the order via the create_order RPC (supabase/migrations/
// 00000000000014_orders.sql) — one atomic call instead of three separate
// client-side inserts, with price/currency re-derived server-side from
// menu_items rather than trusted from the cart.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatMoney, type PaymentMethod } from "@room-aura/shared";
import { useCart } from "../cart/CartContext";
import { useGuestSession } from "../guest/GuestSessionContext";
import { primaryButton, textInput } from "../lib/styles";
import { supabase } from "../supabase";

export default function CartScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { room } = useGuestSession();
  const { items, setQuantity, totalMinor, clear } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("charge_to_room");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = items[0]?.currency ?? "USD";

  async function handlePlaceOrder() {
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await supabase
      .rpc("create_order", {
        p_payment_method: paymentMethod,
        p_note: note.trim() || null,
        p_items: items.map((i) => ({ menu_item_id: i.menuItemId, quantity: i.quantity })),
      })
      .single<{ request_id: string; request_number: string; total_minor: number; currency: string }>();

    if (rpcError || !data) {
      setError(rpcError?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    clear();
    navigate(`/requests/${data.request_id}`, { replace: true });
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: "var(--ra-space-page-gutter)" }}>
        <h1 style={{ fontSize: "var(--ra-text-2xl)" }}>{t("cart.title")}</h1>
        <p style={{ color: "var(--ra-color-text-secondary)" }}>—</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "var(--ra-space-4) 0 0" }}>{t("cart.title")}</h1>

      {items.map((item) => (
        <div key={item.menuItemId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div>{item.name}</div>
            <div style={{ color: "var(--ra-color-text-secondary)", fontSize: "var(--ra-text-sm)" }}>
              {formatMoney(item.priceMinor, item.currency, i18n.language)} × {item.quantity}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
            <StepButton label="−" onClick={() => setQuantity(item.menuItemId, item.quantity - 1)} />
            <span style={{ minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
            <StepButton label="+" onClick={() => setQuantity(item.menuItemId, item.quantity + 1)} />
          </div>
        </div>
      ))}

      <div style={{ borderTop: "1px solid var(--ra-color-border)", paddingTop: "var(--ra-space-3)", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
        <span>{t("cart.total")}</span>
        <span>{formatMoney(totalMinor, currency, i18n.language)}</span>
      </div>

      {room && (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>
          {t("home.room")} {room.number}
        </p>
      )}

      <label>
        <span style={{ display: "block", marginBottom: "var(--ra-space-1)" }}>{t("common.note")} ({t("common.optional")})</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} style={textInput} />
      </label>

      <div>
        <span style={{ display: "block", marginBottom: "var(--ra-space-2)" }}>{t("cart.paymentMethod")}</span>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)", marginBottom: "var(--ra-space-2)" }}>
          <input type="radio" checked={paymentMethod === "charge_to_room"} onChange={() => setPaymentMethod("charge_to_room")} />
          {t("cart.chargeToRoom")}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="radio" checked={paymentMethod === "pay_at_hotel"} onChange={() => setPaymentMethod("pay_at_hotel")} />
          {t("cart.payAtHotel")}
        </label>
      </div>

      {error && (
        <p style={{ color: "var(--ra-color-danger)" }} role="alert">
          {error}
        </p>
      )}

      <button disabled={submitting} style={primaryButton} onClick={() => void handlePlaceOrder()}>
        {submitting ? t("common.loading") : t("cart.placeOrder")}
      </button>
    </div>
  );
}

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: "var(--ra-radius-full)",
        border: "1px solid var(--ra-color-border)",
        background: "var(--ra-color-surface)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
