// /platform/hotels — list · create · activate/deactivate · plan
// (docs/ARCHITECTURE.md section 6).
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HotelPlan, HotelStatus } from "@room-aura/shared";
import { SUPPORTED_LANGUAGES } from "@room-aura/shared";
import SidePanel, { FormField } from "../components/SidePanel";
import { card, primaryButton, secondaryButton, selectInput, textInput } from "../lib/styles";
import { supabase } from "../supabase";
import { usePlatformHotels, type PlatformHotel } from "./usePlatformHotels";

const STATUS_LABELS: Record<HotelStatus, string> = { active: "Active", inactive: "Inactive", trial: "Trial" };
const PLAN_LABELS: Record<HotelPlan, string> = { pilot: "Pilot", pro: "Pro", enterprise: "Enterprise" };

export default function PlatformHotelsScreen() {
  const { hotels, loading, reload } = usePlatformHotels();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(hotel: PlatformHotel, status: HotelStatus) {
    const { error: updateError } = await supabase.from("hotels").update({ status }).eq("id", hotel.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setError(null);
    await reload();
  }

  async function handlePlanChange(hotel: PlatformHotel, plan: HotelPlan) {
    const { error: updateError } = await supabase.from("hotels").update({ plan }).eq("id", hotel.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setError(null);
    await reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>Hotels</h1>
        <button style={primaryButton} onClick={() => setCreating(true)}>
          + Create Hotel
        </button>
      </div>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Name", "City", "Country", "Currency", "Status", "Plan", ""].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : (
              hotels.map((h) => (
                <tr key={h.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600, cursor: "pointer" }} onClick={() => navigate(`/platform/hotels/${h.id}`)}>
                    {h.name}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{h.city}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{h.country}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{h.currency}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>
                    <select style={selectInput} value={h.status} onChange={(e) => void handleStatusChange(h, e.target.value as HotelStatus)}>
                      {(Object.keys(STATUS_LABELS) as HotelStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "var(--ra-space-3)" }}>
                    <select style={selectInput} value={h.plan} onChange={(e) => void handlePlanChange(h, e.target.value as HotelPlan)}>
                      {(Object.keys(PLAN_LABELS) as HotelPlan[]).map((p) => (
                        <option key={p} value={p}>
                          {PLAN_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right" }}>
                    <button style={secondaryButton} onClick={() => navigate(`/platform/hotels/${h.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateHotelForm
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function CreateHotelForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [defaultLocale, setDefaultLocale] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !slug.trim() || !city.trim() || !country.trim()) return;
    setBusy(true);
    setError(null);

    const { data: hotel, error: insertError } = await supabase
      .from("hotels")
      .insert({
        slug: slug.trim(),
        name: name.trim(),
        city: city.trim(),
        country: country.trim(),
        currency: currency.toUpperCase(),
        default_locale: defaultLocale,
        supported_locales: [defaultLocale],
        status: "trial",
        plan: "pilot",
      })
      .select("id")
      .single();

    if (insertError || !hotel) {
      setBusy(false);
      setError(insertError?.message.includes("duplicate") ? "That slug is already taken." : (insertError?.message ?? "Couldn't create hotel."));
      return;
    }

    const { error: settingsError } = await supabase.from("hotel_settings").insert({ hotel_id: hotel.id });
    setBusy(false);
    if (settingsError) {
      setError(settingsError.message);
      return;
    }
    onCreated();
  }

  return (
    <SidePanel title="Create Hotel" onClose={onClose}>
      <FormField label="Name">
        <input style={textInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coastal Retreat" />
      </FormField>
      <FormField label="Slug">
        <input
          style={textInput}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder="e.g. coastal-retreat"
        />
      </FormField>
      <FormField label="City">
        <input style={textInput} value={city} onChange={(e) => setCity(e.target.value)} />
      </FormField>
      <FormField label="Country">
        <input style={textInput} value={country} onChange={(e) => setCountry(e.target.value)} />
      </FormField>
      <FormField label="Currency (ISO code)">
        <input style={textInput} value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value)} />
      </FormField>
      <FormField label="Default language">
        <select style={selectInput} value={defaultLocale} onChange={(e) => setDefaultLocale(e.target.value)}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </FormField>

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button
        style={primaryButton}
        disabled={busy || !name.trim() || !slug.trim() || !city.trim() || !country.trim()}
        onClick={() => void handleSubmit()}
      >
        {busy ? "Creating…" : "Create"}
      </button>
    </SidePanel>
  );
}
