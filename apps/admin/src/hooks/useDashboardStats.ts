import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface DashboardStats {
  newCount: number;
  inProgressCount: number;
  completedToday: number;
  avgResponseMinutes: number | null;
  ordersToday: number;
  revenueTodayMinor: number;
  revenueCurrency: string | null;
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Computed client-side from the (RLS-scoped, per-hotel-or-department) rows
 *  a real hotel has at MVP scale — no warehouse or RPC needed yet. See
 *  docs/ARCHITECTURE.md section 3 ("Materialise later only if a dashboard
 *  gets slow"). */
export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const since = startOfToday();
      const { data } = await supabase
        .from("requests")
        .select("id, kind, status, created_at, accepted_at, completed_at");
      if (cancelled || !data) return;

      const newCount = data.filter((r) => r.status === "new").length;
      const inProgressCount = data.filter((r) => ["accepted", "in_progress", "on_the_way"].includes(r.status)).length;
      const completedToday = data.filter((r) => r.status === "completed" && r.completed_at && r.completed_at >= since).length;

      const responseTimes = data
        .filter((r) => r.accepted_at && r.created_at >= since)
        .map((r) => (new Date(r.accepted_at!).getTime() - new Date(r.created_at).getTime()) / 60000);
      const avgResponseMinutes =
        responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

      // "Revenue" is the value of orders placed through ROOM-AURA, not money
      // ROOM-AURA processed — the hotel's own system handles settlement
      // (docs/ARCHITECTURE.md §10). Cancelled orders don't count.
      const orderIdsToday = data
        .filter((r) => r.kind === "order" && r.created_at >= since && r.status !== "cancelled")
        .map((r) => r.id);
      let revenueTodayMinor = 0;
      let revenueCurrency: string | null = null;
      if (orderIdsToday.length > 0) {
        const { data: orders } = await supabase.from("orders").select("total_minor, currency").in("id", orderIdsToday);
        for (const o of orders ?? []) {
          revenueTodayMinor += o.total_minor;
          revenueCurrency = o.currency;
        }
      }

      if (cancelled) return;
      setStats({
        newCount,
        inProgressCount,
        completedToday,
        avgResponseMinutes,
        ordersToday: orderIdsToday.length,
        revenueTodayMinor,
        revenueCurrency,
      });
    }
    void load();

    const channel = supabase
      .channel("dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return stats;
}
