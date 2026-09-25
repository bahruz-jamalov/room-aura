import { useCallback, useEffect, useState } from "react";
import type { LanguageCode } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface AdminMenuCategory {
  id: string;
  sort_order: number;
  is_active: boolean;
  displayName: string;
}

export function useMenuCategoriesAdmin(defaultLocale: LanguageCode | null) {
  const [categories, setCategories] = useState<AdminMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!defaultLocale) return;
    const [{ data: categoryRows }, { data: translationRows }] = await Promise.all([
      supabase.from("menu_categories").select("id, sort_order, is_active").order("sort_order"),
      supabase.from("menu_category_translations").select("menu_category_id, locale, name"),
    ]);
    const names = new Map((translationRows ?? []).filter((t) => t.locale === defaultLocale).map((t) => [t.menu_category_id, t.name]));
    setCategories((categoryRows ?? []).map((c) => ({ ...c, displayName: names.get(c.id) ?? "(untranslated)" })));
    setLoading(false);
  }, [defaultLocale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, reload };
}
