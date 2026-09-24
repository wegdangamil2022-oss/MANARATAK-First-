export interface UniversityStage34SourceRow {
  sourceLineNumber: number;
  sourceReferenceId: string;
  fields: Record<string, string>;
}

export function readUniversityStage34Markdown(content: string): UniversityStage34SourceRow[] {
  const rows: UniversityStage34SourceRow[] = [];
  const seen = new Set<string>();
  let current: UniversityStage34SourceRow | undefined;
  let expectedSequence = 1;
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^## (\d{4}) — (INS-[A-Z0-9-]+)\s*$/.exec(lines[index]);
    if (heading) {
      if (current) rows.push(current);
      const sequence = Number(heading[1]);
      if (sequence !== expectedSequence++) throw new Error(`UNIVERSITY_STAGE34_SEQUENCE_INVALID:${index + 1}`);
      if (seen.has(heading[2])) throw new Error(`UNIVERSITY_STAGE34_DUPLICATE_ID:${heading[2]}`);
      seen.add(heading[2]);
      current = { sourceLineNumber: index + 1, sourceReferenceId: heading[2], fields: Object.create(null) as Record<string, string> };
      continue;
    }
    if (!current) continue;
    const field = /^- \*\*(.+?):\*\*\s*(.*)$/.exec(lines[index]);
    if (field) current.fields[field[1]] = field[2].trim();
  }
  if (current) rows.push(current);
  if (rows.length === 0) throw new Error('UNIVERSITY_STAGE34_NO_RECORDS');
  for (const row of rows) {
    if (row.fields['University Reference ID'] !== row.sourceReferenceId) {
      throw new Error(`UNIVERSITY_STAGE34_ID_MISMATCH:${row.sourceReferenceId}`);
    }
  }
  return rows;
}
