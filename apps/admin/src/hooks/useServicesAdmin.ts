import { useCallback, useEffect, useState } from "react";
import type { LanguageCode } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface AdminService {
  id: string;
  department_id: string;
  departmentName: string;
  is_free: boolean;
  price_minor: number;
  currency: string;
  expected_minutes: number | null;
  allows_quantity: boolean;
  max_quantity: number;
  allows_note: boolean;
  is_active: boolean;
  sort_order: number;
  displayName: string;
}

/** Services within one category, joined with department name and
 *  default-locale translation for display. */
export function useServicesAdmin(categoryId: string | null, defaultLocale: LanguageCode | null) {
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!categoryId || !defaultLocale) return;
    setLoading(true);
    const [{ data: serviceRows }, { data: translationRows }, { data: departmentRows }] = await Promise.all([
      supabase
        .from("services")
        .select(
          "id, department_id, is_free, price_minor, currency, expected_minutes, allows_quantity, max_quantity, allows_note, is_active, sort_order",
        )
        .eq("category_id", categoryId)
        .order("sort_order"),
      supabase.from("service_translations").select("service_id, locale, name"),
      supabase.from("departments").select("id, name"),
    ]);
    const names = new Map((translationRows ?? []).filter((t) => t.locale === defaultLocale).map((t) => [t.service_id, t.name]));
    const departmentNames = new Map((departmentRows ?? []).map((d) => [d.id, d.name]));
    setServices(
      (serviceRows ?? []).map((s) => ({
        ...s,
        departmentName: departmentNames.get(s.department_id) ?? "—",
        displayName: names.get(s.id) ?? "(untranslated)",
      })),
    );
    setLoading(false);
  }, [categoryId, defaultLocale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { services, loading, reload };
}
