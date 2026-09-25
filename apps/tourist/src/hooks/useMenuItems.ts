import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { resolveTranslation } from "../lib/resolveTranslation";

export interface MenuItemView {
  id: string;
  imageUrl: string | null;
  priceMinor: number;
  currency: string;
  prepMinutes: number | null;
  allergens: string[];
  status: "available" | "sold_out" | "hidden";
  name: string;
  description: string | null;
}

/** Sold Out items still render (greyed, unorderable); Hidden ones don't —
 *  matches the spec's Food & Drink admin section exactly. */
export function useMenuItems(menuCategoryId: string, locale: string, fallbackLocale: string) {
  const [items, setItems] = useState<MenuItemView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: rows } = await supabase
        .from("menu_items")
        .select("id, image_url, price_minor, currency, prep_minutes, allergens, status, sort_order")
        .eq("menu_category_id", menuCategoryId)
        .neq("status", "hidden")
        .order("sort_order");
      if (!rows || rows.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const { data: translations } = await supabase
        .from("menu_item_translations")
        .select("menu_item_id, locale, name, description")
        .in(
          "menu_item_id",
          rows.map((r) => r.id),
        );
      if (cancelled) return;
      const byItem = new Map<string, { locale: string; name: string; description: string | null }[]>();
      for (const t of translations ?? []) {
        const list = byItem.get(t.menu_item_id) ?? [];
        list.push({ locale: t.locale, name: t.name, description: t.description });
        byItem.set(t.menu_item_id, list);
      }
      setItems(
        rows.map((r) => {
          const resolved = resolveTranslation(byItem.get(r.id) ?? [], locale, fallbackLocale);
          return {
            id: r.id,
            imageUrl: r.image_url,
            priceMinor: r.price_minor,
            currency: r.currency,
            prepMinutes: r.prep_minutes,
            allergens: r.allergens,
            status: r.status,
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
  }, [menuCategoryId, locale, fallbackLocale]);

  return { items, loading };
}
