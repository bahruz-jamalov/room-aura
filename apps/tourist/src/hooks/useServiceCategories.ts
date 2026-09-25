import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { resolveTranslation } from "../lib/resolveTranslation";

export interface ServiceCategoryView {
  id: string;
  categoryType: "standard" | "menu";
  icon: string | null;
  imageUrl: string | null;
  name: string;
  description: string | null;
}

/** Every active service_categories row, both types — the guest-facing
 *  "How can we help you?" grid mixes ordinary categories (Housekeeping...)
 *  with the single "Food & Drinks" tile (category_type = 'menu'), which
 *  routes to /menu instead of /services/:id. See CategoryGrid.tsx and
 *  docs/ARCHITECTURE.md's Home mockup. */
export function useServiceCategories(locale: string, fallbackLocale: string) {
  const [categories, setCategories] = useState<ServiceCategoryView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: cats } = await supabase
        .from("service_categories")
        .select("id, category_type, icon, image_url, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (!cats || cats.length === 0) {
        if (!cancelled) {
          setCategories([]);
          setLoading(false);
        }
        return;
      }

      const { data: translations } = await supabase
        .from("service_category_translations")
        .select("category_id, locale, name, description")
        .in(
          "category_id",
          cats.map((c) => c.id),
        );

      if (cancelled) return;
      const byCategory = new Map<string, { locale: string; name: string; description: string | null }[]>();
      for (const t of translations ?? []) {
        const list = byCategory.get(t.category_id) ?? [];
        list.push({ locale: t.locale, name: t.name, description: t.description });
        byCategory.set(t.category_id, list);
      }

      setCategories(
        cats.map((c) => {
          const resolved = resolveTranslation(byCategory.get(c.id) ?? [], locale, fallbackLocale);
          return {
            id: c.id,
            categoryType: c.category_type,
            icon: c.icon,
            imageUrl: c.image_url,
            name: resolved?.name ?? "Untitled",
            description: resolved?.description ?? null,
          };
        }),
      );
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, fallbackLocale]);

  return { categories, loading };
}
