// The request tracker — this screen doubles as the "Request sent"
// confirmation (its top state is simply `status: 'new'`) and the live
// ✓✓●○ progress view from docs/ARCHITECTURE.md's "Request Status" section.
// Status changes arrive via Realtime, no polling, no refresh.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { canGuestCancel, trackerStepState, TRACKER_STEPS } from "@room-aura/shared";
import { useFeedback } from "../hooks/useFeedback";
import { useRequestDetail } from "../hooks/useRequestDetail";
import { primaryButton, secondaryButton } from "../lib/styles";
import { statusI18nKey } from "../lib/statusI18n";
import { supabase } from "../supabase";

export default function RequestDetailScreen() {
  const { requestId = "" } = useParams<{ requestId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { request, loading, notFound } = useRequestDetail(requestId);
  const { feedback } = useFeedback(requestId);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!request) return;
    setCancelling(true);
    await supabase.from("requests").update({ status: "cancelled" }).eq("id", request.id);
    setCancelling(false);
  }

  if (loading) {
    return (
      <div style={{ padding: "var(--ra-space-page-gutter)" }}>
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      </div>
    );
  }
  if (notFound || !request) {
    return (
      <div style={{ padding: "var(--ra-space-page-gutter)" }}>
        <p style={{ color: "var(--ra-color-danger)" }}>{t("request.notFound")}</p>
      </div>
    );
  }

  const isCancelled = request.status === "cancelled";

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-6)" }}>
      <div style={{ display: "flex", alignItems: "center", marginTop: "var(--ra-space-4)" }}>
        <button
          onClick={() => navigate("/requests")}
          aria-label={t("common.back")}
          style={{ background: "none", border: "none", fontSize: "var(--ra-text-2xl)", cursor: "pointer", padding: 0 }}
        >
          ←
        </button>
      </div>

      <header style={{ textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--ra-color-text-secondary)" }}>{t("request.requestSent")}</p>
        <h1 style={{ fontSize: "var(--ra-text-xl)", margin: "var(--ra-space-1) 0" }}>{request.number}</h1>
        {request.originalText && (
          <p style={{ color: "var(--ra-color-text-secondary)", fontStyle: "italic" }}>“{request.originalText}”</p>
        )}
      </header>

      {isCancelled ? (
        <p style={{ textAlign: "center", color: "var(--ra-color-danger)", fontWeight: 600 }}>
          {t(statusI18nKey(request.kind, "cancelled"))}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-3)" }}>
          {TRACKER_STEPS.map((step) => {
            const state = trackerStepState(request.status, step);
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-3)" }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "var(--ra-radius-full)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "var(--ra-text-sm)",
                    flexShrink: 0,
                    background: state === "pending" ? "var(--ra-color-surface-sunken)" : "var(--ra-color-accent)",
                    color: state === "pending" ? "var(--ra-color-text-secondary)" : "var(--ra-color-accent-contrast)",
                  }}
                >
                  {state === "done" ? "✓" : state === "active" ? "●" : ""}
                </span>
                <span
                  style={{
                    fontWeight: state === "pending" ? 400 : 600,
                    color: state === "pending" ? "var(--ra-color-text-secondary)" : "var(--ra-color-text-primary)",
                  }}
                >
                  {t(statusI18nKey(request.kind, step))}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!isCancelled && request.estimatedMinutes && request.status !== "completed" && (
        <p style={{ textAlign: "center", color: "var(--ra-color-text-secondary)" }}>
          {t("request.estimatedDelivery")}: {request.estimatedMinutes} {t("common.minutes")}
        </p>
      )}

      {canGuestCancel(request.status) && (
        <button style={secondaryButton} disabled={cancelling} onClick={() => void handleCancel()}>
          {cancelling ? t("common.loading") : t("common.cancel")}
        </button>
      )}

      {request.status === "completed" && !feedback && (
        <button style={primaryButton} onClick={() => navigate(`/requests/${request.id}/feedback`)}>
          {t("feedback.rateExperience")}
        </button>
      )}

      <button style={request.status === "completed" && !feedback ? secondaryButton : primaryButton} onClick={() => navigate("/home")}>
        {t("nav.home")}
      </button>
    </div>
  );
}
