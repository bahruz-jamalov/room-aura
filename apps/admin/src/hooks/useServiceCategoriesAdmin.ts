import { useCallback, useEffect, useState } from "react";
import type { CategoryType, LanguageCode } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface AdminServiceCategory {
  id: string;
  category_type: CategoryType;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  department_id: string | null;
  parent_category_id: string | null;
  allows_room_charge: boolean;
  displayName: string;
}

/** Categories joined with their default-locale translation for display —
 *  the full per-locale set is edited in TranslationEditor, not shown here. */
export function useServiceCategoriesAdmin(defaultLocale: LanguageCode | null) {
  const [categories, setCategories] = useState<AdminServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!defaultLocale) return;
    const [{ data: categoryRows }, { data: translationRows }] = await Promise.all([
      // Global ("Explore the City") categories are platform-managed, not
      // this hotel's own — see /platform/catalog and
      // 00000000000029_global_catalog.sql — so they're excluded here even
      // though RLS would otherwise let staff read them too.
      supabase
        .from("service_categories")
        .select("id, category_type, icon, sort_order, is_active, department_id, parent_category_id, allows_room_charge")
        .not("hotel_id", "is", null)
        .order("sort_order"),
      supabase.from("service_category_translations").select("category_id, locale, name"),
    ]);
    const names = new Map(
      (translationRows ?? [])
        .filter((t) => t.locale === defaultLocale)
        .map((t) => [t.category_id, t.name]),
    );
    setCategories(
      (categoryRows ?? []).map((c) => ({ ...c, displayName: names.get(c.id) ?? "(untranslated)" })),
    );
    setLoading(false);
  }, [defaultLocale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, reload };
}
