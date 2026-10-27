import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => 'one-stable-command-key',
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
import {
  useCertificateCommand,
  useCertificateRead,
} from '../../src/features/certificates/certificateHooks';
let tree: ReturnType<typeof create>, command: ReturnType<typeof useCertificateCommand>;
function Command() {
  command = useCertificateCommand();
  return <p>{command.error}</p>;
}
function Read({ path }: { path: string }) {
  const result = useCertificateRead<{ value: string }>(path);
  return <p>{result.data?.value ?? 'LOADING'}</p>;
}
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  state.request.mockReset();
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Certificate asynchronous provenance', () => {
  it('keeps the same idempotency identity after an uncertain command and blocks a changed payload', async () => {
    await act(async () => {
      tree = create(<Command />);
    });
    state.request.mockRejectedValueOnce(Error('network interrupted'));
    await act(async () => {
      await command.execute('/admin/certificates/c/revoke', { reason: 'Original reason' });
    });
    expect(command.uncertain).toBe(true);
    await act(async () => {
      await command.execute('/admin/certificates/c/revoke', { reason: 'Changed reason' });
    });
    expect(state.request).toHaveBeenCalledTimes(1);
    state.request.mockResolvedValue({ id: 'c' });
    await act(async () => {
      await command.execute('/admin/certificates/c/revoke', { reason: 'Original reason' });
    });
    expect(state.request.mock.calls[0][1].idempotencyKey).toBe(
      state.request.mock.calls[1][1].idempotencyKey,
    );
    expect(command.uncertain).toBe(false);
  });
  it('allows an edited retry after a conclusive conflict, without pretending it succeeded', async () => {
    await act(async () => {
      tree = create(<Command />);
    });
    state.request.mockRejectedValueOnce(Error('[409] CERTIFICATE_TEMPLATE_STALE'));
    await act(async () => {
      await command.execute('/admin/certificates/templates/t/transition', { status: 'APPROVED' });
    });
    expect(command.uncertain).toBe(false);
    expect(command.error).toContain('version changed');
    state.request.mockResolvedValue({ id: 't' });
    await act(async () => {
      await command.execute('/admin/certificates/templates/t/transition', { status: 'DRAFT' });
    });
    expect(state.request).toHaveBeenCalledTimes(2);
  });
  it('ignores an obsolete read that resolves after navigation', async () => {
    const pending: Record<string, (value: unknown) => void> = {};
    state.request.mockImplementation(
      (path) =>
        new Promise((resolve) => {
          pending[path] = resolve;
        }),
    );
    await act(async () => {
      tree = create(<Read path="/old" />);
    });
    await act(async () => tree.update(<Read path="/new" />));
    await act(async () => pending['/new']({ value: 'CURRENT' }));
    await act(async () => pending['/old']({ value: 'OBSOLETE' }));
    expect(JSON.stringify(tree.toJSON())).toContain('CURRENT');
    expect(JSON.stringify(tree.toJSON())).not.toContain('OBSOLETE');
  });
  it('blocks double submission while the first command is pending', async () => {
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await act(async () => {
      tree = create(<Command />);
    });
    let first!: Promise<unknown>;
    await act(async () => {
      first = command.execute('/admin/certificates/c/renew', { reason: 'Renewal proof' });
      void command.execute('/admin/certificates/c/renew', { reason: 'Renewal proof' });
    });
    expect(state.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ id: 'replacement' });
      await first;
    });
  });
});
