import { createHash } from 'node:crypto';

export interface ScholarshipGuideRecord {
  sourceRecordId: string;
  sourceLineNumber: number;
  title: string;
  importStatus: string | null;
  fields: Record<string, string>;
  explicitlyImported: boolean;
  rawContent: string;
  sourceHash: string;
}

export function readScholarshipMasterGuide(content: string): ScholarshipGuideRecord[] {
  const records: ScholarshipGuideRecord[] = [];
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/);
  const starts = [0, ...[...content.matchAll(/\r?\n/g)].map(match => match.index! + match[0].length)];
  let startOffset = 0;
  let current: ScholarshipGuideRecord | undefined;
  let activeField: string | undefined;
  const finish = (endOffset: number) => {
    if (!current) return;
    current.rawContent = content.slice(startOffset, endOffset);
    current.sourceHash = createHash('sha256').update(current.rawContent, 'utf8').digest('hex');
    for (const [key, value] of Object.entries(current.fields)) current.fields[key] = value.trim();
    records.push(current);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^# (SCH-[A-Z0-9-]+)\s*[—-]\s*(.+)$/.exec(lines[index]);
    if (heading) {
      finish(starts[index]);
      startOffset = starts[index];
      if (seen.has(heading[1])) throw new Error(`SCHOLARSHIP_GUIDE_DUPLICATE_ID:${heading[1]}`);
      seen.add(heading[1]);
      current = {
        sourceRecordId: heading[1], sourceLineNumber: index + 1, title: heading[2].trim(),
        importStatus: null, fields: Object.create(null) as Record<string, string>, explicitlyImported: false,
        rawContent: '', sourceHash: '',
      };
      activeField = undefined;
      continue;
    }
    if (!current) continue;
    const status = /^\*\*حالة الاستيراد النهائية:\*\*\s*(.+?)\s*$/.exec(lines[index]);
    if (status) {
      if (current.importStatus !== null) throw new Error(`SCHOLARSHIP_GUIDE_MULTIPLE_FINAL_MARKERS:${current.sourceRecordId}`);
      current.importStatus = status[1].trim();
      current.explicitlyImported = /^IMPORTED(?:$|[_\s(—-])/.test(current.importStatus);
    }
    const field = /^## (\d+\. .+)$/.exec(lines[index]);
    if (field) {
      activeField = field[1];
      if (activeField in current.fields) throw new Error(`SCHOLARSHIP_GUIDE_DUPLICATE_FIELD:${current.sourceRecordId}`);
      current.fields[activeField] = '';
      continue;
    }
    if (/^#{1,3} /.test(lines[index]) || /^---\s*$/.test(lines[index])) activeField = undefined;
    if (activeField && lines[index].trim()) {
      current.fields[activeField] += `${current.fields[activeField] ? '\n' : ''}${lines[index]}`;
    }
  }
  finish(content.length);
  if (records.length === 0) throw new Error('SCHOLARSHIP_GUIDE_NO_RECORDS');
  return records;
}
