import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, it, expect, vi } from 'vitest';
import {
  UniversityNormalizedCard,
  universityNormalizedPayload,
} from '../../src/features/universities/UniversityNormalizedCard';
import { sectionDefinitions } from '../../src/components/UniversitySectionsEditor';
import { readReviewReasonHeader, reviewReasonHeaders } from '@manaratak/shared';
vi.mock('../../src/components/CanonicalPicker', () => ({ CanonicalPicker: () => null }));
const text = (node: unknown): string =>
  typeof node === 'string'
    ? node
    : Array.isArray(node)
      ? node.map(text).join('')
      : node && typeof node === 'object' && 'children' in node
        ? text(node.children)
        : '';
describe('University financial cards and Unicode command transport', () => {
  it('preserves explicit null, zero and false while clearing nullable fields', () => {
    const fields = sectionDefinitions.find(
      (section) => section.key === 'accommodationProfiles',
    )!.fields;
    expect(
      universityNormalizedPayload(
        'accommodationProfiles',
        [
          {
            id: 'stable',
            accommodationAvailable: false,
            typicalCost: 0,
            averageMonthlyLivingCost: '',
            costVariationNote: '',
            currencyReferenceId: 'currency',
            metadata: { untouched: true },
          },
        ],
        fields,
      ),
    ).toEqual([
      {
        id: 'stable',
        accommodationAvailable: false,
        typicalCost: 0,
        averageMonthlyLivingCost: null,
        costVariationNote: null,
        currencyReferenceId: 'currency',
        metadata: { untouched: true },
      },
    ]);
  });
  it('adds a visible specialized tuition draft and removes only that unsaved draft after confirmation', async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    let pending: (() => void) | undefined;
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <UniversityNormalizedCard
          kind="tuitionProfiles"
          title="Specialized tuition"
          university={{
            id: 'u',
            publicId: 'INS-TEST',
            displayName: 'University',
            revision: 1,
            status: 'READY_TO_REVIEW',
            tuitionProfiles: [{ id: 'annual', profileType: 'ANNUAL', amount: 0 }],
          }}
          ar={false}
          editing
          busy={false}
          disabled={false}
          onEdit={() => {}}
          onCancel={() => {}}
          onDirty={() => {}}
          commit={vi.fn()}
          confirm={(_, action) => {
            pending = action;
          }}
          filter={(row) => row.profileType === 'SPECIALIZED'}
        />,
      );
    });
    await act(async () =>
      tree!.root
        .findAllByType('button')
        .find((button) => text(button) === 'Add tuition profile')!
        .props.onClick(),
    );
    expect(
      tree!.root.findAllByType('input').some((input) => input.props.value === 'SPECIALIZED'),
    ).toBe(true);
    await act(async () =>
      tree!.root
        .findAllByType('button')
        .find((button) => text(button).trim() === 'Remove draft')!
        .props.onClick(),
    );
    expect(
      tree!.root.findAllByType('input').some((input) => input.props.value === 'SPECIALIZED'),
    ).toBe(true);
    await act(async () => pending!());
    expect(
      tree!.root.findAllByType('input').some((input) => input.props.value === 'SPECIALIZED'),
    ).toBe(false);
    await act(async () => tree!.unmount());
  });
  it('carries the exact Arabic reason through byte-safe headers and rejects malformed encoding', () => {
    const reason = 'حفظ رسوم الجامعة بمصدر موثق';
    const headers = reviewReasonHeaders(reason);
    expect(headers['X-Review-Reason']).toMatch(/^[\x00-\x7f]+$/);
    expect(
      readReviewReasonHeader(headers['X-Review-Reason'], headers['X-Review-Reason-Encoding']),
    ).toBe(reason);
    expect(readReviewReasonHeader('Existing caller', undefined)).toBe('Existing caller');
    expect(() => readReviewReasonHeader('invalid%%', 'base64utf8')).toThrow(
      'REVIEW_REASON_ENCODING_INVALID',
    );
    expect(() => readReviewReasonHeader('test', 'unknown')).toThrow(
      'REVIEW_REASON_ENCODING_INVALID',
    );
  });
});
