import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: { request: state.request } }));
import { MajorRelatedCourses } from '../../src/features/majors/MajorRelatedCourses';
let tree: ReturnType<typeof create>;
const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text(node.children) : '';
beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.request.mockReset().mockResolvedValue({ data: [{ id: 'course-1', displayName: 'مقدمة في البرمجة', originalSourceTitle: 'Introduction to Programming', platformName: 'Provider' }], total: 7, page: 1, pageSize: 6, totalPages: 2 });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
});
async function flush() { await act(async () => vi.advanceTimersByTimeAsync(250)); }
async function mount() {
  await act(async () => { tree = create(<MemoryRouter><MajorRelatedCourses majorId="major-1" /></MemoryRouter>); });
  await flush();
}
describe('major to course navigation', () => {
  it('uses the canonical major filter for paging and resets to the first page on search', async () => {
    await mount();
    const links = tree.root.findAllByType('a').map(link => link.props.href);
    expect(links).toEqual(['/courses/external?majorId=major-1', '/courses/external?course=course-1']);
    expect(text(tree.toJSON())).toContain('مقدمة في البرمجة');
    expect(text(tree.toJSON())).toContain('Introduction to Programming');
    await act(async () => tree.root.findAllByType('button').find(button => text(button) === 'التالي')!.props.onClick());
    await flush();
    let query = new URL(state.request.mock.lastCall![0], 'http://local');
    expect(query.searchParams.get('majorId')).toBe('major-1');
    expect(query.searchParams.get('originType')).toBe('EXTERNAL_LINKED_COURSE');
    expect(query.searchParams.get('page')).toBe('2');
    await act(async () => tree.root.findByType('input').props.onChange({ target: { value: 'Python' } }));
    await flush();
    query = new URL(state.request.mock.lastCall![0], 'http://local');
    expect(query.searchParams.get('page')).toBe('1');
    expect(query.searchParams.get('search')).toBe('Python');
  });
  it('distinguishes a request error from an empty related course catalog', async () => {
    state.request.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 });
    await mount();
    expect(tree.root.findAllByProps({ role: 'alert' })).toHaveLength(1);
    expect(text(tree.toJSON())).not.toContain('لا توجد دورات مرتبطة معتمدة');
    await act(async () => tree.root.findByType('button').props.onClick());
    await flush();
    expect(text(tree.toJSON())).toContain('لا توجد دورات مرتبطة معتمدة');
  });
});
