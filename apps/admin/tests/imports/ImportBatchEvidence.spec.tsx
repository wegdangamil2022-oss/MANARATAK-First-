import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const request = vi.hoisted(() => vi.fn());
vi.mock('../../src/api/client', () => ({ adminApiClient: { request } }));
import { ImportBatchEvidence } from '../../src/features/imports/ImportBatchEvidence';
let renderer: ReturnType<typeof create>;
const text = () => JSON.stringify(renderer.toJSON());
const click = async (label: string) => {
  const button = renderer.root.findAllByType('button').find((node) =>
    node.children
      .filter((child) => typeof child === 'string')
      .join('')
      .includes(label),
  );
  expect(button, label).toBeDefined();
  await act(async () => button!.props.onClick());
};
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  request.mockReset();
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});
describe('Import batch evidence', () => {
  it('renders actual execution events and history bounds rather than fabricated counters', async () => {
    request.mockResolvedValue({
      batchId: 'batch-1',
      currentStatus: 'FAILED_RETRYABLE',
      events: [
        {
          eventId: 'e1',
          kind: 'WORKER_FAILURE',
          errorCode: 'NETWORK_FAILURE',
          message: 'Timed out safely',
          createdAt: '2026-10-27T00:00:00Z',
        },
      ],
      historyComplete: false,
      truncated: true,
      stageDurationsKnown: false,
    });
    await act(async () => {
      renderer = create(<ImportBatchEvidence batchId="batch-1" isArabic={false} />);
    });
    expect(request).not.toHaveBeenCalled();
    await click('Execution history');
    expect(request).toHaveBeenCalledWith('/admin/imports/batches/batch-1/timeline');
    expect(text()).toContain('NETWORK_FAILURE');
    expect(text()).toContain('Timed out safely');
    expect(text()).toContain('50');
    expect(text()).toContain('incomplete');
    expect(text()).not.toContain('Received');
  });
  it('distinguishes genuine zero, unavailable counts and inconsistent totals', async () => {
    request.mockResolvedValue({
      batchId: 'b',
      received: null,
      staged: 7,
      skipped: 0,
      invalid: null,
      processed: 0,
      failed: 0,
      consistent: false,
    });
    await act(async () => {
      renderer = create(<ImportBatchEvidence batchId="b" isArabic={false} />);
    });
    await click('Counters');
    expect(text()).toContain('Unavailable');
    expect(text()).toContain('7');
    expect(text()).toContain('0');
    expect(text()).toContain('reconcile');
  });
  it('retains independent evidence and offers retry after a failed read', async () => {
    request
      .mockResolvedValueOnce({ staged: 3 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ events: [], historyComplete: false });
    await act(async () => {
      renderer = create(<ImportBatchEvidence batchId="b" isArabic={false} />);
    });
    await click('Counters');
    await click('Execution history');
    expect(text()).toContain('3');
    expect(text()).toContain('Retry');
    await click('Retry');
    expect(text()).toContain('No recorded execution events');
    expect(text()).toContain('3');
  });
  it('ignores old responses after selecting another batch', async () => {
    let resolve: (value: unknown) => void = () => {};
    request.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await act(async () => {
      renderer = create(<ImportBatchEvidence batchId="first" isArabic={false} />);
    });
    await click('Execution history');
    await act(async () =>
      renderer.update(<ImportBatchEvidence batchId="second" isArabic={false} />),
    );
    await act(async () =>
      resolve({ events: [{ eventId: 'old', message: 'Wrong batch evidence' }] }),
    );
    expect(text()).not.toContain('Wrong batch evidence');
  });
});
