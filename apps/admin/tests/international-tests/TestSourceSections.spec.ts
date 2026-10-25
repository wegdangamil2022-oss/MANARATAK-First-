import { describe, it, expect } from 'vitest';
import {
  sourceSections,
  sourceVariant,
  type TestSourceVersion,
} from '../../src/features/international-tests/TestSourceSections';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { SafeMarkdownView } from '../../src/components/SafeMarkdownView';
const version = (count: number): TestSourceVersion => ({
  id: 'version-' + count,
  testId: 'test',
  versionNumber: count,
  status: 'DRAFT',
  contentBlocks: [
    { blockKey: 'source.raw', blockType: 'RAW_SOURCE', content: 'exact original\nbackup' },
    ...Array.from({ length: count }, (_, index) => ({
      blockKey: 'unmapped.' + (index + 1),
      blockType: 'UNMAPPED_SOURCE_SECTION',
      title: index + 1 + '. عنوان المصدر الأصلي',
      content: 'Source ' + (index + 1),
      locale: 'ar',
    })),
  ],
});
describe('version-specific source content, independent of operational editors', () => {
  it('separates only explicit variant identities and keeps unassigned blocks unassigned', () => {
    const input = version(5);
    input.contentBlocks![1].metadata = { variantId: 'academic', variantName: 'Academic' };
    input.contentBlocks![2].metadata = { variantId: 'general', variantName: 'General' };
    const rows = sourceSections(input);
    expect(rows.filter((row) => sourceVariant(row.block)?.key === 'academic')).toHaveLength(1);
    expect(rows.filter((row) => sourceVariant(row.block)?.key === 'general')).toHaveLength(1);
    expect(rows.filter((row) => sourceVariant(row.block) === null)).toHaveLength(3);
  });
  it('numbers otherwise unknown sections after excluding raw source and accepts malformed descriptor metadata safely', () => {
    const input = version(5);
    input.contentBlocks = input
      .contentBlocks!.slice(0, 1)
      .concat([{ blockKey: 'custom', blockType: 'CUSTOM', content: 'Unassigned original text' }]);
    input.metadata = { detectedSections: 'invalid legacy shape' as never };
    expect(sourceSections(input)[0]).toMatchObject({
      number: 1,
      block: { content: 'Unassigned original text' },
    });
  });
  it.each([5, 12, 18])('retains exactly %s actual sections and excludes raw backup', (count) => {
    const input = version(count),
      before = structuredClone(input);
    const sections = sourceSections(input);
    expect(sections).toHaveLength(count);
    expect(sections.map((row) => row.number)).toEqual(
      Array.from({ length: count }, (_, i) => i + 1),
    );
    expect(input).toEqual(before);
    expect(sections.some((row) => row.block.blockKey === 'source.raw')).toBe(false);
  });
  it('switches dated source versions without merging their variant evidence', () => {
    const academic = version(5),
      general = version(12);
    academic.metadata = { variant: 'Academic' };
    general.metadata = { variant: 'General' };
    expect(sourceSections(academic)).toHaveLength(5);
    expect(sourceSections(general)).toHaveLength(12);
    expect(academic.metadata.variant).toBe('Academic');
  });
  it('keeps unknown sections, language pairs and source order while excluding explicit metadata', () => {
    const input = version(5);
    input.contentBlocks!.push(
      { blockKey: 'meta', blockType: 'METADATA', content: 'descriptor' },
      {
        blockKey: 'unknown',
        blockType: 'CUSTOM_SOURCE_SECTION',
        content: 'Do not lose this paragraph',
        title: '6. Original unknown title',
      },
      {
        blockKey: 'unknown',
        blockType: 'CUSTOM_SOURCE_SECTION',
        locale: 'en',
        content: 'Separate English block',
        title: '6. Original English title',
      },
    );
    const rows = sourceSections(input);
    expect(rows).toHaveLength(7);
    expect(rows.slice(-2).map((row) => row.block.content)).toEqual([
      'Do not lose this paragraph',
      'Separate English block',
    ]);
    expect(new Set(rows.map((row) => row.key)).size).toBe(7);
  });
  it('uses explicit section metadata and does not invent sections when a source is absent', () => {
    expect(sourceSections()).toEqual([]);
    const input = version(5);
    input.contentBlocks = [
      {
        blockKey: 'other',
        blockType: 'CUSTOM_SOURCE_SECTION',
        content: 'Exact',
        metadata: { sectionNumber: 4 },
      },
    ];
    input.metadata = {
      detectedSections: [{ blockKey: 'other', sectionNumber: 9, title: 'Original metadata title' }],
    };
    expect(sourceSections(input)[0]).toMatchObject({ number: 9, title: 'Original metadata title' });
  });
  it('renders Arabic, tables, links and unsafe text without executable HTML', () => {
    const html = renderToStaticMarkup(
      createElement(SafeMarkdownView, {
        content:
          '## عنوان\n\n| First | ثان |\n|---|---|\n| value | قيمة |\n\n[Official](https://example.org/test)\n<script>alert(1)</script>\n[Unsafe](javascript:alert(1))',
      }),
    );
    expect(html).toContain('<table');
    expect(html).toContain('قيمة');
    expect(html).toContain('https://example.org/test');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:');
  });
});
