export const courseBlockTypes = [
  'TEXT',
  'HEADING',
  'CODE',
  'TABLE',
  'LINK',
  'VIDEO',
  'AUDIO',
  'IMAGE',
  'FILE',
  'QUIZ',
] as const;
export type CourseBlockType = (typeof courseBlockTypes)[number];
export interface CourseContentBlockInput {
  id: string;
  type: CourseBlockType;
  payload: Record<string, unknown>;
  assetReferenceId?: string | null;
  quizId?: string | null;
}
export interface CourseContentBlockDto extends CourseContentBlockInput {
  courseId: string;
  lessonId: string;
  position: number;
  version: number;
  status: string;
}

/** Closed, text-only payloads: HTML is never executable content. */
export function normalizeCourseBlock(input: CourseContentBlockInput): CourseContentBlockInput {
  if (!courseBlockTypes.includes(input.type)) throw new Error('COURSE_CONTENT_BLOCK_TYPE_INVALID');
  const source = input.payload;
  if (!source || typeof source !== 'object' || Array.isArray(source))
    throw new Error('COURSE_CONTENT_BLOCK_PAYLOAD_INVALID');
  const payload: Record<string, unknown> = {};
  const text = (key: string, max: number, required = false) => {
    const value = source[key];
    if (value === undefined && !required) return;
    if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
      throw new Error('COURSE_CONTENT_BLOCK_PAYLOAD_INVALID');
    payload[key] = value;
  };
  switch (input.type) {
    case 'TEXT':
      text('text', 50000, true);
      if (source.format !== undefined) {
        if (
          typeof source.format !== 'string' ||
          !['PARAGRAPH', 'BULLETS', 'NUMBERED'].includes(source.format)
        )
          throw new Error('COURSE_CONTENT_BLOCK_PAYLOAD_INVALID');
        payload.format = source.format;
      }
      break;
    case 'HEADING':
      text('text', 500, true);
      break;
    case 'CODE':
      text('text', 50000, true);
      text('language', 40);
      break;
    case 'TABLE': {
      const rows = source.rows;
      if (
        !Array.isArray(rows) ||
        !rows.length ||
        rows.length > 100 ||
        rows.some(
          (row) =>
            !Array.isArray(row) ||
            !row.length ||
            row.length > 12 ||
            row.some((cell) => typeof cell !== 'string' || cell.length > 2000),
        ) ||
        new Set(rows.map((row) => row.length)).size !== 1
      )
        throw new Error('COURSE_CONTENT_BLOCK_TABLE_INVALID');
      payload.rows = rows;
      break;
    }
    case 'LINK': {
      text('title', 500, true);
      text('url', 2000, true);
      let url: URL;
      try {
        url = new URL(String(source.url));
      } catch {
        throw new Error('COURSE_CONTENT_BLOCK_LINK_INVALID');
      }
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        /^(localhost|127\.|0\.|\[|169\.254\.)/i.test(url.hostname)
      )
        throw new Error('COURSE_CONTENT_BLOCK_LINK_INVALID');
      payload.url = url.href;
      break;
    }
    case 'IMAGE':
      text('alt', 1000, true);
      text('caption', 1000);
      break;
    case 'VIDEO':
      text('title', 500, true); text('caption', 1000); text('subtitleReferenceId', 36); text('subtitleLanguage', 35);
      if (Boolean(source.subtitleReferenceId) !== Boolean(source.subtitleLanguage) || (source.subtitleReferenceId && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(source.subtitleReferenceId)) || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(String(source.subtitleLanguage))))) throw Error('COURSE_CONTENT_BLOCK_SUBTITLE_INVALID');
      break;
    case 'AUDIO':
    case 'FILE':
      text('title', 500, true);
      text('caption', 1000);
      break;
    case 'QUIZ':
      text('title', 500);
      break;
  }
  if (Object.keys(source).some((key) => !(key in payload)))
    throw new Error('COURSE_CONTENT_BLOCK_FIELD_FORBIDDEN');
  const media = ['VIDEO', 'AUDIO', 'IMAGE', 'FILE'].includes(input.type);
  if (
    media !== Boolean(input.assetReferenceId) ||
    (input.type === 'QUIZ') !== Boolean(input.quizId)
  )
    throw new Error('COURSE_CONTENT_BLOCK_REFERENCE_REQUIRED');
  if ((!media && input.assetReferenceId) || (input.type !== 'QUIZ' && input.quizId))
    throw new Error('COURSE_CONTENT_BLOCK_REFERENCE_FORBIDDEN');
  return {
    id: input.id,
    type: input.type,
    payload,
    assetReferenceId: input.assetReferenceId ?? null,
    quizId: input.quizId ?? null,
  };
}
