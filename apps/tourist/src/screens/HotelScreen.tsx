import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGuestSession } from "../guest/GuestSessionContext";
import { supabase } from "../supabase";
import { card } from "../lib/styles";

interface HotelSettingsView {
  about: string | null;
  address: string | null;
  contactPhone: string | null;
  checkinTime: string | null;
  checkoutTime: string | null;
}

export default function HotelScreen() {
  const { t } = useTranslation();
  const { hotel } = useGuestSession();
  const [settings, setSettings] = useState<HotelSettingsView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // No .eq() needed — RLS already scopes this to the guest's own hotel.
    supabase
      .from("hotel_settings")
      .select("about, address, contact_phone, checkin_time, checkout_time")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setSettings({
            about: data.about,
            address: data.address,
            contactPhone: data.contact_phone,
            checkinTime: data.checkin_time,
            checkoutTime: data.checkout_time,
          });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnyDetail =
    settings?.about || settings?.address || settings?.contactPhone || settings?.checkinTime || settings?.checkoutTime;

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <header style={{ textAlign: "center", margin: "var(--ra-space-6) 0" }}>
        {hotel?.logoUrl && <img src={hotel.logoUrl} alt={hotel.name} style={{ height: 48 }} />}
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "var(--ra-space-2) 0 0" }}>{hotel?.name}</h1>
      </header>

      {loading ? (
        <p style={{ color: "var(--ra-color-text-secondary)", textAlign: "center" }}>{t("common.loading")}</p>
      ) : !hasAnyDetail ? (
        <p style={{ color: "var(--ra-color-text-secondary)", textAlign: "center" }}>—</p>
      ) : (
        <>
          {settings?.about && (
            <div style={{ ...card, padding: "var(--ra-space-4)" }}>
              <p style={{ margin: 0 }}>{settings.about}</p>
            </div>
          )}
          <div
            style={{ ...card, padding: "var(--ra-space-4)", display: "flex", flexDirection: "column", gap: "var(--ra-space-2)" }}
          >
            {settings?.address && <Row label={t("hotel.address")} value={settings.address} />}
            {settings?.contactPhone && <Row label={t("hotel.phone")} value={settings.contactPhone} />}
            {settings?.checkinTime && <Row label={t("hotel.checkin")} value={settings.checkinTime} />}
            {settings?.checkoutTime && <Row label={t("hotel.checkout")} value={settings.checkoutTime} />}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--ra-color-text-secondary)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
