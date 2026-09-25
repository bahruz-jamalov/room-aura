import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isTerminal, statusLabel } from "@room-aura/shared";
import { useGuestSession } from "../guest/GuestSessionContext";
import { useMyRequests } from "../hooks/useMyRequests";
import { card } from "../lib/styles";

export default function MyRequestsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { guestSessionId, hotel } = useGuestSession();
  const { requests, loading } = useMyRequests(guestSessionId, i18n.language, hotel?.defaultLocale ?? "en");
  const [tab, setTab] = useState<"active" | "completed">("active");

  const filtered = requests.filter((r) => (tab === "active" ? !isTerminal(r.status) : isTerminal(r.status)));

  return (
    <div style={{ padding: "var(--ra-space-page-gutter)", display: "flex", flexDirection: "column", gap: "var(--ra-space-4)" }}>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: "var(--ra-space-4) 0 0" }}>{t("nav.myRequests")}</h1>

      <div style={{ display: "flex", gap: "var(--ra-space-2)" }}>
        {(["active", "completed"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            style={{
              flex: 1,
              minHeight: "var(--ra-min-target)",
              borderRadius: "var(--ra-radius-control)",
              border: tab === tabKey ? "2px solid var(--ra-color-accent)" : "1px solid var(--ra-color-border)",
              background: tab === tabKey ? "var(--ra-color-accent-soft)" : "var(--ra-color-surface)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t(`myRequests.${tabKey}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--ra-color-text-secondary)" }}>{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--ra-color-text-secondary)", textAlign: "center", marginTop: "var(--ra-space-16)" }}>
          —
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ra-space-3)" }}>
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/requests/${r.id}`)}
              style={{
                ...card,
                padding: "var(--ra-space-4)",
                textAlign: "left",
                cursor: "pointer",
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--ra-space-3)",
              }}
            >
              <div>
                <strong>{r.displayText}</strong>
                <p style={{ margin: "var(--ra-space-1) 0 0", fontSize: "var(--ra-text-sm)", color: "var(--ra-color-text-secondary)" }}>
                  {r.number}
                </p>
              </div>
              <span
                style={{
                  fontSize: "var(--ra-text-sm)",
                  fontWeight: 600,
                  color: r.status === "cancelled" ? "var(--ra-color-danger)" : "var(--ra-color-accent)",
                  whiteSpace: "nowrap",
                }}
              >
                {statusLabel(r.kind, r.status)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
