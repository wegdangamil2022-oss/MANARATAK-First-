import { act, create } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useImportDialog } from '../../src/features/imports/useImportDialog';
let renderer: ReturnType<typeof create>;
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  vi.unstubAllGlobals();
});
describe('Import dialog keyboard behavior', () => {
  it('traps Tab, honors locked Escape and restores focus and scroll on close', async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const doc = { activeElement: null as unknown, body: { style: { overflow: 'auto' } } };
    class Element {
      isConnected = true;
      focus = vi.fn(() => {
        doc.activeElement = this;
      });
      getClientRects = () => [{}];
      closest = () => null;
    }
    const previous = new Element(),
      first = new Element(),
      last = new Element();
    doc.activeElement = previous;
    let key: (event: any) => void = () => {};
    const dialog = Object.assign(new Element(), {
      querySelectorAll: () => [first, last],
      addEventListener: (_name: string, listener: typeof key) => {
        key = listener;
      },
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('HTMLElement', Element);
    const close = vi.fn();
    function Probe({ locked }: { locked: boolean }) {
      const ref = useImportDialog(true, close, locked);
      return <section ref={ref} />;
    }
    await act(async () => {
      renderer = create(<Probe locked={true} />, { createNodeMock: () => dialog });
    });
    expect(doc.body.style.overflow).toBe('hidden');
    expect(doc.activeElement).toBe(first);
    const event = (value: string, shiftKey = false) => ({
      key: value,
      shiftKey,
      preventDefault: vi.fn(),
    });
    doc.activeElement = last;
    key(event('Tab'));
    expect(doc.activeElement).toBe(first);
    key(event('Tab', true));
    expect(doc.activeElement).toBe(last);
    key(event('Escape'));
    expect(close).not.toHaveBeenCalled();
    await act(async () => renderer.update(<Probe locked={false} />));
    key(event('Escape'));
    expect(close).toHaveBeenCalledOnce();
    await act(async () => renderer.unmount());
    expect(doc.body.style.overflow).toBe('auto');
    expect(doc.activeElement).toBe(previous);
    expect(dialog.removeEventListener).toHaveBeenCalledOnce();
  });
});
