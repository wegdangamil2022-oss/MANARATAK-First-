import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Code2,
  Compass,
  ExternalLink,
  Globe2,
  GraduationCap,
  Layers3,
  ShieldCheck,
} from 'lucide-react';
import { ImportedCourse } from '../types';
import { FavoriteButton } from './FavoriteButton';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';

interface ImportedCourseDetailProps {
  course: ImportedCourse;
  onBack?: () => void;
  onOpenMajor?: (majorId: string) => void;
  onOpenUniversity?: (universityId: string) => void;
  onOpenScholarship?: (scholarshipId: string) => void;
  onOpenCountry?: (countryId: string) => void;
  onOpenExam?: (examId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}

const Fact = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="min-h-[70px] rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)]/90 px-3 py-2.5 ab-panel ">
    <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold text-[var(--ab-text-muted)]">
      <Icon className="h-3.5 w-3.5 text-[var(--ab-heading)]" />
      <span>{label}</span>
    </div>
    <div className="text-[11px] font-bold leading-5 text-[var(--ab-heading)]">{value}</div>
  </div>
);

export const ImportedCourseDetail: React.FC<ImportedCourseDetailProps> = ({
  course,
  onBack,
  onOpenMajor,
  onOpenUniversity,
  onOpenScholarship,
  onOpenCountry,
  onOpenExam,
  isFavorite = false,
  onToggleFavorite,
  searchAnchor,
  searchTerm,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  useDetailSearchTarget(searchAnchor, searchTerm);
  return (
    <div className="min-h-screen bg-[var(--ab-page)] pb-24 text-[var(--ab-heading)] ab-panel " dir={publicDir}>
      <div className="relative overflow-hidden border-b border-[var(--ab-accent)]/20 bg-gradient-to-br from-[var(--ab-primary)] via-[var(--ab-primary)] to-[var(--ab-primary)] px-4 pb-8 pt-4 text-white shadow-sm ab-inverse ">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-[var(--ab-accent)]/50" />
          <div className="absolute -left-14 bottom-0 h-40 w-40 rounded-full bg-[var(--ab-accent)]/20 blur-3xl" />
        </div>

        {onToggleFavorite && (
          <FavoriteButton
            active={isFavorite}
            onToggle={(event) => {
              event.stopPropagation();
              onToggleFavorite(course.id);
            }}
            className="absolute top-4 left-4 z-20 bg-[var(--ab-surface)]/95 ab-panel "
          />
        )}

        {onBack && (
          <div className="relative z-20"><DetailBackButton onBack={onBack} /></div>
        )}

        <div className="relative z-10 mx-auto mt-4 max-w-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm">
              <Code2 className="h-6 w-6 text-[var(--ab-accent-soft)]" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--ab-accent-soft)]">{course.provider}</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[8px] font-bold text-white">{publicT('public_imported_course')}</span>
              </div>
              <h1 className="text-[20px] font-bold leading-7 text-white sm:text-[22px]">{course.title}</h1>
            </div>
          </div>

          <p className="text-[11px] font-bold leading-5 text-[var(--ab-on-dark-muted)]">{course.field}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {course.studyFree && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ab-success-border)] bg-[var(--ab-success-solid)]/10 px-2.5 py-1 text-[9px] font-bold text-[var(--ab-success-text)]">
                <CheckCircle2 className="h-3 w-3" />{' '}{publicT('public_free_to_study')}</span>
            )}
            {course.freeCertificate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ab-border-gold)] bg-[var(--ab-accent)]/10 px-2.5 py-1 text-[9px] font-bold text-[var(--ab-accent-soft)]">
                <BadgeCheck className="h-3 w-3" />{' '}{publicT('public_free_certificate')}</span>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto -mt-4 max-w-lg space-y-3 ab-inline-gutter">
        <section className="relative z-20 rounded-[22px] border border-[var(--ab-border)] bg-[var(--ab-surface)] p-3.5 shadow-[0_10px_28px_rgba(20,43,95,0.09)] ab-panel ">
          <div className="grid grid-cols-2 gap-2">
            <Fact icon={Globe2} label="اللغة" value={course.language} />
            <Fact icon={GraduationCap} label="المستوى" value={course.level} />
            <Fact icon={Clock3} label="مدة الدورة" value={course.duration} />
            <Fact icon={Award} label="نوع الشهادة" value={course.certificateType} />
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--ab-border)] bg-[var(--ab-surface)] p-3.5 shadow-sm ab-panel ">
          <DetailSectionHeader id="course-about" icon={Layers3} title={publicT('public_course_information')} subtitle="البيانات المستوردة من المصدر الرسمي" />

          <div className="divide-y divide-[var(--ab-border)] rounded-2xl border border-[var(--ab-border)] bg-[var(--ab-page)]/60 px-3">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[10px] font-bold text-[var(--ab-text-muted)]">{publicT('public_platform_university')}</span>
              <span className="text-left text-[10.5px] font-bold text-[var(--ab-heading)]">{course.provider}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[10px] font-bold text-[var(--ab-text-muted)]">{publicT('public_free_study')}</span>
              <span className="text-[10.5px] font-bold text-[var(--ab-success-text)]">{course.studyFree ? publicT('public_yes_free') : publicT('public_no')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[10px] font-bold text-[var(--ab-text-muted)]">{publicT('public_free_certification')}</span>
              <span className="text-[10.5px] font-bold text-[var(--ab-success-text)]">{course.freeCertificate ? publicT('public_yes_free') : publicT('public_unavailable_3')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[10px] font-bold text-[var(--ab-text-muted)]">{publicT('public_certificate_type')}</span>
              <span className="text-left text-[10.5px] font-bold text-[var(--ab-heading)]">{course.certificateType}</span>
            </div>
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--ab-border)] bg-[var(--ab-surface)] p-3.5 shadow-sm ab-panel ">
          <DetailSectionHeader id="course-topics" icon={BookOpen} title={publicT('public_course_topics_2')} subtitle="أبرز الموضوعات المسجلة في ملف الدورة" />

          <div className="grid grid-cols-2 gap-2">
            {course.topics.map((topic) => (
              <div key={topic} className="flex min-h-[48px] items-center gap-2 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)]/80 px-2.5 py-2 ab-panel ">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--ab-accent-text)]" />
                <span className="text-[10px] font-semibold leading-4 text-[var(--ab-text)]">{topic}</span>
              </div>
            ))}
          </div>
        </section>

        {(course.relatedMajors?.length ||
          course.relatedUniversities?.length ||
          course.relatedScholarships?.length ||
          course.relatedCountries?.length ||
          course.relatedExams?.length) ? (
          <section className="rounded-[20px] border border-[var(--ab-border)] bg-[var(--ab-surface)] p-3.5 shadow-sm ab-panel ">
            <DetailSectionHeader id="course-related" icon={Compass} title={publicT('public_related_educational_links')} subtitle={publicT('public_go_to_related_entities_within_absheer')} />

            <div className="space-y-3">
              {course.relatedMajors?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--ab-text-muted)]">
                    <GraduationCap className="h-3.5 w-3.5 text-[var(--ab-accent-text)]" />
                    <span>{publicT('public_related_majors')}</span>
                  </div>
                  <div className="ab-detail-small-grid">
                    {course.relatedMajors.map((item) => (
                      <button
                        key={`${item.id ?? item.name}-major`}
                        type="button"
                        disabled={!item.id || !onOpenMajor}
                        onClick={() => item.id && onOpenMajor?.(item.id)}
                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--ab-border-gold)] enabled:hover:bg-[var(--ab-surface)] disabled:cursor-default enabled:hover:ab-panel "
                      >
                        <div className="min-w-0">
                          <div className="text-[10.5px] font-bold text-[var(--ab-heading)]">{item.name}</div>
                          {item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--ab-text-muted)]">{item.meta}</div>}
                        </div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--ab-accent-text)] transition-transform group-enabled:group-hover:-translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.relatedUniversities?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--ab-text-muted)]">
                    <Building2 className="h-3.5 w-3.5 text-[var(--ab-accent-text)]" />
                    <span>{publicT('public_related_universities')}</span>
                  </div>
                  <div className="ab-detail-small-grid">
                    {course.relatedUniversities.map((item) => (
                      <button key={`${item.id ?? item.name}-university`} type="button" disabled={!item.id || !onOpenUniversity} onClick={() => item.id && onOpenUniversity?.(item.id)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--ab-border-gold)] enabled:hover:bg-[var(--ab-surface)] disabled:cursor-default enabled:hover:ab-panel ">
                        <div className="min-w-0"><div className="text-[10.5px] font-bold text-[var(--ab-heading)]">{item.name}</div>{item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--ab-text-muted)]">{item.meta}</div>}</div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--ab-accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.relatedScholarships?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--ab-text-muted)]"><Award className="h-3.5 w-3.5 text-[var(--ab-accent-text)]" /><span>{publicT('public_related_scholarships')}</span></div>
                  <div className="ab-detail-small-grid">
                    {course.relatedScholarships.map((item) => (
                      <button key={`${item.id ?? item.name}-scholarship`} type="button" disabled={!item.id || !onOpenScholarship} onClick={() => item.id && onOpenScholarship?.(item.id)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--ab-border-gold)] enabled:hover:bg-[var(--ab-surface)] disabled:cursor-default enabled:hover:ab-panel ">
                        <div className="min-w-0"><div className="text-[10.5px] font-bold text-[var(--ab-heading)]">{item.name}</div>{item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--ab-text-muted)]">{item.meta}</div>}</div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--ab-accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.relatedCountries?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--ab-text-muted)]"><Globe2 className="h-3.5 w-3.5 text-[var(--ab-accent-text)]" /><span>{publicT('public_related_countries')}</span></div>
                  <div className="ab-detail-small-grid">
                    {course.relatedCountries.map((item) => (
                      <button key={`${item.id ?? item.name}-country`} type="button" disabled={!onOpenCountry || !item.id} onClick={() => item.id && onOpenCountry?.(item.id)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--ab-border-gold)] enabled:hover:bg-[var(--ab-surface)] disabled:cursor-default enabled:hover:ab-panel ">
                        <div className="min-w-0"><div className="text-[10.5px] font-bold text-[var(--ab-heading)]">{item.name}</div>{item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--ab-text-muted)]">{item.meta}</div>}</div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--ab-accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.relatedExams?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--ab-text-muted)]"><ShieldCheck className="h-3.5 w-3.5 text-[var(--ab-accent-text)]" /><span>{publicT('public_related_exams')}</span></div>
                  <div className="ab-detail-small-grid">
                    {course.relatedExams.map((item) => (
                      <button key={`${item.id ?? item.name}-exam`} type="button" disabled={!item.id || !onOpenExam} onClick={() => item.id && onOpenExam?.(item.id)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--ab-border)] bg-[var(--ab-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--ab-border-gold)] enabled:hover:bg-[var(--ab-surface)] disabled:cursor-default enabled:hover:ab-panel ">
                        <div className="min-w-0"><div className="text-[10.5px] font-bold text-[var(--ab-heading)]">{item.name}</div>{item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--ab-text-muted)]">{item.meta}</div>}</div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--ab-accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="rounded-[20px] border border-[var(--ab-border-gold)] bg-gradient-to-br from-[var(--ab-gold-surface)]/70 to-[var(--ab-surface)] p-3.5 shadow-sm">
          <DetailSectionHeader id="course-certificate" icon={ShieldCheck} title={publicT('public_official_course_source')} />
          <div>
              <p className="mt-0.5 text-[9.5px] font-semibold leading-4 text-[var(--ab-text-muted)]">
                {course.freeCertificate
                  ? publicT('public_course_provider_certificate', { v0: course.provider })
                  : publicT('public_course_provider_study', { v0: course.provider })}
              </p>
          </div>

          <a
            href={course.directCourseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ab-external-link inline-flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-white shadow-[0_8px_18px_rgba(20,43,95,0.22)] transition-transform active:scale-[0.99] ab-inverse "
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-[var(--ab-accent-text)]" />
              <span className="text-[12px] font-bold">{publicT('public_start_course')}</span>
            </span>
            <ArrowLeft className="h-4 w-4 text-[var(--ab-accent-text)]" />
          </a>

          <p className="mt-2 text-center text-[8.5px] font-bold text-[var(--ab-text-muted)]">{publicT('public_direct_link_to_the_official_course_page_opens')}</p>
        </section>
      </main>
    </div>
  );
};

