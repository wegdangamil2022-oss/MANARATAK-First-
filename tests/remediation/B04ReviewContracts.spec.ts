import { describe, expect, it } from 'vitest';
import { scholarshipCanonicalReviewInput } from '../../apps/admin/src/api/scholarshipCanonicalReviewInput';
describe('B04 unresolved canonical review input', () => {
  it('preserves the requested ID without a source label and prefers a real source value', () => {
    expect(
      scholarshipCanonicalReviewInput({
        requestedCanonicalId: ' requested-id ',
        canonicalId: 'resolved-id',
      }),
    ).toBe('requested-id');
    expect(
      scholarshipCanonicalReviewInput({ rawValue: ' English ', requestedCanonicalId: 'lang-en' }),
    ).toBe('English');
    expect(
      scholarshipCanonicalReviewInput({
        rawValue: ' ',
        requestedCanonicalId: 7,
        canonicalId: 'last-id',
      }),
    ).toBe('last-id');
    expect(scholarshipCanonicalReviewInput({})).toBeUndefined();
  });
});
