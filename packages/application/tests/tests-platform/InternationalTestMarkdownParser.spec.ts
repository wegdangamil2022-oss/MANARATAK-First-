import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {InternationalTestMarkdownParser} from '../../src/tests-platform/utils/InternationalTestMarkdownParser';

const root=path.resolve(__dirname,'../../../../');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'workspace/import-sources/international-tests/reviewed-20261107/catalog-manifest.json'),'utf8'));
describe('InternationalTestMarkdownParser',()=>{
  it.each(['ENGLISH','NON_ENGLISH','NATIONAL','GRADUATE','UNIVERSITY'])('preserves a complete %s source and its section order',category=>{
    const row=manifest.matching_rows.find((r:{category:string})=>r.category===category);
    const raw=fs.readFileSync(path.join(root,row.file),'utf8');
    const sections=InternationalTestMarkdownParser.parse(raw);
    expect(sections).toHaveLength(row.sections);
    expect(sections.map(s=>s.sectionNumber)).toEqual(Array.from({length:row.sections},(_,i)=>i+1));
    expect(sections.map(s=>s.content).join('').replace(/\s/g,'')).toBe(raw.replace(/\s/g,''));
  });
  it('keeps unnumbered nested headings and the source preamble',()=>{
    const raw='# Title\nPreamble\n## 1. Eligibility\nText\n## Overseas applicants\nDetails\n## 2. Subjects\n## Mathematics\nContent';
    const sections=InternationalTestMarkdownParser.parse(raw);
    expect(sections.map(s=>s.title)).toEqual(['Eligibility','Subjects']);
    expect(sections[0].content).toContain('Preamble');
    expect(sections[0].content).toContain('## Overseas applicants');
    expect(sections[1].content).toContain('## Mathematics');
    expect(sections.map(s=>s.content).join('').replace(/\s/g,'')).toBe(raw.replace(/\s/g,''));
  });
});
