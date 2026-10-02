import type { InternationalTestDto } from '@manaratak/domain';

type TestRelationships = Pick<InternationalTestDto, 'countryRelationships' | 'languageRelationships' | 'academicTaxonomyRelationships' | 'degreeRelationships'>;

export function SavedTestCanonicalRelationships({ test, isRtl }: { test: TestRelationships; isRtl: boolean }) {
  const rows = [
    ...(test.countryRelationships ?? []).map(row => ({ ...row, kind: 'COUNTRY', id: row.canonicalReferenceId })),
    ...(test.languageRelationships ?? []).map(row => ({ ...row, kind: 'LANGUAGE', id: row.canonicalReferenceId })),
    ...(test.academicTaxonomyRelationships ?? []).map(row => ({ ...row, kind: 'TAXONOMY', id: row.taxonomyNodeId })),
    ...(test.degreeRelationships ?? []).map(row => ({ ...row, kind: 'DEGREE', id: row.degreeLevelId })),
  ];
  return <section className="space-y-2 rounded border p-4">
    <h3 className="font-bold">{isRtl ? 'الروابط المعيارية المحفوظة' : 'Saved canonical relationships'}</h3>
    {!rows.length ? <p>{isRtl ? 'لا توجد روابط معيارية محفوظة.' : 'No saved canonical relationships.'}</p> : <ul className="space-y-2">
      {rows.map(row => <li key={`${row.kind}:${row.id}:${row.relationshipType}`} className="rounded bg-slate-50 p-2 text-sm">
        <span>{row.kind} · {row.relationshipType} · </span><span className="font-mono">{row.id ?? (isRtl ? 'مرجع غير محسوم' : 'Unresolved reference')}</span>
        {row.notes ? <p>{row.notes}</p> : null}
      </li>)}
    </ul>}
  </section>;
}
