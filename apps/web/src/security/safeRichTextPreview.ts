/**
 * Converts stored rich text to inert preview text. React escapes the returned
 * string, so legacy CMS payloads can never execute in administrative previews.
 */
export function safeRichTextPreview(source: string): string {
  return source
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
