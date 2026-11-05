import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
import { CanonicalPicker } from '../../src/components/CanonicalPicker';
let tree: ReactTestRenderer;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const options = [
  { id: 'degree-master-uuid', label: 'Master', code: 'MASTER', lifecycle: 'ACTIVE' },
  { id: 'retired-uuid', label: 'Retired degree', code: 'OLD', lifecycle: 'ARCHIVED' },
];
describe('canonical picker presentation', () => {
  it('shows names without technical identifiers in label mode, retaining the same selection guards', async () => {
    const onChange = vi.fn(),
      load = vi.fn().mockResolvedValue(options);
    await act(async () => {
      tree = create(
        <CanonicalPicker
          label="Degree"
          value={options[0].id}
          onChange={onChange}
          load={load}
          displayMode="label"
          selectedLabel="Master"
        />,
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(tree.root.findByType('select').props.disabled).toBe(false);
    expect(
      tree.root
        .findAllByType('option')
        .find((node) => node.props.value === options[0].id)
        ?.children.join(''),
    ).toBe('Master');
    expect(
      tree.root
        .findAllByType('span')
        .flatMap((node) => node.children)
        .join(''),
    ).not.toContain(options[0].id);
    const select = tree.root.findByType('select');
    await act(async () => select.props.onChange({ target: { value: options[1].id } }));
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => select.props.onChange({ target: { value: options[0].id } }));
    expect(onChange).toHaveBeenCalledWith(options[0].id, options[0]);
  });
  it('preserves default reference details and a saved selection outside the result page', async () => {
    const load = vi.fn().mockResolvedValue(options);
    await act(async () => {
      tree = create(
        <CanonicalPicker label="Degree" value={options[0].id} onChange={vi.fn()} load={load} />,
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(
      tree.root
        .findAllByType('option')
        .find((node) => node.props.value === options[0].id)
        ?.children.join(''),
    ).toBe('Master · MASTER · ACTIVE');
    await act(async () => {
      tree.update(
        <CanonicalPicker
          label="Degree"
          value="outside-uuid"
          selectedLabel="Saved degree"
          onChange={vi.fn()}
          load={load}
          displayMode="label"
        />,
      );
    });
    expect(
      tree.root
        .findAllByType('option')
        .find((node) => node.props.value === 'outside-uuid')
        ?.children.join(''),
    ).toBe('Saved degree');
    expect(tree.root.findByType('select').props.value).toBe('outside-uuid');
    expect(load).toHaveBeenCalledTimes(1);
  });
});
