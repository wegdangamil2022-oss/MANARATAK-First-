import * as XLSX from '@e965/xlsx';

export async function readXlsxTextMatrix(bytes, sheetName) {
  const workbook = XLSX.read(bytes, { type: 'buffer', dense: true });
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return null;
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1, defval: '', raw: false, blankrows: false,
  });
}

export async function writeXlsxMatrix(sheetName, matrix) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(matrix), sheetName);
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }));
}
