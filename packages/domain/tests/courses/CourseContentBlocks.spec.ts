import { describe, expect, it } from 'vitest';
import {
  normalizeCourseBlock,
  type CourseContentBlockInput,
} from '../../src/courses/content-blocks';
const block = (
  type: CourseContentBlockInput['type'],
  payload: Record<string, unknown>,
  references = {},
): CourseContentBlockInput => ({ id: 'id', type, payload, ...references });
describe('closed native lecture content blocks', () => {
  it('preserves text as text, including code-like content, without accepting arbitrary HTML payload fields', () => {
    expect(
      normalizeCourseBlock(
        block('TEXT', { text: '<script>alert(1)</script>', format: 'PARAGRAPH' }),
      ).payload.text,
    ).toContain('<script>');
    expect(() => normalizeCourseBlock(block('TEXT', { text: 'safe', html: '<script/>' }))).toThrow(
      'FIELD_FORBIDDEN',
    );
    expect(() =>
      normalizeCourseBlock(block('TEXT', { text: 'safe', format: ['PARAGRAPH'] })),
    ).toThrow('PAYLOAD_INVALID');
  });
  it.each([
    'javascript:alert(1)',
    'http://example.org',
    'https://x:y@example.org',
    'https://127.0.0.1',
    'https://[::1]',
  ])('rejects unsafe reference %s', (url) => {
    expect(() => normalizeCourseBlock(block('LINK', { title: 'Reference', url }))).toThrow(
      'LINK_INVALID',
    );
  });
  it('validates bounded rectangular tables and explicit alternatives for images', () => {
    expect(
      normalizeCourseBlock(
        block('TABLE', {
          rows: [
            ['A', 'B'],
            ['C', 'D'],
          ],
        }),
      ).payload.rows,
    ).toHaveLength(2);
    expect(() => normalizeCourseBlock(block('TABLE', { rows: [['A'], ['B', 'C']] }))).toThrow(
      'TABLE_INVALID',
    );
    expect(() =>
      normalizeCourseBlock(block('IMAGE', { alt: '' }, { assetReferenceId: 'ref' })),
    ).toThrow('PAYLOAD_INVALID');
  });
  it('uses EAP lesson references and quiz references, never raw URLs in an unrelated payload', () => {
    expect(() => normalizeCourseBlock(block('VIDEO', { title: 'Clip' }))).toThrow(
      'REFERENCE_REQUIRED',
    );
    expect(() =>
      normalizeCourseBlock(
        block('VIDEO', { title: 'Clip', url: 'https://example.org' }, { assetReferenceId: 'ref' }),
      ),
    ).toThrow('FIELD_FORBIDDEN');
    expect(
      normalizeCourseBlock(block('VIDEO', { title: 'Clip' }, { assetReferenceId: 'ref' }))
        .assetReferenceId,
    ).toBe('ref');
    expect(() =>
      normalizeCourseBlock(block('TEXT', { text: 'Text' }, { quizId: 'foreign' })),
    ).toThrow('REFERENCE_REQUIRED');
  });
});
