// /platform/hotels/:id — rooms, request volume, order volume, usage
// (docs/ARCHITECTURE.md section 6). Platform admin has no row-level RLS on
// requests/orders (deliberately — "not the right to read an individual
// guest's messages"), so this calls the platform_hotel_stats RPC
// (migration 00000000000020) instead of querying those tables directly.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatMoney } from "@room-aura/shared";
import { card, secondaryButton } from "../lib/styles";
import { supabase } from "../supabase";
import type { PlatformHotel } from "./usePlatformHotels";

interface HotelStats {
  room_count: number;
  request_count: number;
  completed_count: number;
  order_count: number;
  revenue_by_currency: Record<string, number>;
}

export default function PlatformHotelDetailScreen() {
  const { hotelId = "" } = useParams<{ hotelId: string }>();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<PlatformHotel | null>(null);
  const [stats, setStats] = useState<HotelStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: hotelRow }, { data: statsRows, error: rpcError }] = await Promise.all([
        supabase.from("hotels").select("id, slug, name, city, country, currency, status, plan").eq("id", hotelId).single(),
        supabase.rpc("platform_hotel_stats", { p_hotel_id: hotelId }),
      ]);
      if (cancelled) return;
      setHotel(hotelRow ?? null);
      if (rpcError) setError(rpcError.message);
      else setStats(Array.isArray(statsRows) ? statsRows[0] : statsRows);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  if (!hotel) return <p style={{ color: "var(--ra-color-text-secondary)" }}>Loading…</p>;

  return (
    <div>
      <button style={{ ...secondaryButton, marginBottom: "var(--ra-space-4)" }} onClick={() => navigate("/platform/hotels")}>
        ← All Hotels
      </button>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>{hotel.name}</h1>
      <p style={{ color: "var(--ra-color-text-secondary)", marginTop: "calc(var(--ra-space-2) * -1)" }}>
        {hotel.city}, {hotel.country} · {hotel.status} · {hotel.plan}
      </p>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--ra-space-4)" }}>
          <Kpi label="Rooms" value={stats.room_count} />
          <Kpi label="Total Requests" value={stats.request_count} />
          <Kpi label="Completed" value={stats.completed_count} />
          <Kpi label="Orders" value={stats.order_count} />
          {Object.entries(stats.revenue_by_currency).map(([currency, minor]) => (
            <Kpi key={currency} label={`Revenue (${currency})`} value={formatMoney(minor, currency)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ ...card, padding: "var(--ra-space-5)" }}>
      <div style={{ fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "var(--ra-text-2xl)", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
