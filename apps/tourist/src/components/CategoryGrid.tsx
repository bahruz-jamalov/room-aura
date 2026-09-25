import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { ServiceCategoryView } from "../hooks/useServiceCategories";
import { card } from "../lib/styles";

export default function CategoryGrid({ categories, trailing }: { categories: ServiceCategoryView[]; trailing?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--ra-space-3)" }}>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => navigate(cat.categoryType === "menu" ? "/menu" : `/services/${cat.id}`)}
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
            border: "1px solid var(--ra-color-border)",
          }}
        >
          <span style={{ fontSize: "var(--ra-text-3xl)" }}>{cat.icon ?? "⭐"}</span>
          <span style={{ fontWeight: 600, textAlign: "center" }}>{cat.name}</span>
        </button>
      ))}
      {trailing}
    </div>
  );
}
