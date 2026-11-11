import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  permissions: new Set<string>(),
  languages: vi.fn(),
  degreeLevels: vi.fn(),
  taxonomyNodes: vi.fn(),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (permission: string) => mocks.permissions.has(permission),
  }),
}));
vi.mock('../../src/api/canonicalPickers', () => ({
  canonicalPickerApi: mocks,
  canonicalOptionIsSelectable: () => true,
}));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'ar' }) }));
import { TestAcademicFilters } from '../../src/features/international-tests/TestAcademicFilters';
let tree: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  mocks.permissions.clear();
  for (const load of [mocks.languages, mocks.degreeLevels, mocks.taxonomyNodes])
    load
      .mockReset()
      .mockResolvedValue([{ id: 'linked-id', label: 'اسم المرجع', lifecycle: 'ACTIVE' }]);
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('keeps canonical identities in filters while displaying Arabic labels and forwarding selection changes', async () => {
  mocks.permissions.add('admin:reference-data:manage');
  mocks.permissions.add('admin:academic-taxonomy:manage');
  const change = vi.fn();
  await act(async () => {
    tree = create(
      <TestAcademicFilters
        ar
        params={new URLSearchParams('degreeLevelId=linked-id')}
        change={change}
      />,
    );
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
  const selects = tree.root.findAllByType('select');
  expect(selects).toHaveLength(3);
  expect(selects[1].props.value).toBe('linked-id');
  expect(
    selects[1].findAllByType('option').some((option) => option.children.join('') === 'اسم المرجع'),
  ).toBe(true);
  await act(async () => {
    selects[0].props.onChange({ target: { value: 'linked-id' } });
    selects[1].props.onChange({ target: { value: '' } });
    selects[2].props.onChange({ target: { value: 'linked-id' } });
  });
  expect(change.mock.calls).toEqual([
    ['languageReferenceId', 'linked-id'],
    ['degreeLevelId', ''],
    ['taxonomyNodeId', 'linked-id'],
  ]);
  expect(mocks.languages).toHaveBeenCalledWith('', 1);
  expect(mocks.taxonomyNodes).toHaveBeenCalledWith(undefined, '', 1);
});
it('does not request reference catalogs outside the current permissions', async () => {
  await act(async () => {
    tree = create(<TestAcademicFilters ar params={new URLSearchParams()} change={vi.fn()} />);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
  expect(tree.root.findAllByType('select')).toHaveLength(0);
  expect(mocks.languages).not.toHaveBeenCalled();
  expect(mocks.degreeLevels).not.toHaveBeenCalled();
  expect(mocks.taxonomyNodes).not.toHaveBeenCalled();
});
