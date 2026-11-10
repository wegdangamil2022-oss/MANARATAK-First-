import type { ReactNode } from "react";
import type { AdminCatalogName } from "@manaratak/domain";
import { catalogFacetContext, catalogFilterApi } from "../api/catalogFilters";
import { CanonicalPicker } from "./CanonicalPicker";
export function RelatedCatalogPicker({
  catalog,
  facet,
  context,
  label,
  value,
  onChange,
  ar,
  disabled = false,
  icon,
}: {
  catalog: AdminCatalogName;
  facet: string;
  context: URLSearchParams | Record<string, string>;
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  ar: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const scoped = catalogFacetContext(catalog, facet, context);
  return (
    <CanonicalPicker
      compact
      optional
      allowInactive
      paged
      displayMode="label"
      label={label}
      icon={icon}
      value={value}
      disabled={disabled}
      emptyLabel={ar ? "لا توجد خيارات مرتبطة" : "No related options"}
      reloadKey={`related:${catalog}:${facet}:${disabled}:${ar}:${JSON.stringify(scoped)}`}
      load={(query, page) =>
        disabled
          ? Promise.resolve({ options: [], nextCursor: null })
          : catalogFilterApi.picker(catalog, facet, context, ar, query, page)
      }
      onChange={(id) => onChange(id ?? "")}
    />
  );
}
