import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, it, expect, vi } from 'vitest';
import {
  renderApprovedCertificateSvg,
  APPROVED_CERTIFICATE_DESIGN,
  approvedCertificateCopy,
  type ApprovedCertificateDesignInput,
} from '@manaratak/shared';
const state = vi.hoisted(() => ({
  input: null as Omit<ApprovedCertificateDesignInput, 'logoUrl'> | null,
}));
vi.mock('../../src/components/certificates/ApprovedCertificatePreview', () => ({
  ApprovedCertificatePreview: ({
    input,
  }: {
    input: Omit<ApprovedCertificateDesignInput, 'logoUrl'>;
  }) => {
    state.input = input;
    return <p>Vector preview</p>;
  },
}));
import { CertificatePreview } from '../../src/components/certificates/CertificatePreview';
describe('Official template preview without an issued certificate', () => {
  it('renders the adopted design without confusing blank serial/date fields with overflowing text', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <CertificatePreview
          template={{
            ...approvedCertificateCopy,
            metadata: { designId: APPROVED_CERTIFICATE_DESIGN },
          }}
        />,
      );
    });
    expect(state.input?.serial).toBe('TEMPLATE-PREVIEW');
    expect(state.input?.issuedAt).toBe('—');
    expect(() =>
      renderApprovedCertificateSvg({ ...state.input!, logoUrl: 'data:image/png;base64,AA==' }),
    ).not.toThrow();
    await act(async () => tree.unmount());
  });
});
