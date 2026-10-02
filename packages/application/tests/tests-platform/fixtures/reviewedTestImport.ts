import { InternationalTestCategory } from '@manaratak/domain';
import { internationalTestSourceHash } from '../../../src/tests-platform/use-cases/InternationalTestImportChangeSet';

export const actorId = '00000000-0000-4000-8000-000000000001';
export const reviewEntry = () => {
  const rawContent = '# المصدر الأصلي\n## 1. التعريف\nنص كامل\n## 2. الشروط\nشروط المصدر';
  return { sourceKey: 'language/Test_2026.md', sourceClassification: 'NEW_TEST' as const, resolution: 'APPROVE_CREATE' as const, reviewReason: 'Reviewed canonical mapping', evidenceReference: 'review/test-pilot-1', targetId: '00000000-0000-4000-8000-000000000002', core: { publicId: 'TEST-PILOT-1', slug: 'pilot-test', canonicalName: 'Pilot test', displayName: 'اختبار تجريبي', testCategory: InternationalTestCategory.ENGLISH_LANGUAGE, providerId: '00000000-0000-4000-8000-000000000003' }, sourceCycle: '2026', sourceHash: internationalTestSourceHash(rawContent), rawContent };
};
export const reviewBody = () => ({ schemaVersion: 1 as const, changeSetId: '00000000-0000-4000-8000-000000000004', sourceManifestHash: 'a'.repeat(64), entries: [reviewEntry()], databaseWrites: 0 as const });
