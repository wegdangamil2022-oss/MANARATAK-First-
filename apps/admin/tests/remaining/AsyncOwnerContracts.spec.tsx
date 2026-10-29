import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ request: vi.fn(), key: 0 }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: api.request },
  createAdminIdempotencyKey: () => `attempt-${++api.key}`,
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
import {
  useStaffCommand,
  useStaffRead,
} from '../../src/features/identity-authorization/staffHooks';
import { useWorkspaceRead } from '../../src/features/ai-tools/Workspace';
import { useFinanceRead } from '../../src/pages/useFinanceRead';
let tree: ReturnType<typeof create>, command: ReturnType<typeof useStaffCommand>;
const saved = vi.fn();
function Command() {
  command = useStaffCommand(saved);
  return null;
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.request.mockReset();
  api.key = 0;
  saved.mockReset();
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Remaining owner asynchronous contracts', () => {
  it('freezes an uncertain staff attempt and replays only its exact payload and key', async () => {
    await act(async () => {
      tree = create(<Command />);
    });
    api.request.mockRejectedValueOnce(Error('disconnected')).mockResolvedValueOnce({});
    await act(async () => {
      await command.run('/staff/member/change', { reason: 'Original' });
    });
    await act(async () => {
      await command.run('/staff/member/change', { reason: 'Different' });
    });
    expect(api.request).toHaveBeenCalledTimes(1);
    await act(async () => {
      await command.run('/staff/member/change', { reason: 'Original' });
    });
    expect(api.request.mock.calls[0][1].idempotencyKey).toBe(
      api.request.mock.calls[1][1].idempotencyKey,
    );
  });
  it('allows an edited staff retry after a definitive conflict', async () => {
    await act(async () => {
      tree = create(<Command />);
    });
    api.request.mockRejectedValueOnce(Error('[409] STALE')).mockResolvedValueOnce({});
    await act(async () => {
      await command.run('/staff/member/change', { reason: 'Original' });
    });
    await act(async () => {
      await command.run('/staff/member/change', { reason: 'Updated' });
    });
    expect(api.request).toHaveBeenCalledTimes(2);
    expect(saved).toHaveBeenCalledOnce();
  });
  it('does not classify an accepted staff change as a rejected command when its callback fails', async () => {
    await act(async () => {
      tree = create(<Command />);
    });
    api.request.mockResolvedValue({});
    saved.mockImplementation(() => {
      throw Error('read failure');
    });
    let result = false;
    await act(async () => {
      result = await command.run('/staff/member/change', {});
    });
    expect(result).toBe(true);
    expect(command.error).toContain('Saved;');
  });
  it('ignores a staff completion after its editor unmounts', async () => {
    await act(async () => {
      tree = create(<Command />);
    });
    let finish!: (value: unknown) => void;
    api.request.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = command.run('/staff/member/change', {});
    });
    await act(async () => tree.unmount());
    await act(async () => {
      finish({});
      await pending;
    });
    expect(saved).not.toHaveBeenCalled();
  });
  it('does not invoke a stale AI/tools reload callback after changing its path', async () => {
    let read!: ReturnType<typeof useWorkspaceRead>;
    function Probe({ path }: { path: string }) {
      read = useWorkspaceRead(path);
      return null;
    }
    api.request.mockResolvedValue({});
    await act(async () => {
      tree = create(<Probe path="/old" />);
    });
    const oldReload = read.load;
    await act(async () => tree.update(<Probe path="/new" />));
    const count = api.request.mock.calls.length;
    await act(async () => oldReload());
    expect(api.request).toHaveBeenCalledTimes(count);
  });
  it('does not paint a previous financial observation while a new refresh is pending', async () => {
    const renders: Array<{ token: number; data: unknown }> = [];
    function Probe({ token }: { token: number }) {
      const read = useFinanceRead('/finance', token);
      renders.push({ token, data: read.data });
      return null;
    }
    api.request.mockResolvedValueOnce({ amount: 'OLD' }).mockReturnValue(new Promise(() => {}));
    await act(async () => {
      tree = create(<Probe token={0} />);
    });
    await act(async () => tree.update(<Probe token={1} />));
    expect(renders.find((row) => row.token === 1)?.data).toBeNull();
  });
  it('does not paint staff data from a different endpoint before the replacement effect', async () => {
    const renders: Array<{ path: string; value: unknown }> = [];
    function Probe({ path }: { path: string }) {
      const read = useStaffRead(path);
      renders.push({ path, value: read.value });
      return null;
    }
    api.request
      .mockResolvedValueOnce({ data: { id: 'old' } })
      .mockReturnValue(new Promise(() => {}));
    await act(async () => {
      tree = create(<Probe path="/old" />);
    });
    await act(async () => tree.update(<Probe path="/new" />));
    expect(renders.find((row) => row.path === '/new')?.value).toBeNull();
  });
  it('ends AI/tools loading when a replacement path fails', async () => {
    let read!: ReturnType<typeof useWorkspaceRead>;
    function Probe({ path }: { path: string }) {
      read = useWorkspaceRead(path);
      return null;
    }
    api.request.mockResolvedValueOnce({ id: 'old' }).mockRejectedValueOnce(Error('offline'));
    await act(async () => {
      tree = create(<Probe path="/old" />);
    });
    await act(async () => tree.update(<Probe path="/new" />));
    expect(read.data).toBeNull();
    expect(read.loading).toBe(false);
    expect(read.error).toBe(true);
  });
});
