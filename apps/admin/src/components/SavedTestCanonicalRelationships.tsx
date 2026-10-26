import type { InternationalTestDto } from '@manaratak/domain';
import { Globe2, Languages, Layers, GraduationCap, Network } from 'lucide-react';

type TestRelationships = Pick<
  InternationalTestDto,
  | 'countryRelationships'
  | 'languageRelationships'
  | 'academicTaxonomyRelationships'
  | 'degreeRelationships'
>;

export function SavedTestCanonicalRelationships({
  test,
  isRtl,
}: {
  test: TestRelationships;
  isRtl: boolean;
}) {
  const rows = [
    ...(test.countryRelationships ?? []).map((row) => ({
      ...row,
      kind: 'COUNTRY',
      id: row.canonicalReferenceId,
    })),
    ...(test.languageRelationships ?? []).map((row) => ({
      ...row,
      kind: 'LANGUAGE',
      id: row.canonicalReferenceId,
    })),
    ...(test.academicTaxonomyRelationships ?? []).map((row) => ({
      ...row,
      kind: 'TAXONOMY',
      id: row.taxonomyNodeId,
    })),
    ...(test.degreeRelationships ?? []).map((row) => ({
      ...row,
      kind: 'DEGREE',
      id: row.degreeLevelId,
    })),
  ];
  return (
    <section className="space-y-4 rounded-2xl border border-[#DDEFF2] p-4">
      <h3 className="test-region-title">
        <Network size={18} />
        {isRtl ? 'الروابط المعيارية المحفوظة' : 'Saved canonical relationships'}
      </h3>
      {!rows.length ? (
        <p className="text-[13px]">
          {isRtl ? 'لا توجد روابط معيارية محفوظة.' : 'No saved canonical relationships.'}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const Icon = (
              {
                COUNTRY: Globe2,
                LANGUAGE: Languages,
                TAXONOMY: Layers,
                DEGREE: GraduationCap,
              } as const
            )[row.kind as 'COUNTRY' | 'LANGUAGE' | 'TAXONOMY' | 'DEGREE'];
            const name = isRtl
              ? row.referenceNameAr || row.referenceNameEn
              : row.referenceNameEn || row.referenceNameAr;
            const code =
              'referenceCode' in row
                ? row.referenceCode
                : 'canonicalCode' in row
                  ? row.canonicalCode
                  : undefined;
            return (
              <li
                key={`${row.kind}:${row.id}:${row.relationshipType}`}
                className="min-w-0 space-y-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0] p-3 text-[12px]"
              >
                <p className="flex items-center gap-2 text-[13px] font-bold">
                  <Icon size={16} className="text-[#0E7C86]" />
                  {name || code || (isRtl ? 'اسم المرجع غير متوفر' : 'Reference name unavailable')}
                </p>
                <p>{row.relationshipType}</p>
                {row.notes ? <p>{row.notes}</p> : null}
                <details className="text-[11px] text-slate-500">
                  <summary>{isRtl ? 'مرجع العلاقة' : 'Relationship reference'}</summary>
                  <p className="break-all">
                    {row.id ?? '—'} · {code ?? '—'}
                  </p>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
