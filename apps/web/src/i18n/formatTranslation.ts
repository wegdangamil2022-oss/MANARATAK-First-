export type TranslationValues = Readonly<Record<string, string | number>>;

/** Replace named values literally; preserve unknown placeholders for diagnosis. */
export function formatTranslation(copy: string, values?: TranslationValues): string {
  if (!values) return copy;
  return copy.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : placeholder,
  );
}
