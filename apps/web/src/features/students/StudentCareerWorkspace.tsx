import { PreviewStudentApiClient } from './studentWorkspacePreviewApi';
const ApiClient =
  import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype'
    ? PreviewStudentApiClient
    : LiveApiClient;
import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiClient as LiveApiClient, type StudentOwnedAssetDto } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import {
  BriefcaseBusiness,
  ClipboardList,
  GraduationCap,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  UsersRound,
  Building2,
  Calendar,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  HorizontalSwipeTabs,
  CareerJobsExplorePanel,
  CareerSkillDevelopmentPanel,
} from './StudentExpandedSections';

type Profile = {
  headline?: string;
  summary?: string;
  skills: string[];
  resumeAssetId?: string;
  version?: number;
};
type Alumni = {
  displayName: string;
  graduationYear?: number;
  employerName?: string;
  visibility: 'PRIVATE' | 'ALUMNI_ONLY' | 'PUBLIC';
  consentRevokedAt?: string;
  version?: number;
};
type Application = {
  id: string;
  publicId: string;
  status: string;
  version: number;
  jobSnapshot: { title?: string };
  decisionMetadata?: { studentMessage?: string };
};

type CareerSubTab = 'PROFILE' | 'JOBS' | 'APPLICATIONS' | 'SKILLS' | 'ALUMNI';

export function StudentCareerWorkspace() {
  const { language, dir } = useTranslation();
  const c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [profile, setProfile] = useState<Profile>({ skills: [] });
  const [alumni, setAlumni] = useState<Alumni>({ displayName: '', visibility: 'PRIVATE' });
  const [assets, setAssets] = useState<StudentOwnedAssetDto[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [skills, setSkills] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [consent, setConsent] = useState(false);
  const [alumniConsent, setAlumniConsent] = useState(false);
  const [network, setNetwork] = useState<
    Array<{ id: string; displayName: string; employerName?: string; graduationYear?: number }>
  >([]);
  const [networkPage, setNetworkPage] = useState(1);
  const [networkPages, setNetworkPages] = useState(1);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [job, setJob] = useState<{ id: string; title: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<CareerSubTab>('PROFILE');

  const request = useRef(0);
  const mutation = useRef(false);
  const intent = useRef<{ payload: string; key: string } | null>(null);

  useEffect(() => {
    const sequence = ++request.current;
    setLoading(true);
    const tasks = [
      ApiClient.careerWorkspaceRequest<Profile | null>('profile'),
      ApiClient.careerWorkspaceRequest<Alumni | null>('alumni'),
      ApiClient.listMyActiveStudentAssets('application/pdf'),
      ApiClient.careerWorkspaceRequest<{ data: Application[]; totalPages: number }>(
        `applications?page=${page}`,
      ),
    ] as const;

    void Promise.allSettled(tasks).then((results) => {
      if (sequence !== request.current) return;
      const [p, a, files, list] = results;
      if (p.status === 'fulfilled' && p.value) {
        setProfile(p.value);
        setSkills(p.value.skills.join(', '));
      }
      if (a.status === 'fulfilled' && a.value) setAlumni(a.value);
      if (files.status === 'fulfilled') setAssets(files.value.items);
      if (list.status === 'fulfilled') {
        setApplications(list.value.data);
        setTotalPages(list.value.totalPages);
      }
      if (results.some((result) => result.status === 'rejected')) {
        setNotice(
          language === 'ar'
            ? 'تعذر تحميل بعض بيانات المسار المهني'
            : 'Some career data could not be loaded',
        );
      }
      setLoading(false);
    });
    return () => {
      ++request.current;
    };
  }, [page, reload, language]);

  useEffect(() => {
    const jobId = new URLSearchParams(window.location.search).get('jobId');
    const slug = new URLSearchParams(window.location.search).get('jobSlug');
    if (!jobId || !slug) return;
    let active = true;
    void ApiClient.getCareerJobBySlug(slug, language)
      .then((row) => {
        if (active && row.id === jobId && row.metadata?.applicationChannel === 'INTERNAL') {
          setJob({ id: row.id, title: row.title });
          setActiveSubTab('JOBS');
        }
      })
      .catch(() => {
        if (active)
          setNotice(
            language === 'ar' ? 'الفرصة غير متاحة للتقديم' : 'This opportunity is not open',
          );
      });
    return () => {
      active = false;
    };
  }, [language]);

  const write = async (path: string, method: string, body: Record<string, unknown>) => {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setNotice('');
    const payload = path + method + JSON.stringify(body);
    if (intent.current?.payload !== payload) {
      intent.current = { payload, key: crypto.randomUUID() };
    }
    try {
      await ApiClient.careerWorkspaceRequest(path, method, body, intent.current.key);
      intent.current = null;
      setNotice(c('تم حفظ التغييرات بنجاح', 'Changes saved successfully'));
      setReload((value) => value + 1);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : c('تعذر الحفظ، يرجى المحاولة لاحقًا', 'Could not save, please try again'),
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    void write('profile', 'PUT', {
      headline: profile.headline || null,
      summary: profile.summary || null,
      skills: skills
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      resumeAssetId: profile.resumeAssetId || null,
      visibility: 'PRIVATE',
      expectedVersion: profile.version,
    });
  };

  const loadNetwork = (targetPage = 1) => {
    setNetworkLoading(true);
    void ApiClient.careerWorkspaceRequest<{ data: typeof network; totalPages: number }>(
      `alumni-network?page=${targetPage}`,
    )
      .then((result) => {
        setNetwork(result.data);
        setNetworkPages(result.totalPages);
        setNetworkPage(targetPage);
      })
      .catch(() => {
        setNotice(
          c(
            'الشبكة متاحة للخريجين ذوي الموافقة السارية فقط',
            'The network requires active alumni consent',
          ),
        );
      })
      .finally(() => {
        setNetworkLoading(false);
      });
  };

  const parsedSkillsList = skills
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const savedSkillsCount = parsedSkillsList.length;
  const hasProfile = Boolean(
    profile.headline?.trim() ||
      profile.summary?.trim() ||
      savedSkillsCount ||
      profile.resumeAssetId,
  );



  const inputStyle =
    "mt-1 block min-h-9 w-full rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1.5 text-[12px] font-['Cairo',sans-serif] font-medium text-[var(--mn-heading)] placeholder:font-['Cairo',sans-serif] placeholder:text-[var(--mn-text-muted)] placeholder:text-[11.5px] outline-none transition-colors focus:border-[#0E7C86] dark:bg-[var(--mn-surface-elevated)]";
  const labelStyle =
    "block text-[11.5px] font-['Cairo',sans-serif] font-bold leading-[1.6] text-[var(--mn-heading)]";
  const actionStyle =
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#142B5F] hover:bg-[#1a3675] px-3.5 py-1.5 text-[11.5px] font-['Cairo',sans-serif] font-bold text-white transition-all shadow-2xs border border-[#D6A43B]/35 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryActionStyle =
    "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1 text-[11.5px] font-['Cairo',sans-serif] font-bold text-[var(--mn-heading)] transition-colors hover:border-[#0E7C86] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--mn-surface-elevated)]";

  return (
    <div dir={dir} className="mn-student-career-page mt-0 space-y-3.5 font-['Cairo',sans-serif]">
      {/* Main section hero header with selective Navy start line */}
      <div className="relative -mx-3 sm:-mx-6 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] -mt-px">
        <section
          aria-label={c('مساري المهني', 'My career')}
          className="mn-student-career-hero relative overflow-hidden rounded-none border-x-0 border-t border-b border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] shadow-2xs mn-panel"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-[4px] z-10 bg-[#142B5F]"
          />

          <div className="px-3.5 pt-3 pb-3 pr-4 sm:px-5 sm:pt-3.5 sm:pb-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-[#D6A43B]/45 bg-[#142B5F]">
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />
                </span>
                <h2 className="mn-student-career-heading text-[14px] sm:text-[15px] font-bold leading-tight text-[#1E293B] dark:text-[#F8FAFC] font-['Cairo',sans-serif]">
                  {c('مساري المهني والخريجون', 'Career & Alumni')}
                </h2>
              </div>

              <span className="inline-flex shrink-0 items-center rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] dark:border-white/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#334155] dark:text-[#E2E8F0]">
                {hasProfile ? c('الملف جاهز', 'Ready') : c('ملف جديد', 'New')} ·{' '}
                {savedSkillsCount} {c('مهارات', 'skills')}
              </span>
            </div>
          </div>
        </section>

        {/* 5 Sub-Tabs with Petrol Swipe Bar */}
        <HorizontalSwipeTabs
          ariaLabel={c('أقسام المسار المهني', 'Career sections')}
          activeId={activeSubTab}
          onSelect={setActiveSubTab}
          items={[
            { id: 'PROFILE', label: c('ملفي المهني', 'Profile'), icon: UserRound },
            { id: 'JOBS', label: c('فرص العمل والتدريب', 'Opportunities'), icon: BriefcaseBusiness },
            {
              id: 'APPLICATIONS',
              label: c('تقديماتي المهنية', 'Applications'),
              count: applications.length,
              icon: ClipboardList,
            },
            { id: 'SKILLS', label: c('تطوير مهاراتي', 'Skills'), icon: Sparkles },
            { id: 'ALUMNI', label: c('الخريجون', 'Alumni'), icon: GraduationCap },
          ]}
        />
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-[11.5px] text-[var(--mn-text)] shadow-2xs dark:bg-[var(--mn-surface-elevated)]"
        >
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 text-[#0E7C86]" aria-hidden="true" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="text-[11px] font-bold text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]"
          >
            {c('إغلاق', 'Close')}
          </button>
        </div>
      )}

      {/* SUB-TAB 1: ملفي المهني */}
      {activeSubTab === 'PROFILE' && (
        <CareerSectionCard
          id="mn-career-profile"
          title={c('ملفي المهني والسيرة الذاتية', 'Career profile & CV')}
          icon={<UserRound className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />}
        >
          <div
            data-cairo-12
            className="rounded-xl border border-[#0E7C86]/20 bg-[#0E7C86]/5 dark:bg-[#0E7C86]/10 p-2.5 mb-3 flex items-center gap-2 text-[11px] text-[var(--mn-heading)]"
          >
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-[#0E7C86]" aria-hidden="true" />
            <span>
              {c(
                'ملفك المهني خاص ولا يُشارك إلا عند تقديمك المباشر على فرصة.',
                'Your profile is private and shared only upon direct application.',
              )}
            </span>
          </div>

          <form onSubmit={submitProfile} className="space-y-3">
            <label className={labelStyle}>
              {c('المسمى المهني / التخصص الحالي', 'Current headline or major')}
              <input
                data-cairo-12
                className={inputStyle}
                value={profile.headline || ''}
                maxLength={240}
                placeholder={c(
                  'مثال: خريج نظم معلومات · باحث في الذكاء الاصطناعي',
                  'e.g. MIS Graduate · AI Researcher',
                )}
                onChange={(event) =>
                  setProfile((previous) => ({ ...previous, headline: event.target.value }))
                }
              />
            </label>

            <label className={labelStyle}>
              {c('النبذة المهنية المختصرة', 'Professional summary')}
              <textarea
                data-cairo-12
                className={`${inputStyle} min-h-20 resize-y leading-relaxed`}
                rows={2}
                value={profile.summary || ''}
                maxLength={4000}
                placeholder={c(
                  'لخّص مهاراتك، مشاريعك الأكاديمية، وطموحك المهني…',
                  'Summarize your skills and academic projects…',
                )}
                onChange={(event) =>
                  setProfile((previous) => ({ ...previous, summary: event.target.value }))
                }
              />
            </label>

            <div>
              <label className={labelStyle}>
                {c('المهارات (افصل بينها بفواصل)', 'Skills (comma-separated)')}
                <input
                  data-cairo-12
                  className={inputStyle}
                  value={skills}
                  placeholder={c(
                    'البحث العلمي، تحليل البيانات، اللغة الإنجليزية، بايثون',
                    'Research, Data Analysis, English, Python',
                  )}
                  onChange={(event) => setSkills(event.target.value)}
                />
              </label>
              {parsedSkillsList.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {parsedSkillsList.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      data-cairo-12
                      className="inline-flex items-center gap-1 rounded-lg border border-[#0E7C86]/25 bg-[#0E7C86]/10 px-2 py-0.5 text-[11px] font-bold text-[#0E7C86] dark:text-[#55CBC5]"
                    >
                      <span data-cairo-12>{skill}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <label className={labelStyle}>
              <div className="flex items-center justify-between">
                <span>{c('السيرة الذاتية المعتمدة (PDF)', 'CV (PDF from my files)')}</span>
                <span className="text-[10.5px] text-[var(--mn-text-muted)] font-normal">
                  {assets.length > 0
                    ? c(`${assets.length} ملف متاح`, `${assets.length} files`)
                    : c('لا توجد ملفات PDF', 'No PDF files')}
                </span>
              </div>
              <select
                data-cairo-12
                className={`${inputStyle} cursor-pointer`}
                value={profile.resumeAssetId || ''}
                onChange={(event) =>
                  setProfile((previous) => ({ ...previous, resumeAssetId: event.target.value }))
                }
              >
                <option data-cairo-12 value="">
                  {c('— بدون تحديد سيرة ذاتية —', '— No file selected —')}
                </option>
                {profile.resumeAssetId &&
                  !assets.some((row) => row.id === profile.resumeAssetId) && (
                    <option data-cairo-12 value={profile.resumeAssetId}>
                      {c('الملف المحفوظ حاليًا', 'Currently saved file')}
                    </option>
                  )}
                {assets.map((row) => (
                  <option key={row.id} value={row.id} data-cairo-12>
                    {row.metadata?.originalFilename || row.reference}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center justify-end border-t border-[var(--mn-border)] dark:border-white/10 pt-2.5">
              <button type="submit" disabled={busy || loading} className={actionStyle}>
                <ShieldCheck className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />
                <span>{c('حفظ الملف المهني', 'Save career profile')}</span>
              </button>
            </div>
          </form>
        </CareerSectionCard>
      )}

      {/* SUB-TAB 2: فرص العمل والتدريب */}
      {activeSubTab === 'JOBS' && (
        <div className="space-y-3.5">
          <CareerJobsExplorePanel
            onSelectJob={(selectedJob) => {
              setJob(selectedJob);
            }}
          />

          {job && (
            <CareerSectionCard
              title={c('نموذج التقديم المباشر', 'Direct application form')}
              icon={<BriefcaseBusiness className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />}
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void write('applications', 'POST', {
                    jobId: job.id,
                    cvAssetId: profile.resumeAssetId,
                    coverLetter,
                    consent,
                  });
                }}
                className="space-y-3"
              >
                <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3">
                  <span className="text-[10px] font-bold text-[#0E7C86]">
                    {c('الفرصة المختارة', 'Selected role')}
                  </span>
                  <h4 className="mt-0.5 text-[12.5px] font-bold text-[var(--mn-heading)]">
                    {job.title}
                  </h4>
                </div>

                <label className={labelStyle}>
                  {c('رسالة التقديم المختصرة', 'Cover letter')}
                  <textarea
                    data-cairo-12
                    value={coverLetter}
                    maxLength={4000}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    rows={3}
                    placeholder={c(
                      'اكتب رسالة موجزة توضح سبب اهتمامك بالفرصة…',
                      'Explain why you are interested in this role…',
                    )}
                    className={`${inputStyle} min-h-20 resize-y`}
                  />
                </label>

                <label
                  data-cairo-12
                  className="flex items-start gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-[11.5px] font-medium text-[var(--mn-heading)] cursor-pointer"
                >
                  <input
                    className="mt-1 h-4 w-4 shrink-0 rounded accent-[#142B5F]"
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    {c(
                      'أوافق على مشاركة ملفي المهني وسيرتي الذاتية مع جهة التدريب لهذه الفرصة فقط.',
                      'I consent to sharing my profile and CV for this opportunity only.',
                    )}
                  </span>
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--mn-border)]">
                  <button
                    type="button"
                    onClick={() => setJob(null)}
                    className={secondaryActionStyle}
                  >
                    {c('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className={actionStyle}
                    disabled={busy || loading || !consent || !profile.resumeAssetId}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#F2CD78]" />
                    <span>{c('إرسال التقديم', 'Submit application')}</span>
                  </button>
                </div>
              </form>
            </CareerSectionCard>
          )}
        </div>
      )}

      {/* SUB-TAB 3: تقديماتي المهنية */}
      {activeSubTab === 'APPLICATIONS' && (
        <CareerSectionCard
          id="mn-career-applications"
          title={c('تقديماتي المهنية المسجلة', 'My career applications')}
          icon={<ClipboardList className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />}
          count={`${applications.length} ${c('طلب', 'applications')}`}
        >
          {applications.length === 0 ? (
            <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-5 text-center dark:bg-[var(--mn-surface-elevated)]">
              <ClipboardList
                className="h-7 w-7 mx-auto text-[#0E7C86] mb-1.5"
                aria-hidden="true"
              />
              <h4 className="text-[12.5px] font-bold text-[var(--mn-heading)]">
                {c('لا توجد طلبات تقديم مهنية مسجلة بعد', 'No career applications yet')}
              </h4>
              <button
                type="button"
                onClick={() => setActiveSubTab('JOBS')}
                className="mt-2.5 inline-flex min-h-8 items-center gap-1 rounded-xl bg-[#142B5F] px-3 py-1 text-[11px] font-bold text-white border border-[#D6A43B]/35 cursor-pointer"
              >
                <span>{c('تصفح فرص العمل والتدريب', 'Browse opportunities')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {applications.map((row) => {
                  const statusInfo = getApplicationStatusInfo(row.status, c);
                  const canWithdraw = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'].includes(
                    row.status,
                  );
                  return (
                    <article
                      key={row.id}
                      className="flex flex-col justify-between rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 shadow-2xs dark:bg-[var(--mn-surface-elevated)]"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[12px] font-bold leading-snug text-[var(--mn-heading)]">
                            {row.jobSnapshot?.title || c('فرصة مهنية', 'Career opportunity')}
                          </h4>
                          <span
                            className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[10.5px] text-[var(--mn-text-muted)]">
                          #{row.publicId}
                        </div>
                      </div>

                      {canWithdraw && (
                        <div className="mt-2.5 flex justify-end border-t border-[var(--mn-border)] pt-2">
                          <button
                            type="button"
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10.5px] font-bold text-rose-700 cursor-pointer"
                            disabled={busy}
                            onClick={() =>
                              void write(`applications/${row.id}/withdraw`, 'POST', {
                                expectedVersion: row.version,
                              })
                            }
                          >
                            {c('سحب الطلب', 'Withdraw')}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    className={secondaryActionStyle}
                    disabled={loading || page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>{c('السابق', 'Prev')}</span>
                  </button>
                  <span className="text-[11px] font-bold">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className={secondaryActionStyle}
                    disabled={loading || page >= totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    <span>{c('التالي', 'Next')}</span>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </CareerSectionCard>
      )}

      {/* SUB-TAB 4: تطوير مهاراتي */}
      {activeSubTab === 'SKILLS' && (
        <CareerSkillDevelopmentPanel skillsCount={savedSkillsCount} />
      )}

      {/* SUB-TAB 5: الخريجون (إعدادات الخريج + شبكة الخريجين) */}
      {activeSubTab === 'ALUMNI' && (
        <div className="space-y-3.5">
          <CareerSectionCard
            id="mn-career-alumni"
            title={c('ملف الخريج والخصوصية', 'Alumni profile & privacy')}
            icon={<GraduationCap className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />}
          >
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void write('alumni', 'PUT', {
                  displayName: alumni.displayName,
                  graduationYear: alumni.graduationYear ?? null,
                  employerName: alumni.employerName || null,
                  visibility: alumni.visibility,
                  ...(alumniConsent ? { consentGranted: true } : {}),
                  expectedVersion: alumni.version,
                });
              }}
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className={labelStyle}>
                  {c('اسم العرض في دليل الخريجين', 'Display name')}
                  <input
                    required
                    data-cairo-12
                    className={inputStyle}
                    value={alumni.displayName}
                    maxLength={240}
                    placeholder={c('مثال: م. أحمد عبد الله', 'e.g. Eng. Ahmed')}
                    onChange={(event) =>
                      setAlumni((previous) => ({ ...previous, displayName: event.target.value }))
                    }
                  />
                </label>

                <label className={labelStyle}>
                  {c('سنة التخرج', 'Graduation year')}
                  <input
                    data-cairo-12
                    className={inputStyle}
                    type="number"
                    min={1970}
                    max={new Date().getFullYear() + 7}
                    placeholder={String(new Date().getFullYear())}
                    value={alumni.graduationYear ?? ''}
                    onChange={(event) =>
                      setAlumni((previous) => ({
                        ...previous,
                        graduationYear: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className={labelStyle}>
                  {c('جهة العمل الحالية (اختياري)', 'Current employer')}
                  <input
                    data-cairo-12
                    className={inputStyle}
                    value={alumni.employerName || ''}
                    maxLength={240}
                    placeholder={c('مثال: مهندس برمجيات', 'e.g. Software Engineer')}
                    onChange={(event) =>
                      setAlumni((previous) => ({ ...previous, employerName: event.target.value }))
                    }
                  />
                </label>

                <label className={labelStyle}>
                  {c('مستوى ظهور الملف', 'Visibility level')}
                  <select
                    data-cairo-12
                    className={`${inputStyle} cursor-pointer`}
                    value={alumni.visibility}
                    onChange={(event) =>
                      setAlumni((previous) => ({
                        ...previous,
                        visibility: event.target.value as Alumni['visibility'],
                      }))
                    }
                  >
                    <option data-cairo-12 value="PRIVATE">
                      {c('خاص — غير مدرج في الدليل', 'Private')}
                    </option>
                    <option data-cairo-12 value="ALUMNI_ONLY">
                      {c('للخريجين الموافقين فقط', 'Consenting alumni only')}
                    </option>
                    <option data-cairo-12 value="PUBLIC">
                      {c('عام', 'Public')}
                    </option>
                  </select>
                </label>
              </div>

              <label
                data-cairo-12
                className="flex items-start gap-2 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-[11.5px] font-medium text-[var(--mn-heading)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded accent-[#142B5F]"
                  checked={alumniConsent}
                  onChange={(event) => setAlumniConsent(event.target.checked)}
                />
                <span>
                  {c(
                    'أوافق على إدراج بياناتي الأساسية وفق نطاق الخصوصية المحدد أعلاه.',
                    'I consent to listing my basic info according to the privacy level above.',
                  )}
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--mn-border)] pt-2.5">
                <button type="submit" className={actionStyle} disabled={busy || loading}>
                  <ShieldCheck className="h-3.5 w-3.5 text-[#F2CD78]" />
                  <span>{c('حفظ إعدادات الخريج', 'Save alumni settings')}</span>
                </button>
              </div>
            </form>
          </CareerSectionCard>

          <CareerSectionCard
            id="mn-career-network"
            title={c('دليل شبكة الخريجين', 'Alumni directory')}
            icon={<UsersRound className="h-3.5 w-3.5 text-[#F2CD78]" aria-hidden="true" />}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[var(--mn-text-muted)]">
                {alumni.visibility === 'PRIVATE'
                  ? c(
                      'فعّل ظهور ملفك إلى «للخريجين الموافقين» لاستعراض زملائك.',
                      'Enable alumni visibility above to browse peers.',
                    )
                  : c('تواصل مع زملائك الخريجين المشاركين في الشبكة.', 'Connect with peers.')}
              </span>
              <button
                type="button"
                className={actionStyle}
                disabled={busy || loading || networkLoading || alumni.visibility === 'PRIVATE'}
                onClick={() => loadNetwork(1)}
              >
                <UsersRound className="h-3.5 w-3.5 text-[#F2CD78]" />
                <span>
                  {networkLoading
                    ? c('جارٍ التحميل…', 'Loading…')
                    : c('تصفح الشبكة', 'Browse network')}
                </span>
              </button>
            </div>

            {network.length > 0 && (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {network.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#142B5F] text-[#F2CD78]">
                        <GraduationCap className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-[11.5px] font-bold text-[var(--mn-heading)] truncate">
                          {row.displayName}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--mn-text-muted)]">
                          {row.graduationYear && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-[#0E7C86]" />
                              <span>{row.graduationYear}</span>
                            </span>
                          )}
                          {row.employerName && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 text-[#0E7C86]" />
                              <span className="truncate">{row.employerName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CareerSectionCard>
        </div>
      )}
    </div>
  );
}

function CareerSectionCard({
  id,
  title,
  icon,
  count,
  children,
}: {
  id?: string;
  title: string;
  icon: ReactNode;
  count?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="mn-student-career-section relative -mx-3 sm:-mx-6 w-[calc(100%+1.5rem)] sm:w-[calc(100%+3rem)] scroll-mt-6 rounded-none border-x-0 border-t border-b border-[var(--mn-border)] bg-[var(--mn-surface)] px-3.5 py-3 sm:px-5 sm:py-3.5 shadow-2xs mn-panel dark:border-white/10 font-['Cairo',sans-serif] overflow-hidden"
    >
      <div className="mb-2.5 border-b border-[var(--mn-border)] dark:border-white/10 pb-2 flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#D6A43B]/40 bg-[#142B5F]">
            {icon}
          </span>
          <h3 className="inline-block border-b-2 border-[#D6A43B] pb-0.5 text-[13.5px] sm:text-[14px] font-bold leading-snug text-[#1E293B] dark:text-[#F8FAFC] font-['Cairo',sans-serif]">
            {title}
          </h3>
        </div>
        {count && (
          <span className="shrink-0 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[#334155] dark:text-[#E2E8F0]">
            {count}
          </span>
        )}
      </div>

      {children}
    </section>
  );
}

function getApplicationStatusInfo(status: string, c: (ar: string, en: string) => string) {
  switch ((status || '').toUpperCase()) {
    case 'SUBMITTED':
      return {
        label: c('تم التقديم', 'Submitted'),
        className: 'bg-[#0E7C86]/10 text-[#0E7C86] border-[#0E7C86]/25',
      };
    case 'UNDER_REVIEW':
      return {
        label: c('قيد المراجعة', 'Under review'),
        className: 'bg-[#142B5F]/10 text-[#142B5F] dark:text-[#F2CD78] border-[#142B5F]/20',
      };
    case 'SHORTLISTED':
      return {
        label: c('قائمة قصيرة', 'Shortlisted'),
        className: 'bg-[#0E7C86]/10 text-[#0E7C86] border-[#0E7C86]/25',
      };
    case 'ACCEPTED':
      return {
        label: c('مقبول', 'Accepted'),
        className:
          'bg-[var(--mn-success-soft)] text-[var(--mn-success-text)] border-[var(--mn-success-border)]',
      };
    case 'REJECTED':
      return {
        label: c('غير مستوفٍ', 'Rejected'),
        className: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
      };
    default:
      return {
        label: status || c('قيد المتابعة', 'Pending'),
        className: 'bg-[var(--mn-page)] text-[var(--mn-text-muted)] border-[var(--mn-border)]',
      };
  }
}
