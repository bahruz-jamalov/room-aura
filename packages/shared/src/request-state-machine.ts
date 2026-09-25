// The request/order state machine — docs/ARCHITECTURE.md section 8.
//
// This table MUST stay identical to the `validate_request_status_transition`
// trigger in supabase/migrations/00000000000010_triggers.sql. The database
// is the actual enforcement (it holds regardless of client bugs); this copy
// exists so the UI can grey out impossible actions instead of round-tripping
// to find out a transition is illegal.

import type { RequestKind, RequestStatus } from "./types/enums";

export const ALLOWED_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  new: ["accepted", "cancelled"],
  accepted: ["in_progress", "on_the_way", "completed", "cancelled"],
  in_progress: ["on_the_way", "completed", "cancelled"],
  on_the_way: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Only guests may call this — and only from `new`. Every other transition is staff-only. */
export function canGuestCancel(current: RequestStatus): boolean {
  return current === "new";
}

export const TERMINAL_STATUSES: readonly RequestStatus[] = ["completed", "cancelled"];
export function isTerminal(status: RequestStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

// Same five states, different words — see docs/ARCHITECTURE.md section 8.
// This relabelling is why one state machine covers both service requests
// and food/drink orders.
const STATUS_LABELS: Record<RequestKind, Record<RequestStatus, string>> = {
  service: {
    new: "Request Received",
    accepted: "Accepted",
    in_progress: "In Progress",
    on_the_way: "On the Way",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  freetext: {
    new: "Request Received",
    accepted: "Accepted",
    in_progress: "In Progress",
    on_the_way: "On the Way",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  order: {
    new: "Order Received",
    accepted: "Confirmed",
    in_progress: "Preparing",
    on_the_way: "On the Way",
    completed: "Delivered",
    cancelled: "Cancelled",
  },
};

export function statusLabel(kind: RequestKind, status: RequestStatus): string {
  return STATUS_LABELS[kind][status];
}

/** Ordered steps for the guest-facing ✓✓●○ progress tracker (docs/ARCHITECTURE.md
 *  "Request Status" / "My Requests"). Cancelled requests render separately. */
export const TRACKER_STEPS: readonly RequestStatus[] = ["new", "accepted", "on_the_way", "completed"];

export function trackerStepState(current: RequestStatus, step: RequestStatus): "done" | "active" | "pending" {
  if (current === "cancelled") return "pending";
  const currentIndex = TRACKER_STEPS.indexOf(current);
  const stepIndex = TRACKER_STEPS.indexOf(step);
  // in_progress renders as "active" on the same tracker slot as on_the_way's
  // predecessor step (accepted) until the guest actually sees movement.
  const effectiveCurrentIndex = currentIndex === -1 ? TRACKER_STEPS.indexOf("accepted") : currentIndex;
  if (stepIndex < effectiveCurrentIndex) return "done";
  if (stepIndex === effectiveCurrentIndex) return "active";
  return "pending";
}
