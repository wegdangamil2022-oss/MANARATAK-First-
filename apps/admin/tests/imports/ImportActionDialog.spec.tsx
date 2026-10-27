import { act, create } from 'react-test-renderer';
import { afterEach, describe, expect, it } from 'vitest';
import { useImportActionDialog } from '../../src/features/imports/ImportActionDialog';
let renderer: ReturnType<typeof create>, current: ReturnType<typeof useImportActionDialog>;
function Probe() {
  current = useImportActionDialog(false);
  return current.actionDialog;
}
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
});
describe('Import command confirmation', () => {
  it('requires a valid reason and returns a trimmed value', async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    await act(async () => {
      renderer = create(<Probe />);
    });
    let answer: ReturnType<typeof current.ask>;
    await act(async () => {
      answer = current.ask({
        title: 'Change source',
        description: 'Change source status',
        reason: true,
        minimum: 3,
      });
    });
    expect(renderer.root.findByProps({ type: 'submit' }).props.disabled).toBe(true);
    await act(async () =>
      renderer.root
        .findByType('textarea')
        .props.onChange({ target: { value: '  audited reason  ' } }),
    );
    expect(renderer.root.findByProps({ type: 'submit' }).props.disabled).toBe(false);
    await act(async () => renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    expect(await answer!).toEqual({ reason: 'audited reason' });
    expect(renderer.toJSON()).toBeNull();
  });
  it('rejects duplicate questions and cancels pending commands on unmount', async () => {
    await act(async () => {
      renderer = create(<Probe />);
    });
    let answer: ReturnType<typeof current.ask>;
    await act(async () => {
      answer = current.ask({ title: 'Stage', description: 'No publication' });
    });
    expect(await current.ask({ title: 'Duplicate', description: '' })).toBeNull();
    await act(async () => renderer.unmount());
    expect(await answer!).toBeNull();
  });
});
