import { describe, expect, it } from 'vitest';
import { normalizeCourseBlock } from '../../src/courses/content-blocks';
describe('protected video caption references', () => {
  const payload = {
    title: 'Lecture',
    subtitleReferenceId: '10000000-0000-4000-8000-000000000001',
    subtitleLanguage: 'ar',
  };
  it('accepts only a paired caption reference and language, never a raw URL', () => {
    expect(
      normalizeCourseBlock({ id: 'block', type: 'VIDEO', payload, assetReferenceId: 'video-ref' })
        .payload,
    ).toEqual(payload);
    expect(() =>
      normalizeCourseBlock({
        id: 'block',
        type: 'VIDEO',
        payload: { ...payload, subtitleReferenceId: 'https://example.org/caption.vtt' },
        assetReferenceId: 'video-ref',
      }),
    ).toThrow('SUBTITLE');
    expect(() =>
      normalizeCourseBlock({
        id: 'block',
        type: 'VIDEO',
        payload: { title: 'Lecture', subtitleReferenceId: payload.subtitleReferenceId },
        assetReferenceId: 'video-ref',
      }),
    ).toThrow('SUBTITLE');
    expect(() =>
      normalizeCourseBlock({
        id: 'block',
        type: 'VIDEO',
        payload: { ...payload, subtitleLanguage: '<script>' },
        assetReferenceId: 'video-ref',
      }),
    ).toThrow('SUBTITLE');
  });
});
