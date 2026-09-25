// Free-text department routing — docs/ARCHITECTURE.md section 9.
// Deliberately dumb: keyword match on the TRANSLATED text against the
// hotel's routing_rules (highest priority wins), falling back to
// hotel_settings.freetext_department_id. Staff can reassign in one click
// later (Phase 4); statistical intent classification is explicitly
// POST-MVP.
import { supabase } from "../supabase";

export async function resolveFreetextDepartment(translatedText: string): Promise<string | null> {
  const { data: rules } = await supabase
    .from("routing_rules")
    .select("keyword, department_id, priority")
    .order("priority", { ascending: false });

  const haystack = translatedText.toLowerCase();
  const match = rules?.find((r) => haystack.includes(r.keyword.toLowerCase()));
  if (match) return match.department_id;

  const { data: settings } = await supabase.from("hotel_settings").select("freetext_department_id").maybeSingle();
  return settings?.freetext_department_id ?? null;
}
