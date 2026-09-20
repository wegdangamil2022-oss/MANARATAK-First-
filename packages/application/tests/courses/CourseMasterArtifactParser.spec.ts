import { describe, expect, it } from 'vitest';
import { writeXlsxWorkbook } from '@manaratak/shared';
import { CourseMasterArtifactParser } from '../../src/courses/parsers/CourseMasterArtifactParser';

const HEADERS = [
  'No.',
  'Platform / University',
  'Course Name',
  'Direct Course URL',
  'Study Free',
  'Free Certificate',
  'Certificate Type',
  'Language',
  'Study Level',
  'Course Duration',
  'Short Course Topics (4)',
];

function workbookBytes(rows: unknown[][], sheetName = 'Courses'): Promise<Uint8Array> {
  return writeXlsxWorkbook([{ name: sheetName, rows: [HEADERS, ...rows] }]);
}

describe('CourseMasterArtifactParser', () => {
  it('parses exact course-master columns and preserves worksheet row numbers', async () => {
    const bytes = await workbookBytes([
      [1, 'Saylor University', 'Course A', 'https://learn.saylor.org/course/view.php?id=1', 'Yes', 'Yes', 'Certificate of Completion', 'English', 'Not officially specified', '10 hours', 'Business'],
      ['   ', '', '', '', '', '', '', '', '', '', ''],
      [2, 'Saylor University', 'Course B', 'https://learn.saylor.org/course/view.php?id=2', 'Yes', 'No', 'None', 'English', 'Not officially specified', '8 hours', 'Ethics'],
    ]);

    const result = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      declaredByteSize: bytes.byteLength,
    });

    expect(result.rows.map((row) => row.sourceRowNumber)).toEqual([2, 4]);
    expect(result.ignoredBlankRows).toBe(1);
    expect(result.security?.archiveEntryCount).toBeGreaterThan(0);
  });

  it('accepts an exact-width row and trailing technically-empty XLSX cells', async () => {
    const bytes = await workbookBytes([[
      1, 'Saylor University', 'Course A', 'https://learn.saylor.org/course/view.php?id=1', 'Yes', 'Yes',
      'Certificate', 'English', 'Level', '10h', 'Topic', '', '',
    ]]);
    const result = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      declaredByteSize: bytes.byteLength,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.issues).not.toContainEqual(expect.objectContaining({
      code: 'COURSE_MASTER_ROW_COLUMN_COUNT_MISMATCH',
    }));
  });

  it('rejects an XLSX data row with a non-empty twelfth cell', async () => {
    const bytes = await workbookBytes([[
      1, 'Saylor University', 'Course A', 'https://learn.saylor.org/course/view.php?id=1', 'Yes', 'Yes',
      'Certificate', 'English', 'Level', '10h', 'Topic', 'unexpected',
    ]]);
    const result = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      declaredByteSize: bytes.byteLength,
    });
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'COURSE_MASTER_ROW_COLUMN_COUNT_MISMATCH',
      severity: 'ERROR',
      rowNumber: 2,
      column: 'L',
    }));
  });

  it('requires the Courses sheet', async () => {
    const bytes = await workbookBytes([[1, 'x']], 'WrongSheet');
    await expect(
      CourseMasterArtifactParser.parse({
        bytes,
        originalFilename: 'courses.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        declaredByteSize: bytes.byteLength,
      }),
    ).rejects.toThrow('COURSE_MASTER_REQUIRED_SHEET_MISSING');
  });

  it('reports missing required headers', async () => {
    const bytes = await writeXlsxWorkbook([{ name: 'Courses', rows: [['Course Name'], ['Course A']] }]);
    const result = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      declaredByteSize: bytes.byteLength,
    });
    expect(result.rows).toHaveLength(0);
    expect(
      result.issues.some((issue) => issue.code === 'COURSE_MASTER_REQUIRED_COLUMN_MISSING'),
    ).toBe(true);
  });

  it('rejects reordered required columns instead of positionally mis-mapping data', async () => {
    const reordered = [...HEADERS];
    [reordered[1], reordered[2]] = [reordered[2], reordered[1]];
    const bytes = await writeXlsxWorkbook([{ name: 'Courses', rows: [reordered, [1, 'Course A', 'Saylor University', 'https://learn.saylor.org/course/view.php?id=1', 'Yes', 'No', 'None', 'English', 'Level', '10h', 'Topic']] }]);
    const result = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      declaredByteSize: bytes.byteLength,
    });
    expect(result.rows).toHaveLength(0);
    expect(result.issues.some((issue) => issue.code === 'COURSE_MASTER_COLUMN_CONTRACT_MISMATCH')).toBe(true);
  });

  it('rejects an extra column in the approved course-master contract', async () => {
    const headers = [...HEADERS.slice(0, 2), 'Unexpected Column', ...HEADERS.slice(2)];
    const bytes = await writeXlsxWorkbook([{ name: 'Courses', rows: [headers, [1, 'Saylor University', 'extra', 'Course A', 'https://learn.saylor.org/course/view.php?id=1', 'Yes', 'No', 'None', 'English', 'Level', '10h', 'Topic']] }]);
    const result = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      declaredByteSize: bytes.byteLength,
    });
    expect(result.rows).toHaveLength(0);
    expect(result.unknownColumns).toContain('Unexpected Column');
    expect(result.issues.some((issue) => issue.code === 'COURSE_MASTER_COLUMN_CONTRACT_MISMATCH')).toBe(true);
  });

  it('rejects formula cells', async () => {
    const rows = [
      HEADERS,
      [1, 'Saylor University', 'Course A', 'https://learn.saylor.org/course/view.php?id=1', 'Yes', 'Yes', 'Certificate', 'English', 'Level', '10h', 'Topic'],
    ];
    rows[1][2] = { formula: '1+1', result: 2 };
    const bytes = await writeXlsxWorkbook([{ name: 'Courses', rows }]);
    const result = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      declaredByteSize: bytes.byteLength,
    });
    expect(
      result.issues.some((issue) => issue.code === 'COURSE_XLSX_FORMULA_CELL_REJECTED'),
    ).toBe(true);
  });

  it('parses UTF-8 CSV with the same contract', async () => {
    const csv = `${HEADERS.join(',')}\n1,Saylor University,Course A,https://learn.saylor.org/course/view.php?id=1,Yes,No,None,English,Not officially specified,10 hours,Topic`;
    const bytes = new TextEncoder().encode(csv);
    const result = await CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.csv',
      mimeType: 'text/csv',
      declaredByteSize: bytes.byteLength,
    });
    expect(result.format).toBe('CSV');
    expect(result.rows).toHaveLength(1);
  });

  it.each([
    ['extra', `${HEADERS.join(',')}\n1,Saylor University,Course A,https://learn.saylor.org/course/view.php?id=1,Yes,No,None,English,Level,10h,Topic,unexpected`],
    ['missing', `${HEADERS.join(',')}\n1,Saylor University,Course A,https://learn.saylor.org/course/view.php?id=1,Yes,No,None,English,Level,10h`],
  ])('rejects CSV rows with a %s data column', async (_kind, csv) => {
    const bytes = new TextEncoder().encode(csv);
    await expect(CourseMasterArtifactParser.parse({
      bytes,
      originalFilename: 'courses.csv',
      mimeType: 'text/csv',
      declaredByteSize: bytes.byteLength,
    })).rejects.toThrow('COURSE_MASTER_ROW_COLUMN_COUNT_MISMATCH');
  });
});
