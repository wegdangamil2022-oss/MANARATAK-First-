import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CourseLearnerPage } from '../../src/features/learning/CourseLearnerPage';
import type { CourseLearnerWorkspaceDto } from '../../src/api/client';
import { ApiClient } from '../../src/api/client';
import { consumePostLoginReturn } from '../../src/features/students/postLoginIntent';
const route = vi.hoisted(() => ({ courseId: 'owner-a', locale: 'en', search: '', hash: '' }));
vi.mock('../../src/api/client', () => ({
  ApiClient: { getStudentCourseWorkspace: vi.fn(), enrollStudentCourse: vi.fn() },
}));
vi.mock('react-router-dom', () => ({
  useParams: () => route,
  useLocation: () => ({
    pathname: `/${route.locale}/student/courses/${route.courseId}`,
    search: route.search,
    hash: route.hash,
  }),
  Link: ({
    to,
    onClick,
    children,
  }: {
    to: string;
    onClick?: () => void;
    children: React.ReactNode;
  }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
const snapshot = (progress = 37) =>
  ({
    curriculum: { modules: [], lessons: [], quizzes: [], questions: [], assets: [] },
    progress: {
      enrollment: { progressPercentage: progress },
      lessons: [],
      quizAttempts: [],
      completion: null,
    },
  }) as unknown as CourseLearnerWorkspaceDto;
beforeEach(() => {
  vi.clearAllMocks();
  route.courseId = 'owner-a';
  route.search = '';
  route.hash = '';
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
});
async function mount() {
  let view!: ReactTestRenderer;
  await act(async () => {
    view = create(<CourseLearnerPage />);
  });
  return view;
}
describe('B03 real learner entry', () => {
  it('preserves the exact localized course return for an anonymous student', async () => {
    route.search = '?lesson=intro';
    route.hash = '#progress';
    vi.mocked(ApiClient.getStudentCourseWorkspace).mockRejectedValue(
      new Error('STUDENT_AUTHENTICATION_REQUIRED'),
    );
    const view = await mount();
    expect(view.root.findByType('a').props.href).toBe('/en/login');
    expect(consumePostLoginReturn('new-student')).toBe('/en/student/courses/owner-a?lesson=intro#progress');
    expect(ApiClient.enrollStudentCourse).not.toHaveBeenCalled();
    act(() => view.unmount());
  });
  it('enrolls only on explicit missing-enrollment response, with the canonical owner', async () => {
    vi.mocked(ApiClient.getStudentCourseWorkspace)
      .mockRejectedValueOnce(new Error('COURSE_ENROLLMENT_REQUIRED'))
      .mockResolvedValue(snapshot());
    vi.mocked(ApiClient.enrollStudentCourse).mockResolvedValue(
      {} as unknown as CourseLearnerWorkspaceDto,
    );
    const view = await mount();
    await act(async () => view.root.findByType('button').props.onClick());
    expect(ApiClient.enrollStudentCourse).toHaveBeenCalledWith('owner-a');
    expect(JSON.stringify(view.toJSON())).toContain('37');
    expect(JSON.stringify(view.toJSON())).not.toContain('اكتملت الدورة');
    act(() => view.unmount());
  });
  it.each([
    'SERVICE_OFFLINE',
    'COURSE_ENROLLMENT_NOT_ACCESSIBLE:SUSPENDED',
    'COURSE_ENROLLMENT_VERSION_NOT_FOUND',
  ])('does not offer registration or fake progress after %s', async (message) => {
    vi.mocked(ApiClient.getStudentCourseWorkspace).mockRejectedValue(new Error(message));
    const view = await mount();
    expect(JSON.stringify(view.toJSON())).not.toContain('التسجيل في الدورة');
    expect(JSON.stringify(view.toJSON())).toContain(message);
    expect(ApiClient.enrollStudentCourse).not.toHaveBeenCalled();
    act(() => view.unmount());
  });
  it('cannot simulate enrollment when the server denies paid clearance', async () => {
    vi.mocked(ApiClient.getStudentCourseWorkspace).mockRejectedValue(
      new Error('COURSE_ENROLLMENT_REQUIRED'),
    );
    vi.mocked(ApiClient.enrollStudentCourse).mockRejectedValue(
      new Error('COURSE_FINANCIAL_CLEARANCE_REQUIRED'),
    );
    const view = await mount();
    await act(async () => view.root.findByType('button').props.onClick());
    expect(JSON.stringify(view.toJSON())).toContain('COURSE_FINANCIAL_CLEARANCE_REQUIRED');
    expect(view.root.findAllByType('progress')).toHaveLength(0);
    act(() => view.unmount());
  });
  it('does not reopen the previous owner after an in-flight enrollment finishes', async () => {
    let finishEnrollment!: (value: CourseLearnerWorkspaceDto['progress']) => void;
    vi.mocked(ApiClient.getStudentCourseWorkspace)
      .mockRejectedValueOnce(new Error('COURSE_ENROLLMENT_REQUIRED'))
      .mockResolvedValue(snapshot(22));
    vi.mocked(ApiClient.enrollStudentCourse).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishEnrollment = resolve;
        }),
    );
    const view = await mount();
    let pending!: Promise<void>;
    act(() => {
      pending = view.root.findByType('button').props.onClick();
    });
    route.courseId = 'owner-b';
    await act(async () => view.update(<CourseLearnerPage />));
    await act(async () => {
      finishEnrollment(snapshot().progress);
      await pending;
    });
    expect(ApiClient.getStudentCourseWorkspace).toHaveBeenCalledTimes(2);
    expect(ApiClient.getStudentCourseWorkspace).toHaveBeenLastCalledWith('owner-b');
    expect(view.root.findByType('progress').props.value).toBe(22);
    act(() => view.unmount());
  });
  it('discards delayed workspace/auth responses from the previously selected course', async () => {
    let resolveOld!: (value: CourseLearnerWorkspaceDto) => void;
    vi.mocked(ApiClient.getStudentCourseWorkspace)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValue(snapshot(22));
    const view = await mount();
    route.courseId = 'owner-b';
    await act(async () => view.update(<CourseLearnerPage />));
    await act(async () => resolveOld(snapshot(99)));
    expect(ApiClient.getStudentCourseWorkspace).toHaveBeenLastCalledWith('owner-b');
    expect(view.root.findByType('progress').props.value).toBe(22);
    act(() => view.unmount());
  });
});
