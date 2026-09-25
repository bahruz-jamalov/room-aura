import { useEffect, useState } from "react";
import type { RequestKind, RequestStatus } from "@room-aura/shared";
import { resolveTranslation } from "../lib/resolveTranslation";
import { supabase } from "../supabase";

export interface MyRequestSummary {
  id: string;
  number: string;
  kind: RequestKind;
  status: RequestStatus;
  createdAt: string;
  displayText: string;
}

interface RequestRow {
  id: string;
  number: string;
  kind: RequestKind;
  status: RequestStatus;
  created_at: string;
  original_text: string | null;
  service_id: string | null;
}

/** Live-updates via Realtime — a new request or a staff status change shows
 *  up here without a refresh. Filtered to this guest's own session, which
 *  RLS would enforce anyway; the filter just avoids receiving events for
 *  rows this subscription can't use. */
export function useMyRequests(guestSessionId: string | null, locale: string, fallbackLocale: string) {
  const [requests, setRequests] = useState<MyRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guestSessionId) return;
    let cancelled = false;

    async function resolveDisplayText(rows: RequestRow[]): Promise<MyRequestSummary[]> {
      const serviceIds = [...new Set(rows.filter((r) => r.service_id).map((r) => r.service_id as string))];
      const orderIds = rows.filter((r) => r.kind === "order").map((r) => r.id);

      let translationsByService = new Map<string, { locale: string; name: string }[]>();
      if (serviceIds.length > 0) {
        const { data: translations } = await supabase
          .from("service_translations")
          .select("service_id, locale, name")
          .in("service_id", serviceIds);
        translationsByService = new Map();
        for (const t of translations ?? []) {
          const list = translationsByService.get(t.service_id) ?? [];
          list.push({ locale: t.locale, name: t.name });
          translationsByService.set(t.service_id, list);
        }
      }

      let itemsByOrder = new Map<string, string[]>();
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("order_id, name_snapshot")
          .in("order_id", orderIds);
        itemsByOrder = new Map();
        for (const oi of orderItems ?? []) {
          const list = itemsByOrder.get(oi.order_id) ?? [];
          list.push(oi.name_snapshot);
          itemsByOrder.set(oi.order_id, list);
        }
      }

      return rows.map((r) => {
        let displayText = "Request";
        if (r.kind === "freetext" && r.original_text) {
          displayText = r.original_text.length > 48 ? `${r.original_text.slice(0, 48)}…` : r.original_text;
        } else if (r.kind === "service" && r.service_id) {
          const resolved = resolveTranslation(translationsByService.get(r.service_id) ?? [], locale, fallbackLocale);
          displayText = resolved?.name ?? "Service request";
        } else if (r.kind === "order") {
          const names = itemsByOrder.get(r.id) ?? [];
          displayText =
            names.length === 0
              ? "Order"
              : names.length === 1
                ? (names[0] ?? "Order")
                : `${names[0] ?? "Order"} +${names.length - 1} more`;
        }
        return {
          id: r.id,
          number: r.number,
          kind: r.kind,
          status: r.status,
          createdAt: r.created_at,
          displayText,
        };
      });
    }

    async function load() {
      const { data } = await supabase
        .from("requests")
        .select("id, number, kind, status, created_at, original_text, service_id")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setRequests(await resolveDisplayText((data ?? []) as RequestRow[]));
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel(`my-requests-${guestSessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `guest_session_id=eq.${guestSessionId}` },
        () => {
          // A single row's shape varies by event; simplest correct approach
          // is to re-fetch the (small, per-guest) list rather than patch it.
          void load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [guestSessionId, locale, fallbackLocale]);

  return { requests, loading };
}
