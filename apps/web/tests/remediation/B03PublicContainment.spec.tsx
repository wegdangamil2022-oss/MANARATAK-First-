import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { FeaturedScholarships } from '../../src/features/public-template/components/FeaturedScholarships';
import { FeaturedMajors } from '../../src/features/public-template/components/FeaturedMajors';
import { FeaturedExams } from '../../src/features/public-template/components/FeaturedExams';
import { AIToolsBanner } from '../../src/features/public-template/components/AIToolsBanner';
import { PublicCourseEntry } from '../../src/features/public-template/components/PublicCourseEntry';
import { OwnerCourseDetail } from '../../src/features/public-template/components/OwnerCourseDetail';
import { courseLearnerPath } from '../../src/features/public-template/courseLearningNavigation';
import { ar } from '../../src/i18n/ar';
import type { Course, Exam, Scholarship, Major } from '../../src/features/public-template/types';
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({
    language: 'ar',
    dir: 'rtl',
    t: (key: keyof typeof ar) => ar[key] ?? key,
  }),
}));
vi.mock('react-router-dom', () => ({
  useParams: () => ({ locale: 'en' }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
vi.mock('../../src/features/public-template/components/CourseStudyRoomView', () => ({
  CourseStudyRoomView: () => <div>PROTOTYPE_ROOM</div>,
}));
const noop = () => {};
const markup = (element: React.ReactElement) => renderToStaticMarkup(element);
const course = (ownerId: string, originType = 'NATIVE_MANARATAK_COURSE') =>
  ({
    id: 'public-slug',
    ownerId,
    originType,
    title: 'Actual course',
    acquiredSkills: [],
    provider: 'Google',
    accessType: originType === 'PAID_COURSE' ? 'PAID' : 'FREE_STUDY',
  }) as Course;

describe('B03 public cards and canonical learner navigation', () => {
  it('keeps scholarship layout without inventing owner records on empty/omitted data', () => {
    for (const html of [
      markup(<FeaturedScholarships onViewAllClick={noop} />),
      markup(<FeaturedScholarships scholarships={[]} onViewAllClick={noop} />),
    ]) {
      expect(html).toContain('featured-scholarships-section');
      expect(html).toContain('data-home-empty-kind="scholarships"');
      expect(html).not.toContain('csc-china');
      expect(html).not.toContain('role="button"');
    }
  });
  it('renders only owner-provided featured scholarships, never fuzzy-matches a display card', async () => {
    const actual = {
      id: 'actual-scholarship',
      title: 'Owner scholarship',
      country: 'Actual country',
      imageUrl: '/real.jpg',
      featured: true,
    } as Scholarship;
    const select = vi.fn();
    const favorite = vi.fn();
    let view!: ReactTestRenderer;
    await act(async () => {
      view = create(
        <FeaturedScholarships
          scholarships={[
            { ...actual, id: 'not-featured', title: 'Hidden', featured: false },
            actual,
          ]}
          onSelectScholarship={select}
          onToggleFavorite={favorite}
          onViewAllClick={noop}
        />,
      );
    });
    const html = JSON.stringify(view.toJSON());
    expect(html).toContain('Owner scholarship');
    expect(html).not.toContain('Hidden');
    expect(html).not.toContain('csc-china');
    act(() => view.root.findByProps({ role: 'button' }).props.onClick());
    expect(select).toHaveBeenCalledWith(actual);
    act(() => view.root.findAllByType('button')[0].props.onClick({ stopPropagation: noop }));
    expect(favorite).toHaveBeenCalledWith('actual-scholarship');
    act(() => view.unmount());
  });
  it('omits global major totals even with a partial live page', () => {
    const html = markup(
      <FeaturedMajors
        majors={[{ id: 'partial-page-major' } as Major]}
        onSelectMajor={noop}
        onViewAllClick={noop}
      />,
    );
    for (const value of ['840', '1114', '1116', '360']) expect(html).not.toContain('>' + value);
    expect(
      markup(
        <FeaturedMajors
          dataMode="prototype"
          majors={[]}
          onSelectMajor={noop}
          onViewAllClick={noop}
        />,
      ),
    ).toContain('840');
  });
  it('keeps exam and tool designs visible without advertising unavailable owner records or executable tools', () => {
    const exams = markup(<FeaturedExams exams={[]} onViewAllClick={noop} />);
    expect(exams).toContain('data-home-empty-kind="exams"');
    expect(exams).not.toContain('IELTS');
    const html = markup(<AIToolsBanner onOpenAiTools={noop} />);
    expect(html).toContain('disabled=""');
    expect(html).toContain(ar.public_home_tools_preview_notice);
    expect(html).toContain('btn-view-all-ai-tools');
    expect(markup(<FeaturedExams dataMode="prototype" onViewAllClick={noop} />)).toContain('IELTS');
    expect(markup(<AIToolsBanner dataMode="prototype" onOpenAiTools={noop} />)).toContain(
      ar.public_gpa_calculator,
    );
  });
  it('opens the exact published exam instead of matching one of ten fixed names', async () => {
    const actual = { id: 'new-test', ownerId: 'test-owner', name: 'Published Exam' } as Exam;
    const select = vi.fn();
    let view!: ReactTestRenderer;
    await act(async () => {
      view = create(<FeaturedExams exams={[actual]} onSelectExam={select} onViewAllClick={noop} />);
    });
    act(() => view.root.findAllByProps({ role: 'button' })[0].props.onClick());
    expect(select).toHaveBeenCalledWith(actual);
    expect(JSON.stringify(view.toJSON())).not.toContain('TOEFL');
    act(() => view.unmount());
  });
  it.each(['NATIVE_MANARATAK_COURSE', 'PAID_COURSE'])(
    'routes %s by owner and locale and ignores prototype callbacks in api',
    (origin) => {
      for (const owner of ['owner-a', 'owner-b']) {
        expect(courseLearnerPath(course(owner, origin), 'en')).toBe(`/en/student/courses/${owner}`);
        const html = markup(
          <OwnerCourseDetail
            course={course(owner, origin)}
            track={origin === 'PAID_COURSE' ? 'paid' : 'native'}
            onBack={noop}
            onStartStudy={noop}
          />,
        );
        expect(html).toContain(`href="/en/student/courses/${owner}"`);
        expect(html).not.toContain('/student/courses/public-slug');
      }
    },
  );
  it('ignores a stale study flag in live mode while keeping an explicit prototype preview', () => {
    const props = {
      course: course('actual-owner'),
      isStudying: true,
      onBack: noop,
      onStartStudy: noop,
      onStopStudy: noop,
      onRestrictedAction: noop,
    };
    const live = markup(<PublicCourseEntry {...props} dataMode="api" />);
    expect(live).not.toContain('PROTOTYPE_ROOM');
    expect(live).toContain('/en/student/courses/actual-owner');
    expect(markup(<PublicCourseEntry {...props} dataMode="prototype" />)).toContain(
      'PROTOTYPE_ROOM',
    );
  });
  it('fails closed for missing owners/external courses and encodes route identifiers', () => {
    expect(courseLearnerPath(course(''), 'ar')).toBeNull();
    expect(courseLearnerPath(course('external', 'EXTERNAL_LINKED_COURSE'), 'ar')).toBeNull();
    expect(courseLearnerPath(course('owner/one'), 'ar')).toBe('/ar/student/courses/owner%2Fone');
    const html = markup(
      <OwnerCourseDetail course={course('')} track="native" onBack={noop} onStartStudy={noop} />,
    );
    expect(html).not.toContain('/student/courses/');
  });
});
