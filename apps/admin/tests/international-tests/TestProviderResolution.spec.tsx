import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import {
  TestProviderResolution,
  reviewedTestProviderResolution,
} from '../../src/features/international-tests/TestProviderResolution';
const multiple = {
  optionalFields: {
    providerReviewResolution: {
      mode: 'MULTIPLE_PROVIDERS',
      reviewStatus: 'RESOLVED',
      noteAr: 'تختلف الجهة حسب المجلس.',
      providers: [
        { providerId: 'aqa', displayName: 'AQA' },
        { providerId: 'ocr', displayName: 'OCR' },
      ],
    },
  },
};
it('shows multiple independent providers without inventing a single owner', () => {
  const html = renderToStaticMarkup(<TestProviderResolution test={multiple} isRtl />);
  expect(html).toContain('جهات متعددة');
  expect(html).toContain('AQA');
  expect(html).toContain('OCR');
  expect(reviewedTestProviderResolution(multiple)?.providers).toHaveLength(2);
});
it('shows decentralised administration with no fabricated provider', () => {
  const test = {
    optionalFields: {
      providerReviewResolution: {
        mode: 'DECENTRALIZED_ADMINISTRATION',
        reviewStatus: 'RESOLVED',
        noteAr: 'حسب الإقليم والجامعة',
        providers: [],
      },
    },
  };
  expect(renderToStaticMarkup(<TestProviderResolution test={test} isRtl />)).toContain(
    'تنظيم محلي حسب الإقليم',
  );
});
it('does not treat old unresolved decisions or malformed JSON as completed', () => {
  for (const raw of [
    null,
    {},
    { mode: 'MULTIPLE_PROVIDERS', reviewStatus: 'RESOLVED', noteAr: 'x', providers: [] },
    {
      mode: 'SINGLE_PROVIDER',
      reviewStatus: 'RESOLVED',
      noteAr: 'x',
      providers: [{ providerId: 7, displayName: 'x' }],
    },
  ])
    expect(
      reviewedTestProviderResolution({ optionalFields: { providerReviewResolution: raw } }),
    ).toBeNull();
});
