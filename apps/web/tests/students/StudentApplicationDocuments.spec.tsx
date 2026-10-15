import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StudentApplicationDocuments } from '../../src/features/students/StudentApplicationDocuments';
import { ApiClient } from '../../src/api/client';
vi.mock('../../src/api/client', () => ({
  ApiClient: {
    getMyApplicationDocuments: vi.fn(),
    listMyActiveStudentAssets: vi.fn(),
    getScholarshipApplicationCycles: vi.fn(),
    unbindMyApplicationDocument: vi.fn(),
    bindMyApplicationDocument: vi.fn(),
    createMyStudentApplicationTracker: vi.fn(),
  },
}));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const tracker = {
  id: 'tracker',
  scholarshipId: 'scholarship',
  status: 'ACTIVE',
  cycleReferenceId: 'cycle',
  version: 3,
  ownerSnapshot: { cycleKey: '2027|Fall|2099-01-01' },
} as any;
const readiness = {
  ownerState: 'AVAILABLE',
  entries: [
    {
      requirementId: 'requirement',
      displayName: 'Transcript',
      required: true,
      linked: true,
      bindable: true,
      state: 'ASSET_AVAILABLE_UNVERIFIED',
    },
  ],
};
async function mount() {
  let view!: ReactTestRenderer;
  await act(async () => {
    view = create(<StudentApplicationDocuments tracker={tracker} onChanged={() => {}} />);
  });
  await act(async () => {
    view.root.findAllByType('button')[0].props.onClick();
  });
  return view;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ApiClient.getMyApplicationDocuments).mockResolvedValue(readiness);
  vi.mocked(ApiClient.listMyActiveStudentAssets).mockResolvedValue({
    items: [],
    hasMore: false,
    nextCursor: null,
  });
  vi.mocked(ApiClient.getScholarshipApplicationCycles).mockResolvedValue({
    scholarshipId: 'scholarship',
    displayName: 'Scholarship',
    cycles: [{ id: 'next', cycleKey: '2028|Fall|ROLLING', closesAt: null }],
  });
});
describe('private application documents', () => {
  it('keeps independent cycle selection available when assets are unavailable', async () => {
    vi.mocked(ApiClient.listMyActiveStudentAssets).mockRejectedValue(new Error('unavailable'));
    const view = await mount();
    expect(JSON.stringify(view.toJSON())).toContain('Track a separate published cycle');
    expect(JSON.stringify(view.toJSON())).toContain('Some requirements');
    await act(async () => view.unmount());
  });
  it('does not enable document writes without an owned asset and explicit consent', async () => {
    const view = await mount();
    const submit = view.root
      .findAllByType('button')
      .find((b) => b.children.includes('Link document'));
    expect(submit?.props.disabled).toBe(true);
    await act(async () => {
      view.root.findByType('form').props.onSubmit({ preventDefault: () => {} });
    });
    expect(ApiClient.bindMyApplicationDocument).not.toHaveBeenCalled();
    expect(JSON.stringify(view.toJSON())).toContain('content not attested');
    await act(async () => view.unmount());
  });
  it('withdraws consent against the current tracker version', async () => {
    const view = await mount();
    vi.mocked(ApiClient.unbindMyApplicationDocument).mockResolvedValue(undefined);
    await act(async () => {
      view.root
        .findAllByType('button')
        .find((b) => b.children.includes('Unlink and withdraw consent'))!
        .props.onClick();
    });
    expect(ApiClient.unbindMyApplicationDocument).toHaveBeenCalledWith('tracker', 'requirement', 3);
    await act(async () => view.unmount());
  });
});
