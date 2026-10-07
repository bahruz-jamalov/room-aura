// The most important screen in the admin — accept, assign, set an ETA,
// advance status, add a note, or cancel. Every status button is derived
// from ALLOWED_TRANSITIONS (packages/shared/src/request-state-machine.ts),
// the same table the database trigger enforces, so this can never offer an
// action the backend would reject.
import { useState } from "react";
import { ALLOWED_TRANSITIONS, formatMoney, type RequestStatus } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import { useRequestHistory } from "../hooks/useRequestHistory";
import { useStaffInDepartment } from "../hooks/useStaffInDepartment";
import type { QueueRequest } from "../hooks/useRequestsQueue";
import { dangerButton, primaryButton, secondaryButton, selectInput, statusColors, textInput } from "../lib/styles";
import { supabase } from "../supabase";

const STATUS_TRANSITION_LABELS: Record<RequestStatus, string> = {
  new: "Reopen",
  accepted: "Accept",
  in_progress: "Start",
  on_the_way: "Mark On the Way",
  completed: "Complete",
  cancelled: "Cancel",
};

export default function RequestDetailPanel({ request, onClose }: { request: QueueRequest; onClose: () => void }) {
  const { staff } = useAuth();
  const history = useRequestHistory(request.id);
  const staffOptions = useStaffInDepartment(request.departmentId);
  const [assignee, setAssignee] = useState(request.assignedTo ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(request.estimatedMinutes?.toString() ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const nextStatuses = ALLOWED_TRANSITIONS[request.status].filter((s) => s !== "cancelled");
  const canCancel = ALLOWED_TRANSITIONS[request.status].includes("cancelled");

  async function transitionTo(status: RequestStatus) {
    setBusy(true);
    await supabase.from("requests").update({ status }).eq("id", request.id);
    setBusy(false);
  }

  async function handleAssign() {
    if (!assignee || !staff) return;
    setBusy(true);
    await supabase.from("requests").update({ assigned_to: assignee }).eq("id", request.id);
    const assignedName = staffOptions.find((s) => s.id === assignee)?.fullName ?? "staff";
    await supabase.from("request_status_history").insert({
      request_id: request.id,
      hotel_id: staff.hotelId,
      event_type: "assignment",
      actor_type: "staff",
      actor_staff_id: staff.id,
      note: `Assigned to ${assignedName}`,
    });
    setBusy(false);
  }

  async function handleSetEstimate() {
    const minutes = parseInt(estimatedMinutes, 10);
    if (Number.isNaN(minutes) || minutes <= 0) return;
    setBusy(true);
    await supabase.from("requests").update({ estimated_minutes: minutes }).eq("id", request.id);
    setBusy(false);
  }

  async function handleAddNote() {
    if (!note.trim() || !staff) return;
    setBusy(true);
    await supabase.from("request_status_history").insert({
      request_id: request.id,
      hotel_id: staff.hotelId,
      event_type: "note",
      actor_type: "staff",
      actor_staff_id: staff.id,
      note: note.trim(),
    });
    setNote("");
    setBusy(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        // See SidePanel.tsx: starts below AdminLayout's TopBar (~43px) so
        // the topbar (raised above --ra-z-modal for the Sign-out fix) can't
        // paint over this panel's own title/close button and swallow the
        // click — same bug, found while testing Phase 6's SidePanel.
        top: 44,
        right: 0,
        bottom: 0,
        width: 420,
        maxWidth: "100vw",
        background: "var(--ra-color-surface)",
        borderLeft: "1px solid var(--ra-color-border)",
        boxShadow: "var(--ra-shadow-lg)",
        overflowY: "auto",
        zIndex: "var(--ra-z-modal)",
        padding: "var(--ra-space-6)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--ra-space-4)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "var(--ra-text-xl)" }}>{request.number}</h2>
          <span style={{ color: statusColors[request.status], fontWeight: 600, fontSize: "var(--ra-text-sm)" }}>
            {request.status.replace(/_/g, " ")}
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "var(--ra-text-xl)", cursor: "pointer" }}>
          ×
        </button>
      </div>

      <Field label="Room" value={request.roomNumber} />
      <Field label="Department" value={request.departmentName} />
      {request.serviceName && <Field label="Service" value={`${request.serviceName} × ${request.quantity}`} />}
      {request.requestedFor && (
        <Field
          label="Requested for"
          value={new Date(request.requestedFor).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
        />
      )}
      {request.guestNote && <Field label="Guest note" value={request.guestNote} />}
      {request.kind === "order" && (
        <>
          {request.orderSummary && <Field label="Items" value={request.orderSummary} />}
          {request.orderTotalMinor != null && request.orderCurrency && (
            <Field label="Total" value={formatMoney(request.orderTotalMinor, request.orderCurrency)} />
          )}
          {request.orderPaymentMethod && (
            <Field label="Payment method" value={request.orderPaymentMethod === "charge_to_room" ? "Charge to Room" : "Pay at Hotel"} />
          )}
        </>
      )}

      {request.kind === "freetext" && (
        <div style={{ margin: "var(--ra-space-4) 0" }}>
          <SectionTitle>Original ({request.originalLocale})</SectionTitle>
          <p style={{ margin: "0 0 var(--ra-space-3)" }}>{request.originalText}</p>
          <SectionTitle>
            Translated
            {request.translationIsMock && (
              <span
                style={{
                  marginLeft: "var(--ra-space-2)",
                  background: "#fef3c7",
                  color: "#92400e",
                  fontSize: "var(--ra-text-xs)",
                  fontWeight: 700,
                  padding: "1px 8px",
                  borderRadius: "var(--ra-radius-full)",
                }}
              >
                Mock translation
              </span>
            )}
          </SectionTitle>
          <p style={{ margin: 0 }}>{request.translatedText}</p>
        </div>
      )}

      <SectionTitle>Actions</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ra-space-2)", marginBottom: "var(--ra-space-5)" }}>
        {nextStatuses.map((status) => (
          <button key={status} disabled={busy} style={primaryButton} onClick={() => void transitionTo(status)}>
            {STATUS_TRANSITION_LABELS[status]}
          </button>
        ))}
        {canCancel && (
          <button disabled={busy} style={dangerButton} onClick={() => void transitionTo("cancelled")}>
            Cancel
          </button>
        )}
      </div>

      <SectionTitle>Assign employee</SectionTitle>
      <div style={{ display: "flex", gap: "var(--ra-space-2)", marginBottom: "var(--ra-space-5)" }}>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={selectInput}>
          <option value="">Unassigned</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
        <button disabled={busy || !assignee} style={secondaryButton} onClick={() => void handleAssign()}>
          Save
        </button>
      </div>

      <SectionTitle>Estimated time (minutes)</SectionTitle>
      <div style={{ display: "flex", gap: "var(--ra-space-2)", marginBottom: "var(--ra-space-5)" }}>
        <input
          type="number"
          min={1}
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          style={textInput}
        />
        <button disabled={busy} style={secondaryButton} onClick={() => void handleSetEstimate()}>
          Save
        </button>
      </div>

      <SectionTitle>Add internal note</SectionTitle>
      <div style={{ display: "flex", gap: "var(--ra-space-2)", marginBottom: "var(--ra-space-5)" }}>
        <input value={note} onChange={(e) => setNote(e.target.value)} style={textInput} placeholder="Note for other staff…" />
        <button disabled={busy || !note.trim()} style={secondaryButton} onClick={() => void handleAddNote()}>
          Add
        </button>
      </div>

      <SectionTitle>Timeline</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-2)" }}>
        {history.map((h) => (
          <div key={h.id} style={{ fontSize: "var(--ra-text-sm)", borderBottom: "1px solid var(--ra-color-border)", paddingBottom: "var(--ra-space-2)" }}>
            <div style={{ color: "var(--ra-color-text-secondary)", fontSize: "var(--ra-text-xs)" }}>
              {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {h.actorName ? ` · ${h.actorName}` : h.actorType === "guest" ? " · Guest" : ""}
            </div>
            <div>
              {h.eventType === "status_change" && (h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Created (${h.toStatus})`)}
              {h.eventType === "note" && h.note}
              {h.eventType === "assignment" && h.note}
              {h.eventType === "estimate" && h.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "var(--ra-space-2)" }}>
      <span style={{ color: "var(--ra-color-text-secondary)", fontSize: "var(--ra-text-xs)" }}>{label}</span>
      <div>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: "var(--ra-text-sm)", textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ra-color-text-secondary)", marginBottom: "var(--ra-space-2)" }}>
      {children}
    </h3>
  );
}
