// /staff — invite, role, department, activate/deactivate
// (docs/ARCHITECTURE.md section 6). Hotel-admin only, enforced both by
// RequireCapability on the route and by staff_users' own RLS ("hotel admin
// manages own hotel roster").
import { useState } from "react";
import type { StaffRole, StaffStatus } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import SidePanel, { FormField } from "../components/SidePanel";
import { useDepartments } from "../hooks/useDepartments";
import { useStaffAdmin, type AdminStaffMember } from "../hooks/useStaffAdmin";
import { card, dangerButton, primaryButton, secondaryButton, selectInput, textInput } from "../lib/styles";
import { supabase } from "../supabase";

const ROLE_LABELS: Record<StaffRole, string> = {
  hotel_admin: "Hotel Admin",
  manager: "Manager",
  staff: "Staff",
};

export default function StaffScreen() {
  const { staff: currentStaff } = useAuth();
  const { staff, loading, reload } = useStaffAdmin();
  const departments = useDepartments();
  const [editing, setEditing] = useState<AdminStaffMember | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  async function handleToggleStatus(member: AdminStaffMember) {
    const nextStatus: StaffStatus = member.status === "active" ? "inactive" : "active";
    const { error: updateError } = await supabase.from("staff_users").update({ status: nextStatus }).eq("id", member.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setError(null);
    await reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h1 style={{ fontSize: "var(--ra-text-2xl)", margin: 0 }}>Staff</h1>
        <button style={primaryButton} onClick={() => setEditing("new")}>
          + Invite Staff
        </button>
      </div>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      {tempPassword && (
        <div style={{ ...card, padding: "var(--ra-space-4)", marginBottom: "var(--ra-space-4)", border: "1px solid var(--ra-color-accent)" }}>
          <strong>{tempPassword.email}</strong> was created with temporary password:{" "}
          <code style={{ background: "var(--ra-color-surface-sunken)", padding: "2px 6px", borderRadius: 4 }}>{tempPassword.password}</code>
          <div style={{ fontSize: "var(--ra-text-sm)", color: "var(--ra-color-text-secondary)", marginTop: "var(--ra-space-2)" }}>
            Share this with them directly — it won't be shown again.
          </div>
          <button style={{ ...secondaryButton, marginTop: "var(--ra-space-3)" }} onClick={() => setTempPassword(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Name", "Email", "Role", "Department", "Status", ""].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                    {s.full_name}
                    {s.id === currentStaff?.id && <span style={{ color: "var(--ra-color-text-secondary)" }}> (you)</span>}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.email}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{ROLE_LABELS[s.role]}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.departmentName ?? "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.status === "active" ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditing(s)}>
                      Edit
                    </button>
                    {s.id !== currentStaff?.id && (
                      <button style={dangerButton} onClick={() => void handleToggleStatus(s)}>
                        {s.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing === "new" && (
        <InviteStaffForm
          departments={departments}
          onClose={() => setEditing(null)}
          onInvited={async (email, password) => {
            setEditing(null);
            setTempPassword({ email, password });
            await reload();
          }}
        />
      )}

      {editing && editing !== "new" && (
        <EditStaffForm
          member={editing}
          departments={departments}
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

function InviteStaffForm({
  departments,
  onClose,
  onInvited,
}: {
  departments: { id: string; name: string }[];
  onClose: () => void;
  onInvited: (email: string, password: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!fullName.trim() || !email.trim()) return;
    if (role === "staff" && !departmentId) {
      setError("Plain staff must belong to a department.");
      return;
    }
    setBusy(true);
    setError(null);

    const { data, error: invokeError } = await supabase.functions.invoke<{ id: string; tempPassword: string; error?: string }>(
      "invite-staff",
      { body: { email: email.trim(), fullName: fullName.trim(), role, departmentId: role === "staff" ? departmentId : null } },
    );

    setBusy(false);
    if (invokeError || !data || data.error) {
      const code = data?.error;
      setError(
        code === "email_already_registered"
          ? "That email is already registered."
          : code === "department_required_for_staff_role"
            ? "Plain staff must belong to a department."
            : "Couldn't create the staff account. Make sure the invite-staff function is deployed.",
      );
      return;
    }
    onInvited(email.trim(), data.tempPassword);
  }

  return (
    <SidePanel title="Invite Staff" onClose={onClose}>
      <FormField label="Full name">
        <input style={textInput} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </FormField>
      <FormField label="Email">
        <input style={textInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <FormField label="Role">
        <select style={selectInput} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="hotel_admin">Hotel Admin</option>
        </select>
      </FormField>
      {role === "staff" && (
        <FormField label="Department">
          <select style={selectInput} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy || !fullName.trim() || !email.trim()} onClick={() => void handleSubmit()}>
        {busy ? "Creating…" : "Create Account"}
      </button>
    </SidePanel>
  );
}

function EditStaffForm({
  member,
  departments,
  onClose,
  onSaved,
}: {
  member: AdminStaffMember;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<StaffRole>(member.role);
  const [departmentId, setDepartmentId] = useState(member.department_id ?? departments[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (role === "staff" && !departmentId) {
      setError("Plain staff must belong to a department.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("staff_users")
      .update({ role, department_id: role === "staff" ? departmentId : null })
      .eq("id", member.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
  }

  return (
    <SidePanel title={`Edit ${member.full_name}`} onClose={onClose}>
      <FormField label="Role">
        <select style={selectInput} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
          <option value="hotel_admin">Hotel Admin</option>
        </select>
      </FormField>
      {role === "staff" && (
        <FormField label="Department">
          <select style={selectInput} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </SidePanel>
  );
}
