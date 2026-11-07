import type { InternationalTestImportDraftRequestDto } from '@manaratak/domain';

type InternationalTestContentBlockCreateInput = {
  blockKey: string;
  blockType: string;
  title?: string;
  locale?: string;
  content: string;
  sourceSectionPath?: string;
  reviewStatus: string;
  metadata?: Record<string, unknown>;
};

/** Shared byte-preserving draft projection for individual and batched persistence. */
export function projectInternationalTestImportDraft(data: InternationalTestImportDraftRequestDto, previousMetadata?: unknown) {
    const hasRawContent = typeof data.rawContent === 'string' && data.rawContent.trim().length > 0;
    const unmappedSections = data.unmappedSections ?? [];
    const reviewBlocks: InternationalTestContentBlockCreateInput[] = [];

    if (hasRawContent && data.rawContent) {
      reviewBlocks.push({
        blockKey: 'source.raw',
        blockType: 'RAW_SOURCE',
        title: data.sourceFileName,
        content: data.rawContent,
        sourceSectionPath: '/',
        reviewStatus: 'NEEDS_REVIEW',
        metadata: {
          preservedOriginalSource: true,
          ...(data.sourceHash ? { sourceHash: data.sourceHash } : {}),
          ...(data.sourceUri ? { sourceUri: data.sourceUri } : {}),
        },
      });
    }

    for (const [index, section] of unmappedSections.entries()) {
      if (!section.content || section.content.trim() === '') continue;
      reviewBlocks.push({
        blockKey: `unmapped.${index + 1}.${normalizeBlockKey(section.sectionKey)}`,
        blockType: 'UNMAPPED_SOURCE_SECTION',
        title: section.title ?? section.sectionKey,
        locale: section.locale,
        content: section.content,
        sourceSectionPath: section.sourceSectionPath,
        reviewStatus: 'NEEDS_REVIEW',
        metadata: {
          requiresMapping: true,
          detectedFieldKeys: section.detectedFieldKeys ?? [],
          ...(section.metadata ?? {}),
        },
      });
    }

    const changeSummary = {
      ...buildImportChangeSummary(previousMetadata, data.detectedFields),
      unmappedSectionCount: reviewBlocks.filter(
        (block) => block.blockType === 'UNMAPPED_SOURCE_SECTION',
      ).length,
      unmappedSectionsRequireReview: reviewBlocks.some(
        (block) => block.blockType === 'UNMAPPED_SOURCE_SECTION',
      ),
    };
    const rawContentBlocks = reviewBlocks.map((block) => ({
      blockKey: block.blockKey,
      blockType: block.blockType,
      ...(block.title ? { title: block.title } : {}),
      ...(block.sourceSectionPath ? { sourceSectionPath: block.sourceSectionPath } : {}),
      contentLength: block.content.length,
      reviewStatus: block.reviewStatus,
    }));

    return {hasRawContent,unmappedSections,reviewBlocks,changeSummary,rawContentBlocks};
}

function normalizeBlockKey(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'section';
  }

function buildImportChangeSummary(
    previousMetadata: unknown,
    detectedFields: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!detectedFields) {
      return {
        comparisonStatus: 'PENDING_FIELD_MAPPING',
        createdFromExistingTest: true,
        addedFields: [],
        removedFields: [],
        changedFields: [],
      };
    }

    const previousFields = extractDetectedFields(previousMetadata);
    const previousKeys = Object.keys(previousFields);
    const currentKeys = Object.keys(detectedFields);
    const addedFields = currentKeys.filter((key) => !previousKeys.includes(key));
    const removedFields = previousKeys.filter((key) => !currentKeys.includes(key));
    const changedFields = currentKeys.filter((key) => {
      if (!previousKeys.includes(key)) return false;
      return JSON.stringify(previousFields[key]) !== JSON.stringify(detectedFields[key]);
    });

    return {
      comparisonStatus: previousKeys.length > 0 ? 'COMPLETED' : 'BASELINE_VERSION',
      createdFromExistingTest: true,
      addedFields,
      removedFields,
      changedFields,
      newFieldsRequireReview: addedFields.length > 0,
      deletedSourceFieldsRequireReview: removedFields.length > 0,
    };
  }

function extractDetectedFields(metadata: unknown): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
    const detectedFields = (metadata as Record<string, unknown>).detectedFields;
    if (!detectedFields || typeof detectedFields !== 'object' || Array.isArray(detectedFields))
      return {};
    return detectedFields as Record<string, unknown>;
  }
