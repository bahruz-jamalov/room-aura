// /services — categories & services CRUD + translations editor
// (docs/ARCHITECTURE.md section 6). Visible to every staff role; only
// admin/manager (canManageCatalogue) get edit controls — plain staff see a
// read-only catalogue, matching the "read" cell in the roles matrix.
import { useEffect, useState } from "react";
import { permissions, type LanguageCode } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import SidePanel, { FormField } from "../components/SidePanel";
import TranslationEditor, { type TranslationValue } from "../components/TranslationEditor";
import { useDepartments } from "../hooks/useDepartments";
import { useHotel } from "../hooks/useHotel";
import { useServiceCategoriesAdmin, type AdminServiceCategory } from "../hooks/useServiceCategoriesAdmin";
import { useServicesAdmin, type AdminService } from "../hooks/useServicesAdmin";
import { card, dangerButton, primaryButton, secondaryButton, selectInput, textInput } from "../lib/styles";
import { supabase } from "../supabase";

export default function ServicesScreen() {
  const { staff } = useAuth();
  const hotel = useHotel();
  const canEdit = staff ? permissions.canManageCatalogue(staff) : false;
  const { categories, loading, reload } = useServiceCategoriesAdmin(hotel?.defaultLocale ?? null);
  const [editingCategory, setEditingCategory] = useState<AdminServiceCategory | "new" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AdminServiceCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteCategory(cat: AdminServiceCategory) {
    // service_categories -> services is ON DELETE CASCADE, not RESTRICT:
    // deleting a category silently deletes every service inside it too
    // (and their translations). No safety net at the database level, so
    // the confirm has to say so plainly instead of implying protection
    // that doesn't exist.
    if (!confirm(`Delete "${cat.displayName}"? This also deletes every service inside it. This can't be undone.`)) return;
    const { error: deleteError } = await supabase.from("service_categories").delete().eq("id", cat.id);
    if (deleteError) {
      setError(`Couldn't delete "${cat.displayName}" — ${deleteError.message}`);
      return;
    }
    setError(null);
    if (selectedCategory?.id === cat.id) setSelectedCategory(null);
    await reload();
  }

  return (
    <div>
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Services</h1>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Categories</h2>
        {canEdit && (
          <button style={primaryButton} onClick={() => setEditingCategory("new")}>
            + Add Category
          </button>
        )}
      </div>

      <div style={{ ...card, overflow: "hidden", marginBottom: "var(--ra-space-6)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Icon", "Name", "Type", "Status", ""].map((h) => (
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
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCategory(c)}
                  style={{
                    borderTop: "1px solid var(--ra-color-border)",
                    cursor: "pointer",
                    background: selectedCategory?.id === c.id ? "var(--ra-color-accent-soft)" : undefined,
                  }}
                >
                  <td style={{ padding: "var(--ra-space-3)" }}>{c.icon ?? "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{c.displayName}</td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>{c.category_type}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{c.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <>
                        <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingCategory(c)}>
                          Edit
                        </button>
                        <button style={dangerButton} onClick={() => void handleDeleteCategory(c)}>
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

      {selectedCategory && hotel && <ServicesForCategory category={selectedCategory} hotel={hotel} canEdit={canEdit} />}

      {editingCategory && staff && hotel && (
        <CategoryForm
          category={editingCategory === "new" ? null : editingCategory}
          hotelId={staff.hotelId}
          hotel={hotel}
          nextSortOrder={categories.length}
          onClose={() => setEditingCategory(null)}
          onSaved={async () => {
            setEditingCategory(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function ServicesForCategory({
  category,
  hotel,
  canEdit,
}: {
  category: AdminServiceCategory;
  hotel: { id: string; defaultLocale: LanguageCode; supportedLocales: LanguageCode[]; currency: string };
  canEdit: boolean;
}) {
  const { services, loading, reload } = useServicesAdmin(category.id, hotel.defaultLocale);
  const departments = useDepartments();
  const [editingService, setEditingService] = useState<AdminService | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(service: AdminService) {
    if (!confirm(`Delete "${service.displayName}"? This only works if it has no requests on record.`)) return;
    const { error: deleteError } = await supabase.from("services").delete().eq("id", service.id);
    if (deleteError) {
      setError(`Couldn't delete "${service.displayName}" — it has requests on record. Deactivate it instead.`);
      return;
    }
    setError(null);
    await reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Services in "{category.displayName}"</h2>
        {canEdit && (
          <button style={primaryButton} onClick={() => setEditingService("new")}>
            + Add Service
          </button>
        )}
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
              {["Name", "Department", "Price", "Status", ""].map((h) => (
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
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No services in this category yet.
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{s.displayName}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.departmentName}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.is_free ? "Free" : `${(s.price_minor / 100).toFixed(2)} ${s.currency}`}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    {canEdit && (
                      <>
                        <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingService(s)}>
                          Edit
                        </button>
                        <button style={dangerButton} onClick={() => void handleDelete(s)}>
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

      {editingService && (
        <ServiceForm
          service={editingService === "new" ? null : editingService}
          categoryId={category.id}
          hotelId={hotel.id}
          hotel={hotel}
          departments={departments}
          nextSortOrder={services.length}
          onClose={() => setEditingService(null)}
          onSaved={async () => {
            setEditingService(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function CategoryForm({
  category,
  hotelId,
  hotel,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  category: AdminServiceCategory | null;
  hotelId: string;
  hotel: { defaultLocale: LanguageCode; supportedLocales: LanguageCode[] };
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [categoryType, setCategoryType] = useState<"standard" | "menu">(category?.category_type ?? "standard");
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [translations, setTranslations] = useState<Partial<Record<LanguageCode, TranslationValue>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) return;
    supabase
      .from("service_category_translations")
      .select("locale, name, description")
      .eq("category_id", category.id)
      .then(({ data }) => {
        const map: Partial<Record<LanguageCode, TranslationValue>> = {};
        for (const row of data ?? []) map[row.locale as LanguageCode] = { name: row.name, description: row.description ?? "" };
        setTranslations(map);
      });
  }, [category]);

  async function handleSubmit() {
    const defaultName = translations[hotel.defaultLocale]?.name?.trim();
    if (!defaultName) {
      setError(`A name in the default language (${hotel.defaultLocale.toUpperCase()}) is required.`);
      return;
    }
    setBusy(true);
    setError(null);

    const payload = { icon: icon.trim() || null, category_type: categoryType, is_active: isActive };
    let categoryId = category?.id;
    if (category) {
      const { error: updateError } = await supabase.from("service_categories").update(payload).eq("id", category.id);
      if (updateError) {
        setBusy(false);
        setError(updateError.message);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("service_categories")
        .insert({ hotel_id: hotelId, ...payload, sort_order: nextSortOrder })
        .select("id")
        .single();
      if (insertError || !data) {
        setBusy(false);
        setError(insertError?.message ?? "Couldn't create category.");
        return;
      }
      categoryId = data.id;
    }

    const rows = Object.entries(translations)
      .filter(([, v]) => v?.name?.trim())
      .map(([locale, v]) => ({ category_id: categoryId, locale, name: v!.name.trim(), description: v!.description?.trim() || null }));
    if (rows.length > 0) {
      const { error: translationError } = await supabase.from("service_category_translations").upsert(rows, { onConflict: "category_id,locale" });
      if (translationError) {
        setBusy(false);
        setError(translationError.message);
        return;
      }
    }

    setBusy(false);
    onSaved();
  }

  return (
    <SidePanel title={category ? "Edit Category" : "Add Category"} onClose={onClose}>
      <FormField label="Icon (emoji)">
        <input style={textInput} value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. 🧺" />
      </FormField>
      <FormField label="Type">
        <select style={selectInput} value={categoryType} onChange={(e) => setCategoryType(e.target.value as "standard" | "menu")}>
          <option value="standard">Standard (service category)</option>
          <option value="menu">Menu tile (links to Food &amp; Drinks)</option>
        </select>
      </FormField>
      <FormField label="Status">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </FormField>

      <TranslationEditor
        locales={hotel.supportedLocales}
        defaultLocale={hotel.defaultLocale}
        values={translations}
        onChange={(locale, value) => setTranslations((prev) => ({ ...prev, [locale]: value }))}
      />

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </SidePanel>
  );
}

function ServiceForm({
  service,
  categoryId,
  hotelId,
  hotel,
  departments,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  service: AdminService | null;
  categoryId: string;
  hotelId: string;
  hotel: { defaultLocale: LanguageCode; supportedLocales: LanguageCode[]; currency: string };
  departments: { id: string; name: string }[];
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [departmentId, setDepartmentId] = useState(service?.department_id ?? departments[0]?.id ?? "");
  const [isFree, setIsFree] = useState(service?.is_free ?? true);
  const [priceMinor, setPriceMinor] = useState(service ? (service.price_minor / 100).toString() : "0");
  const [expectedMinutes, setExpectedMinutes] = useState(service?.expected_minutes?.toString() ?? "");
  const [allowsQuantity, setAllowsQuantity] = useState(service?.allows_quantity ?? false);
  const [maxQuantity, setMaxQuantity] = useState(service?.max_quantity?.toString() ?? "1");
  const [allowsNote, setAllowsNote] = useState(service?.allows_note ?? true);
  const [requiresScheduling, setRequiresScheduling] = useState(service?.requires_scheduling ?? false);
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [translations, setTranslations] = useState<Partial<Record<LanguageCode, TranslationValue>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!service) return;
    supabase
      .from("service_translations")
      .select("locale, name, description")
      .eq("service_id", service.id)
      .then(({ data }) => {
        const map: Partial<Record<LanguageCode, TranslationValue>> = {};
        for (const row of data ?? []) map[row.locale as LanguageCode] = { name: row.name, description: row.description ?? "" };
        setTranslations(map);
      });
  }, [service]);

  async function handleSubmit() {
    const defaultName = translations[hotel.defaultLocale]?.name?.trim();
    if (!defaultName) {
      setError(`A name in the default language (${hotel.defaultLocale.toUpperCase()}) is required.`);
      return;
    }
    if (!departmentId) {
      setError("Choose a department.");
      return;
    }
    setBusy(true);
    setError(null);

    const payload = {
      department_id: departmentId,
      is_free: isFree,
      price_minor: isFree ? 0 : Math.round(parseFloat(priceMinor || "0") * 100),
      currency: hotel.currency,
      expected_minutes: expectedMinutes ? parseInt(expectedMinutes, 10) : null,
      allows_quantity: allowsQuantity,
      max_quantity: allowsQuantity ? parseInt(maxQuantity || "1", 10) : 1,
      allows_note: allowsNote,
      requires_scheduling: requiresScheduling,
      is_active: isActive,
    };

    let serviceId = service?.id;
    if (service) {
      const { error: updateError } = await supabase.from("services").update(payload).eq("id", service.id);
      if (updateError) {
        setBusy(false);
        setError(updateError.message);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("services")
        .insert({ hotel_id: hotelId, category_id: categoryId, ...payload, sort_order: nextSortOrder })
        .select("id")
        .single();
      if (insertError || !data) {
        setBusy(false);
        setError(insertError?.message ?? "Couldn't create service.");
        return;
      }
      serviceId = data.id;
    }

    const rows = Object.entries(translations)
      .filter(([, v]) => v?.name?.trim())
      .map(([locale, v]) => ({ service_id: serviceId, locale, name: v!.name.trim(), description: v!.description?.trim() || null }));
    if (rows.length > 0) {
      const { error: translationError } = await supabase.from("service_translations").upsert(rows, { onConflict: "service_id,locale" });
      if (translationError) {
        setBusy(false);
        setError(translationError.message);
        return;
      }
    }

    setBusy(false);
    onSaved();
  }

  return (
    <SidePanel title={service ? "Edit Service" : "Add Service"} onClose={onClose}>
      <FormField label="Department">
        <select style={selectInput} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Pricing">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)", marginBottom: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Free
        </label>
        {!isFree && (
          <input
            style={textInput}
            type="number"
            step="0.01"
            value={priceMinor}
            onChange={(e) => setPriceMinor(e.target.value)}
            placeholder={`Price in ${hotel.currency}`}
          />
        )}
      </FormField>
      <FormField label="Expected time (minutes, optional)">
        <input style={textInput} type="number" value={expectedMinutes} onChange={(e) => setExpectedMinutes(e.target.value)} />
      </FormField>
      <FormField label="Quantity">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)", marginBottom: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={allowsQuantity} onChange={(e) => setAllowsQuantity(e.target.checked)} />
          Guest can choose a quantity
        </label>
        {allowsQuantity && (
          <input style={textInput} type="number" min={1} value={maxQuantity} onChange={(e) => setMaxQuantity(e.target.value)} placeholder="Max quantity" />
        )}
      </FormField>
      <FormField label="Note">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={allowsNote} onChange={(e) => setAllowsNote(e.target.checked)} />
          Guest can add a note
        </label>
      </FormField>
      <FormField label="Status">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </FormField>

      <TranslationEditor
        locales={hotel.supportedLocales}
        defaultLocale={hotel.defaultLocale}
        values={translations}
        onChange={(locale, value) => setTranslations((prev) => ({ ...prev, [locale]: value }))}
      />

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </SidePanel>
  );
}
