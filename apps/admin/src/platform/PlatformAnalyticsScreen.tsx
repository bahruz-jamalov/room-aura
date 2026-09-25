// /platform/analytics — cross-tenant platform metrics
// (docs/ARCHITECTURE.md section 6), via the platform_analytics RPC
// (migration 00000000000020) since platform admin has no row-level RLS on
// requests/orders across tenants.
import { useEffect, useState } from "react";
import { formatMoney } from "@room-aura/shared";
import { card } from "../lib/styles";
import { supabase } from "../supabase";

interface PlatformStats {
  total_hotels: number;
  active_hotels: number;
  total_requests: number;
  total_orders: number;
  revenue_by_currency: Record<string, number>;
}

export default function PlatformAnalyticsScreen() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("platform_analytics")
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) setError(rpcError.message);
        else setStats(Array.isArray(data) ? data[0] : data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Platform Analytics</h1>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      {!stats ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--ra-space-4)" }}>
          <Kpi label="Total Hotels" value={stats.total_hotels} />
          <Kpi label="Active Hotels" value={stats.active_hotels} />
          <Kpi label="Total Requests" value={stats.total_requests} />
          <Kpi label="Total Orders" value={stats.total_orders} />
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
