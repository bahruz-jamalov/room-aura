import { useCallback, useEffect, useState } from "react";
import type { LanguageCode } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface AdminMenuCategory {
  id: string;
  service_category_id: string;
  sort_order: number;
  is_active: boolean;
  displayName: string;
}

/** `shopId` scopes this to one menu-type service_categories row ("shop") —
 *  every independent shop (Food & Drinks, a City Shop, …) has its own set
 *  of menu_categories, see 00000000000027_multi_shop_menus.sql. */
export function useMenuCategoriesAdmin(defaultLocale: LanguageCode | null, shopId: string | null) {
  const [categories, setCategories] = useState<AdminMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!defaultLocale || !shopId) return;
    const [{ data: categoryRows }, { data: translationRows }] = await Promise.all([
      supabase.from("menu_categories").select("id, service_category_id, sort_order, is_active").eq("service_category_id", shopId).order("sort_order"),
      supabase.from("menu_category_translations").select("menu_category_id, locale, name"),
    ]);
    const names = new Map((translationRows ?? []).filter((t) => t.locale === defaultLocale).map((t) => [t.menu_category_id, t.name]));
    setCategories((categoryRows ?? []).map((c) => ({ ...c, displayName: names.get(c.id) ?? "(untranslated)" })));
    setLoading(false);
  }, [defaultLocale, shopId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, reload };
}
