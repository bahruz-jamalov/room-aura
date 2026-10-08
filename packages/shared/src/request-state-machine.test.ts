import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  canGuestCancel,
  canTransition,
  isTerminal,
  statusLabel,
  trackerStepState,
} from "./request-state-machine";
import type { RequestStatus } from "./types/enums";

describe("canTransition", () => {
  it("allows every transition listed in ALLOWED_TRANSITIONS", () => {
    for (const [from, tos] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const to of tos) {
        expect(canTransition(from as RequestStatus, to)).toBe(true);
      }
    }
  });

  it("allows a status to transition to itself (no-op)", () => {
    expect(canTransition("in_progress", "in_progress")).toBe(true);
  });

  it("rejects skipping backwards or resurrecting a terminal status", () => {
    expect(canTransition("on_the_way", "new")).toBe(false);
    expect(canTransition("completed", "accepted")).toBe(false);
    expect(canTransition("cancelled", "new")).toBe(false);
  });

  it("treats completed and cancelled as dead ends", () => {
    expect(ALLOWED_TRANSITIONS.completed).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS.cancelled).toHaveLength(0);
  });
});

describe("canGuestCancel", () => {
  it("only allows cancelling from 'new'", () => {
    expect(canGuestCancel("new")).toBe(true);
    expect(canGuestCancel("accepted")).toBe(false);
    expect(canGuestCancel("completed")).toBe(false);
  });
});

describe("isTerminal", () => {
  it("flags completed and cancelled, nothing else", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("new")).toBe(false);
    expect(isTerminal("on_the_way")).toBe(false);
  });
});

describe("statusLabel", () => {
  it("uses order-specific wording for order kind", () => {
    expect(statusLabel("order", "new")).toBe("Order Received");
    expect(statusLabel("order", "completed")).toBe("Delivered");
  });

  it("uses the shared wording for service and freetext kinds", () => {
    expect(statusLabel("service", "new")).toBe("Request Received");
    expect(statusLabel("freetext", "completed")).toBe("Completed");
  });
});

describe("trackerStepState", () => {
  it("marks earlier steps done, the current step active, later steps pending", () => {
    expect(trackerStepState("accepted", "new")).toBe("done");
    expect(trackerStepState("accepted", "accepted")).toBe("active");
    expect(trackerStepState("accepted", "on_the_way")).toBe("pending");
    expect(trackerStepState("accepted", "completed")).toBe("pending");
  });

  it("renders in_progress on the same slot as accepted", () => {
    expect(trackerStepState("in_progress", "accepted")).toBe("active");
    expect(trackerStepState("in_progress", "new")).toBe("done");
  });

  it("marks every step pending once cancelled", () => {
    expect(trackerStepState("cancelled", "new")).toBe("pending");
    expect(trackerStepState("cancelled", "completed")).toBe("pending");
  });

  it("marks every step done once completed", () => {
    expect(trackerStepState("completed", "new")).toBe("done");
    expect(trackerStepState("completed", "on_the_way")).toBe("done");
    expect(trackerStepState("completed", "completed")).toBe("active");
  });
});
