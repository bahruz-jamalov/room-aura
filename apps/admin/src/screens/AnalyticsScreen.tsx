// /analytics — operational · guest experience · commercial;
// Today/7/30/custom (docs/ARCHITECTURE.md section 6). Admin/manager only.
import { useMemo, useState } from "react";
import { formatMoney } from "@room-aura/shared";
import { useAnalytics } from "../hooks/useAnalytics";
import { card, secondaryButton, textInput } from "../lib/styles";

type RangePreset = "today" | "7" | "30" | "custom";

function rangeFor(preset: RangePreset, customFrom: string, customTo: string): { from: Date; to: Date } {
  const now = new Date();
  if (preset === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(`${customTo}T23:59:59.999`) };
  }
  const from = new Date(now);
  if (preset === "today") from.setHours(0, 0, 0, 0);
  else if (preset === "7") from.setDate(from.getDate() - 7);
  else if (preset === "30") from.setDate(from.getDate() - 30);
  return { from, to: now };
}

export default function AnalyticsScreen() {
  const [preset, setPreset] = useState<RangePreset>("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  // Memoized on the inputs that should actually change the range — not
  // recomputed on every render, which previously created a fresh `now`
  // (and therefore a new `to` a few milliseconds later) on every render,
  // sending useAnalytics's dependency array into an infinite refetch loop.
  const { from, to } = useMemo(() => rangeFor(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const { data, loading } = useAnalytics(from, to);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>Analytics</h1>
        <div style={{ display: "flex", gap: "var(--ra-space-2)", alignItems: "center" }}>
          {(["today", "7", "30", "custom"] as const).map((p) => (
            <button
              key={p}
              style={{ ...secondaryButton, background: preset === p ? "var(--ra-color-accent-soft)" : undefined }}
              onClick={() => setPreset(p)}
            >
              {p === "today" ? "Today" : p === "7" ? "7 days" : p === "30" ? "30 days" : "Custom"}
            </button>
          ))}
          {preset === "custom" && (
            <>
              <input style={{ ...textInput, width: 150 }} type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <input style={{ ...textInput, width: 150 }} type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {loading || !data ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-6)" }}>
          <Section title="Operational">
            <Kpi label="Total Requests" value={data.totalRequests} />
            <Kpi label="Completed" value={data.completedCount} />
            <Kpi label="Cancelled" value={data.cancelledCount} />
            <Kpi label="Avg Response Time" value={data.avgResponseMinutes != null ? `${data.avgResponseMinutes} min` : "—"} />
            <Kpi label="Avg Resolution Time" value={data.avgResolutionMinutes != null ? `${data.avgResolutionMinutes} min` : "—"} />
          </Section>

          {data.byDepartment.length > 0 && (
            <div style={{ ...card, padding: "var(--ra-space-5)" }}>
              <h3 style={{ margin: "0 0 var(--ra-space-3)", fontSize: "var(--ra-text-sm)", textTransform: "uppercase", color: "var(--ra-color-text-secondary)" }}>
                Requests by Department
              </h3>
              {data.byDepartment.map((d) => (
                <div key={d.name} style={{ display: "flex", justifyContent: "space-between", padding: "var(--ra-space-2) 0", borderTop: "1px solid var(--ra-color-border)" }}>
                  <span>{d.name}</span>
                  <span style={{ fontWeight: 600 }}>{d.count}</span>
                </div>
              ))}
            </div>
          )}

          <Section title="Guest Experience">
            <Kpi label="Avg Rating" value={data.avgRating != null ? data.avgRating.toFixed(1) : "—"} />
            <Kpi label="Avg Effort Score" value={data.avgEffort != null ? data.avgEffort.toFixed(1) : "—"} />
            <Kpi label="Responses" value={data.feedbackCount} />
          </Section>

          <Section title="Commercial">
            <Kpi label="Orders" value={data.orderCount} />
            <Kpi label="Revenue" value={data.revenueCurrency ? formatMoney(data.revenueMinor, data.revenueCurrency) : "—"} />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: "var(--ra-text-lg)", marginBottom: "var(--ra-space-3)" }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--ra-space-4)" }}>{children}</div>
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
