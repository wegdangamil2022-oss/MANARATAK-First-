import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  filterStudentNotifications,
  computeNextPriorityStep,
  resolveDocumentStatusDimensions,
} from './studentAccountBriefLogic';

describe('studentAccountBriefLogic', () => {
  it('separates ALL, UNREAD, and READ notifications accurately without turning READ into ALL', () => {
    const items = [
      { id: 'n1', readAt: null },
      { id: 'n2', readAt: '2026-10-20T10:00:00.000Z' },
      { id: 'n3', readAt: null },
    ];
    const localReadIds = new Set(['n3']);

    const all = filterStudentNotifications(items, 'ALL', localReadIds);
    const unread = filterStudentNotifications(items, 'UNREAD', localReadIds);
    const read = filterStudentNotifications(items, 'READ', localReadIds);

    assert.equal(all.length, 3);
    assert.deepEqual(unread.map((i) => i.id), ['n1']);
    assert.deepEqual(read.map((i) => i.id), ['n2', 'n3']);
  });

  it('computes the top next priority step from active tracker tasks first', () => {
    const step = computeNextPriorityStep({
      trackers: [
        {
          id: 't1',
          studentReferenceId: 's1',
          scholarshipId: 'csc',
          stage: 'تجهيز المستندات',
          status: 'ACTIVE',
          version: 1,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
          owner: {
            id: 'csc',
            slug: 'csc',
            displayName: 'منحة الحكومة الصينية',
            available: true,
          },
          checklist: [
            {
              id: 'c1',
              trackerId: 't1',
              label: 'تجهيز جواز السفر',
              completed: true,
              position: 0,
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'c2',
              trackerId: 't1',
              label: 'ترجمة السجل الأكاديمي',
              completed: false,
              position: 1,
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      ],
      invoices: [],
      courses: [],
    });

    assert.equal(step.title, 'ترجمة السجل الأكاديمي');
    assert.equal(step.subtitle, 'منحة الحكومة الصينية');
    assert.equal(step.targetTab, 'OPPORTUNITIES');
  });

  it('resolves the 4 independent document status dimensions clearly', () => {
    const dimensions = resolveDocumentStatusDimensions({
      expiresAt: '2029-01-01T00:00:00Z',
      available: true,
      consentGranted: false,
      verification: 'NOT_ATTESTED',
    });

    assert.equal(dimensions.validityLabel, 'ساري الصلاحية');
    assert.equal(dimensions.availabilityLabel, 'الأصل متاح');
    assert.equal(dimensions.consentLabel, 'موافقة المراجعة غير مفعلة');
    assert.equal(dimensions.verificationLabel, 'غير مصدّق بعد');
  });
});
