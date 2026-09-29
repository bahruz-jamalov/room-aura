import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";

export interface AdminFaq {
  id: string;
  keyword: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export function useFaqsAdmin() {
  const [faqs, setFaqs] = useState<AdminFaq[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("hotel_faqs").select("id, keyword, question, answer, sort_order, is_active").order("sort_order");
    setFaqs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { faqs, loading, reload };
}
