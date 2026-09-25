import { useEffect, useState } from "react";
import type { RequestKind, RequestStatus } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface RequestDetail {
  id: string;
  number: string;
  kind: RequestKind;
  status: RequestStatus;
  quantity: number;
  guestNote: string | null;
  originalText: string | null;
  originalLocale: string | null;
  translatedText: string | null;
  translationIsMock: boolean;
  estimatedMinutes: number | null;
  createdAt: string;
}

// Row shape as returned by Postgres (snake_case) — both the initial select
// and realtime's payload.new use this shape.
interface RequestRow {
  id: string;
  number: string;
  kind: RequestKind;
  status: RequestStatus;
  quantity: number;
  guest_note: string | null;
  original_text: string | null;
  original_locale: string | null;
  translated_text: string | null;
  translation_is_mock: boolean;
  estimated_minutes: number | null;
  created_at: string;
}

function mapRow(row: RequestRow): RequestDetail {
  return {
    id: row.id,
    number: row.number,
    kind: row.kind,
    status: row.status,
    quantity: row.quantity,
    guestNote: row.guest_note,
    originalText: row.original_text,
    originalLocale: row.original_locale,
    translatedText: row.translated_text,
    translationIsMock: row.translation_is_mock,
    estimatedMinutes: row.estimated_minutes,
    createdAt: row.created_at,
  };
}

/** Live-updates via Realtime (supabase/migrations/00000000000011_realtime.sql)
 *  — the guest sees a staff status change with no refresh and no polling. */
export function useRequestDetail(requestId: string) {
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("requests")
        .select("id, number, kind, status, quantity, guest_note, original_text, original_locale, translated_text, translation_is_mock, estimated_minutes, created_at")
        .eq("id", requestId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
      } else {
        setRequest(mapRow(data as RequestRow));
      }
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel(`request-${requestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests", filter: `id=eq.${requestId}` },
        (payload) => {
          setRequest(mapRow(payload.new as RequestRow));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [requestId]);

  return { request, loading, notFound };
}
