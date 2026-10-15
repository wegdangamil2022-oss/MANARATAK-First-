import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ load: vi.fn(), focus: null as null | (() => void) }));
vi.mock('../../src/features/public-template/publicLiveDataSource', () => ({ loadPublicLiveSnapshot: state.load }));
import { usePublicLiveData } from '../../src/features/public-template/usePublicLiveData';
let tree: ReturnType<typeof create>;
function Probe({ locale }: { locale: 'ar' | 'en' }) { const value = usePublicLiveData('api', locale); return <output>{JSON.stringify(value.data)}</output>; }
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('__MANARATAK_PROTOTYPE_DATA_ENABLED__', false); vi.useFakeTimers(); state.load.mockReset();
  vi.stubGlobal('window', { setInterval, clearInterval, addEventListener: (name: string, fn: () => void) => { if (name === 'focus') state.focus = fn; }, removeEventListener: vi.fn() });
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('B08 snapshot event generation', () => {
  it('focus rechecks the complete published preview and ignores the older initial response', async () => {
    let resolve!: (value: unknown) => void;
    state.load.mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue({ data: { careers: ['NEW-PUBLISHED-CAREER'] } });
    await act(async () => { tree = create(<Probe locale="en" />); });
    await act(async () => state.focus!());
    expect(state.load).toHaveBeenLastCalledWith('en', true);
    await act(async () => resolve({ data: { careers: ['OLD-INITIAL'] } }));
    expect(JSON.stringify(tree.toJSON())).toContain('NEW-PUBLISHED-CAREER');
    expect(JSON.stringify(tree.toJSON())).not.toContain('OLD-INITIAL');
  });
  it('does not let an Arabic response overwrite a newly selected English view', async () => {
    let resolve!: (value: unknown) => void;
    state.load.mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue({ data: { scholarships: ['ENGLISH-PUBLISHED'] } });
    await act(async () => { tree = create(<Probe locale="ar" />); });
    await act(async () => tree.update(<Probe locale="en" />));
    await act(async () => resolve({ data: { scholarships: ['ARABIC-OLD'] } }));
    expect(JSON.stringify(tree.toJSON())).toContain('ENGLISH-PUBLISHED');
    expect(JSON.stringify(tree.toJSON())).not.toContain('ARABIC-OLD');
  });
  it('rechecks on the defined three-minute renewal interval and releases listeners on unmount', async () => {
    state.load.mockResolvedValue({ data: { countries: [] } });
    await act(async () => { tree = create(<Probe locale="en" />); });
    await act(async () => vi.advanceTimersByTimeAsync(180000));
    expect(state.load).toHaveBeenLastCalledWith('en', true);
    await act(async () => tree.unmount());
    expect(window.removeEventListener).toHaveBeenCalledWith('focus', expect.any(Function));
  });
});
