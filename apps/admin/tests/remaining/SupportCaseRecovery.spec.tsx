import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ request: vi.fn(), key: 0 }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: api.request },
  createAdminIdempotencyKey: () => `case-${++api.key}`,
}));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({ hasPermission: () => true }),
}));
import { SupportTicketDetail } from '../../src/pages/support/SupportTicketDetail';
let tree: ReturnType<typeof create>;
const changed = vi.fn();
const ticket = (id: string) => ({
  id,
  title: id,
  publicId: id,
  status: 'OPEN',
  priority: 'NORMAL',
  version: 1,
  updatedAt: '2026-10-28T00:00:00Z',
  teamId: null,
  assigneeId: null,
});
async function mount(id = 'case-a') {
  await act(async () => {
    tree = create(
      <MemoryRouter>
        <SupportTicketDetail id={id} onChanged={changed} />
      </MemoryRouter>,
    );
  });
}
function reply() {
  return tree.root.findAllByType('form')[0].props.onSubmit;
}
async function fill(body: string) {
  await act(async () =>
    tree.root.findAllByType('textarea')[0].props.onChange({ target: { value: body } }),
  );
}
const submitEvent = { preventDefault() {} };
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  api.key = 0;
  changed.mockReset();
  api.request
    .mockReset()
    .mockImplementation(async (path: string) =>
      path === '/admin/support/choices'
        ? { teams: [], macros: [] }
        : path.includes('/messages?')
          ? { items: [], nextCursor: null }
          : ticket(path.split('/').at(-1)!),
    );
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Support case command identity and persistence boundaries', () => {
  it('submits a same-event double reply only once', async () => {
    await mount();
    await fill('Synthetic reply');
    let finish!: (value: unknown) => void;
    api.request.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const send = reply();
    let first!: Promise<void>;
    await act(async () => {
      first = send(submitEvent);
      void send(submitEvent);
    });
    expect(api.request.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(
      1,
    );
    await act(async () => tree.unmount());
    await act(async () => {
      finish({});
      await first;
    });
    expect(changed).not.toHaveBeenCalled();
  });
  it('rejects a case read with a different owner identity', async () => {
    api.request.mockImplementation(async (path: string) =>
      path.includes('/messages?')
        ? { items: [], nextCursor: null }
        : path.endsWith('/choices')
          ? { teams: [], macros: [] }
          : ticket('unrelated-case'),
    );
    await mount();
    expect(JSON.stringify(tree.toJSON())).not.toContain('unrelated-case');
    expect(tree.root.findAllByType('form')).toHaveLength(0);
  });
  it('keeps an uncertain command frozen when the visible reply is edited', async () => {
    await mount();
    await fill('Original reply');
    api.request.mockRejectedValue(Error('offline'));
    await act(async () => {
      await reply()(submitEvent);
    });
    await fill('Different reply');
    await act(async () => {
      await reply()(submitEvent);
    });
    expect(api.request.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(
      1,
    );
  });
  it('does not verify another case from command-status', async () => {
    await mount();
    await fill('Original reply');
    api.request.mockRejectedValueOnce(Error('offline'));
    await act(async () => {
      await reply()(submitEvent);
    });
    api.request.mockResolvedValue({ state: 'SAVED', caseId: 'other-case' });
    const recover = tree.root
      .findAllByType('button')
      .find((node) => node.children.includes('Verify and safely retry the same command'))!;
    await act(async () => recover.props.onClick());
    expect(changed).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).not.toContain(
      'Save verified without creating a new command.',
    );
    expect(tree.root.findAllByType('textarea')[0].props.value).toBe('Original reply');
  });
});
