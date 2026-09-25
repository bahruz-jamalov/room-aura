// /requests/:id/feedback — docs/ARCHITECTURE.md section 5:
// "★1–5 satisfaction → 1–5 effort → optional comment". Only reachable for a
// completed request (RequestDetailScreen only links here once completed),
// and RLS enforces the same rule server-side regardless of what the client
// shows ("guest creates feedback for own completed request").
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useFeedback } from "../hooks/useFeedback";
import { useGuestSession } from "../guest/GuestSessionContext";
import { primaryButton, textInput } from "../lib/styles";
import { supabase } from "../supabase";

export default function FeedbackScreen() {
  const { requestId = "" } = useParams<{ requestId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { guestSessionId, hotel } = useGuestSession();
  const { feedback, loading } = useFeedback(requestId);
  const [rating, setRating] = useState(0);
  const [effortScore, setEffortScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!guestSessionId || !hotel || rating === 0 || effortScore === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({
      request_id: requestId,
      hotel_id: hotel.id,
      guest_session_id: guestSessionId,
      rating,
      effort_score: effortScore,
      comment: comment.trim() || null,
      locale: i18n.language,
    });
    setSubmitting(false);
    if (!error) setSubmitted(true);
  }

  if (loading) {
    return (
      <div style={{ padding: "var(--ra-space-page-gutter)" }}>
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  const alreadyRated = Boolean(feedback);

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-6)" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          style={{ background: "none", border: "none", fontSize: "var(--ra-text-2xl)", cursor: "pointer", padding: 0 }}
        >
          ←
        </button>
      </div>

      {submitted || alreadyRated ? (
        <div style={{ textAlign: "center", padding: "var(--ra-space-8) 0" }}>
          <p style={{ fontSize: "var(--ra-text-xl)", fontWeight: 700 }}>{t("feedback.thankYou")}</p>
        </div>
      ) : (
        <>
          <StarPicker label={t("feedback.howWasExperience")} value={rating} onChange={setRating} />
          <StarPicker label={t("feedback.howEasy")} value={effortScore} onChange={setEffortScore} />

          <div>
            <textarea
              style={{ ...textInput, minHeight: 88, paddingTop: "var(--ra-space-3)", resize: "vertical" }}
              placeholder={t("feedback.optionalComment")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button
            style={{ ...primaryButton, opacity: rating === 0 || effortScore === 0 ? 0.5 : 1 }}
            disabled={submitting || rating === 0 || effortScore === 0}
            onClick={() => void handleSubmit()}
          >
            {submitting ? t("common.loading") : t("feedback.submit")}
          </button>
        </>
      )}
    </div>
  );
}

function StarPicker({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontWeight: 600, marginBottom: "var(--ra-space-3)" }}>{label}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: "var(--ra-space-2)" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-label={`${n}`}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 36,
              lineHeight: 1,
              padding: "var(--ra-space-1)",
              minWidth: "var(--ra-min-target)",
              minHeight: "var(--ra-min-target)",
              color: n <= value ? "var(--ra-color-accent)" : "var(--ra-color-border)",
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
