import { useEffect, useState } from "react";
import type { RequestKind, RequestStatus } from "@room-aura/shared";
import { supabase } from "../supabase";

export interface QueueRequest {
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
  requestedFor: string | null;
  createdAt: string;
  roomNumber: string;
  departmentId: string;
  departmentName: string;
  serviceName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  orderSummary: string | null;
  orderTotalMinor: number | null;
  orderCurrency: string | null;
  orderPaymentMethod: string | null;
}

interface RawRow {
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
  requested_for: string | null;
  created_at: string;
  room_id: string;
  department_id: string;
  service_id: string | null;
  assigned_to: string | null;
}

/** RLS already scopes this to the caller's own hotel (all requests for
 *  admin/manager, own department only for plain staff) — see
 *  docs/ARCHITECTURE.md section 4. Live via Realtime: a new request or any
 *  status change re-fetches, matching "Hotel Web Admin immediately
 *  receives: NEW REQUEST" from the spec. */
export function useRequestsQueue(hotelDefaultLocale: string) {
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: rows } = await supabase
        .from("requests")
        .select(
          "id, number, kind, status, quantity, guest_note, original_text, original_locale, translated_text, translation_is_mock, estimated_minutes, requested_for, created_at, room_id, department_id, service_id, assigned_to",
        )
        .order("created_at", { ascending: false });
      if (cancelled || !rows) {
        setLoading(false);
        return;
      }
      const raw = rows as RawRow[];

      const roomIds = [...new Set(raw.map((r) => r.room_id))];
      const departmentIds = [...new Set(raw.map((r) => r.department_id))];
      const serviceIds = [...new Set(raw.filter((r) => r.service_id).map((r) => r.service_id as string))];
      const staffIds = [...new Set(raw.filter((r) => r.assigned_to).map((r) => r.assigned_to as string))];
      const orderIds = raw.filter((r) => r.kind === "order").map((r) => r.id);

      const [{ data: rooms }, { data: departments }, { data: serviceTranslations }, { data: staff }, { data: orders }, { data: orderItems }] =
        await Promise.all([
          roomIds.length ? supabase.from("rooms").select("id, number").in("id", roomIds) : Promise.resolve({ data: [] }),
          departmentIds.length
            ? supabase.from("departments").select("id, name").in("id", departmentIds)
            : Promise.resolve({ data: [] }),
          serviceIds.length
            ? supabase
                .from("service_translations")
                .select("service_id, locale, name")
                .in("service_id", serviceIds)
                .eq("locale", hotelDefaultLocale)
            : Promise.resolve({ data: [] }),
          staffIds.length
            ? supabase.from("staff_users").select("id, full_name").in("id", staffIds)
            : Promise.resolve({ data: [] }),
          orderIds.length
            ? supabase.from("orders").select("id, total_minor, currency, payment_method").in("id", orderIds)
            : Promise.resolve({ data: [] }),
          orderIds.length
            ? supabase.from("order_items").select("order_id, name_snapshot, quantity").in("order_id", orderIds)
            : Promise.resolve({ data: [] }),
        ]);
      if (cancelled) return;

      const roomById = new Map((rooms ?? []).map((r) => [r.id, r.number]));
      const deptById = new Map((departments ?? []).map((d) => [d.id, d.name]));
      const serviceNameById = new Map((serviceTranslations ?? []).map((t) => [t.service_id, t.name]));
      const staffById = new Map((staff ?? []).map((s) => [s.id, s.full_name]));
      const orderById = new Map((orders ?? []).map((o) => [o.id, o]));
      const itemsByOrder = new Map<string, string[]>();
      for (const oi of orderItems ?? []) {
        const list = itemsByOrder.get(oi.order_id) ?? [];
        list.push(`${oi.name_snapshot} ×${oi.quantity}`);
        itemsByOrder.set(oi.order_id, list);
      }

      setRequests(
        raw.map((r) => ({
          id: r.id,
          number: r.number,
          kind: r.kind,
          status: r.status,
          quantity: r.quantity,
          guestNote: r.guest_note,
          originalText: r.original_text,
          originalLocale: r.original_locale,
          translatedText: r.translated_text,
          translationIsMock: r.translation_is_mock,
          estimatedMinutes: r.estimated_minutes,
          requestedFor: r.requested_for,
          createdAt: r.created_at,
          roomNumber: roomById.get(r.room_id) ?? "—",
          departmentId: r.department_id,
          departmentName: deptById.get(r.department_id) ?? "—",
          serviceName: r.service_id ? (serviceNameById.get(r.service_id) ?? null) : null,
          assignedTo: r.assigned_to,
          assignedToName: r.assigned_to ? (staffById.get(r.assigned_to) ?? null) : null,
          orderSummary: r.kind === "order" ? ((itemsByOrder.get(r.id) ?? []).join(", ") || null) : null,
          orderTotalMinor: orderById.get(r.id)?.total_minor ?? null,
          orderCurrency: orderById.get(r.id)?.currency ?? null,
          orderPaymentMethod: orderById.get(r.id)?.payment_method ?? null,
        })),
      );
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel("admin-requests-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [hotelDefaultLocale]);

  return { requests, loading };
}
