import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SavedTestCanonicalRelationships } from '../../src/components/SavedTestCanonicalRelationships';
it('shows canonical names and Arabic meanings without claiming testing-centre availability', () => {
  const html = renderToStaticMarkup(
    <SavedTestCanonicalRelationships
      isRtl
      test={{
        countryRelationships: [
          {
            canonicalReferenceId: 'country-in',
            referenceCode: 'IN',
            referenceNameAr: 'الهند',
            relationshipType: 'SOURCE_JURISDICTION',
          },
        ],
        languageRelationships: [
          {
            canonicalReferenceId: 'language-en',
            referenceCode: 'en',
            referenceNameAr: 'الإنجليزية',
            relationshipType: 'QUESTION_LANGUAGE',
          },
        ],
        degreeRelationships: [
          {
            degreeLevelId: 'master',
            canonicalCode: 'MASTER',
            referenceNameAr: 'ماجستير',
            relationshipType: 'ADMISSION_TARGET',
          },
        ],
        academicTaxonomyRelationships: [
          {
            taxonomyNodeId: 'pharmacy',
            referenceNameAr: 'الصيدلة والعلوم الصيدلية',
            relationshipType: 'EXPLICIT_ADMISSION_FIELD',
          },
        ],
      }}
    />,
  );
  for (const label of [
    'الهند',
    'الإنجليزية',
    'ماجستير',
    'الصيدلة والعلوم الصيدلية',
    'الدولة المرتبطة بالاختبار في المصدر',
    'لغة أسئلة الاختبار',
    'الدرجة المستهدفة بالقبول',
    'المجال الأكاديمي المذكور في المصدر',
  ])
    expect(html).toContain(label);
  expect(html).not.toContain('SOURCE_JURISDICTION');
  expect(html).not.toContain('QUESTION_LANGUAGE');
});
