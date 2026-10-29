export const SCHOLARSHIP_ELIGIBILITY_SECTION = 'الشروط ومعايير التقديم';
export interface ScholarshipEligibilitySource {
  version: 1;
  section: typeof SCHOLARSHIP_ELIGIBILITY_SECTION;
  text: string;
  sourceRecordId?: string;
  artifactHash?: string;
  recordHash?: string;
}
export interface ScholarshipLiteralCriterion {
  key: string;
  sourceText: string;
  text: string;
  manuallyEdited: boolean;
}
export interface ScholarshipEligibilityEdit {
  key: string;
  sourceText: string;
  text: string;
  actorId: string;
  approvedAt: string;
  reason: string;
}
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Only the named source section is authority. Empty/missing NEVER falls back to enrichment. */
export function scholarshipEligibilitySource(
  metadata: unknown,
): ScholarshipEligibilitySource | null {
  const data = object(metadata);
  const sections = object(data.rawSourceSections);
  if (Object.prototype.hasOwnProperty.call(sections, SCHOLARSHIP_ELIGIBILITY_SECTION)) {
    return {
      version: 1,
      section: SCHOLARSHIP_ELIGIBILITY_SECTION,
      text:
        typeof sections[SCHOLARSHIP_ELIGIBILITY_SECTION] === 'string'
          ? (sections[SCHOLARSHIP_ELIGIBILITY_SECTION] as string)
          : '',
      ...(typeof data.sourceReferenceId === 'string'
        ? { sourceRecordId: data.sourceReferenceId }
        : {}),
      ...(typeof data.sourceArtifactSha256 === 'string'
        ? { artifactHash: data.sourceArtifactSha256 }
        : {}),
      ...(typeof data.sourceRecordSha256 === 'string'
        ? { recordHash: data.sourceRecordSha256 }
        : {}),
    };
  }
  const source = object(data.sourceEligibility);
  return source.version === 1 &&
    source.section === SCHOLARSHIP_ELIGIBILITY_SECTION &&
    typeof source.text === 'string'
    ? {
        version: 1,
        section: SCHOLARSHIP_ELIGIBILITY_SECTION,
        text: source.text,
        ...(typeof source.sourceRecordId === 'string'
          ? { sourceRecordId: source.sourceRecordId }
          : {}),
        ...(typeof source.artifactHash === 'string' ? { artifactHash: source.artifactHash } : {}),
        ...(typeof source.recordHash === 'string' ? { recordHash: source.recordHash } : {}),
      }
    : null;
}

/** Literal segmentation only. No words from other fields, test policies or inferred requirements. */
export function literalScholarshipCriteria(text: string): ScholarshipLiteralCriterion[] {
  text = text.replace(/^(\s*)(?:[-*•]\s+|\d+[.)]\s+)/gm, '$1');
  const fragments: string[] = [];
  let start = 0,
    depth = 0;
  let conditional = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if ('([{'.includes(char)) depth++;
    if (')]}'.includes(char)) depth = Math.max(0, depth - 1);
    if (depth === 0 && /[،;؛]/.test(char) && !conditional)
      conditional = /(?:^|\s)(?:إذا|إن|شريطة|unless|if)(?:\s|$)|في حال/u.test(
        text.slice(start, index),
      );
    const decimal = /\p{N}/u.test(text[index - 1] ?? '') && /\p{N}/u.test(text[index + 1] ?? '');
    const sentence =
      /[.!؟?]/.test(char) && !decimal && (index === text.length - 1 || /\s/.test(text[index + 1]));
    const list = (char === '،' || char === ';' || char === '؛') && !conditional && !decimal;
    const newline = char === '\n';
    if (depth === 0 && (sentence || list || newline)) {
      const value = text.slice(start, sentence ? index + 1 : index).trim();
      if (value) fragments.push(value);
      start = index + 1;
      if (sentence || newline) conditional = false;
    }
  }
  if (text.slice(start).trim()) fragments.push(text.slice(start).trim());
  return fragments
    .map((sourceText, index) => {
      // Drop Markdown list markers and the explicit list conjunction; never alter a factual word.
      let value = sourceText.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/u, '').trim();
      if (index > 0) value = value.replace(/^و(?=إثبات\s)/u, '');
      value = value.replace(/[،؛;]+$/u, '').trim();
      return {
        key: `source-criterion-${index + 1}`,
        sourceText,
        text: /[.!؟?]$/u.test(value) ? value : `${value}.`,
        manuallyEdited: false,
      };
    })
    .filter((item) => item.text !== '.');
}

export function scholarshipEligibilityView(metadata: unknown) {
  const source = scholarshipEligibilitySource(metadata);
  const items = literalScholarshipCriteria(source?.text ?? '');
  const authoring = object(object(metadata).eligibilityAuthoring);
  if (
    source &&
    authoring.version === 1 &&
    authoring.sourceText === source.text &&
    Array.isArray(authoring.edits)
  ) {
    for (const value of authoring.edits) {
      const edit = object(value);
      const item = items.find(
        (item) => item.key === edit.key && item.sourceText === edit.sourceText,
      );
      if (
        item &&
        typeof edit.text === 'string' &&
        edit.text.trim() &&
        typeof edit.actorId === 'string' &&
        typeof edit.reason === 'string' &&
        edit.reason.trim().length >= 3 &&
        typeof edit.approvedAt === 'string' &&
        Number.isFinite(Date.parse(edit.approvedAt))
      ) {
        item.text = edit.text;
        item.manuallyEdited = true;
      }
    }
  }
  return { source, items };
}

export function appendScholarshipEligibilityEdit(
  metadata: Record<string, unknown> | undefined,
  key: string,
  text: string,
  actorId: string,
  reason: string,
  approvedAt: string,
) {
  const view = scholarshipEligibilityView(metadata);
  const item = view.items.find((item) => item.key === key);
  if (!view.source || !item) throw new Error('SCHOLARSHIP_SOURCE_CRITERION_NOT_FOUND');
  if (!text.trim() || text.length > 20000 || !actorId || reason.trim().length < 3)
    throw new Error('SCHOLARSHIP_CRITERION_EDIT_INVALID');
  const previous = object(metadata?.eligibilityAuthoring);
  const edits =
    previous.version === 1 &&
    previous.sourceText === view.source.text &&
    Array.isArray(previous.edits)
      ? previous.edits
      : [];
  return {
    ...metadata,
    eligibilityAuthoring: {
      version: 1,
      sourceText: view.source.text,
      edits: [
        ...edits,
        {
          key,
          sourceText: item.sourceText,
          text: text.trim(),
          actorId,
          reason: reason.trim(),
          approvedAt,
        },
      ],
    },
  };
}

/** Generic catalog writes cannot replace original source or forge an approved criterion edit. */
export function assertScholarshipEligibilityMetadataUnchanged(
  current: unknown,
  incoming: unknown,
): void {
  const before = object(current),
    after = object(incoming);
  for (const key of [
    'rawSourceSections',
    'rawSourceBlock',
    'rawSourceBlockSha256',
    'sourceArtifactSha256',
    'sourceRecordSha256',
    'sourceEligibility',
    'eligibilityAuthoring',
  ]) {
    if (
      Object.prototype.hasOwnProperty.call(after, key) &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key])
    )
      throw new Error('SCHOLARSHIP_ELIGIBILITY_SOURCE_IMMUTABLE');
  }
}
