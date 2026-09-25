import { useMemo, useState } from "react";
import type { RequestStatus } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import RequestDetailPanel from "../components/RequestDetailPanel";
import { useDepartments } from "../hooks/useDepartments";
import { useRequestsQueue } from "../hooks/useRequestsQueue";
import { card, selectInput, statusColors, textInput } from "../lib/styles";

const STATUS_OPTIONS: RequestStatus[] = ["new", "accepted", "in_progress", "on_the_way", "completed", "cancelled"];

export default function RequestsScreen() {
  const { staff, isAdminOrManager } = useAuth();
  const { requests, loading } = useRequestsQueue("en");
  const departments = useDepartments();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [roomFilter, setRoomFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (statusFilter && r.status !== statusFilter) return false;
        if (departmentFilter && r.departmentId !== departmentFilter) return false;
        if (roomFilter && !r.roomNumber.toLowerCase().includes(roomFilter.toLowerCase())) return false;
        return true;
      }),
    [requests, statusFilter, departmentFilter, roomFilter],
  );

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Requests</h1>
      {!isAdminOrManager && staff?.departmentName && (
        <p style={{ color: "var(--ra-color-text-secondary)", marginTop: -8 }}>
          Showing {staff.departmentName} requests only.
        </p>
      )}

      <div style={{ display: "flex", gap: "var(--ra-space-3)", marginBottom: "var(--ra-space-4)" }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...selectInput, width: 180 }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        {isAdminOrManager && (
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} style={{ ...selectInput, width: 200 }}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        <input
          placeholder="Room…"
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          style={{ ...textInput, width: 140 }}
        />
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Request", "Room", "Service / Message", "Department", "Created", "Status", "Assigned"].map((h) => (
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
                  No requests match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{ borderTop: "1px solid var(--ra-color-border)", cursor: "pointer" }}
                >
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{r.number}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{r.roomNumber}</td>
                  <td style={{ padding: "var(--ra-space-3)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.serviceName ?? r.orderSummary ?? r.translatedText ?? r.originalText ?? "—"}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{r.departmentName}</td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>
                    {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)" }}>
                    <span style={{ color: statusColors[r.status], fontWeight: 600 }}>{r.status.replace(/_/g, " ")}</span>
                  </td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>
                    {r.assignedToName ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <RequestDetailPanel request={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
