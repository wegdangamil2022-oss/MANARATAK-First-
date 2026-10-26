export interface TestSourceBlock {
  id?: string;
  versionId?: string;
  blockKey: string;
  blockType: string;
  title?: string;
  locale?: string;
  content: string;
  sourceSectionPath?: string;
  reviewStatus?: string;
  metadata?: Record<string, unknown>;
}
export interface TestSourceVersion {
  id: string;
  testId: string;
  versionNumber: number;
  status: string;
  sourceFileName?: string;
  sourceLocale?: string;
  sourceUri?: string;
  sourceHash?: string;
  importedAt?: string;
  contentBlocks?: TestSourceBlock[];
  rawContentBlocks?: Array<Record<string, unknown>>;
  metadata?: {
    detectedSections?: Array<{ sectionNumber?: number; title?: string; blockKey?: string }>;
    unmappedSections?: unknown[];
    [key: string]: unknown;
  };
}
export function sourceSectionNumber(block: TestSourceBlock, fallback: number): number {
  const explicit = block.metadata?.sectionNumber;
  if (typeof explicit === 'number' && Number.isSafeInteger(explicit) && explicit > 0)
    return explicit;
  for (const value of [block.title, block.sourceSectionPath]) {
    const match = value?.match(/^\s*#{0,6}\s*(\d+)\s*[.\-ـ:]/);
    if (match) return Number(match[1]);
  }
  const key = block.blockKey.match(/(?:sec-|unmapped\.)(\d+)/);
  return key ? Number(key[1]) : fallback;
}
export function sourceSections(version?: TestSourceVersion | null) {
  // Exclude explicit raw/descriptive records; keep unknown source sections intact.
  return (version?.contentBlocks ?? [])
    .map((block, index) => ({ block, index }))
    .filter(
      ({ block }) =>
        block.blockKey !== 'source.raw' &&
        !['RAW_SOURCE', 'METADATA', 'SOURCE_METADATA', 'IMPORT_METADATA'].includes(
          block.blockType,
        ) &&
        block.metadata?.isSection !== false,
    )
    .map(({ block, index }, sectionIndex) => {
      const detected = (
        Array.isArray(version?.metadata?.detectedSections) ? version.metadata.detectedSections : []
      )?.find((row) => row.blockKey === block.blockKey);
      return {
        block,
        number: detected?.sectionNumber ?? sourceSectionNumber(block, sectionIndex + 1),
        title: block.title || detected?.title || block.sourceSectionPath || '',
        originalIndex: index,
        key: block.id ?? block.blockKey + ':' + (block.locale ?? '') + ':' + index,
      };
    })
    .sort((a, b) => a.number - b.number || a.originalIndex - b.originalIndex);
}
export function sourceVariant(block: TestSourceBlock) {
  const key = block.metadata?.variantId ?? block.metadata?.variantKey;
  if (typeof key !== 'string' || !key.trim()) return null;
  const label = block.metadata?.variantName;
  return { key, label: typeof label === 'string' && label.trim() ? label : key };
}
