/** Owner search context is bounded and independent of shareable queue filters. */
export function reviewOwnerSearch(params: URLSearchParams): string {
  return (params.get('reviewSearch') ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 120);
}
export function reviewOwnerBatch(params: URLSearchParams): string {
  const value = params.get('reviewBatch') ?? '';
  return /^[a-zA-Z0-9._:-]{1,200}$/.test(value) ? value : '';
}
