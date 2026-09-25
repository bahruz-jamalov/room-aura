// /departments — department CRUD (docs/ARCHITECTURE.md section 6). Admin or
// manager only (packages/shared/src/permissions.ts canManageRoomsAndDepartments);
// AdminLayout hides the nav item for plain staff entirely.
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import SidePanel, { FormField } from "../components/SidePanel";
import { useDepartmentsAdmin, type AdminDepartment } from "../hooks/useDepartmentsAdmin";
import { card, dangerButton, primaryButton, secondaryButton, textInput } from "../lib/styles";
import { supabase } from "../supabase";

export default function DepartmentsScreen() {
  const { staff } = useAuth();
  const { departments, loading, reload } = useDepartmentsAdmin();
  const [editing, setEditing] = useState<AdminDepartment | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(dept: AdminDepartment) {
    if (!confirm(`Delete "${dept.name}"? This only works if no services or requests reference it.`)) return;
    const { error: deleteError } = await supabase.from("departments").delete().eq("id", dept.id);
    if (deleteError) {
      setError(`Couldn't delete "${dept.name}" — it's still in use by a service or request. Deactivate it instead.`);
      return;
    }
    setError(null);
    await reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>Departments</h1>
        <button style={primaryButton} onClick={() => setEditing("new")}>
          + Add Department
        </button>
      </div>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Code", "Name", "Status", ""].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No departments yet.
                </td>
              </tr>
            ) : (
              departments.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>{d.code}</td>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{d.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditing(d)}>
                      Edit
                    </button>
                    <button style={dangerButton} onClick={() => void handleDelete(d)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && staff && (
        <DepartmentForm
          department={editing === "new" ? null : editing}
          hotelId={staff.hotelId}
          nextSortOrder={departments.length}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function DepartmentForm({
  department,
  hotelId,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  department: AdminDepartment | null;
  hotelId: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(department?.code ?? "");
  const [name, setName] = useState(department?.name ?? "");
  const [isActive, setIsActive] = useState(department?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!code.trim() || !name.trim()) return;
    setBusy(true);
    setError(null);
    const { error: saveError } = department
      ? await supabase.from("departments").update({ code: code.trim(), name: name.trim(), is_active: isActive }).eq("id", department.id)
      : await supabase
          .from("departments")
          .insert({ hotel_id: hotelId, code: code.trim(), name: name.trim(), is_active: isActive, sort_order: nextSortOrder });
    setBusy(false);
    if (saveError) {
      setError(saveError.message.includes("duplicate") ? "A department with that code already exists." : saveError.message);
      return;
    }
    onSaved();
  }

  return (
    <SidePanel title={department ? "Edit Department" : "Add Department"} onClose={onClose}>
      <FormField label="Code">
        <input
          style={textInput}
          value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
          placeholder="e.g. spa"
        />
      </FormField>
      <FormField label="Name">
        <input style={textInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spa" />
      </FormField>
      <FormField label="Status">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </FormField>

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy || !code.trim() || !name.trim()} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </SidePanel>
  );
}
