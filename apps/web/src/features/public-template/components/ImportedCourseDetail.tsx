import {useTranslation} from '../../../i18n/I18nProvider';
import {ApiClient} from '../../../api/client';
import {mapCourse} from '../publicLiveDataSource';
import React,{useEffect,useState} from 'react';
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
  dataMode?: 'api'|'prototype';
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
  <div className="min-h-[70px] rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/90 px-3 py-2.5 mn-panel ">
    <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold text-[var(--mn-text-muted)]">
      <Icon className="h-3.5 w-3.5 text-[var(--mn-heading)]" />
      <span>{label}</span>
    </div>
    <div className="text-[11px] font-bold leading-5 text-[var(--mn-heading)]">{value}</div>
  </div>
);

export const ImportedCourseDetail: React.FC<ImportedCourseDetailProps> = ({
  course:initialCourse,
  dataMode='api',
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

 const {t,dir,language}=useTranslation();
 const levelLabel=(value:string)=>{const key=({'مبتدئ':'course13_level_beginner','متوسط':'course13_level_intermediate','متقدم':'course13_level_advanced','جميع المستويات':'course13_level_all','غير محدد رسميًا':'course13_level_unknown'} as const)[value as 'مبتدئ'];return key?t(key):value;};  const [course,setCourse]=useState(initialCourse);const [verifiedSlug,setVerifiedSlug]=useState('');const [availabilityError,setAvailabilityError]=useState('');
  useEffect(()=>{let active=true;setAvailabilityError('');setVerifiedSlug('');if(dataMode==='prototype'){setCourse(initialCourse);return;}
    if(!initialCourse.slug){setAvailabilityError('COURSE_CANONICAL_SLUG_REQUIRED');return;}
    void ApiClient.getCourseBySlug(initialCourse.slug).then(dto=>{const latest=mapCourse(dto).imported;if(!latest)throw new Error('COURSE_NOT_ELIGIBLE');if(active){setCourse(latest);setVerifiedSlug(initialCourse.slug!);}}).catch(cause=>{if(active)setAvailabilityError(String(cause));});return()=>{active=false;};
  },[initialCourse,dataMode]);
  useDetailSearchTarget(dataMode==='api'&&verifiedSlug!==initialCourse.slug?undefined:searchAnchor, searchTerm);
  if(dataMode==='api'&&verifiedSlug!==initialCourse.slug)return <section className="p-6"><button onClick={onBack}>{t('course13_copy_220')}</button><p role={availabilityError?'alert':'status'}>{availabilityError?t('course13_copy_221'):t('course13_copy_222')}</p></section>;
  return (
    <div className="min-h-screen bg-[var(--mn-page)] pb-24 text-[var(--mn-heading)] mn-panel " dir={dir}>
      {course.contentLanguage?.titleFallback&&<p role="note">{t('course13_source_fallback')} <bdi>{course.contentLanguage.sourceLanguage??t('course13_source_unknown')}</bdi></p>}
      <div className="relative overflow-hidden border-b border-[var(--mn-accent)]/20 bg-gradient-to-br from-[var(--mn-primary)] via-[var(--mn-primary)] to-[var(--mn-primary)] px-4 pb-8 pt-4 text-white shadow-sm mn-inverse ">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-[var(--mn-accent)]/50" />
          <div className="absolute -left-14 bottom-0 h-40 w-40 rounded-full bg-[var(--mn-accent)]/20 blur-3xl" />
        </div>

        {onToggleFavorite && (
          <FavoriteButton
            active={isFavorite}
            onToggle={(event) => {
              event.stopPropagation();
              onToggleFavorite(course.id);
            }}
            className="absolute top-4 left-4 z-20 bg-[var(--mn-surface)]/95 mn-panel "
          />
        )}

        {onBack && (
          <div className="relative z-20"><DetailBackButton onBack={onBack} /></div>
        )}

        <div className="relative z-10 mx-auto mt-4 max-w-lg">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm">
              <Code2 className="h-6 w-6 text-[var(--mn-accent-soft)]" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--mn-accent-soft)]">{course.provider}</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[8px] font-bold text-white">{t('course13_copy_223')}</span>
              </div>
              <h1 className="text-[20px] font-bold leading-7 text-white sm:text-[22px]">{course.title}</h1>
            </div>
          </div>

          <p className="text-[11px] font-bold leading-5 text-[var(--mn-on-dark-muted)]">{course.field}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {course.studyFree && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--mn-success-border)] bg-[var(--mn-success-solid)]/10 px-2.5 py-1 text-[9px] font-bold text-[var(--mn-success-text)]">
                <CheckCircle2 className="h-3 w-3" /> {t('course13_copy_224')}</span>
            )}
            {course.freeCertificate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--mn-border-gold)] bg-[var(--mn-accent)]/10 px-2.5 py-1 text-[9px] font-bold text-[var(--mn-accent-soft)]">
                <BadgeCheck className="h-3 w-3" /> {t('course13_copy_044')}</span>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto -mt-4 max-w-lg space-y-3 mn-inline-gutter">
        <section className="relative z-20 rounded-[22px] border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 shadow-[0_10px_28px_rgba(20,43,95,0.09)] mn-panel ">
          <div className="grid grid-cols-2 gap-2">
            <Fact icon={Globe2} label={t('course13_copy_210')} value={course.language} />
            <Fact icon={GraduationCap} label={t('course13_copy_035')} value={levelLabel(course.level)} />
            <Fact icon={Clock3} label={t('course13_copy_225')} value={course.duration} />
            <Fact icon={Award} label={t('course13_copy_213')} value={course.certificateType} />
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 shadow-sm mn-panel ">
          <DetailSectionHeader id="course-about" icon={Layers3} title={t('course13_copy_226')} subtitle={t('course13_copy_227')} />

          <div className="divide-y divide-[var(--mn-border)] rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-page)]/60 px-3">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">{t('course13_copy_228')}</span>
              <span className="text-left text-[10.5px] font-bold text-[var(--mn-heading)]">{course.provider}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">{t('course13_copy_229')}</span>
              <span className="text-[10.5px] font-bold text-[var(--mn-success-text)]">{course.studyFree ? t('course13_copy_230') : t('course13_copy_231')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">{t('course13_copy_232')}</span>
              <span className="text-[10.5px] font-bold text-[var(--mn-success-text)]">{course.freeCertificate ? t('course13_copy_230') : t('course13_copy_233')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">{t('course13_copy_213')}</span>
              <span className="text-left text-[10.5px] font-bold text-[var(--mn-heading)]">{course.certificateType}</span>
            </div>
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 shadow-sm mn-panel ">
          <DetailSectionHeader id="course-topics" icon={BookOpen} title={t('course13_copy_234')} subtitle={t('course13_copy_235')} />

          <div className="grid grid-cols-2 gap-2">
            {course.topics.map((topic) => (
              <div key={topic} className="flex min-h-[48px] items-center gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/80 px-2.5 py-2 mn-panel ">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
                <span className="text-[10px] font-semibold leading-4 text-[var(--mn-text)]">{topic}</span>
              </div>
            ))}
          </div>
        </section>

        {(course.relatedMajors?.length ||
          course.relatedUniversities?.length ||
          course.relatedScholarships?.length ||
          course.relatedCountries?.length ||
          course.relatedExams?.length) ? (
          <section className="rounded-[20px] border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 shadow-sm mn-panel ">
            <DetailSectionHeader id="course-related" icon={Compass} title={t('course13_copy_236')} subtitle={t('course13_copy_237')} />

            <div className="space-y-3">
              {course.relatedMajors?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--mn-text-muted)]">
                    <GraduationCap className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" />
                    <span>{t('course13_copy_238')}</span>
                  </div>
                  <div className="mn-detail-small-grid">
                    {course.relatedMajors.map((item) => (
                      <button
                        key={`${item.id ?? item.name}-major`}
                        type="button"
                        disabled={!item.id || !onOpenMajor}
                        onClick={() => item.id && onOpenMajor?.(item.id)}
                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--mn-border-gold)] enabled:hover:bg-[var(--mn-surface)] disabled:cursor-default enabled:hover:mn-panel "
                      >
                        <div className="min-w-0">
                          <div className="text-[10.5px] font-bold text-[var(--mn-heading)]">{item.name}</div>
                          {item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--mn-text-muted)]">{item.meta}</div>}
                        </div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)] transition-transform group-enabled:group-hover:-translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.relatedUniversities?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--mn-text-muted)]">
                    <Building2 className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" />
                    <span>{t('course13_copy_239')}</span>
                  </div>
                  <div className="mn-detail-small-grid">
                    {course.relatedUniversities.map((item) => (
                      <button key={`${item.id ?? item.name}-university`} type="button" disabled={!item.id || !onOpenUniversity} onClick={() => item.id && onOpenUniversity?.(item.id)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--mn-border-gold)] enabled:hover:bg-[var(--mn-surface)] disabled:cursor-default enabled:hover:mn-panel ">
                        <div className="min-w-0"><div className="text-[10.5px] font-bold text-[var(--mn-heading)]">{item.name}</div>{item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--mn-text-muted)]">{item.meta}</div>}</div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.relatedScholarships?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--mn-text-muted)]"><Award className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" /><span>{t('course13_copy_240')}</span></div>
                  <div className="mn-detail-small-grid">
                    {course.relatedScholarships.map((item) => (
                      <button key={`${item.id ?? item.name}-scholarship`} type="button" disabled={!item.id || !onOpenScholarship} onClick={() => item.id && onOpenScholarship?.(item.id)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--mn-border-gold)] enabled:hover:bg-[var(--mn-surface)] disabled:cursor-default enabled:hover:mn-panel ">
                        <div className="min-w-0"><div className="text-[10.5px] font-bold text-[var(--mn-heading)]">{item.name}</div>{item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--mn-text-muted)]">{item.meta}</div>}</div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.relatedCountries?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--mn-text-muted)]"><Globe2 className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" /><span>{t('course13_copy_241')}</span></div>
                  <div className="mn-detail-small-grid">
                    {course.relatedCountries.map((item) => (
                      <button key={`${item.id ?? item.name}-country`} type="button" disabled={!onOpenCountry || !item.id} onClick={() => item.id && onOpenCountry?.(item.id)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--mn-border-gold)] enabled:hover:bg-[var(--mn-surface)] disabled:cursor-default enabled:hover:mn-panel ">
                        <div className="min-w-0"><div className="text-[10.5px] font-bold text-[var(--mn-heading)]">{item.name}</div>{item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--mn-text-muted)]">{item.meta}</div>}</div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {course.relatedExams?.length ? (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--mn-text-muted)]"><ShieldCheck className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" /><span>{t('course13_copy_242')}</span></div>
                  <div className="mn-detail-small-grid">
                    {course.relatedExams.map((item) => (
                      <button key={`${item.id ?? item.name}-exam`} type="button" disabled={!item.id || !onOpenExam} onClick={() => item.id && onOpenExam?.(item.id)} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)]/75 px-3 py-2.5 text-start transition-all enabled:hover:border-[var(--mn-border-gold)] enabled:hover:bg-[var(--mn-surface)] disabled:cursor-default enabled:hover:mn-panel ">
                        <div className="min-w-0"><div className="text-[10.5px] font-bold text-[var(--mn-heading)]">{item.name}</div>{item.meta && <div className="mt-0.5 text-[8.5px] font-bold leading-4 text-[var(--mn-text-muted)]">{item.meta}</div>}</div>
                        <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="rounded-[20px] border border-[var(--mn-border-gold)] bg-gradient-to-br from-[var(--mn-gold-surface)]/70 to-[var(--mn-surface)] p-3.5 shadow-sm">
          <DetailSectionHeader id="course-certificate" icon={ShieldCheck} title={t('course13_copy_243')} />
          <div>
              <p className="mt-0.5 text-[9.5px] font-semibold leading-4 text-[var(--mn-text-muted)]">
                {course.freeCertificate
                  ? `${t('course13_launch_prefix')} ${course.provider} ${t('course13_launch_certificate_suffix')}`
                  : `${t('course13_launch_prefix')} ${course.provider} ${t('course13_launch_source_suffix')}`}
              </p>
          </div>

          <a
            href={dataMode==='api'&&course.slug?ApiClient.getCourseLaunchUrl(course.slug):course.directCourseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mn-external-link inline-flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-white shadow-[0_8px_18px_rgba(20,43,95,0.22)] transition-transform active:scale-[0.99] mn-inverse "
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-[var(--mn-accent-text)]" />
              <span className="text-[12px] font-bold">{t('course13_copy_244')}</span>
            </span>
            <ArrowLeft className="h-4 w-4 text-[var(--mn-accent-text)]" />
          </a>

          <p className="mt-2 text-center text-[8.5px] font-bold text-[var(--mn-text-muted)]">{t('course13_copy_245')}</p>
        </section>
      </main>
    </div>
  );
};

