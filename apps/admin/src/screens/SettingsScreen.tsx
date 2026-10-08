// /settings — hotel_settings (docs/ARCHITECTURE.md section 6, nav item
// previously a disabled placeholder). Only the "Explore the City" routing
// field exists for now: which of this hotel's own departments fulfils a
// booking/order against the shared global catalogue (00000000000029_
// global_catalog.sql) — a global shop has no department of its own, so
// every hotel picks one here.
import { useEffect, useState } from "react";
import { permissions } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import { useDepartments } from "../hooks/useDepartments";
import { card, primaryButton, selectInput } from "../lib/styles";
import { supabase } from "../supabase";

export default function SettingsScreen() {
  const { staff } = useAuth();
  const canEdit = staff ? permissions.canManageHotelSettings(staff) : false;
  const departments = useDepartments();
  const [cityServicesDepartmentId, setCityServicesDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!staff) return;
    supabase
      .from("hotel_settings")
      .select("city_services_department_id")
      .eq("hotel_id", staff.hotelId)
      .single()
      .then(({ data }) => {
        setCityServicesDepartmentId(data?.city_services_department_id ?? "");
        setLoading(false);
      });
  }, [staff]);

  async function handleSave() {
    if (!staff) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error: updateError } = await supabase
      .from("hotel_settings")
      .update({ city_services_department_id: cityServicesDepartmentId || null })
      .eq("hotel_id", staff.hotelId);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
  }

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Settings</h1>

      <div style={{ ...card, padding: "var(--ra-space-5)", maxWidth: 480 }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", marginTop: 0 }}>Explore the City</h2>
        <p style={{ color: "var(--ra-color-text-secondary)", fontSize: "var(--ra-text-sm)" }}>
          Bookings and orders placed against the shared "Explore the City" catalogue (Pharmacy, Electronics Store, Travel Companies, …) have no
          department of their own — pick which of your departments coordinates them.
        </p>

        {loading ? (
          <p style={{ color: "var(--ra-color-text-secondary)" }}>Loading…</p>
        ) : (
          <>
            <select
              style={{ ...selectInput, width: "100%", marginBottom: "var(--ra-space-4)" }}
              value={cityServicesDepartmentId}
              disabled={!canEdit}
              onChange={(e) => setCityServicesDepartmentId(e.target.value)}
            >
              <option value="">(not configured — these requests will fail)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}
            {saved && !error && (
              <div style={{ color: "var(--ra-color-success)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>Saved.</div>
            )}

            {canEdit && (
              <button style={primaryButton} disabled={busy} onClick={() => void handleSave()}>
                {busy ? "Saving…" : "Save"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
