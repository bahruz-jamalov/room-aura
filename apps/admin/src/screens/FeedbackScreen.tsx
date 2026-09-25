// /feedback — ratings, effort scores, comments, filterable
// (docs/ARCHITECTURE.md section 6). Admin/manager only.
import { useMemo, useState } from "react";
import { useDepartments } from "../hooks/useDepartments";
import { useFeedbackAdmin } from "../hooks/useFeedbackAdmin";
import { card, selectInput } from "../lib/styles";

function Stars({ value }: { value: number }) {
  return (
    <span style={{ color: "var(--ra-color-accent)", letterSpacing: 2 }}>
      {"★".repeat(value)}
      <span style={{ color: "var(--ra-color-border)" }}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default function FeedbackScreen() {
  const { feedback, loading } = useFeedbackAdmin();
  const departments = useDepartments();
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [minRating, setMinRating] = useState(0);

  const filtered = feedback.filter(
    (f) => (!departmentFilter || f.departmentName === departments.find((d) => d.id === departmentFilter)?.name) && f.rating >= minRating,
  );

  const summary = useMemo(() => {
    if (filtered.length === 0) return null;
    const avgRating = filtered.reduce((sum, f) => sum + f.rating, 0) / filtered.length;
    const avgEffort = filtered.reduce((sum, f) => sum + f.effortScore, 0) / filtered.length;
    return { avgRating, avgEffort, count: filtered.length };
  }, [filtered]);

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Feedback</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--ra-space-4)", margin: "var(--ra-space-6) 0" }}>
        <div style={{ ...card, padding: "var(--ra-space-5)" }}>
          <div style={{ fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)", textTransform: "uppercase" }}>Avg Rating</div>
          <div style={{ fontSize: "var(--ra-text-2xl)", fontWeight: 700 }}>{summary ? summary.avgRating.toFixed(1) : "—"}</div>
        </div>
        <div style={{ ...card, padding: "var(--ra-space-5)" }}>
          <div style={{ fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)", textTransform: "uppercase" }}>Avg Effort</div>
          <div style={{ fontSize: "var(--ra-text-2xl)", fontWeight: 700 }}>{summary ? summary.avgEffort.toFixed(1) : "—"}</div>
        </div>
        <div style={{ ...card, padding: "var(--ra-space-5)" }}>
          <div style={{ fontSize: "var(--ra-text-xs)", color: "var(--ra-color-text-secondary)", textTransform: "uppercase" }}>Responses</div>
          <div style={{ fontSize: "var(--ra-text-2xl)", fontWeight: 700 }}>{summary?.count ?? 0}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "var(--ra-space-3)", marginBottom: "var(--ra-space-4)" }}>
        <select style={{ ...selectInput, width: 200 }} value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select style={{ ...selectInput, width: 160 }} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
          <option value={0}>Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}+ stars
            </option>
          ))}
        </select>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Request", "Room", "Department", "Rating", "Effort", "Comment", "Date"].map((h) => (
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No feedback yet.
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{f.requestNumber}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{f.roomNumber}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{f.departmentName}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>
                    <Stars value={f.rating} />
                  </td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{f.effortScore} / 5</td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)", maxWidth: 260 }}>{f.comment ?? "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)", whiteSpace: "nowrap" }}>
                    {new Date(f.createdAt).toLocaleDateString()}
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
