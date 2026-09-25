// The guest's identity for the whole app: an anonymous Supabase Auth user
// bound to a guest_sessions row (hotel + room + locale + expiry) — see
// docs/ARCHITECTURE.md section 4. No email/password, no registration.
//
// Once redeemed, every guest-side query needs NO manual .eq('hotel_id', ...)
// filter at all: RLS (guest_hotel_id() / guest_room_id() / guest_session_id())
// already scopes every read to exactly this guest's hotel/room/session. That
// is deliberate — see the "staff reads own hotel" pattern in apps/admin for
// the same idea on the staff side.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../supabase";
import { LOCALE_STORAGE_KEY } from "../lib/constants";

export interface GuestHotel {
  id: string;
  name: string;
  logoUrl: string | null;
  defaultLocale: string;
  currency: string;
}

export interface GuestRoom {
  id: string;
  number: string;
}

export type RedeemErrorCode =
  | "invalid_code"
  | "expired_code"
  | "room_required"
  | "room_not_found"
  | "bad_request"
  | "unauthorized"
  | "server_error"
  | "network_error";

interface GuestSessionState {
  status: "loading" | "unauthenticated" | "active";
  guestSessionId: string | null;
  hotel: GuestHotel | null;
  room: GuestRoom | null;
  locale: string;
}

interface GuestSessionContextValue extends GuestSessionState {
  redeemAccess: (token: string, roomNumber: string | undefined, locale: string) => Promise<RedeemErrorCode | null>;
  setLocale: (locale: string) => Promise<void>;
  endSession: () => Promise<void>;
}

const GuestSessionContext = createContext<GuestSessionContextValue | null>(null);

async function fetchOwnHotelAndRoom(): Promise<{ hotel: GuestHotel; room: GuestRoom } | null> {
  // No .eq() filters needed — RLS already scopes these to the caller's own
  // active guest session.
  const [{ data: hotelRow }, { data: roomRow }] = await Promise.all([
    supabase.from("hotels").select("id, name, logo_url, default_locale, currency").maybeSingle(),
    supabase.from("rooms").select("id, number").maybeSingle(),
  ]);
  if (!hotelRow || !roomRow) return null;
  return {
    hotel: {
      id: hotelRow.id,
      name: hotelRow.name,
      logoUrl: hotelRow.logo_url,
      defaultLocale: hotelRow.default_locale,
      currency: hotelRow.currency,
    },
    room: { id: roomRow.id, number: roomRow.number },
  };
}

export function GuestSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuestSessionState>({
    status: "loading",
    guestSessionId: null,
    hotel: null,
    room: null,
    locale: localStorage.getItem(LOCALE_STORAGE_KEY) ?? "en",
  });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) setState((s) => ({ ...s, status: "unauthenticated" }));
        return;
      }

      const { data: guestSessionRow } = await supabase.from("guest_sessions").select("id, locale").maybeSingle();
      if (!guestSessionRow) {
        if (!cancelled) setState((s) => ({ ...s, status: "unauthenticated" }));
        return;
      }

      const resolved = await fetchOwnHotelAndRoom();
      if (cancelled) return;
      if (!resolved) {
        setState((s) => ({ ...s, status: "unauthenticated" }));
        return;
      }
      setState({
        status: "active",
        guestSessionId: guestSessionRow.id,
        hotel: resolved.hotel,
        room: resolved.room,
        locale: guestSessionRow.locale,
      });
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const redeemAccess = useCallback(
    async (token: string, roomNumber: string | undefined, locale: string): Promise<RedeemErrorCode | null> => {
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError || !signInData.session) return "unauthorized";
        sessionData = signInData;
      }

      const { data, error } = await supabase.functions.invoke<{
        guestSessionId: string;
        hotelId: string;
        hotelName: string;
        hotelLogoUrl: string | null;
        roomNumber: string;
        locale: string;
      }>("redeem-access", { body: { token, roomNumber, locale } });

      if (error) {
        // supabase-js surfaces a non-2xx function response as a generic
        // FunctionsHttpError; the actual { error: "..." } body is on .context.
        const body = (error as { context?: { json?: () => Promise<{ error?: RedeemErrorCode }> } }).context;
        if (body?.json) {
          try {
            const parsed = await body.json();
            if (parsed.error) return parsed.error;
          } catch {
            /* fall through to network_error below */
          }
        }
        return "network_error";
      }
      if (!data) return "server_error";

      localStorage.setItem(LOCALE_STORAGE_KEY, data.locale);
      setState({
        status: "active",
        guestSessionId: data.guestSessionId,
        hotel: {
          id: data.hotelId,
          name: data.hotelName,
          logoUrl: data.hotelLogoUrl,
          defaultLocale: data.locale,
          currency: "USD", // refined by fetchOwnHotelAndRoom below
        },
        room: { id: "", number: data.roomNumber },
        locale: data.locale,
      });

      // Fill in the fields the function response doesn't carry (currency,
      // room id) via the now-active RLS-scoped read.
      const resolved = await fetchOwnHotelAndRoom();
      if (resolved) {
        setState((s) => ({ ...s, hotel: resolved.hotel, room: resolved.room }));
      }
      return null;
    },
    [],
  );

  const setLocale = useCallback(async (locale: string) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    setState((s) => ({ ...s, locale }));
    // Best-effort — keeps hotel-side language analytics accurate. Not
    // critical if it fails (e.g. session just expired).
    await supabase.from("guest_sessions").update({ locale }).select().maybeSingle();
  }, []);

  const endSession = useCallback(async () => {
    await supabase.from("guest_sessions").update({ revoked_at: new Date().toISOString() }).select().maybeSingle();
    await supabase.auth.signOut();
    setState({ status: "unauthenticated", guestSessionId: null, hotel: null, room: null, locale: state.locale });
  }, [state.locale]);

  const value = useMemo<GuestSessionContextValue>(
    () => ({ ...state, redeemAccess, setLocale, endSession }),
    [state, redeemAccess, setLocale, endSession],
  );

  return <GuestSessionContext.Provider value={value}>{children}</GuestSessionContext.Provider>;
}

export function useGuestSession(): GuestSessionContextValue {
  const ctx = useContext(GuestSessionContext);
  if (!ctx) throw new Error("useGuestSession must be used within a GuestSessionProvider");
  return ctx;
}
