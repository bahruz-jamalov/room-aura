// Structured service request — a few taps: quantity (if applicable),
// optional note, Send Request. See docs/ARCHITECTURE.md's "Extra Towels"
// example flow.
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { formatMoney } from "@room-aura/shared";
import { useGuestSession } from "../guest/GuestSessionContext";
import { resolveTranslation } from "../lib/resolveTranslation";
import { primaryButton, textInput } from "../lib/styles";
import { supabase } from "../supabase";

interface ServiceFull {
  id: string;
  departmentId: string;
  imageUrl: string | null;
  isFree: boolean;
  priceMinor: number;
  currency: string;
  expectedMinutes: number | null;
  allowsQuantity: boolean;
  maxQuantity: number;
  allowsNote: boolean;
  name: string;
  description: string | null;
}

export default function ServiceDetailScreen() {
  const { serviceId = "" } = useParams<{ serviceId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hotel, room, guestSessionId } = useGuestSession();
  const [service, setService] = useState<ServiceFull | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: svc } = await supabase
        .from("services")
        .select("id, department_id, image_url, is_free, price_minor, currency, expected_minutes, allows_quantity, max_quantity, allows_note")
        .eq("id", serviceId)
        .single();
      if (!svc || cancelled) return;

      const { data: translations } = await supabase
        .from("service_translations")
        .select("locale, name, description")
        .eq("service_id", serviceId);
      if (cancelled) return;

      const resolved = resolveTranslation(translations ?? [], i18n.language, hotel?.defaultLocale ?? "en");
      setService({
        id: svc.id,
        departmentId: svc.department_id,
        imageUrl: svc.image_url,
        isFree: svc.is_free,
        priceMinor: svc.price_minor,
        currency: svc.currency,
        expectedMinutes: svc.expected_minutes,
        allowsQuantity: svc.allows_quantity,
        maxQuantity: svc.max_quantity,
        allowsNote: svc.allows_note,
        name: resolved?.name ?? "Untitled",
        description: resolved?.description ?? null,
      });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [serviceId, i18n.language, hotel?.defaultLocale]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!service || !hotel || !room || !guestSessionId) return;
    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("requests")
      .insert({
        hotel_id: hotel.id,
        room_id: room.id,
        guest_session_id: guestSessionId,
        kind: "service",
        service_id: service.id,
        department_id: service.departmentId,
        quantity,
        guest_note: note.trim() || null,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }
    navigate(`/requests/${data.id}`, { replace: true });
  }

  if (!service) {
    return (
      <div style={{ padding: "var(--ra-space-page-gutter)" }}>
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", marginTop: "var(--ra-space-4)" }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          style={{ background: "none", border: "none", fontSize: "var(--ra-text-2xl)", cursor: "pointer", padding: 0 }}
        >
          ←
        </button>
      </div>

      {service.imageUrl && (
        <img
          src={service.imageUrl}
          alt={service.name}
          style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "var(--ra-radius-card)" }}
        />
      )}

      <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>{service.name}</h1>
      {service.description && <p style={{ color: "var(--ra-color-text-secondary)", margin: 0 }}>{service.description}</p>}
      <p style={{ fontWeight: 600, color: "var(--ra-color-accent)", margin: 0 }}>
        {service.isFree ? "Free" : formatMoney(service.priceMinor, service.currency, i18n.language)}
        {service.expectedMinutes && (
          <span style={{ color: "var(--ra-color-text-secondary)", fontWeight: 400 }}>
            {" "}
            · ~{service.expectedMinutes} {t("common.minutes")}
          </span>
        )}
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
        {service.allowsQuantity && (
          <div>
            <span style={{ display: "block", marginBottom: "var(--ra-space-1)" }}>{t("request.quantity")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-3)" }}>
              <StepperButton label="−" onClick={() => setQuantity((q) => Math.max(1, q - 1))} />
              <span style={{ fontSize: "var(--ra-text-xl)", minWidth: 24, textAlign: "center" }}>{quantity}</span>
              <StepperButton label="+" onClick={() => setQuantity((q) => Math.min(service.maxQuantity, q + 1))} />
            </div>
          </div>
        )}

        {service.allowsNote && (
          <label>
            <span style={{ display: "block", marginBottom: "var(--ra-space-1)" }}>{t("request.addNote")}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} style={textInput} />
          </label>
        )}

        {error && (
          <p style={{ color: "var(--ra-color-danger)", margin: 0 }} role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} style={primaryButton}>
          {submitting ? t("common.loading") : t("request.sendRequest")}
        </button>
      </form>
    </div>
  );
}

function StepperButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "var(--ra-min-target)",
        height: "var(--ra-min-target)",
        borderRadius: "var(--ra-radius-full)",
        border: "1px solid var(--ra-color-border)",
        background: "var(--ra-color-surface)",
        fontSize: "var(--ra-text-xl)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
