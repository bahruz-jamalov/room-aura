import { useCallback, useEffect, useState } from "react";
import type { LanguageCode, MenuItemStatus } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface AdminMenuItem {
  id: string;
  price_minor: number;
  currency: string;
  prep_minutes: number | null;
  allergens: string[];
  status: MenuItemStatus;
  sort_order: number;
  displayName: string;
}

export function useMenuItemsAdmin(categoryId: string | null, defaultLocale: LanguageCode | null) {
  const [items, setItems] = useState<AdminMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!categoryId || !defaultLocale) return;
    setLoading(true);
    const [{ data: itemRows }, { data: translationRows }] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id, price_minor, currency, prep_minutes, allergens, status, sort_order")
        .eq("menu_category_id", categoryId)
        .order("sort_order"),
      supabase.from("menu_item_translations").select("menu_item_id, locale, name"),
    ]);
    const names = new Map((translationRows ?? []).filter((t) => t.locale === defaultLocale).map((t) => [t.menu_item_id, t.name]));
    setItems((itemRows ?? []).map((i) => ({ ...i, displayName: names.get(i.id) ?? "(untranslated)" })));
    setLoading(false);
  }, [categoryId, defaultLocale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, reload };
}
