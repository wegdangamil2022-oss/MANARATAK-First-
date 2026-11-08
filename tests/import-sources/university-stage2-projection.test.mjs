import assert from 'node:assert/strict';
import test from 'node:test';
import { planUniversityStage2Projection } from '../../scripts/import/university-stage2-projection.mjs';

const source = {
  'University Reference ID': 'INS-TEST-0001',
  'Country ISO3': 'TST',
  'Official English Name': 'Verified university',
  'Founded Year': '2001',
  'Short Description': 'Source description',
  'Review Status': 'Ready for Import',
  'Official Application Portal URL': 'https://example.edu/apply',
};
const owner = {
  id: 'owner',
  publicId: 'INS-TEST-0001',
  displayName: 'Original university',
  canonicalName: 'Original university',
  foundedYear: null,
  status: 'IMPORTED',
  optionalFields: {},
};
const first = {
  existingId: null,
  raw: { ISO3: 'TST', 'Official English Name': 'Original university' },
};
test('enriches a matching Stage-1 identity without requiring a supplied founding year', () => {
  const input = { ...source, 'Founded Year': '' };
  const result = planUniversityStage2Projection(input, owner, first, 2026);
  assert.ok(result.rootKeys.includes('displayName'));
  assert.ok(!result.rootKeys.includes('foundedYear'));
  assert.ok(result.optionalKeys.includes('description'));
  assert.equal(input['Founded Year'], '');
});
test('recognizes the European workbook literal Verified status without treating review states as approval', () => {
  const result = planUniversityStage2Projection(
    { ...source, 'Review Status': 'Verified' },
    owner,
    first,
    2026,
  );
  assert.equal(result.sourceReady, true);
  assert.ok(result.rootKeys.includes('foundedYear'));
  assert.ok(result.optionalKeys.includes('description'));
});
test('preserves manual descriptions, founding years and admissions settings', () => {
  const result = planUniversityStage2Projection(
    source,
    {
      ...owner,
      foundedYear: 1900,
      optionalFields: {
        description: 'Manual description',
        internationalAdmissions: { applicationPortalUrl: 'https://manual.example/' },
      },
    },
    first,
    2026,
  );
  assert.ok(!result.rootKeys.includes('foundedYear'));
  assert.ok(!result.optionalKeys.includes('description'));
  assert.ok(!result.optionalKeys.includes('internationalAdmissions.applicationPortalUrl'));
});
test('retains rejected, under-review and immutable-owner rows as evidence without promotion', () => {
  for (const state of ['Rejected', 'Under Review']) {
    const result = planUniversityStage2Projection(
      { ...source, 'Review Status': state },
      owner,
      first,
      2026,
    );
    assert.deepEqual(result.rootKeys, []);
    assert.deepEqual(result.optionalKeys, []);
  }
  const published = planUniversityStage2Projection(
    source,
    { ...owner, status: 'PUBLISHED' },
    first,
    2026,
  );
  assert.equal(published.ownerImmutable, true);
  assert.deepEqual(published.rootKeys, []);
});
test('keeps malformed URLs, years and mismatched-country content out of canonical fields', () => {
  const result = planUniversityStage2Projection(
    {
      ...source,
      'Founded Year': 'not known',
      'Official Application Portal URL': 'javascript:alert(1)',
    },
    owner,
    first,
    2026,
  );
  assert.ok(!result.rootKeys.includes('foundedYear'));
  assert.ok(!result.optionalKeys.includes('internationalAdmissions.applicationPortalUrl'));
  const mismatch = planUniversityStage2Projection(
    { ...source, 'Country ISO3': 'OTHER' },
    owner,
    first,
    2026,
  );
  assert.deepEqual(mismatch.rootKeys, []);
  assert.deepEqual(mismatch.optionalKeys, []);
});
