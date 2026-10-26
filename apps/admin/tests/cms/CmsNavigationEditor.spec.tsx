import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/features/cms/CmsActionDialog', () => ({
  useCmsActionDialog: () => ({ requestAction: async () => ({}), actionDialog: null }),
}));
import { CmsNavigationEditor } from '../../src/features/cms/CmsNavigationEditor';
let renderer: ReturnType<typeof create>;
const text = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map(text).join('')
      : value && typeof value === 'object' && 'children' in value
        ? text(value.children)
        : '';
const nodes = [
  {
    id: 'first',
    parentNodeId: null,
    displayText: 'First link',
    targetType: 'EXTERNAL_URL' as const,
    targetValue: 'https://example.org/one',
    sortOrder: 0,
    openInNewWindow: true,
    metadata: { keep: 'value' },
  },
  {
    id: 'second',
    parentNodeId: null,
    displayText: 'Second link',
    targetType: 'EXTERNAL_URL' as const,
    targetValue: 'https://example.org/two',
    sortOrder: 1,
    openInNewWindow: false,
    metadata: null,
  },
];
const save = vi.fn(),
  publish = vi.fn();
function button(label: string) {
  return renderer.root.findAllByType('button').find((node) => text(node.props.children) === label)!;
}
async function mount() {
  await act(async () => {
    renderer = create(
      <CmsNavigationEditor
        menus={[{ id: 'menu', locationKey: 'HEADER', status: 'DRAFT', version: 7, nodes }]}
        locale="ar"
        disabled={false}
        canPublish={true}
        onDirty={() => {}}
        onSave={save}
        onPublish={publish}
      />,
    );
  });
}
beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  save.mockReset().mockResolvedValue(undefined);
  publish.mockReset();
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});
describe('governed navigation editor', () => {
  it('starts in reading mode and preserves IDs, metadata and CAS when changing order', async () => {
    await mount();
    expect(renderer.root.findAllByType('input')).toHaveLength(0);
    await act(async () => button('Edit menu').props.onClick());
    await act(async () => button('Down').props.onClick());
    await act(async () => button('Save menu draft').props.onClick());
    expect(save).toHaveBeenCalledWith({
      id: 'menu',
      expectedVersion: 7,
      locationKey: 'HEADER',
      nodes: [
        { ...nodes[1], sortOrder: 0 },
        { ...nodes[0], sortOrder: 1 },
      ],
    });
  });
  it('prevents cyclic parents before requesting a save', async () => {
    await mount();
    await act(async () => button('Edit menu').props.onClick());
    const parents = () =>
      renderer.root.findAllByType('select').filter((node) => node.props.value === '');
    await act(async () => parents()[0].props.onChange({ target: { value: 'second' } }));
    await act(async () => parents()[0].props.onChange({ target: { value: 'first' } }));
    await act(async () => button('Save menu draft').props.onClick());
    expect(save).not.toHaveBeenCalled();
    expect(text(renderer.toJSON())).toContain('parent cycles');
  });
  it('removes only the chosen node after confirmation', async () => {
    await mount();
    await act(async () => button('Edit menu').props.onClick());
    await act(async () => button('Remove').props.onClick());
    await act(async () => button('Save menu draft').props.onClick());
    expect(save.mock.calls[0][0].nodes).toEqual([{ ...nodes[1], sortOrder: 0 }]);
  });
});
