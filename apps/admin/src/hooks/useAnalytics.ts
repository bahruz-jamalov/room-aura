import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface AnalyticsData {
  // Operational
  totalRequests: number;
  completedCount: number;
  cancelledCount: number;
  avgResponseMinutes: number | null; // created -> accepted
  avgResolutionMinutes: number | null; // created -> completed
  byDepartment: { name: string; count: number }[];
  // Guest experience
  avgRating: number | null;
  avgEffort: number | null;
  feedbackCount: number;
  // Commercial
  orderCount: number;
  revenueMinor: number;
  revenueCurrency: string | null;
}

/** Client-side aggregation over a date range, same "fetch raw rows, reduce
 *  in JS" approach as useDashboardStats — no SQL views/RPCs yet, reasonable
 *  at this hotel's data volume. RLS scopes every query to the caller's own
 *  hotel (admin/manager only reach this screen at all). */
export function useAnalytics(fromDate: Date, toDate: Date) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      const fromIso = fromDate.toISOString();
      const toIso = toDate.toISOString();

      const [{ data: requestRows }, { data: departmentRows }, { data: feedbackRows }] = await Promise.all([
        supabase
          .from("requests")
          .select("id, kind, status, department_id, created_at, accepted_at, completed_at")
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        supabase.from("departments").select("id, name"),
        supabase.from("feedback").select("rating, effort_score, created_at").gte("created_at", fromIso).lte("created_at", toIso),
      ]);
      if (cancelled) return;

      const requests = requestRows ?? [];
      const departmentNames = new Map((departmentRows ?? []).map((d) => [d.id, d.name]));

      // orders has no created_at of its own — its id IS the request id
      // (1:1), so "orders in range" means "order-kind requests in range",
      // same join useDashboardStats already uses for Orders/Revenue Today.
      const orderRequestIds = requests.filter((r) => r.kind === "order" && r.status !== "cancelled").map((r) => r.id);
      const { data: orderRows } =
        orderRequestIds.length > 0
          ? await supabase.from("orders").select("id, total_minor, currency").in("id", orderRequestIds)
          : { data: [] as { id: string; total_minor: number; currency: string }[] };
      if (cancelled) return;

      const completed = requests.filter((r) => r.status === "completed");
      const cancelledRequests = requests.filter((r) => r.status === "cancelled");

      const responseMinutes = requests
        .filter((r) => r.accepted_at)
        .map((r) => (new Date(r.accepted_at!).getTime() - new Date(r.created_at).getTime()) / 60000);
      const resolutionMinutes = completed
        .filter((r) => r.completed_at)
        .map((r) => (new Date(r.completed_at!).getTime() - new Date(r.created_at).getTime()) / 60000);

      const departmentCounts = new Map<string, number>();
      for (const r of requests) {
        const name = departmentNames.get(r.department_id) ?? "Unknown";
        departmentCounts.set(name, (departmentCounts.get(name) ?? 0) + 1);
      }

      const feedback = feedbackRows ?? [];
      const orders = orderRows ?? [];

      setData({
        totalRequests: requests.length,
        completedCount: completed.length,
        cancelledCount: cancelledRequests.length,
        avgResponseMinutes: responseMinutes.length ? Math.round(avg(responseMinutes)) : null,
        avgResolutionMinutes: resolutionMinutes.length ? Math.round(avg(resolutionMinutes)) : null,
        byDepartment: [...departmentCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        avgRating: feedback.length ? avg(feedback.map((f) => f.rating)) : null,
        avgEffort: feedback.length ? avg(feedback.map((f) => f.effort_score)) : null,
        feedbackCount: feedback.length,
        orderCount: orders.length,
        revenueMinor: orders.reduce((sum, o) => sum + o.total_minor, 0),
        revenueCurrency: orders[0]?.currency ?? null,
      });
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on
    // primitive timestamps, not the Date objects: a caller that recomputes
    // `fromDate`/`toDate` on every render (new object, same instant) would
    // otherwise retrigger this effect every render, forever.
  }, [fromDate.getTime(), toDate.getTime()]);

  return { data, loading };
}

function avg(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
