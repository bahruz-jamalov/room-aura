import { useEffect, useState } from "react";
import type { LanguageCode } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../supabase";

export interface HotelInfo {
  id: string;
  name: string;
  defaultLocale: LanguageCode;
  supportedLocales: LanguageCode[];
  currency: string;
}

/** The signed-in staff member's hotel row — used wherever a Phase 6 screen
 *  needs the hotel's locale list (translation editors) or currency
 *  (pricing forms). RLS scopes this to the caller's own hotel. */
export function useHotel() {
  const { staff } = useAuth();
  const [hotel, setHotel] = useState<HotelInfo | null>(null);

  useEffect(() => {
    if (!staff) return;
    let cancelled = false;
    supabase
      .from("hotels")
      .select("id, name, default_locale, supported_locales, currency")
      .eq("id", staff.hotelId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setHotel({
          id: data.id,
          name: data.name,
          defaultLocale: data.default_locale as LanguageCode,
          supportedLocales: data.supported_locales as LanguageCode[],
          currency: data.currency,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [staff]);

  return hotel;
}
