import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { resolveTranslation } from "../lib/resolveTranslation";

export interface ServiceCategoryView {
  id: string;
  icon: string | null;
  imageUrl: string | null;
  name: string;
  description: string | null;
}

/** service_categories where category_type = 'standard' — the guest-facing
 *  "How can we help you?" grid. Food & Drinks (category_type = 'menu') has
 *  its own screen, built alongside ordering in Phase 5. */
export function useServiceCategories(locale: string, fallbackLocale: string) {
  const [categories, setCategories] = useState<ServiceCategoryView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: cats } = await supabase
        .from("service_categories")
        .select("id, icon, image_url, sort_order")
        .eq("category_type", "standard")
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
