import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/home", icon: "\u{1F3E0}", labelKey: "nav.home" },
  { to: "/services", icon: "\u{1F6CE}️", labelKey: "nav.services" },
  { to: "/requests", icon: "\u{1F4CB}", labelKey: "nav.myRequests" },
  { to: "/hotel", icon: "\u{1F3E8}", labelKey: "nav.hotel" },
  { to: "/settings", icon: "⚙️", labelKey: "nav.settings" },
] as const;

export default function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        display: "flex",
        background: "var(--ra-color-surface)",
        borderTop: "1px solid var(--ra-color-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: "var(--ra-z-nav)",
      }}
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={({ isActive }) => ({
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "var(--ra-space-2) 0",
            minHeight: "var(--ra-min-target)",
            color: isActive ? "var(--ra-color-accent)" : "var(--ra-color-text-secondary)",
            textDecoration: "none",
            fontSize: "var(--ra-text-xs)",
          })}
        >
          <span style={{ fontSize: "var(--ra-text-xl)", lineHeight: 1 }}>{item.icon}</span>
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
