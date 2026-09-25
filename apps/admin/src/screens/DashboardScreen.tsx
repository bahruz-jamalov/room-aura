// KPI cards cover what's real: operational counts from `requests`, Orders
// Today / Revenue Today from real orders (Phase 5), and now Guest Rating /
// Effort Score from real feedback (Phase 7).
import { useNavigate } from "react-router-dom";
import { formatMoney } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useRequestsQueue } from "../hooks/useRequestsQueue";
import { card, statusColors } from "../lib/styles";

export default function DashboardScreen() {
  const { staff } = useAuth();
  const stats = useDashboardStats();
  const { requests } = useRequestsQueue("en");
  const navigate = useNavigate();
  const recent = requests.slice(0, 8);

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: "var(--ra-color-text-secondary)", marginTop: -8 }}>{staff?.hotelName}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--ra-space-4)", margin: "var(--ra-space-6) 0" }}>
        <Kpi label="New Requests" value={stats?.newCount ?? "…"} accent={statusColors.new} />
        <Kpi label="In Progress" value={stats?.inProgressCount ?? "…"} accent={statusColors.in_progress} />
        <Kpi label="Completed Today" value={stats?.completedToday ?? "…"} accent={statusColors.completed} />
        <Kpi
          label="Avg Response Time"
          value={stats?.avgResponseMinutes != null ? `${stats.avgResponseMinutes} min` : "—"}
          accent="var(--ra-color-accent)"
        />
        <Kpi label="Orders Today" value={stats?.ordersToday ?? "…"} />
        <Kpi
          label="Revenue Today"
          value={
            stats && stats.revenueCurrency
              ? formatMoney(stats.revenueTodayMinor, stats.revenueCurrency)
              : stats
                ? "—"
                : "…"
          }
        />
        <Kpi label="Guest Rating" value={stats?.avgRatingToday != null ? stats.avgRatingToday.toFixed(1) : stats ? "—" : "…"} />
        <Kpi label="Effort Score" value={stats?.avgEffortToday != null ? stats.avgEffortToday.toFixed(1) : stats ? "—" : "…"} />
      </div>

      <h2 style={{ fontSize: "var(--ra-text-lg)" }}>Recent requests</h2>
      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Request", "Room", "Department", "Created", "Status"].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No requests yet.
                </td>
              </tr>
            ) : (
              recent.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate("/requests")}
                  style={{ borderTop: "1px solid var(--ra-color-border)", cursor: "pointer" }}
                >
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{r.number}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{r.roomNumber}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{r.departmentName}</td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>
                    {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)" }}>
                    <span style={{ color: statusColors[r.status], fontWeight: 600 }}>{r.status.replace(/_/g, " ")}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ ...card, padding: "var(--ra-space-5)", borderTop: `3px solid ${accent ?? "var(--ra-color-accent)"}` }}>
      <div style={{ fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "var(--ra-text-2xl)", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
