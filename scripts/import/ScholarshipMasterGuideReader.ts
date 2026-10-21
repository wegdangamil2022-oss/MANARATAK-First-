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
  let degreeFormat = false;
  let metadata = true;
  let activeField: string | undefined;
  const registerIdentity = (id: string) => {
    if (seen.has(id)) throw new Error(`SCHOLARSHIP_GUIDE_DUPLICATE_ID:${id}`);
    seen.add(id);
    current!.sourceRecordId = id;
  };
  const finish = (endOffset: number) => {
    if (!current) return;
    if (!current.sourceRecordId) throw new Error(`SCHOLARSHIP_GUIDE_MISSING_ID:${current.sourceLineNumber}`);
    current.rawContent = content.slice(startOffset, endOffset);
    current.sourceHash = createHash('sha256').update(current.rawContent, 'utf8').digest('hex');
    for (const [key, value] of Object.entries(current.fields)) current.fields[key] = value.trim();
    records.push(current);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^# (SCH-[A-Z0-9-]+)\s*[—-]\s*(.+)$/.exec(lines[index]);
    const degreeHeading = /^### منحة رقم (\d+)\s*—\s*(.+)$/.exec(lines[index]);
    if (heading || degreeHeading) {
      finish(starts[index]);
      startOffset = starts[index];
      degreeFormat = Boolean(degreeHeading);
      metadata = true;
      current = {
        sourceRecordId: '', sourceLineNumber: index + 1, title: (heading ?? degreeHeading)![2].trim(),
        importStatus: null, fields: Object.create(null) as Record<string, string>, explicitlyImported: false,
        rawContent: '', sourceHash: '',
      };
      if (heading) registerIdentity(heading[1]);
      activeField = undefined;
      continue;
    }
    if (!current) continue;
    if (degreeFormat && metadata && /^\*\*المعرّف (?:الأصلي|الجديد):\*\*/.test(lines[index])) {
      const identity = /^\*\*المعرّف (?:الأصلي|الجديد):\*\*\s*`(SCH-[A-Z0-9-]+)`\s*$/.exec(lines[index]);
      if (!identity || current.sourceRecordId) throw new Error(`SCHOLARSHIP_GUIDE_INVALID_ID:${index + 1}`);
      registerIdentity(identity[1]);
      continue;
    }
    const status = degreeFormat
      ? metadata ? /^\*\*(?:حالة الاستيراد(?: النهائية)?|القرار):\*\*\s*(.+?)\s*$/.exec(lines[index]) : null
      : /^\*\*حالة الاستيراد النهائية:\*\*\s*(.+?)\s*$/.exec(lines[index]);
    if (status) {
      if (current.importStatus !== null) throw new Error(`SCHOLARSHIP_GUIDE_MULTIPLE_FINAL_MARKERS:${current.sourceRecordId}`);
      current.importStatus = status[1].trim();
      current.explicitlyImported = /^IMPORTED(?:$|[_\s(—-])/.test(current.importStatus);
    }
    const field = (degreeFormat ? /^#### (\d+\. .+)$/ : /^## (\d+\. .+)$/).exec(lines[index]);
    if (field) {
      metadata = false;
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
