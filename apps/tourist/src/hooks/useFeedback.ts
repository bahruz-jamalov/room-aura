import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface GuestFeedback {
  rating: number;
  effortScore: number;
  comment: string | null;
}

/** Whether this request already has feedback — RLS scopes the read to the
 *  guest's own feedback (00000000000009_rls_policies.sql: "guest reads own
 *  feedback"), so this can never see another guest's rating. */
export function useFeedback(requestId: string) {
  const [feedback, setFeedback] = useState<GuestFeedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("feedback")
      .select("rating, effort_score, comment")
      .eq("request_id", requestId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setFeedback(data ? { rating: data.rating, effortScore: data.effort_score, comment: data.comment } : null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  return { feedback, loading };
}
