import { useCallback, useEffect, useState } from "react";
import type { HotelPlan, HotelStatus } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface PlatformHotel {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  currency: string;
  status: HotelStatus;
  plan: HotelPlan;
}

/** Platform admin has full SELECT on hotels via RLS ("platform admin sees
 *  all hotels" — 00000000000009_rls_policies.sql). */
export function usePlatformHotels() {
  const [hotels, setHotels] = useState<PlatformHotel[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("hotels").select("id, slug, name, city, country, currency, status, plan").order("name");
    setHotels(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { hotels, loading, reload };
}
