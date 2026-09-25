import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { resolveTranslation } from "../lib/resolveTranslation";

export interface MenuCategoryView {
  id: string;
  name: string;
}

export function useMenuCategories(locale: string, fallbackLocale: string) {
  const [categories, setCategories] = useState<MenuCategoryView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: cats } = await supabase
        .from("menu_categories")
        .select("id, sort_order")
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
        .from("menu_category_translations")
        .select("menu_category_id, locale, name")
        .in(
          "menu_category_id",
          cats.map((c) => c.id),
        );
      if (cancelled) return;
      const byCategory = new Map<string, { locale: string; name: string }[]>();
      for (const t of translations ?? []) {
        const list = byCategory.get(t.menu_category_id) ?? [];
        list.push({ locale: t.locale, name: t.name });
        byCategory.set(t.menu_category_id, list);
      }
      setCategories(
        cats.map((c) => ({
          id: c.id,
          name: resolveTranslation(byCategory.get(c.id) ?? [], locale, fallbackLocale)?.name ?? "Untitled",
        })),
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
