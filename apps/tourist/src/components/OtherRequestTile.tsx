// A fixed tile, not hotel-controlled data — "Other Request" always exists
// so a guest can ask for anything in their own language. See
// docs/ARCHITECTURE.md's "Free-Text Request" section.
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { card } from "../lib/styles";

export default function OtherRequestTile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/request/other")}
      style={{
        ...card,
        minHeight: 120,
        padding: "var(--ra-space-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--ra-space-2)",
        cursor: "pointer",
        border: "1px dashed var(--ra-color-accent)",
        width: "100%",
      }}
    >
      <span style={{ fontSize: "var(--ra-text-3xl)" }}>{"\u{1F4AC}"}</span>
      <span style={{ fontWeight: 600, textAlign: "center" }}>{t("request.otherRequest")}</span>
    </button>
  );
}
