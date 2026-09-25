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

  useEffect(() => {
    let cancelled = false;
    // No .eq() needed — RLS already scopes this to the guest's own hotel.
    supabase
      .from("hotel_settings")
      .select("about, address, contact_phone, checkin_time, checkout_time")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSettings({
          about: data.about,
          address: data.address,
          contactPhone: data.contact_phone,
          checkinTime: data.checkin_time,
          checkoutTime: data.checkout_time,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <header style={{ textAlign: "center", margin: "var(--ra-space-6) 0" }}>
        {hotel?.logoUrl && <img src={hotel.logoUrl} alt={hotel.name} style={{ height: 48 }} />}
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "var(--ra-space-2) 0 0" }}>{hotel?.name}</h1>
      </header>

      {settings?.about && (
        <div style={{ ...card, padding: "var(--ra-space-4)" }}>
          <p style={{ margin: 0 }}>{settings.about}</p>
        </div>
      )}

      <div style={{ ...card, padding: "var(--ra-space-4)", display: "flex", flexDirection: "column", gap: "var(--ra-space-2)" }}>
        {settings?.address && <Row label="Address" value={settings.address} />}
        {settings?.contactPhone && <Row label="Phone" value={settings.contactPhone} />}
        {settings?.checkinTime && <Row label="Check-in" value={settings.checkinTime} />}
        {settings?.checkoutTime && <Row label="Check-out" value={settings.checkoutTime} />}
      </div>

      {!settings?.about && !settings?.address && (
        <p style={{ color: "var(--ra-color-text-secondary)", textAlign: "center" }}>{t("common.loading")}</p>
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
