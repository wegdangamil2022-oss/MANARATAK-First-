import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  graphMajorLabel,
  graphProgramLabel,
  graphScholarshipLabel,
  graphServiceLabel,
  graphTestLabel,
} from '../../../packages/application/src/read-models/GraphOwnerLabels';
test('graph labels: published major translation beats draft candidates', () => {
  const owner = {
    displayName: 'Owner',
    status: 'PUBLISHED',
    currentPublishedVersionId: 'v1',
    localizedNameEn: 'Reviewed',
    optionalFields: {
      translationNameCandidates: { en: { reviewStatus: 'NEEDS_REVIEW', value: 'Draft' } },
    },
  };
  assert.equal(graphMajorLabel(owner as any, 'en').displayName, 'Reviewed');
  assert.equal(graphMajorLabel({ ...owner, status: 'DRAFT' } as any, 'en').localeFallback, true);
});
test('graph labels: service public snapshot owns translations instead of a newer draft', () => {
  const value = graphServiceLabel(
    {
      displayName: 'Draft',
      localizedContent: { en: { displayName: 'Draft' } },
      publishedSnapshot: {
        displayName: 'Published',
        localizedContent: { en: { displayName: 'Reviewed' } },
      },
    } as any,
    'en',
  );
  assert.equal(value.displayName, 'Reviewed');
  assert.equal(value.localeFallback, false);
});
test('graph labels: program translations require exact target, field and publication review', () => {
  const owner = {
    localizedTexts: [
      {
        targetType: 'ACADEMIC_PROGRAM',
        targetId: 'p',
        fieldKey: 'sourceProgramName',
        locale: 'en',
        reviewStatus: 'PUBLISHED',
        value: 'Reviewed program',
      },
      {
        targetType: 'ACADEMIC_PROGRAM',
        targetId: 'other',
        fieldKey: 'sourceProgramName',
        locale: 'ar',
        reviewStatus: 'PUBLISHED',
        value: 'Other program',
      },
      {
        targetType: 'ACADEMIC_PROGRAM',
        targetId: 'p',
        fieldKey: 'sourceProgramName',
        locale: 'ar',
        reviewStatus: 'NEEDS_REVIEW',
        value: 'Draft',
      },
    ],
  };
  const program = { id: 'p', sourceProgramName: 'Owner default' };
  assert.equal(graphProgramLabel(owner as any, program, 'en').displayName, 'Reviewed program');
  assert.deepEqual(graphProgramLabel(owner as any, program, 'ar'), {
    displayName: 'Owner default',
    labelLocale: 'OWNER_DEFAULT',
    localeFallback: true,
  });
});
test('graph labels: unpublished test names cannot become reviewed localized labels', () => {
  assert.equal(
    graphTestLabel({ canonicalName: 'Owner', localizedNameEn: 'Unreviewed' } as any, 'en')
      .displayName,
    'Owner',
  );
  assert.equal(
    graphTestLabel(
      {
        canonicalName: 'Owner',
        currentPublishedVersionId: 'published',
        localizedNameEn: 'Reviewed',
      } as any,
      'en',
    ).labelLocale,
    'en',
  );
  assert.equal(
    graphScholarshipLabel({ displayName: 'Owner', localizedNames: { en: '  ' } } as any, 'en')
      .localeFallback,
    true,
  );
});
