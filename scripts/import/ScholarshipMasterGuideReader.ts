export interface ScholarshipGuideRecord {
  sourceRecordId: string;
  sourceLineNumber: number;
  title: string;
  importStatus: string | null;
  fields: Record<string, string>;
  explicitlyImported: boolean;
}

export function readScholarshipMasterGuide(content: string): ScholarshipGuideRecord[] {
  const records: ScholarshipGuideRecord[] = [];
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/);
  let current: ScholarshipGuideRecord | undefined;
  let activeField: string | undefined;
  const finish = () => {
    if (!current) return;
    for (const [key, value] of Object.entries(current.fields)) current.fields[key] = value.trim();
    records.push(current);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^# (SCH-[A-Z0-9-]+)\s*[—-]\s*(.+)$/.exec(lines[index]);
    if (heading) {
      finish();
      if (seen.has(heading[1])) throw new Error(`SCHOLARSHIP_GUIDE_DUPLICATE_ID:${heading[1]}`);
      seen.add(heading[1]);
      current = {
        sourceRecordId: heading[1], sourceLineNumber: index + 1, title: heading[2].trim(),
        importStatus: null, fields: Object.create(null) as Record<string, string>, explicitlyImported: false,
      };
      activeField = undefined;
      continue;
    }
    if (!current) continue;
    const status = /^\*\*حالة الاستيراد النهائية:\*\*\s*(.+?)\s*$/.exec(lines[index]);
    if (status) {
      current.importStatus = status[1].trim();
      current.explicitlyImported = current.importStatus.startsWith('IMPORTED');
    }
    const field = /^## (\d+\. .+)$/.exec(lines[index]);
    if (field) {
      activeField = field[1];
      current.fields[activeField] = '';
      continue;
    }
    if (/^#{1,3} /.test(lines[index]) || /^---\s*$/.test(lines[index])) activeField = undefined;
    if (activeField && lines[index].trim()) {
      current.fields[activeField] += `${current.fields[activeField] ? '\n' : ''}${lines[index]}`;
    }
  }
  finish();
  if (records.length === 0) throw new Error('SCHOLARSHIP_GUIDE_NO_RECORDS');
  return records;
}
