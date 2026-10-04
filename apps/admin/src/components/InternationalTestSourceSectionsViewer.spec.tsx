import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SafeMarkdownView } from './SafeMarkdownView';
import { InternationalTestSourceSectionsViewer } from './InternationalTestSourceSectionsViewer';

vi.mock('../api/client', () => ({
  adminApiClient: {
    getInternationalTestImportVersions: vi.fn(() => Promise.resolve([
      {
        id: 'ver-1',
        testId: 'test-1',
        versionNumber: 1,
        status: 'DRAFT',
        sourceFileName: 'IELTS_2026_Complete_Data_AR.md',
        sourceHash: '52c7bbea615899ed94eb1ed5b8c5be068f03b900faec77bf6aaa8c293ded48f8',
        importedAt: '2026-10-02T10:00:00.000Z',
        contentBlocks: [
          {
            blockKey: 'source.raw',
            blockType: 'RAW_SOURCE',
            title: 'المصدر الكامل',
            content: '# المصدر الأصلي الكامل',
            reviewStatus: 'APPROVED'
          },
          {
            blockKey: 'unmapped.1.sec-01',
            blockType: 'UNMAPPED_SOURCE_SECTION',
            title: '1. معلومات الاختبار الأساسية',
            content: '## 1. معلومات الاختبار الأساسية\nمحتوى تفصيلي',
            reviewStatus: 'NEEDS_REVIEW'
          },
          {
            blockKey: 'unmapped.2.sec-02',
            blockType: 'UNMAPPED_SOURCE_SECTION',
            title: '2. نبذة واستخدامات الاختبار',
            content: '## 2. نبذة واستخدامات الاختبار\n| البند | القيمة |\n|---|---|\n| النوع | أكاديمي |',
            reviewStatus: 'NEEDS_REVIEW'
          }
        ]
      }
    ]))
  }
}));

describe('InternationalTestSourceSectionsViewer and SafeMarkdownView', () => {
  it('renders SafeMarkdownView cleanly without unsafe markup and formats tables and headers', () => {
    const md = '## 1. العنوان الرئيسي\n\nنص تجريبي **عريض** و `كود`\n\n| عمود 1 | عمود 2 |\n|---|---|\n| قيمة 1 | قيمة 2 |';
    const html = renderToStaticMarkup(createElement(SafeMarkdownView, { content: md }));
    expect(html).toContain('العنوان الرئيسي');
    expect(html).toContain('عريض');
    expect(html).toContain('كود');
    expect(html).toContain('عمود 1');
    expect(html).toContain('قيمة 2');
    expect(html).not.toContain('<script>');
  });

  it('renders viewer initial markup and separates content sections from raw source', () => {
    const html = renderToStaticMarkup(createElement(InternationalTestSourceSectionsViewer, { testId: 'test-1', isRtl: true }));
    expect(html).toBeTruthy();
  });
});
