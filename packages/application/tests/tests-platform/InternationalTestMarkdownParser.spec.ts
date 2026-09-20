import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { InternationalTestMarkdownParser } from '../../src/tests-platform/utils/InternationalTestMarkdownParser';

describe('InternationalTestMarkdownParser - Pilot Test', () => {
  const workspaceRoot = path.resolve(__dirname, '../../../../');
  
  const ieltsPath = path.join(
    workspaceRoot,
    'workspace/import-sources/international-tests/unified-56/01_English_Language_Tests_12/IELTS_2026_Complete_Data_AR.md'
  );
  
  const jeeAdvancedPath = path.join(
    workspaceRoot,
    'workspace/import-sources/international-tests/unified-56/06_Specialized_Admission_Tests_10/JEE_Advanced_India_2026_Unified_AR.md'
  );

  it('correctly parses IELTS Complete Data with exactly 17 sections', () => {
    const rawMarkdown = fs.readFileSync(ieltsPath, 'utf-8');
    const sections = InternationalTestMarkdownParser.parse(rawMarkdown);

    // 1. Verify expected section count
    expect(sections).toHaveLength(17);

    // 2. Verify section numbers and keys are sequential and match expectations
    for (let i = 0; i < sections.length; i++) {
      const expectedNum = i + 1;
      expect(sections[i].sectionNumber).toBe(expectedNum);
      expect(sections[i].blockKey).toBe(`sec-${String(expectedNum).padStart(2, '0')}`);
    }

    // 3. Verify first and last sections
    expect(sections[0].title).toBe('معلومات الاختبار الأساسية');
    expect(sections[16].title).toBe('الملاحظات');

    // 4. Verify no content is lost (excluding whitespace differences)
    const originalCleaned = rawMarkdown.replace(/\s+/g, '');
    const parsedCleaned = sections.map(s => s.content).join('\n').replace(/\s+/g, '');
    expect(parsedCleaned).toBe(originalCleaned);
  });

  it('correctly parses JEE Advanced Complete Data with exactly 22 sections, nesting unnumbered H2s', () => {
    const rawMarkdown = fs.readFileSync(jeeAdvancedPath, 'utf-8');
    const sections = InternationalTestMarkdownParser.parse(rawMarkdown);

    // 1. Verify expected section count
    expect(sections).toHaveLength(22);

    // 2. Verify section numbers and keys are sequential and match expectations
    for (let i = 0; i < sections.length; i++) {
      const expectedNum = i + 1;
      expect(sections[i].sectionNumber).toBe(expectedNum);
      expect(sections[i].blockKey).toBe(`sec-${String(expectedNum).padStart(2, '0')}`);
    }

    // 3. Verify first and last sections
    expect(sections[0].title).toBe('معلومات الاختبار أو المؤهل الأساسية');
    expect(sections[21].title).toBe('الملاحظات');

    // 4. Verify unnumbered H2s remain nested and did not spawn separate sections
    // For example, "## للمرشحين الهنود وOCI/PIO(I)" should exist within section 5
    const sec5 = sections[4]; // Section 5 is at index 4
    expect(sec5.title).toBe('الأهلية والمتطلبات التعليمية المسبقة');
    expect(sec5.content).toContain('## للمرشحين الهنود وOCI/PIO(I)');
    expect(sec5.content).toContain('## الأجانب وOCI/PIO(F)');

    // Another example: "## Mathematics", "## Physics", "## Chemistry" should exist in section 7
    const sec7 = sections[6]; // Section 7 is at index 6
    expect(sec7.title).toBe('المناهج والمحتوى الأكاديمي');
    expect(sec7.content).toContain('## Mathematics');
    expect(sec7.content).toContain('## Physics');
    expect(sec7.content).toContain('## Chemistry');

    // 5. Verify no content is lost (excluding whitespace differences)
    const originalCleaned = rawMarkdown.replace(/\s+/g, '');
    const parsedCleaned = sections.map(s => s.content).join('\n').replace(/\s+/g, '');
    expect(parsedCleaned).toBe(originalCleaned);
  });
});
