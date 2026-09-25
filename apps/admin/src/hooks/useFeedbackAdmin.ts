import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface AdminFeedback {
  id: string;
  rating: number;
  effortScore: number;
  comment: string | null;
  createdAt: string;
  requestNumber: string;
  roomNumber: string;
  departmentName: string;
}

/** RLS scopes this to the caller's own hotel, admin/manager only ("admin or
 *  manager reads own hotel feedback"). */
export function useFeedbackAdmin() {
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: feedbackRows }, { data: requestRows }, { data: roomRows }, { data: departmentRows }] = await Promise.all([
        supabase.from("feedback").select("id, request_id, rating, effort_score, comment, created_at").order("created_at", { ascending: false }),
        supabase.from("requests").select("id, number, room_id, department_id"),
        supabase.from("rooms").select("id, number"),
        supabase.from("departments").select("id, name"),
      ]);
      if (cancelled) return;

      const requests = new Map((requestRows ?? []).map((r) => [r.id, r]));
      const roomNumbers = new Map((roomRows ?? []).map((r) => [r.id, r.number]));
      const departmentNames = new Map((departmentRows ?? []).map((d) => [d.id, d.name]));

      setFeedback(
        (feedbackRows ?? []).map((f) => {
          const request = requests.get(f.request_id);
          return {
            id: f.id,
            rating: f.rating,
            effortScore: f.effort_score,
            comment: f.comment,
            createdAt: f.created_at,
            requestNumber: request?.number ?? "—",
            roomNumber: request ? (roomNumbers.get(request.room_id) ?? "—") : "—",
            departmentName: request ? (departmentNames.get(request.department_id) ?? "—") : "—",
          };
        }),
      );
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { feedback, loading };
}
