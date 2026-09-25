import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { resolveTranslation } from "../lib/resolveTranslation";

export interface ServiceView {
  id: string;
  imageUrl: string | null;
  isFree: boolean;
  priceMinor: number;
  currency: string;
  expectedMinutes: number | null;
  name: string;
  description: string | null;
}

/** Phase 2 is discovery only — no "Send Request" action here yet.
 *  Phase 3 adds the request-creation flow on top of this same screen. */
export function useServicesByCategory(categoryId: string, locale: string, fallbackLocale: string) {
  const [services, setServices] = useState<ServiceView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: svcs } = await supabase
        .from("services")
        .select("id, image_url, is_free, price_minor, currency, expected_minutes, sort_order")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("sort_order");

      if (!svcs || svcs.length === 0) {
        if (!cancelled) {
          setServices([]);
          setLoading(false);
        }
        return;
      }

      const { data: translations } = await supabase
        .from("service_translations")
        .select("service_id, locale, name, description")
        .in(
          "service_id",
          svcs.map((s) => s.id),
        );

      if (cancelled) return;
      const byService = new Map<string, { locale: string; name: string; description: string | null }[]>();
      for (const t of translations ?? []) {
        const list = byService.get(t.service_id) ?? [];
        list.push({ locale: t.locale, name: t.name, description: t.description });
        byService.set(t.service_id, list);
      }

      setServices(
        svcs.map((s) => {
          const resolved = resolveTranslation(byService.get(s.id) ?? [], locale, fallbackLocale);
          return {
            id: s.id,
            imageUrl: s.image_url,
            isFree: s.is_free,
            priceMinor: s.price_minor,
            currency: s.currency,
            expectedMinutes: s.expected_minutes,
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
  }, [categoryId, locale, fallbackLocale]);

  return { services, loading };
}
