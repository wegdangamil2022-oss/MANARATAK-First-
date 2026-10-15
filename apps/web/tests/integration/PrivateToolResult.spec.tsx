import { beforeEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StudentPrivateToolResult } from '../../src/features/students/StudentPrivateToolResult';
import { ApiClient } from '../../src/api/client';
vi.mock('../../src/api/client', () => ({ ApiClient: { getMyPrivateToolResult: vi.fn() } }));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/features/student-tools/StudentToolResultView', () => ({
  StudentToolResultView: ({ value }: { value: unknown }) => <p>{JSON.stringify(value)}</p>,
}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  vi.clearAllMocks();
});
describe('private retained tool result UI', () => {
  it('loads through the authenticated private reference endpoint only after a user click and clears on hide', async () => {
    vi.mocked(ApiClient.getMyPrivateToolResult).mockResolvedValue({ private: 'content' });
    let view!: ReactTestRenderer;
    await act(async () => {
      view = create(<StudentPrivateToolResult savedReference="saved" available />);
    });
    expect(ApiClient.getMyPrivateToolResult).not.toHaveBeenCalled();
    await act(async () => {
      view.root.findByType('button').props.onClick();
    });
    expect(ApiClient.getMyPrivateToolResult).toHaveBeenCalledWith('saved');
    expect(JSON.stringify(view.toJSON())).toContain('content');
    await act(async () => {
      view.root.findByType('button').props.onClick();
    });
    expect(JSON.stringify(view.toJSON())).not.toContain('content');
    await act(async () => view.unmount());
  });
  it('does not display an old reference result after switching ownership context', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(ApiClient.getMyPrivateToolResult).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    let view!: ReactTestRenderer;
    await act(async () => {
      view = create(<StudentPrivateToolResult savedReference="old" available />);
    });
    await act(async () => {
      view.root.findByType('button').props.onClick();
    });
    await act(async () => {
      view.update(<StudentPrivateToolResult savedReference="new" available />);
      resolve({ secret: 'old result' });
    });
    expect(JSON.stringify(view.toJSON())).not.toContain('old result');
    await act(async () => view.unmount());
  });
});
