// Reusable "translations editor" (docs/ARCHITECTURE.md section 6: "/services
// ... translations editor") for category/service/menu forms. Editing one
// locale at a time keeps the form usable for hotels supporting all 9
// languages instead of showing 9 stacked text areas.
import { useState } from "react";
import type { LanguageCode } from "@room-aura/shared";
import { FormField } from "./SidePanel";
import { selectInput, textInput } from "../lib/styles";

export interface TranslationValue {
  name: string;
  description?: string;
}

export default function TranslationEditor({
  locales,
  defaultLocale,
  values,
  onChange,
  hasDescription = true,
}: {
  locales: LanguageCode[];
  defaultLocale: LanguageCode;
  values: Partial<Record<LanguageCode, TranslationValue>>;
  onChange: (locale: LanguageCode, value: TranslationValue) => void;
  hasDescription?: boolean;
}) {
  const [activeLocale, setActiveLocale] = useState<LanguageCode>(defaultLocale);
  const current = values[activeLocale] ?? { name: "", description: "" };

  return (
    <div style={{ border: "1px solid var(--ra-color-border)", borderRadius: "var(--ra-radius-control)", padding: "var(--ra-space-3)", marginBottom: "var(--ra-space-4)" }}>
      <FormField label="Translation language">
        <select style={selectInput} value={activeLocale} onChange={(e) => setActiveLocale(e.target.value as LanguageCode)}>
          {locales.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()} {l === defaultLocale ? "(default)" : values[l]?.name ? "" : "— missing"}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Name">
        <input
          style={textInput}
          value={current.name}
          onChange={(e) => onChange(activeLocale, { ...current, name: e.target.value })}
        />
      </FormField>
      {hasDescription && (
        <FormField label="Description (optional)">
          <input
            style={textInput}
            value={current.description ?? ""}
            onChange={(e) => onChange(activeLocale, { ...current, description: e.target.value })}
          />
        </FormField>
      )}
    </div>
  );
}
