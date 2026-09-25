// "Other Request" — one of ROOM-AURA's most important features. The guest
// types naturally in their own language; we translate it, route it to a
// department by keyword, and store both the original and translated text.
// See docs/ARCHITECTURE.md section 9.
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useGuestSession } from "../guest/GuestSessionContext";
import { resolveFreetextDepartment } from "../lib/departmentRouter";
import { primaryButton } from "../lib/styles";
import { supabase } from "../supabase";
import { translateContent } from "../lib/translate";

export default function OtherRequestScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hotel, room, guestSessionId } = useGuestSession();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !hotel || !room || !guestSessionId) return;
    setSubmitting(true);
    setError(null);

    try {
      const targetLocale = hotel.defaultLocale;
      const translated = await translateContent(trimmed, i18n.language, targetLocale);
      const departmentId = await resolveFreetextDepartment(translated.text);
      if (!departmentId) {
        setError("This hotel hasn't configured where to send this yet. Please contact reception.");
        setSubmitting(false);
        return;
      }

      const { data, error: insertError } = await supabase
        .from("requests")
        .insert({
          hotel_id: hotel.id,
          room_id: room.id,
          guest_session_id: guestSessionId,
          kind: "freetext",
          department_id: departmentId,
          original_text: trimmed,
          original_locale: i18n.language,
          translated_text: translated.text,
          translation_provider: translated.provider,
          translation_is_mock: translated.isMock,
        })
        .select("id")
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      navigate(`/requests/${data.id}`, { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)", marginTop: "var(--ra-space-4)" }}>
        <button
          onClick={() => navigate(-1)}
          aria-label={t("common.back")}
          style={{ background: "none", border: "none", fontSize: "var(--ra-text-2xl)", cursor: "pointer", padding: 0 }}
        >
          ←
        </button>
      </div>

      <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>{t("request.whatDoYouNeed")}</h1>
      <p style={{ color: "var(--ra-color-text-secondary)", margin: 0 }}>{t("request.typeInYourLanguage")}</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
        <textarea
          required
          autoFocus
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: "100%",
            padding: "var(--ra-space-3)",
            border: "1px solid var(--ra-color-border)",
            borderRadius: "var(--ra-radius-control)",
            fontSize: "var(--ra-text-lg)",
            fontFamily: "inherit",
            background: "var(--ra-color-surface)",
            color: "var(--ra-color-text-primary)",
            resize: "vertical",
          }}
        />
        {error && (
          <p style={{ color: "var(--ra-color-danger)", margin: 0 }} role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting || !text.trim()} style={primaryButton}>
          {submitting ? t("common.loading") : t("request.sendRequest")}
        </button>
      </form>
    </div>
  );
}
