import { describe, it, expect, vi } from 'vitest';
import {
  ReviewWorkspaceUseCases,
  type ReviewWorkspaceGateway,
} from '../../src/review-workspace/ReviewWorkspaceUseCases';
import {
  normalizeReviewSearch,
  reviewPriority,
} from '../../../infrastructure/src/review-workspace/PrismaReviewWorkspaceGateway';
import { isAdministrativeReadQuery } from '../../../../apps/api/src/presentation/security/AdministrativeReadQuery';
import { reviewWorkspaceQuery } from '../../../../apps/api/src/presentation/api/router/ReviewWorkspaceRouter';
describe('Review workbench authorization and search contracts', () => {
  it('batches reviewer eligibility while retaining platform and owner requirements', async () => {
    const candidates = [{ id: 'owner-only', label: 'Owner', kind: 'person' }, { id: 'platform-only', label: 'Platform', kind: 'person' }, { id: 'both', label: 'Both', kind: 'person' }];
    const evaluatePermissions = vi.fn(async (actor: string, permissions: readonly string[]) => permissions.map(permission => ({
      isGranted: actor === 'actor' || actor === 'both' ||
        (actor === 'owner-only' && permission === 'admin:cms:view') ||
        (actor === 'platform-only' && permission === 'admin:platform:manage'),
    })));
    const uc = new ReviewWorkspaceUseCases({ reviewers: async () => candidates } as unknown as ReviewWorkspaceGateway, { evaluatePermission: vi.fn(), evaluatePermissions } as never);
    expect(await uc.reviewers('actor', 'cms')).toEqual([candidates[2]]);
    expect(evaluatePermissions).toHaveBeenCalledTimes(4);
  });
  it('uses one fresh permission batch without deriving owner access from platform access', async () => {
    const list = vi.fn(async () => ({}));
    const evaluatePermission = vi.fn();
    const evaluatePermissions = vi.fn(async (_actor: string, permissions: readonly string[]) =>
      permissions.map(permission => ({ isGranted: ['admin:platform:manage', 'admin:cms:view'].includes(permission) })),
    );
    const uc = new ReviewWorkspaceUseCases({ list } as unknown as ReviewWorkspaceGateway, { evaluatePermission, evaluatePermissions } as never);
    await uc.list('staff', {});
    expect(list.mock.calls[0][0]).toMatchObject({ domains: ['cms'], imports: false });
    expect(evaluatePermissions).toHaveBeenCalledTimes(1); expect(evaluatePermission).not.toHaveBeenCalled();
    evaluatePermissions.mockImplementation(async (_actor, permissions) => permissions.map(() => ({ isGranted: false })));
    await expect(uc.list('staff', {})).rejects.toThrow('REVIEW_FORBIDDEN');
    expect(list).toHaveBeenCalledTimes(1);
  });
  it('normalizes Arabic hamza/diacritics without changing other letters or deleting words', () => {
    expect(normalizeReviewSearch('  إِدارةُ الـمِنَح  ')).toBe('ادارة المنح');
    expect(normalizeReviewSearch('ى أآإ')).toBe('ي ااا');
    expect(normalizeReviewSearch("x%' OR true --")).toBe("x%' or true --");
  });
  it('deduces only explicitly labelled suggested urgency from documented review reasons', () => {
    expect(reviewPriority(['workflow_review', 'needs_translation'])).toBe('medium');
    expect(reviewPriority(['workflow_review', 'incomplete'])).toBe('high');
  });
  it('does not grant any owner from platform permission alone', async () => {
    const list = vi.fn(async () => ({})),
      gateway = { list } as unknown as ReviewWorkspaceGateway;
    const evaluator = {
      evaluatePermission: vi.fn(async (_actor: string, permission: string) => ({
        isGranted: permission === 'admin:platform:manage',
      })),
    };
    const uc = new ReviewWorkspaceUseCases(gateway, evaluator as never);
    await uc.list('staff', {});
    expect(list.mock.calls[0][0]).toMatchObject({ domains: [], imports: false });
  });
  it('refuses unauthenticated and forbidden reads before any gateway call', async () => {
    const list = vi.fn(),
      uc = new ReviewWorkspaceUseCases(
        { list } as unknown as ReviewWorkspaceGateway,
        { evaluatePermission: vi.fn(async () => ({ isGranted: false })) } as never,
      );
    await expect(uc.list('', {})).rejects.toThrow('REVIEW_AUTH_REQUIRED');
    await expect(uc.list('staff', {})).rejects.toThrow('REVIEW_FORBIDDEN');
    expect(list).not.toHaveBeenCalled();
  });
  it('checks both current resource and recipient permission through the command boundary', async () => {
    const checks: Array<unknown> = [],
      gateway = {
        command: vi.fn(async (_access, command, authorize) => {
          checks.push(await authorize('staff', 'cms', 'record'));
          checks.push(await authorize('student', 'cms', 'record'));
          return command;
        }),
      } as unknown as ReviewWorkspaceGateway;
    const evaluator = {
      evaluatePermission: vi.fn(
        async (actor: string, permission: string, context: { resourceId?: string }) => ({
          isGranted:
            actor === 'staff' &&
            (permission === 'admin:platform:manage' ||
              permission === 'admin:cms:view' ||
              (permission === 'admin:cms:review' && context.resourceId === 'record')),
        }),
      ),
    };
    const uc = new ReviewWorkspaceUseCases(gateway, evaluator as never);
    await uc.command('staff', {
      key: 'cms:record:',
      version: 1,
      ownerRevision: 'a'.repeat(32),
      idempotencyKey: 'a'.repeat(20),
      action: 'claim',
      reason: 'Review claim',
    });
    expect(checks).toEqual([true, false]);
  });
  it('allows no bulk publication, duplicate keys or unbounded bulk commands', async () => {
    const uc = new ReviewWorkspaceUseCases({} as ReviewWorkspaceGateway, {} as never);
    await expect(uc.bulk('staff', [])).rejects.toThrow('REVIEW_INPUT_INVALID');
    await expect(uc.bulk('staff', [{ key: 'x', action: 'claim' }] as never)).rejects.toThrow(
      'REVIEW_INPUT_INVALID',
    );
    await expect(
      uc.bulk(
        'staff',
        Array.from({ length: 26 }, (_, i) => ({ key: String(i), action: 'assign' })) as never,
      ),
    ).rejects.toThrow('REVIEW_INPUT_INVALID');
  });
  it('validates server filter choices and bounded cursors', () => {
    expect(reviewWorkspaceQuery.safeParse({ domain: 'finance' }).success).toBe(false);
    expect(reviewWorkspaceQuery.safeParse({ pageSize: 500 }).success).toBe(false);
    expect(reviewWorkspaceQuery.safeParse({ search: 'x'.repeat(201) }).success).toBe(false);
    expect(reviewWorkspaceQuery.parse({ sort: 'deadline', pageSize: '25' })).toMatchObject({
      pageSize: 25,
      sort: 'deadline',
    });
  });
  it('treats exactly the read-only POST search as a read; no prefix or mutation aliases', () => {
    expect(
      isAdministrativeReadQuery({
        method: 'POST',
        originalUrl: '/api/v1/admin/review-workspace/query',
      }),
    ).toBe(true);
    for (const originalUrl of [
      '/api/v1/admin/review-workspace/query/commands',
      '/api/v1/admin/review-workspace/commands',
      '/api/v1/admin/review-workspace/synchronize',
      '/api/v1/admin/review-workspace/query%2fcommands',
      '/admin/review-workspace/query',
    ])
      expect(isAdministrativeReadQuery({ method: 'POST', originalUrl })).toBe(false);
  });
});
