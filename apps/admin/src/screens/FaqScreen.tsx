// /faqs — FAQ entries the native app's chat matches guest questions
// against (case-insensitive keyword substring, same style as
// routing_rules). Visible to every staff role; only admin/manager
// (canManageFaqs) get edit controls, matching Services' read/edit split.
import { useState } from "react";
import { permissions } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import SidePanel, { FormField } from "../components/SidePanel";
import { type AdminFaq, useFaqsAdmin } from "../hooks/useFaqsAdmin";
import { card, dangerButton, primaryButton, secondaryButton, textInput } from "../lib/styles";
import { supabase } from "../supabase";

export default function FaqScreen() {
  const { staff } = useAuth();
  const canEdit = staff ? permissions.canManageFaqs(staff) : false;
  const { faqs, loading, reload } = useFaqsAdmin();
  const [editingFaq, setEditingFaq] = useState<AdminFaq | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(faq: AdminFaq) {
    if (!confirm(`Delete the FAQ for keyword "${faq.keyword}"? This can't be undone.`)) return;
    const { error: deleteError } = await supabase.from("hotel_faqs").delete().eq("id", faq.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setError(null);
    await reload();
  }

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>FAQs</h1>
      <p style={{ color: "var(--ra-color-text-secondary)", marginTop: -8 }}>
        When a guest's chat question contains a keyword below, the app answers instantly instead of escalating to staff.
      </p>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Entries</h2>
        {canEdit && (
          <button style={primaryButton} onClick={() => setEditingFaq("new")}>
            + Add FAQ
          </button>
        )}
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Keyword", "Question", "Answer", "Status", ""].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : faqs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No FAQs yet — every chat question will go to staff.
                </td>
              </tr>
            ) : (
              faqs.map((f) => (
                <tr key={f.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{f.keyword}</td>
                  <td style={{ padding: "var(--ra-space-3)", maxWidth: 220 }}>{f.question}</td>
                  <td style={{ padding: "var(--ra-space-3)", maxWidth: 320, color: "var(--ra-color-text-secondary)" }}>{f.answer}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{f.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    {canEdit && (
                      <>
                        <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingFaq(f)}>
                          Edit
                        </button>
                        <button style={dangerButton} onClick={() => void handleDelete(f)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingFaq && staff && (
        <FaqForm
          faq={editingFaq === "new" ? null : editingFaq}
          hotelId={staff.hotelId}
          nextSortOrder={faqs.length}
          onClose={() => setEditingFaq(null)}
          onSaved={async () => {
            setEditingFaq(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function FaqForm({
  faq,
  hotelId,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  faq: AdminFaq | null;
  hotelId: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [keyword, setKeyword] = useState(faq?.keyword ?? "");
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [isActive, setIsActive] = useState(faq?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!keyword.trim() || !question.trim() || !answer.trim()) {
      setError("Keyword, question, and answer are all required.");
      return;
    }
    setBusy(true);
    setError(null);

    const payload = { keyword: keyword.trim().toLowerCase(), question: question.trim(), answer: answer.trim(), is_active: isActive };
    const { error: saveError } = faq
      ? await supabase.from("hotel_faqs").update(payload).eq("id", faq.id)
      : await supabase.from("hotel_faqs").insert({ hotel_id: hotelId, ...payload, sort_order: nextSortOrder });

    setBusy(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved();
  }

  return (
    <SidePanel title={faq ? "Edit FAQ" : "Add FAQ"} onClose={onClose}>
      <FormField label="Keyword (case-insensitive, matched anywhere in the guest's question)">
        <input style={textInput} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. pool" />
      </FormField>
      <FormField label="Example question (shown to staff for reference only)">
        <input style={textInput} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. What time does the pool close?" />
      </FormField>
      <FormField label="Answer shown to the guest">
        <textarea
          style={{ ...textInput, width: "100%", resize: "vertical" }}
          rows={4}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </FormField>
      <FormField label="Status">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </FormField>

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </SidePanel>
  );
}
