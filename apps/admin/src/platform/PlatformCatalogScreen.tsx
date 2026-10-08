// /platform/catalog — the shared "Explore the City" catalogue: categories,
// services and menu items with hotel_id = null, visible to every hotel's
// guests alongside that hotel's own catalogue (00000000000029_global_
// catalog.sql). A global shop has no single hotel's department to route
// requests to — each hotel instead picks its own fulfilling department in
// /settings (hotel_settings.city_services_department_id), so there's no
// department field anywhere on this screen.
import { useCallback, useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES, type CategoryType, type LanguageCode, type MenuItemStatus } from "@room-aura/shared";
import SidePanel, { FormField } from "../components/SidePanel";
import TranslationEditor, { type TranslationValue } from "../components/TranslationEditor";
import { card, dangerButton, primaryButton, secondaryButton, selectInput, textInput } from "../lib/styles";
import { supabase } from "../supabase";

const DEFAULT_LOCALE: LanguageCode = "en";
const CURRENCY = "USD";

const STATUS_LABELS: Record<MenuItemStatus, string> = {
  available: "Available",
  sold_out: "Sold Out",
  hidden: "Hidden",
};

interface GlobalCategory {
  id: string;
  category_type: CategoryType;
  icon: string | null;
  parent_category_id: string | null;
  is_active: boolean;
  displayName: string;
}

interface GlobalService {
  id: string;
  is_free: boolean;
  price_minor: number;
  expected_minutes: number | null;
  allows_quantity: boolean;
  max_quantity: number;
  allows_note: boolean;
  requires_scheduling: boolean;
  is_active: boolean;
  displayName: string;
}

interface GlobalMenuCategory {
  id: string;
  is_active: boolean;
  displayName: string;
}

interface GlobalMenuItem {
  id: string;
  price_minor: number;
  allergens: string[];
  status: MenuItemStatus;
  displayName: string;
}

function useGlobalCategories() {
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: rows }, { data: translationRows }] = await Promise.all([
      supabase
        .from("service_categories")
        .select("id, category_type, icon, parent_category_id, is_active, sort_order")
        .is("hotel_id", null)
        .order("sort_order"),
      supabase.from("service_category_translations").select("category_id, locale, name").is("hotel_id", null),
    ]);
    const names = new Map((translationRows ?? []).filter((t) => t.locale === DEFAULT_LOCALE).map((t) => [t.category_id, t.name]));
    setCategories((rows ?? []).map((c) => ({ ...c, displayName: names.get(c.id) ?? "(untranslated)" })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, reload };
}

export default function PlatformCatalogScreen() {
  const { categories, loading, reload } = useGlobalCategories();
  const [editingCategory, setEditingCategory] = useState<GlobalCategory | "new" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GlobalCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteCategory(cat: GlobalCategory) {
    if (!confirm(`Delete "${cat.displayName}"? This also deletes every service/menu item inside it, for every hotel. This can't be undone.`)) return;
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
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Explore the City (shared catalogue)</h1>
      <p style={{ color: "var(--ra-color-text-secondary)", marginTop: 0 }}>
        Every category, service and menu item here is visible to every hotel's guests — there's no per-hotel copy. Each hotel chooses which of
        its own departments fulfils these in its Settings screen.
      </p>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Categories</h2>
        <button style={primaryButton} onClick={() => setEditingCategory("new")}>
          + Add Category
        </button>
      </div>

      <div style={{ ...card, overflow: "hidden", marginBottom: "var(--ra-space-6)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Icon", "Name", "Type", "Parent", "Status", ""].map((h) => (
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
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No shared categories yet.
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
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>
                    {c.parent_category_id ? categories.find((p) => p.id === c.parent_category_id)?.displayName ?? "—" : "—"}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{c.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingCategory(c)}>
                      Edit
                    </button>
                    <button style={dangerButton} onClick={() => void handleDeleteCategory(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedCategory && selectedCategory.category_type === "menu" && (
        <GlobalMenuPanel key={selectedCategory.id} shopCategoryId={selectedCategory.id} />
      )}
      {selectedCategory && selectedCategory.category_type === "standard" && (
        <GlobalServicesPanel key={selectedCategory.id} category={selectedCategory} />
      )}

      {editingCategory && (
        <GlobalCategoryForm
          category={editingCategory === "new" ? null : editingCategory}
          parentOptions={categories.filter((c) => c.parent_category_id === null && c.id !== (editingCategory === "new" ? null : editingCategory.id))}
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

function GlobalCategoryForm({
  category,
  parentOptions,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  category: GlobalCategory | null;
  parentOptions: GlobalCategory[];
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [categoryType, setCategoryType] = useState<CategoryType>(category?.category_type ?? "standard");
  const [parentCategoryId, setParentCategoryId] = useState(category?.parent_category_id ?? "");
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
    const defaultName = translations[DEFAULT_LOCALE]?.name?.trim();
    if (!defaultName) {
      setError(`A name in the default language (${DEFAULT_LOCALE.toUpperCase()}) is required.`);
      return;
    }
    setBusy(true);
    setError(null);

    const payload = {
      icon: icon.trim() || null,
      category_type: categoryType,
      parent_category_id: parentCategoryId || null,
      is_active: isActive,
    };
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
        .insert({ hotel_id: null, ...payload, sort_order: nextSortOrder })
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
      .map(([locale, v]) => ({ category_id: categoryId, hotel_id: null, locale, name: v!.name.trim(), description: v!.description?.trim() || null }));
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
        <input style={textInput} value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. 💊" />
      </FormField>
      <FormField label="Type">
        <select style={selectInput} value={categoryType} onChange={(e) => setCategoryType(e.target.value as CategoryType)}>
          <option value="standard">Standard (bookable services)</option>
          <option value="menu">Menu / shop (orderable items)</option>
        </select>
      </FormField>
      <FormField label="Parent category (optional)">
        <select style={selectInput} value={parentCategoryId} onChange={(e) => setParentCategoryId(e.target.value)}>
          <option value="">(top-level — shown directly on the home screen)</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Status">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </FormField>

      <TranslationEditor
        locales={[...SUPPORTED_LANGUAGES]}
        defaultLocale={DEFAULT_LOCALE}
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

function useGlobalServices(categoryId: string) {
  const [services, setServices] = useState<GlobalService[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: rows }, { data: translationRows }] = await Promise.all([
      supabase
        .from("services")
        .select("id, is_free, price_minor, expected_minutes, allows_quantity, max_quantity, allows_note, requires_scheduling, is_active, sort_order")
        .eq("category_id", categoryId)
        .order("sort_order"),
      supabase.from("service_translations").select("service_id, locale, name").is("hotel_id", null),
    ]);
    const names = new Map((translationRows ?? []).filter((t) => t.locale === DEFAULT_LOCALE).map((t) => [t.service_id, t.name]));
    setServices((rows ?? []).map((s) => ({ ...s, displayName: names.get(s.id) ?? "(untranslated)" })));
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { services, loading, reload };
}

function GlobalServicesPanel({ category }: { category: GlobalCategory }) {
  const { services, loading, reload } = useGlobalServices(category.id);
  const [editingService, setEditingService] = useState<GlobalService | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(service: GlobalService) {
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
        <button style={primaryButton} onClick={() => setEditingService("new")}>
          + Add Service
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
              {["Name", "Price", "Booking", "Status", ""].map((h) => (
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
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No services in this category yet.
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{s.displayName}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.is_free ? "Free" : `${(s.price_minor / 100).toFixed(2)} ${CURRENCY}`}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.requires_scheduling ? "Date & time" : "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{s.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingService(s)}>
                      Edit
                    </button>
                    <button style={dangerButton} onClick={() => void handleDelete(s)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingService && (
        <GlobalServiceForm
          service={editingService === "new" ? null : editingService}
          categoryId={category.id}
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

function GlobalServiceForm({
  service,
  categoryId,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  service: GlobalService | null;
  categoryId: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
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
    const defaultName = translations[DEFAULT_LOCALE]?.name?.trim();
    if (!defaultName) {
      setError(`A name in the default language (${DEFAULT_LOCALE.toUpperCase()}) is required.`);
      return;
    }
    setBusy(true);
    setError(null);

    const payload = {
      is_free: isFree,
      price_minor: isFree ? 0 : Math.round(parseFloat(priceMinor || "0") * 100),
      currency: CURRENCY,
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
        .insert({ hotel_id: null, category_id: categoryId, department_id: null, ...payload, sort_order: nextSortOrder })
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
      .map(([locale, v]) => ({ service_id: serviceId, hotel_id: null, locale, name: v!.name.trim(), description: v!.description?.trim() || null }));
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
            placeholder={`Price in ${CURRENCY}`}
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
      <FormField label="Booking">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={requiresScheduling} onChange={(e) => setRequiresScheduling(e.target.checked)} />
          Guest must pick a date &amp; time
        </label>
      </FormField>
      <FormField label="Status">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </FormField>

      <TranslationEditor
        locales={[...SUPPORTED_LANGUAGES]}
        defaultLocale={DEFAULT_LOCALE}
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

function useGlobalMenuCategories(shopCategoryId: string) {
  const [categories, setCategories] = useState<GlobalMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: rows }, { data: translationRows }] = await Promise.all([
      supabase.from("menu_categories").select("id, is_active, sort_order").eq("service_category_id", shopCategoryId).order("sort_order"),
      supabase.from("menu_category_translations").select("menu_category_id, locale, name").is("hotel_id", null),
    ]);
    const names = new Map((translationRows ?? []).filter((t) => t.locale === DEFAULT_LOCALE).map((t) => [t.menu_category_id, t.name]));
    setCategories((rows ?? []).map((c) => ({ ...c, displayName: names.get(c.id) ?? "(untranslated)" })));
    setLoading(false);
  }, [shopCategoryId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { categories, loading, reload };
}

function GlobalMenuPanel({ shopCategoryId }: { shopCategoryId: string }) {
  const { categories, loading, reload } = useGlobalMenuCategories(shopCategoryId);
  const [editingCategory, setEditingCategory] = useState<GlobalMenuCategory | "new" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GlobalMenuCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteCategory(cat: GlobalMenuCategory) {
    if (!confirm(`Delete "${cat.displayName}"? This also deletes every item inside it. This can't be undone.`)) return;
    const { error: deleteError } = await supabase.from("menu_categories").delete().eq("id", cat.id);
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
      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Menu Categories</h2>
        <button style={primaryButton} onClick={() => setEditingCategory("new")}>
          + Add Category
        </button>
      </div>

      <div style={{ ...card, overflow: "hidden", marginBottom: "var(--ra-space-6)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ra-text-sm)" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "var(--ra-color-surface-sunken)" }}>
              {["Name", "Status", ""].map((h) => (
                <th key={h} style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  Loading…
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No menu categories yet.
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
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{c.displayName}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{c.is_active ? "Active" : "Inactive"}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                    <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingCategory(c)}>
                      Edit
                    </button>
                    <button style={dangerButton} onClick={() => void handleDeleteCategory(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedCategory && <GlobalMenuItemsPanel category={selectedCategory} />}

      {editingCategory && (
        <GlobalMenuCategoryForm
          category={editingCategory === "new" ? null : editingCategory}
          shopCategoryId={shopCategoryId}
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

function GlobalMenuCategoryForm({
  category,
  shopCategoryId,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  category: GlobalMenuCategory | null;
  shopCategoryId: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const [translations, setTranslations] = useState<Partial<Record<LanguageCode, TranslationValue>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) return;
    supabase
      .from("menu_category_translations")
      .select("locale, name")
      .eq("menu_category_id", category.id)
      .then(({ data }) => {
        const map: Partial<Record<LanguageCode, TranslationValue>> = {};
        for (const row of data ?? []) map[row.locale as LanguageCode] = { name: row.name };
        setTranslations(map);
      });
  }, [category]);

  async function handleSubmit() {
    const defaultName = translations[DEFAULT_LOCALE]?.name?.trim();
    if (!defaultName) {
      setError(`A name in the default language (${DEFAULT_LOCALE.toUpperCase()}) is required.`);
      return;
    }
    setBusy(true);
    setError(null);

    let categoryId = category?.id;
    if (category) {
      const { error: updateError } = await supabase.from("menu_categories").update({ is_active: isActive }).eq("id", category.id);
      if (updateError) {
        setBusy(false);
        setError(updateError.message);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("menu_categories")
        .insert({ hotel_id: null, service_category_id: shopCategoryId, is_active: isActive, sort_order: nextSortOrder })
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
      .map(([locale, v]) => ({ menu_category_id: categoryId, hotel_id: null, locale, name: v!.name.trim() }));
    if (rows.length > 0) {
      const { error: translationError } = await supabase
        .from("menu_category_translations")
        .upsert(rows, { onConflict: "menu_category_id,locale" });
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
      <FormField label="Status">
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ra-space-2)" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </FormField>

      <TranslationEditor
        locales={[...SUPPORTED_LANGUAGES]}
        defaultLocale={DEFAULT_LOCALE}
        values={translations}
        onChange={(locale, value) => setTranslations((prev) => ({ ...prev, [locale]: value }))}
        hasDescription={false}
      />

      {error && <div style={{ color: "var(--ra-color-danger)", fontSize: "var(--ra-text-sm)", marginBottom: "var(--ra-space-4)" }}>{error}</div>}

      <button style={primaryButton} disabled={busy} onClick={() => void handleSubmit()}>
        {busy ? "Saving…" : "Save"}
      </button>
    </SidePanel>
  );
}

function useGlobalMenuItems(categoryId: string) {
  const [items, setItems] = useState<GlobalMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: rows }, { data: translationRows }] = await Promise.all([
      supabase.from("menu_items").select("id, price_minor, allergens, status, sort_order").eq("menu_category_id", categoryId).order("sort_order"),
      supabase.from("menu_item_translations").select("menu_item_id, locale, name").is("hotel_id", null),
    ]);
    const names = new Map((translationRows ?? []).filter((t) => t.locale === DEFAULT_LOCALE).map((t) => [t.menu_item_id, t.name]));
    setItems((rows ?? []).map((i) => ({ ...i, displayName: names.get(i.id) ?? "(untranslated)" })));
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, reload };
}

function GlobalMenuItemsPanel({ category }: { category: GlobalMenuCategory }) {
  const { items, loading, reload } = useGlobalMenuItems(category.id);
  const [editingItem, setEditingItem] = useState<GlobalMenuItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(item: GlobalMenuItem) {
    if (!confirm(`Delete "${item.displayName}"? Past orders that included it are unaffected.`)) return;
    const { error: deleteError } = await supabase.from("menu_items").delete().eq("id", item.id);
    if (deleteError) {
      setError(`Couldn't delete "${item.displayName}" — ${deleteError.message}`);
      return;
    }
    setError(null);
    await reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Items in "{category.displayName}"</h2>
        <button style={primaryButton} onClick={() => setEditingItem("new")}>
          + Add Item
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
              {["Name", "Price", "Allergens", "Status", ""].map((h) => (
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
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "var(--ra-space-4)", color: "var(--ra-color-text-secondary)" }}>
                  No items in this category yet.
                </td>
              </tr>
            ) : (
              items.map((i) => (
                <tr key={i.id} style={{ borderTop: "1px solid var(--ra-color-border)" }}>
                  <td style={{ padding: "var(--ra-space-3)", fontWeight: 600 }}>{i.displayName}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>
                    {(i.price_minor / 100).toFixed(2)} {CURRENCY}
                  </td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>{i.allergens.join(", ") || "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{STATUS_LABELS[i.status]}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingItem(i)}>
                      Edit
                    </button>
                    <button style={dangerButton} onClick={() => void handleDelete(i)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <GlobalMenuItemForm
          item={editingItem === "new" ? null : editingItem}
          categoryId={category.id}
          nextSortOrder={items.length}
          onClose={() => setEditingItem(null)}
          onSaved={async () => {
            setEditingItem(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function GlobalMenuItemForm({
  item,
  categoryId,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  item: GlobalMenuItem | null;
  categoryId: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [price, setPrice] = useState(item ? (item.price_minor / 100).toString() : "");
  const [allergens, setAllergens] = useState(item?.allergens.join(", ") ?? "");
  const [status, setStatus] = useState<MenuItemStatus>(item?.status ?? "available");
  const [translations, setTranslations] = useState<Partial<Record<LanguageCode, TranslationValue>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    supabase
      .from("menu_item_translations")
      .select("locale, name, description")
      .eq("menu_item_id", item.id)
      .then(({ data }) => {
        const map: Partial<Record<LanguageCode, TranslationValue>> = {};
        for (const row of data ?? []) map[row.locale as LanguageCode] = { name: row.name, description: row.description ?? "" };
        setTranslations(map);
      });
  }, [item]);

  async function handleSubmit() {
    const defaultName = translations[DEFAULT_LOCALE]?.name?.trim();
    if (!defaultName) {
      setError(`A name in the default language (${DEFAULT_LOCALE.toUpperCase()}) is required.`);
      return;
    }
    const priceMinor = Math.round(parseFloat(price || "0") * 100);
    if (Number.isNaN(priceMinor) || priceMinor < 0) {
      setError("Enter a valid price.");
      return;
    }
    setBusy(true);
    setError(null);

    const payload = {
      price_minor: priceMinor,
      currency: CURRENCY,
      allergens: allergens
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      status,
    };

    let itemId = item?.id;
    if (item) {
      const { error: updateError } = await supabase.from("menu_items").update(payload).eq("id", item.id);
      if (updateError) {
        setBusy(false);
        setError(updateError.message);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("menu_items")
        .insert({ hotel_id: null, menu_category_id: categoryId, ...payload, sort_order: nextSortOrder })
        .select("id")
        .single();
      if (insertError || !data) {
        setBusy(false);
        setError(insertError?.message ?? "Couldn't create item.");
        return;
      }
      itemId = data.id;
    }

    const rows = Object.entries(translations)
      .filter(([, v]) => v?.name?.trim())
      .map(([locale, v]) => ({ menu_item_id: itemId, hotel_id: null, locale, name: v!.name.trim(), description: v!.description?.trim() || null }));
    if (rows.length > 0) {
      const { error: translationError } = await supabase.from("menu_item_translations").upsert(rows, { onConflict: "menu_item_id,locale" });
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
    <SidePanel title={item ? "Edit Item" : "Add Item"} onClose={onClose}>
      <FormField label={`Price (${CURRENCY})`}>
        <input style={textInput} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
      </FormField>
      <FormField label="Allergens (comma-separated, optional)">
        <input style={textInput} value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="e.g. gluten, dairy" />
      </FormField>
      <FormField label="Status">
        <select style={selectInput} value={status} onChange={(e) => setStatus(e.target.value as MenuItemStatus)}>
          {(["available", "sold_out", "hidden"] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </FormField>

      <TranslationEditor
        locales={[...SUPPORTED_LANGUAGES]}
        defaultLocale={DEFAULT_LOCALE}
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
