// /menu — menu categories & items, Available / Sold Out / Hidden
// (docs/ARCHITECTURE.md section 6). Same visibility rule as /services:
// everyone can see the menu, only admin/manager can edit it.
import { useEffect, useState } from "react";
import { permissions, type LanguageCode, type MenuItemStatus } from "@room-aura/shared";
import { useAuth } from "../auth/AuthContext";
import SidePanel, { FormField } from "../components/SidePanel";
import TranslationEditor, { type TranslationValue } from "../components/TranslationEditor";
import { useHotel } from "../hooks/useHotel";
import { useMenuCategoriesAdmin, type AdminMenuCategory } from "../hooks/useMenuCategoriesAdmin";
import { useMenuItemsAdmin, type AdminMenuItem } from "../hooks/useMenuItemsAdmin";
import { card, dangerButton, primaryButton, secondaryButton, selectInput, textInput } from "../lib/styles";
import { supabase } from "../supabase";

const STATUS_LABELS: Record<MenuItemStatus, string> = {
  available: "Available",
  sold_out: "Sold Out",
  hidden: "Hidden",
};

export default function MenuScreen() {
  const { staff } = useAuth();
  const hotel = useHotel();
  const canEdit = staff ? permissions.canManageCatalogue(staff) : false;
  const { categories, loading, reload } = useMenuCategoriesAdmin(hotel?.defaultLocale ?? null);
  const [editingCategory, setEditingCategory] = useState<AdminMenuCategory | "new" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AdminMenuCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteCategory(cat: AdminMenuCategory) {
    // menu_categories -> menu_items is ON DELETE CASCADE, not RESTRICT: see
    // the matching comment on ServicesScreen's category delete.
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
      <h1 style={{ fontSize: "var(--ra-text-2xl)", marginTop: 0 }}>Food &amp; Drinks</h1>

      {error && (
        <div style={{ ...card, padding: "var(--ra-space-3) var(--ra-space-4)", marginBottom: "var(--ra-space-4)", color: "var(--ra-color-danger)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ra-space-4)" }}>
        <h2 style={{ fontSize: "var(--ra-text-lg)", margin: 0 }}>Menu Categories</h2>
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

      {selectedCategory && hotel && <ItemsForCategory category={selectedCategory} hotel={hotel} canEdit={canEdit} />}

      {editingCategory && staff && hotel && (
        <MenuCategoryForm
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

function ItemsForCategory({
  category,
  hotel,
  canEdit,
}: {
  category: AdminMenuCategory;
  hotel: { id: string; defaultLocale: LanguageCode; supportedLocales: LanguageCode[]; currency: string };
  canEdit: boolean;
}) {
  const { items, loading, reload } = useMenuItemsAdmin(category.id, hotel.defaultLocale);
  const [editingItem, setEditingItem] = useState<AdminMenuItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(item: AdminMenuItem) {
    // Unlike services/rooms/departments, deleting a menu item is always safe:
    // order_items.menu_item_id is ON DELETE SET NULL (not RESTRICT) because
    // order history reads its own name/price snapshot, never a live join —
    // so a past order stays intact and readable even after this item is
    // gone. Prefer Hidden for a temporarily unavailable item; Delete is for
    // removing it from the menu for good.
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
        {canEdit && (
          <button style={primaryButton} onClick={() => setEditingItem("new")}>
            + Add Item
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
                  <td style={{ padding: "var(--ra-space-3)" }}>{(i.price_minor / 100).toFixed(2)} {i.currency}</td>
                  <td style={{ padding: "var(--ra-space-3)", color: "var(--ra-color-text-secondary)" }}>{i.allergens.join(", ") || "—"}</td>
                  <td style={{ padding: "var(--ra-space-3)" }}>{STATUS_LABELS[i.status]}</td>
                  <td style={{ padding: "var(--ra-space-3)", textAlign: "right", whiteSpace: "nowrap" }}>
                    {canEdit && (
                      <>
                        <button style={{ ...secondaryButton, marginRight: "var(--ra-space-2)" }} onClick={() => setEditingItem(i)}>
                          Edit
                        </button>
                        <button style={dangerButton} onClick={() => void handleDelete(i)}>
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

      {editingItem && (
        <MenuItemForm
          item={editingItem === "new" ? null : editingItem}
          categoryId={category.id}
          hotelId={hotel.id}
          hotel={hotel}
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

function MenuCategoryForm({
  category,
  hotelId,
  hotel,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  category: AdminMenuCategory | null;
  hotelId: string;
  hotel: { defaultLocale: LanguageCode; supportedLocales: LanguageCode[] };
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
    const defaultName = translations[hotel.defaultLocale]?.name?.trim();
    if (!defaultName) {
      setError(`A name in the default language (${hotel.defaultLocale.toUpperCase()}) is required.`);
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
        .insert({ hotel_id: hotelId, is_active: isActive, sort_order: nextSortOrder })
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
      .map(([locale, v]) => ({ menu_category_id: categoryId, locale, name: v!.name.trim() }));
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
        locales={hotel.supportedLocales}
        defaultLocale={hotel.defaultLocale}
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

function MenuItemForm({
  item,
  categoryId,
  hotelId,
  hotel,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  item: AdminMenuItem | null;
  categoryId: string;
  hotelId: string;
  hotel: { defaultLocale: LanguageCode; supportedLocales: LanguageCode[]; currency: string };
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [price, setPrice] = useState(item ? (item.price_minor / 100).toString() : "");
  const [prepMinutes, setPrepMinutes] = useState(item?.prep_minutes?.toString() ?? "");
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
    const defaultName = translations[hotel.defaultLocale]?.name?.trim();
    if (!defaultName) {
      setError(`A name in the default language (${hotel.defaultLocale.toUpperCase()}) is required.`);
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
      currency: hotel.currency,
      prep_minutes: prepMinutes ? parseInt(prepMinutes, 10) : null,
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
        .insert({ hotel_id: hotelId, menu_category_id: categoryId, ...payload, sort_order: nextSortOrder })
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
      .map(([locale, v]) => ({ menu_item_id: itemId, locale, name: v!.name.trim(), description: v!.description?.trim() || null }));
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
      <FormField label={`Price (${hotel.currency})`}>
        <input style={textInput} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
      </FormField>
      <FormField label="Prep time (minutes, optional)">
        <input style={textInput} type="number" value={prepMinutes} onChange={(e) => setPrepMinutes(e.target.value)} />
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
