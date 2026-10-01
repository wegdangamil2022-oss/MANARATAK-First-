import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  effects: [] as Array<() => void | (() => void)>, updates: [] as unknown[],
  live: vi.fn(), prototype: vi.fn(), prototypeModule: vi.fn(),
}));
vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { harness.effects.push(effect); },
  useState: (value: unknown) => [value, (next: unknown) => { harness.updates.push(next); }],
}));
vi.mock('./publicLiveDataSource', () => ({ loadPublicLiveSnapshot: harness.live }));
vi.mock('./publicPrototypeDataSource', () => {
  harness.prototypeModule(); return { loadPublicPrototypeSnapshot: harness.prototype };
});

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); harness.effects.length = 0; harness.updates.length = 0;
  harness.live.mockResolvedValue({ data: { scholarships: ['published'] } });
  harness.prototype.mockReturnValue({ data: { scholarships: ['prototype'] } });
});
afterEach(() => vi.unstubAllGlobals());

describe('public data mode effect boundary with isolated loaders', () => {
  it.each([undefined, 'api', 'misspelled-mode'])('defaults %s to API without importing prototype data', async (value) => {
    vi.stubGlobal('__MANARATAK_PROTOTYPE_DATA_ENABLED__', true);
    const { usePublicLiveData } = await import('./usePublicLiveData');
    expect(usePublicLiveData(value).mode).toBe('api'); harness.effects[0]();
    await vi.waitFor(() => expect(harness.live).toHaveBeenCalledWith('ar'));
    expect(harness.prototypeModule).not.toHaveBeenCalled(); expect(harness.prototype).not.toHaveBeenCalled();
  });
  it('forces production to API even if prototype is requested', async () => {
    vi.stubGlobal('__MANARATAK_PROTOTYPE_DATA_ENABLED__', false);
    const { usePublicLiveData } = await import('./usePublicLiveData');
    expect(usePublicLiveData('prototype').mode).toBe('api'); harness.effects[0]();
    await vi.waitFor(() => expect(harness.live).toHaveBeenCalledOnce()); expect(harness.prototypeModule).not.toHaveBeenCalled();
  });
  it('imports and loads prototype data only after an explicit preview request', async () => {
    vi.stubGlobal('__MANARATAK_PROTOTYPE_DATA_ENABLED__', true);
    const { usePublicLiveData } = await import('./usePublicLiveData');
    expect(usePublicLiveData('prototype').mode).toBe('prototype'); expect(harness.prototypeModule).not.toHaveBeenCalled();
    harness.effects[0](); await vi.waitFor(() => expect(harness.prototype).toHaveBeenCalledOnce());
    expect(harness.live).not.toHaveBeenCalled();
  });
  it('ignores a prototype import that finishes after the effect is cancelled', async () => {
    vi.stubGlobal('__MANARATAK_PROTOTYPE_DATA_ENABLED__', true);
    const { usePublicLiveData } = await import('./usePublicLiveData'); usePublicLiveData('prototype');
    const cleanup = harness.effects[0](); if (typeof cleanup === 'function') cleanup();
    await vi.dynamicImportSettled();
    expect(harness.prototype).not.toHaveBeenCalled();
    expect(harness.updates).toHaveLength(1);
  });
});
