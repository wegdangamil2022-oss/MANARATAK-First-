import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock3,
  Eye,
  FilePenLine,
  FolderTree,
  Loader2,
  Link2,
  Plus,
  Search,
  Send,
  Tags,
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { CmsOperationsPanels } from '../features/cms/CmsOperationsPanels';
import { CmsRichText } from '@manaratak/ui';
import { AssetPicker } from '../components/AssetPicker';

type Locale = 'ar' | 'en';
interface Content {
  id: string;
  publicId: string;
  slug: string;
  siteIdentifier: string;
  primaryLocale: Locale;
  contentType: string;
  status: string;
  title: string;
  summary?: string | null;
  categoryId?: string | null;
  featuredAssetId?: string | null;
  version: number;
  updatedAt: string;
  scheduledAt?: string | null;
}
interface Localized {
  id: string;
  locale: Locale;
  localizedSlug: string;
  title: string;
  summary?: string | null;
  body: string;
  readingTimeMinutes?: number | null;
  featuredAssetId?: string | null;
  attachmentAssetIds?: string[];
  tagIds?: string[];
  seoMetadata?: Seo | null;
  state: string;
  version: number;
  scheduledAt?: string | null;
}
interface DomainLink {
  id?: string;
  targetType: string;
  targetId: string;
  relationType: string;
  sortOrder: number;
}
interface Detail extends Content {
  localizedPayloads: Localized[];
  tags: Tag[];
  revisions: Array<{ id: string; versionNumber: number; reason: string; capturedAt: string }>;
  readiness: Record<string, { ready: boolean; missing: string[]; warnings: string[] }>;
  domainLinks: DomainLink[];
}
interface Category {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  status: string;
}
interface Tag {
  id: string;
  normalizedValue: string;
  labelAr: string;
  labelEn: string;
}
interface Seo {
  title: string;
  description: string;
  canonicalUrl?: string | null;
  keywords: string[];
  noIndex: boolean;
  noFollow: boolean;
  openGraphTitle?: string | null;
  openGraphDescription?: string | null;
  openGraphAssetId?: string | null;
}
interface ListResponse {
  data: Content[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
interface EditorState {
  openGraphTitle: string;
  openGraphDescription: string;
  localizedSlug: string;
  title: string;
  summary: string;
  body: string;
  readingTimeMinutes: string;
  featuredAssetId: string;
  attachmentAssetIds: string;
  tagIds: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  keywords: string;
  openGraphAssetId: string;
  noIndex: boolean;
  noFollow: boolean;
  version?: number;
}
interface TaxonomyState {
  categorySlug: string;
  categoryAr: string;
  categoryEn: string;
  tagValue: string;
  tagAr: string;
  tagEn: string;
}

const blankEditor = (): EditorState => ({
  openGraphTitle: '',
  openGraphDescription: '',
  localizedSlug: '',
  title: '',
  summary: '',
  body: '',
  readingTimeMinutes: '5',
  featuredAssetId: '',
  attachmentAssetIds: '',
  tagIds: [],
  seoTitle: '',
  seoDescription: '',
  canonicalUrl: '',
  keywords: '',
  openGraphAssetId: '',
  noIndex: false,
  noFollow: false,
});
const contentTypes = [
  'ARTICLE',
  'NEWS',
  'STATIC_PAGE',
  'STUDY_GUIDE',
  'FAQ',
  'CHECKLIST',
  'LANDING_PAGE',
];
const workflow = [
  'قائمة المحتوى',
  'إنشاء المحتوى',
  'التحرير',
  'الوسائط',
  'تهيئة SEO',
  'المعاينة',
  'المراجعة',
  'النشر',
];

export function CmsAdminPage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [locale, setLocale] = useState<Locale>('ar');
  const [editors, setEditors] = useState<Record<Locale, EditorState>>({
    ar: blankEditor(),
    en: blankEditor(),
  });
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const listSequence = useRef(0);
  const mutationLock = useRef(false);
  const baseline = useRef<Record<Locale, EditorState>>({ ar: blankEditor(), en: blankEditor() });
  const linksBaseline = useRef('[]');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [create, setCreate] = useState({
    title: '',
    slug: '',
    contentType: 'ARTICLE',
    categoryId: '',
    featuredAssetId: '',
  });
  const [domainLinks, setDomainLinks] = useState<DomainLink[]>([]);
  const [taxonomy, setTaxonomy] = useState({
    categorySlug: '',
    categoryAr: '',
    categoryEn: '',
    tagValue: '',
    tagAr: '',
    tagEn: '',
  });

  const loadDashboard = useCallback(async () => {
    const sequence = ++listSequence.current;
    setListError(null);
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        siteIdentifier: 'manaratak',
      });
      if (query.trim()) params.set('q', query.trim());
      if (status) params.set('status', status);
      if (typeFilter) params.set('contentType', typeFilter);
      if (categoryFilter) params.set('categorySlug', categoryFilter);
      const [contentLoad, categoryLoad, tagLoad] = await Promise.allSettled([
        adminApiClient.request<ListResponse>(`/admin/cms/content?${params}`),
        adminApiClient.request<{ data: Category[] }>('/admin/cms/categories'),
        adminApiClient.request<{ data: Tag[] }>('/admin/cms/tags'),
      ]);
      if (sequence !== listSequence.current) return;
      if (categoryLoad.status === 'fulfilled') setCategories(categoryLoad.value.data);
      if (tagLoad.status === 'fulfilled') setTags(tagLoad.value.data);
      if (contentLoad.status === 'rejected') throw contentLoad.reason;
      const contentResult = contentLoad.value;
      if (categoryLoad.status === 'rejected' || tagLoad.status === 'rejected')
        setError(
          'تعذر تحميل بعض التصنيفات أو الوسوم. قائمة المحتوى متاحة؛ أعد التحميل قبل استخدامها.',
        );
      if (page > Math.max(1, contentResult.totalPages)) {
        setPage(Math.max(1, contentResult.totalPages));
        return;
      }
      setList(contentResult);
    } catch (reason) {
      if (sequence === listSequence.current) {
        setListError(messageOf(reason));
        setList(null);
      }
    } finally {
      if (sequence === listSequence.current) setLoading(false);
    }
  }, [query, status, page, typeFilter, categoryFilter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const dirtyLocales = {
    ar: JSON.stringify(editors.ar) !== JSON.stringify(baseline.current.ar),
    en: JSON.stringify(editors.en) !== JSON.stringify(baseline.current.en),
  };
  const linksDirty = JSON.stringify(domainLinks) !== linksBaseline.current;
  const dirty = Boolean(selected && (dirtyLocales.ar || dirtyLocales.en || linksDirty));
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const openContent = async (id: string, preservedLocale?: Locale, preserveAll = false) => {
    setBusy(true);
    setError(null);
    try {
      const detail = await adminApiClient.request<Detail>(`/admin/cms/content/${id}`);
      const next = {
        ar: toEditor(
          detail.localizedPayloads.find((entry) => entry.locale === 'ar'),
          detail.slug,
        ),
        en: toEditor(
          detail.localizedPayloads.find((entry) => entry.locale === 'en'),
          detail.slug,
        ),
      };
      const keep = (language: Locale) =>
        selected?.id === id &&
        (preserveAll || preservedLocale === language) &&
        dirtyLocales[language];
      baseline.current = next;
      setSelected(detail);
      if (!preservedLocale || !linksDirty) {
        setDomainLinks(detail.domainLinks ?? []);
        linksBaseline.current = JSON.stringify(detail.domainLinks ?? []);
      }
      setEditors((previous) => ({
        ar: keep('ar') ? previous.ar : next.ar,
        en: keep('en') ? previous.en : next.en,
      }));
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };
  const chooseContent = (id: string) => {
    if (busy || mutationLock.current) return;
    if (dirty && !window.confirm('توجد تعديلات غير محفوظة. هل تريد تجاهلها وفتح المادة؟')) return;
    void openContent(id);
  };

  const createContent = async (event: FormEvent) => {
    event.preventDefault();
    if (
      mutationLock.current ||
      (dirty && !window.confirm('توجد تعديلات غير محفوظة. تجاهلها وإنشاء مادة جديدة؟'))
    )
      return;
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await adminApiClient.request<Content>('/admin/cms/content', {
        method: 'POST',
        body: JSON.stringify({
          title: create.title.trim(),
          slug: create.slug.trim(),
          contentType: create.contentType,
          siteIdentifier: 'manaratak',
          primaryLocale: 'ar',
          categoryId: create.categoryId || null,
          featuredAssetId: create.featuredAssetId.trim() || null,
        }),
      });
      setCreate({
        title: '',
        slug: '',
        contentType: 'ARTICLE',
        categoryId: '',
        featuredAssetId: '',
      });
      setNotice(
        'تم إنشاء المسودة. أكمل اللغة المطلوبة واربطها بالكيانات ذات الصلة ثم أرسلها للمراجعة.',
      );
      await Promise.all([openContent(created.id), loadDashboard()]);
    } catch (reason) {
      setError(messageOf(reason));
      setBusy(false);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const currentEditor = editors[locale];
  const updateEditor = (change: Partial<EditorState>) =>
    setEditors((value) => ({ ...value, [locale]: { ...value[locale], ...change } }));
  const saveLocale = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || mutationLock.current) return;
    const minutes = Number(currentEditor.readingTimeMinutes);
    if (currentEditor.readingTimeMinutes.trim() && (!Number.isInteger(minutes) || minutes <= 0)) {
      setError('وقت القراءة يجب أن يكون عدد دقائق صحيحًا موجبًا.');
      return;
    }
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApiClient.request(`/admin/cms/content/${selected.id}/localized`, {
        method: 'PUT',
        body: JSON.stringify({
          locale,
          localizedSlug: currentEditor.localizedSlug.trim(),
          title: currentEditor.title.trim(),
          summary: currentEditor.summary.trim() || null,
          body: currentEditor.body,
          readingTimeMinutes: currentEditor.readingTimeMinutes.trim()
            ? Number(currentEditor.readingTimeMinutes)
            : null,
          featuredAssetId: currentEditor.featuredAssetId.trim() || null,
          attachmentAssetIds: splitValues(currentEditor.attachmentAssetIds),
          tagIds: currentEditor.tagIds,
          expectedVersion: currentEditor.version,
          seoMetadata: {
            title: currentEditor.seoTitle.trim(),
            description: currentEditor.seoDescription.trim(),
            keywords: splitValues(currentEditor.keywords),
            noIndex: currentEditor.noIndex,
            noFollow: currentEditor.noFollow,
            openGraphTitle: currentEditor.openGraphTitle.trim() || null,
            openGraphDescription: currentEditor.openGraphDescription.trim() || null,
            openGraphAssetId: currentEditor.openGraphAssetId.trim() || null,
          },
        }),
      });
      setNotice(
        `تم حفظ النسخة ${locale === 'ar' ? 'العربية' : 'الإنجليزية'} في الخادم مع نسخة مراجعة جديدة.`,
      );
      await openContent(selected.id, locale === 'ar' ? 'en' : 'ar');
      await loadDashboard();
    } catch (reason) {
      setError(messageOf(reason));
      setBusy(false);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const runWorkflow = async (
    action: 'submit-review' | 'approve' | 'publish' | 'archive' | 'reject',
  ) => {
    if (!selected || mutationLock.current) return;
    if (dirty) {
      setError('احفظ تعديلات المحتوى والروابط قبل تغيير حالة النشر.');
      return;
    }
    if (
      ['publish', 'archive'].includes(action) &&
      !window.confirm(
        action === 'publish' ? 'نشر هذه اللغة للعامة؟' : 'أرشفة هذه اللغة وإخفاؤها عن العامة؟',
      )
    )
      return;
    const comments = action === 'reject' ? window.prompt('سبب الرفض (إلزامي):') : null;
    if (action === 'reject' && !comments?.trim()) return;
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApiClient.request(`/admin/cms/content/${selected.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ locale, expectedVersion: currentEditor.version, comments }),
      });
      setNotice(
        action === 'submit-review'
          ? 'أُرسلت النسخة للمراجعة.'
          : action === 'approve'
            ? 'اعتمدها الناشر وأصبحت جاهزة للنشر.'
            : action === 'publish'
              ? 'نُشرت النسخة بنجاح.'
              : action === 'archive'
                ? 'أُرشفت النسخة.'
                : 'أُعيدت للمحرر مع سبب الرفض.',
      );
      await Promise.all([openContent(selected.id), loadDashboard()]);
    } catch (reason) {
      setError(messageOf(reason));
      setBusy(false);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const schedule = async () => {
    if (!selected || mutationLock.current) return;
    if (dirty) {
      setError('احفظ التعديلات قبل جدولة النشر.');
      return;
    }
    const value = window.prompt('موعد النشر بصيغة ISO، مثال: 2026-09-01T08:00:00Z');
    if (!value) return;
    if (!Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()) {
      setError('اختر موعد نشر صالحًا في المستقبل.');
      return;
    }
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    try {
      await adminApiClient.request(`/admin/cms/content/${selected.id}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          locale,
          expectedVersion: currentEditor.version,
          scheduledAt: value,
        }),
      });
      setNotice('تمت الجدولة دون نشر تلقائي من الواجهة؛ عامل الجدولة ينفذها في بيئة التشغيل.');
      await Promise.all([openContent(selected.id), loadDashboard()]);
    } catch (reason) {
      setError(messageOf(reason));
      setBusy(false);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const cancelSchedule = async () => {
    if (!selected || mutationLock.current || dirty) return;
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    try {
      await adminApiClient.request(`/admin/cms/content/${selected.id}/cancel-schedule`, {
        method: 'POST',
        body: JSON.stringify({ locale, expectedVersion: currentEditor.version }),
      });
      await Promise.all([openContent(selected.id), loadDashboard()]);
      setNotice('أُلغيت الجدولة وأُعيدت النسخة إلى المسودة.');
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const saveDomainLinks = async () => {
    if (!selected || mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApiClient.request(`/admin/cms/content/${selected.id}/domain-links`, {
        method: 'PUT',
        body: JSON.stringify({
          links: domainLinks.map((link, index) => ({ ...link, sortOrder: index })),
        }),
      });
      setNotice('تم حفظ روابط المحتوى مع أقسام المنصة باستخدام المعرّفات Canonical.');
      await openContent(selected.id, undefined, true);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const createTaxonomy = async (kind: 'category' | 'tag') => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    try {
      if (kind === 'category')
        await adminApiClient.request('/admin/cms/categories', {
          method: 'POST',
          body: JSON.stringify({
            slug: taxonomy.categorySlug,
            nameAr: taxonomy.categoryAr,
            nameEn: taxonomy.categoryEn,
            status: 'ACTIVE',
          }),
        });
      else
        await adminApiClient.request('/admin/cms/tags', {
          method: 'POST',
          body: JSON.stringify({
            normalizedValue: taxonomy.tagValue,
            labelAr: taxonomy.tagAr,
            labelEn: taxonomy.tagEn,
          }),
        });
      setNotice(kind === 'category' ? 'تم إنشاء التصنيف.' : 'تم إنشاء الوسم.');
      await loadDashboard();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const readiness = selected?.readiness?.[locale];
  const localizedState = selected?.localizedPayloads.find(
    (entry) => entry.locale === locale,
  )?.state;
  const editorLocked = ['IN_REVIEW', 'READY_TO_PUBLISH', 'SCHEDULED'].includes(
    localizedState ?? '',
  );
  const publicSegment =
    (
      {
        ARTICLE: 'articles',
        NEWS: 'news',
        STUDY_GUIDE: 'study-guides',
        CHECKLIST: 'checklists',
        FAQ: 'faqs',
        STATIC_PAGE: 'pages',
        LANDING_PAGE: 'landing',
      } as Record<string, string>
    )[selected?.contentType ?? ''] ?? 'articles';
  const publicUrl = `${(import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '')}/${locale}/${publicSegment}/${selected?.localizedPayloads.find((entry) => entry.locale === locale)?.localizedSlug ?? selected?.slug ?? ''}`;
  const preview = useMemo(
    () => ({
      title: currentEditor.title,
      summary: currentEditor.summary,
      body: currentEditor.body,
    }),
    [currentEditor],
  );

  return (
    <main
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="mx-auto max-w-[1500px] space-y-6 font-sans text-slate-900"
    >
      <header className="overflow-hidden rounded-3xl bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold text-[#F2CD78]">منصة المحتوى المؤسسية</p>
            <h1 className="text-3xl font-black">إدارة المحتوى والنشر</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
              تحرير ثنائي اللغة، وسائط من منصة الأصول، SEO، مراجعة مستقلة، وجدولة ونشر موثوق.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Metric value={list?.total ?? 0} label="إجمالي المحتوى" />
            <Metric
              value={list?.data.filter((x) => x.status === 'PUBLISHED').length ?? 0}
              label="منشور في الصفحة"
            />
            <Metric
              value={list?.data.filter((x) => x.status === 'IN_REVIEW').length ?? 0}
              label="مراجعة في الصفحة"
            />
          </div>
        </div>
      </header>

      <nav
        aria-label="مسار النشر"
        className="grid grid-cols-2 gap-2 rounded-2xl border border-[#DDEFF2] bg-white p-3 shadow-sm sm:grid-cols-4 xl:grid-cols-8"
      >
        {workflow.map((label, index) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-xl bg-[#DDEFF2]/55 px-3 py-2 text-xs font-bold text-[#142B5F]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0E7C86] text-white">
              {index + 1}
            </span>
            {label}
          </div>
        ))}
      </nav>
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        <aside className="space-y-6">
          <Panel title="قائمة المحتوى" icon={<FilePenLine className="h-5 w-5" />}>
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  aria-label="بحث المحتوى"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  className="input pr-9"
                  placeholder="العنوان أو الرابط..."
                />
              </div>
              <select
                aria-label="تصفية الحالة"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="input w-36"
              >
                <option value="">كل الحالات</option>
                {[
                  'DRAFT',
                  'IN_REVIEW',
                  'READY_TO_PUBLISH',
                  'SCHEDULED',
                  'PUBLISHED',
                  'ARCHIVED',
                ].map((x) => (
                  <option key={x} value={x}>
                    {labelOf(x)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <Select
                label="نوع المحتوى"
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'كل الأنواع' },
                  ...contentTypes.map((value) => ({ value, label: labelOf(value) })),
                ]}
              />
              <Select
                label="التصنيف"
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
                options={[
                  { value: '', label: 'كل التصنيفات' },
                  ...categories.map((value) => ({ value: value.slug, label: value.nameAr })),
                ]}
              />
            </div>
            {loading ? (
              <Loading />
            ) : listError ? (
              <Alert tone="error">{listError}</Alert>
            ) : list?.data.length ? (
              <div className="max-h-[430px] space-y-2 overflow-y-auto">
                {list.data.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    disabled={busy}
                    onClick={() => chooseContent(item.id)}
                    className={`w-full rounded-xl border p-3 text-right transition hover:border-[#21A7B4] hover:bg-[#DDEFF2]/55 ${selected?.id === item.id ? 'border-[#0E7C86] bg-[#DDEFF2]/55' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{item.title}</p>
                        <p dir="ltr" className="mt-1 text-right text-xs text-slate-500">
                          /{item.slug}
                        </p>
                      </div>
                      <Status value={item.status} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Empty text="لا يوجد محتوى مطابق." />
            )}
            {list && (
              <div className="mt-4 flex items-center justify-between gap-2 text-sm">
                <button
                  disabled={loading || page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  السابق
                </button>
                <span>
                  {page} / {Math.max(1, list.totalPages)} · {list.total} مادة
                </span>
                <button
                  disabled={loading || page >= list.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  التالي
                </button>
              </div>
            )}
          </Panel>
          <Panel title="إنشاء مسودة" icon={<Plus className="h-5 w-5" />}>
            <form onSubmit={createContent} className="space-y-3">
              <Field
                label="العنوان العربي"
                value={create.title}
                onChange={(v) => setCreate({ ...create, title: v })}
                required
              />
              <Field
                label="الرابط الثابت بالإنجليزية"
                dir="ltr"
                value={create.slug}
                onChange={(v) => setCreate({ ...create, slug: v })}
                required
              />
              <Select
                label="نوع المحتوى"
                value={create.contentType}
                onChange={(v) => setCreate({ ...create, contentType: v })}
                options={contentTypes.map((x) => ({ value: x, label: labelOf(x) }))}
              />
              <Select
                label="التصنيف"
                value={create.categoryId}
                onChange={(v) => setCreate({ ...create, categoryId: v })}
                options={[
                  { value: '', label: 'اختر لاحقًا' },
                  ...categories.map((x) => ({ value: x.id, label: x.nameAr })),
                ]}
              />
              <AssetPicker
                label="الصورة البارزة"
                purpose="CMS_FEATURED_ASSET"
                mimeTypePrefix="image/"
                value={create.featuredAssetId}
                onChange={(featuredAssetId) => setCreate({ ...create, featuredAssetId })}
              />
              <PrimaryButton disabled={busy || !create.title || !create.slug}>
                <Plus className="h-4 w-4" />
                إنشاء المسودة
              </PrimaryButton>
            </form>
          </Panel>
          <TaxonomyPanel
            taxonomy={taxonomy}
            setTaxonomy={setTaxonomy}
            createTaxonomy={createTaxonomy}
            busy={busy}
          />
        </aside>

        <section className="space-y-6">
          {!selected ? (
            <Panel title="محرر المحتوى" icon={<FilePenLine className="h-5 w-5" />}>
              <Empty text="اختر محتوى من القائمة أو أنشئ مسودة جديدة للبدء." />
            </Panel>
          ) : (
            <>
              <div className="rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black">{selected.title}</h2>
                      <Status value={localizedState ?? 'DRAFT'} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {selected.publicId} · إصدار اللغة {currentEditor.version ?? 'غير محفوظة'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Action disabled={busy} onClick={() => chooseContent(selected.id)}>
                      إعادة التحميل
                    </Action>
                    <LocaleButton
                      active={locale === 'ar'}
                      onClick={() => {
                        if (!busy) setLocale('ar');
                      }}
                    >
                      العربية
                    </LocaleButton>
                    <LocaleButton
                      active={locale === 'en'}
                      onClick={() => {
                        if (!busy) setLocale('en');
                      }}
                    >
                      English
                    </LocaleButton>
                  </div>
                </div>
              </div>
              {dirty && (
                <Alert tone="error">
                  توجد تعديلات غير محفوظة{dirtyLocales.ar ? ' · العربية' : ''}
                  {dirtyLocales.en ? ' · الإنجليزية' : ''}
                  {linksDirty ? ' · الروابط' : ''}.
                </Alert>
              )}
              {localizedState === 'PUBLISHED' && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-bold text-[#0E7C86]"
                >
                  عرض المادة المنشورة في الصفحة العامة ↗
                </a>
              )}
              <fieldset disabled={busy || editorLocked}>
                <form onSubmit={saveLocale} className="grid gap-6 2xl:grid-cols-2">
                  <Panel
                    title={`المحرر — ${locale === 'ar' ? 'العربية' : 'English'}`}
                    icon={<FilePenLine className="h-5 w-5" />}
                  >
                    <div className="space-y-4">
                      <Field
                        label="الرابط المحلي"
                        dir="ltr"
                        value={currentEditor.localizedSlug}
                        onChange={(v) => updateEditor({ localizedSlug: v })}
                        required
                      />
                      <Field
                        label="العنوان"
                        value={currentEditor.title}
                        onChange={(v) => updateEditor({ title: v })}
                        required
                      />
                      <TextArea
                        label="الملخص"
                        value={currentEditor.summary}
                        onChange={(v) => updateEditor({ summary: v })}
                        rows={3}
                      />
                      <p className="text-xs text-slate-500">
                        يمكن كتابة نص عادي أو HTML للفقرات والعناوين والقوائم والروابط HTTPS. تُعرض
                        المعاينة والعامة بنفس التنسيق الآمن.
                      </p>
                      <TextArea
                        label="نص المحتوى"
                        value={currentEditor.body}
                        onChange={(v) => updateEditor({ body: v })}
                        rows={15}
                        required
                      />
                      <Field
                        label="مدة القراءة بالدقائق"
                        dir="ltr"
                        value={currentEditor.readingTimeMinutes}
                        onChange={(v) => updateEditor({ readingTimeMinutes: v })}
                      />
                    </div>
                  </Panel>
                  <div className="space-y-6">
                    <Panel title="الوسائط والتصنيف" icon={<Eye className="h-5 w-5" />}>
                      <div className="space-y-4">
                        <AssetPicker
                          label="الصورة البارزة"
                          purpose="CMS_LOCALIZED_FEATURED_ASSET"
                          mimeTypePrefix="image/"
                          value={currentEditor.featuredAssetId}
                          onChange={(featuredAssetId) => updateEditor({ featuredAssetId })}
                        />
                        <div className="space-y-2">
                          <AssetPicker
                            label="إضافة مرفق من مكتبة الأصول"
                            purpose="CMS_ATTACHMENT_ASSET"
                            value=""
                            onChange={(assetId) => {
                              if (!assetId) return;
                              const ids = splitValues(currentEditor.attachmentAssetIds);
                              if (!ids.includes(assetId))
                                updateEditor({ attachmentAssetIds: [...ids, assetId].join(', ') });
                            }}
                          />
                          <TextArea
                            label="المرفقات المختارة"
                            dir="ltr"
                            value={currentEditor.attachmentAssetIds}
                            onChange={(v) => updateEditor({ attachmentAssetIds: v })}
                            rows={2}
                          />
                        </div>
                        <fieldset>
                          <legend className="mb-2 text-sm font-bold">الوسوم</legend>
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <label
                                key={tag.id}
                                className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={currentEditor.tagIds.includes(tag.id)}
                                  onChange={(e) =>
                                    updateEditor({
                                      tagIds: e.target.checked
                                        ? [...currentEditor.tagIds, tag.id]
                                        : currentEditor.tagIds.filter((id) => id !== tag.id),
                                    })
                                  }
                                />
                                {locale === 'ar' ? tag.labelAr : tag.labelEn}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                    </Panel>
                    <DomainLinksPanel
                      links={domainLinks}
                      setLinks={setDomainLinks}
                      busy={busy}
                      onSave={saveDomainLinks}
                    />
                    <Panel title="تهيئة محركات البحث" icon={<Search className="h-5 w-5" />}>
                      <div className="space-y-4">
                        <Field
                          label="عنوان SEO"
                          value={currentEditor.seoTitle}
                          onChange={(v) => updateEditor({ seoTitle: v })}
                          required
                        />
                        <TextArea
                          label="وصف SEO"
                          value={currentEditor.seoDescription}
                          onChange={(v) => updateEditor({ seoDescription: v })}
                          rows={3}
                          required
                        />
                        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                          Canonical URL يُولَّد تلقائيًا من نوع المحتوى واللغة والـslug ولا يمكن
                          للناشر استبداله يدويًا.
                        </p>
                        <Field
                          label="الكلمات المفتاحية"
                          value={currentEditor.keywords}
                          onChange={(v) => updateEditor({ keywords: v })}
                        />
                        <AssetPicker
                          label="صورة Open Graph"
                          purpose="CMS_OPEN_GRAPH_ASSET"
                          mimeTypePrefix="image/"
                          value={currentEditor.openGraphAssetId}
                          onChange={(openGraphAssetId) => updateEditor({ openGraphAssetId })}
                        />
                        <div className="flex gap-5 text-sm">
                          <Check
                            label="منع الفهرسة"
                            checked={currentEditor.noIndex}
                            onChange={(v) => updateEditor({ noIndex: v })}
                          />
                          <Check
                            label="منع تتبع الروابط"
                            checked={currentEditor.noFollow}
                            onChange={(v) => updateEditor({ noFollow: v })}
                          />
                        </div>
                      </div>
                    </Panel>
                  </div>
                  <div className="2xl:col-span-2">
                    <PrimaryButton
                      disabled={
                        busy ||
                        !currentEditor.title ||
                        !currentEditor.body ||
                        !currentEditor.seoTitle ||
                        !currentEditor.seoDescription
                      }
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      حفظ النسخة على الخادم
                    </PrimaryButton>
                  </div>
                </form>
              </fieldset>
              {editorLocked && (
                <p className="text-sm text-amber-800">
                  النسخة مقفلة للمراجعة أو النشر. أعدها للمحرر أو ألغِ الجدولة قبل تحريرها.
                </p>
              )}
              <div className="grid gap-6 2xl:grid-cols-2">
                <Panel title="المعاينة" icon={<Eye className="h-5 w-5" />}>
                  <article className="rounded-2xl border bg-slate-50 p-6">
                    <p className="text-xs font-bold text-[#0E7C86]">معاينة مسودة غير عامة</p>
                    <h3 className="mt-3 text-3xl font-black">{preview.title || 'العنوان'}</h3>
                    {preview.summary && <p className="mt-3 text-slate-600">{preview.summary}</p>}
                    <div className="mt-6 whitespace-pre-wrap leading-8 text-slate-800">
                      <CmsRichText
                        body={preview.body || 'اكتب المحتوى لتظهر المعاينة هنا.'}
                        className="cms-rich-text"
                      />
                    </div>
                  </article>
                </Panel>
                <Panel title="الجاهزية والمراجعة والنشر" icon={<Send className="h-5 w-5" />}>
                  <div className="space-y-4">
                    {readiness ? (
                      <div
                        className={`rounded-xl border p-4 ${readiness.ready ? 'border-[#DDEFF2] bg-[#DDEFF2]/55' : 'border-amber-200 bg-amber-50'}`}
                      >
                        <p className="font-bold">
                          {readiness.ready ? 'جاهز للإرسال للمراجعة' : 'توجد حقول مطلوبة'}
                        </p>
                        {readiness.missing.length > 0 && (
                          <p className="mt-2 text-sm">الناقص: {readiness.missing.join('، ')}</p>
                        )}
                        {readiness.warnings.length > 0 && (
                          <p className="mt-2 text-sm">تنبيهات: {readiness.warnings.join('، ')}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">احفظ هذه اللغة لإظهار فحص الجاهزية.</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Action
                        onClick={() => void runWorkflow('submit-review')}
                        disabled={busy || dirty || !readiness?.ready || localizedState !== 'DRAFT'}
                      >
                        <Send className="h-4 w-4" />
                        إرسال للمراجعة
                      </Action>
                      <Action
                        onClick={() => void runWorkflow('approve')}
                        disabled={busy || dirty || localizedState !== 'IN_REVIEW'}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        اعتماد كناشر
                      </Action>
                      <Action
                        onClick={schedule}
                        disabled={busy || dirty || localizedState !== 'READY_TO_PUBLISH'}
                      >
                        <Clock3 className="h-4 w-4" />
                        جدولة
                      </Action>
                      <Action
                        onClick={() => void runWorkflow('publish')}
                        disabled={busy || dirty || localizedState !== 'READY_TO_PUBLISH'}
                      >
                        <Send className="h-4 w-4" />
                        نشر الآن
                      </Action>
                      <Action
                        onClick={() => void runWorkflow('reject')}
                        disabled={busy || dirty || localizedState !== 'IN_REVIEW'}
                      >
                        إعادة للمحرر
                      </Action>
                      <Action
                        onClick={() => void runWorkflow('archive')}
                        disabled={busy || dirty || localizedState !== 'PUBLISHED'}
                      >
                        <Archive className="h-4 w-4" />
                        أرشفة
                      </Action>
                      {localizedState === 'SCHEDULED' && (
                        <Action disabled={busy || dirty} onClick={() => void cancelSchedule()}>
                          إلغاء الجدولة
                        </Action>
                      )}
                    </div>
                    <p className="text-xs leading-6 text-slate-500">
                      لا يستطيع منشئ النسخة اعتمادها بنفسه. يلزم حساب ناشر آخر، ولا يحدث نشر تلقائي
                      عند الحفظ أو المراجعة.
                    </p>
                    {selected.revisions.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-bold">آخر النسخ</p>
                        {selected.revisions.slice(0, 5).map((revision) => (
                          <div key={revision.id} className="border-t py-2 text-xs">
                            الإصدار {revision.versionNumber} · {revision.reason} ·{' '}
                            {formatDate(revision.capturedAt)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>
              </div>
            </>
          )}
        </section>
      </section>
      <CmsOperationsPanels contents={list?.data ?? []} locale={locale} />
    </main>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-[#142B5F]">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-emerald-100">{label}</p>
    </div>
  );
}
function Alert({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 text-sm font-bold ${tone === 'success' ? 'border-[#DDEFF2] bg-[#DDEFF2]/55 text-[#0E7C86]' : 'border-red-200 bg-red-50 text-red-800'}`}
    >
      {children}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  required,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  dir?: 'ltr';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        dir={dir}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
  rows,
  required,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  required?: boolean;
  dir?: 'ltr';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <textarea
        dir={dir}
        required={required}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="input resize-y leading-7"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
function PrimaryButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0E7C86] px-4 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
function Action({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DDEFF2] bg-white px-3 text-sm font-bold text-[#0E7C86] hover:bg-[#DDEFF2]/55 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
function LocaleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-5 py-2 text-sm font-bold ${active ? 'bg-[#0E7C86] text-white' : 'bg-slate-100 text-slate-600'}`}
    >
      {children}
    </button>
  );
}
function Status({ value }: { value: string }) {
  const color =
    value === 'PUBLISHED'
      ? 'bg-emerald-100 text-[#0E7C86]'
      : value === 'IN_REVIEW' || value === 'READY_TO_PUBLISH'
        ? 'bg-amber-100 text-amber-800'
        : value === 'ARCHIVED'
          ? 'bg-slate-200 text-slate-700'
          : 'bg-blue-100 text-blue-800';
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black ${color}`}>
      {labelOf(value)}
    </span>
  );
}
function Loading() {
  return (
    <div className="grid min-h-40 place-items-center">
      <Loader2 className="h-7 w-7 animate-spin text-[#0E7C86]" />
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
function DomainLinksPanel({
  links,
  setLinks,
  busy,
  onSave,
}: {
  links: DomainLink[];
  setLinks: (value: DomainLink[]) => void;
  busy: boolean;
  onSave: () => Promise<void>;
}) {
  const add = () =>
    setLinks([
      ...links,
      { targetType: 'UNIVERSITY', targetId: '', relationType: 'RELATED', sortOrder: links.length },
    ]);
  return (
    <Panel title="الربط مع أقسام المنصة" icon={<Link2 className="h-5 w-5" />}>
      <p className="mb-4 text-xs leading-6 text-slate-500">
        اربط المادة بالـOwner UUID للكيان Canonical فقط. استخدم معرف السجل الفعلي من لوحة الإدارة.
        لا تستخدم الاسم أو الرابط المختصر، ولا تنسخ بيانات الكيان داخل المادة.
      </p>
      <div className="space-y-3">
        {links.map((link, index) => (
          <div
            key={`${link.targetType}-${index}`}
            className="grid gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/50 p-3 md:grid-cols-[1fr_1.4fr_1fr_auto]"
          >
            <select
              disabled={busy}
              className="input"
              value={link.targetType}
              onChange={(e) =>
                setLinks(
                  links.map((item, i) =>
                    i === index ? { ...item, targetType: e.target.value } : item,
                  ),
                )
              }
            >
              <option value="UNIVERSITY">جامعة</option>
              <option value="ACADEMIC_PROGRAM">برنامج جامعي</option>
              <option value="SCHOLARSHIP">منحة</option>
              <option value="MAJOR">تخصص</option>
              <option value="INTERNATIONAL_TEST">اختبار دولي</option>
              <option value="COURSE">دورة</option>
              <option value="REFERENCE_COUNTRY">دولة / وجهة دراسية</option>
            </select>
            <input
              disabled={busy}
              dir="ltr"
              className="input"
              value={link.targetId}
              onChange={(e) =>
                setLinks(
                  links.map((item, i) =>
                    i === index ? { ...item, targetId: e.target.value } : item,
                  ),
                )
              }
              placeholder="Canonical owner UUID"
            />
            <select
              disabled={busy}
              className="input"
              value={link.relationType}
              onChange={(e) =>
                setLinks(
                  links.map((item, i) =>
                    i === index ? { ...item, relationType: e.target.value } : item,
                  ),
                )
              }
            >
              <option value="RELATED">مرتبط</option>
              <option value="FEATURED">مميز</option>
              <option value="GUIDE">دليل</option>
              <option value="APPLICATION">التقديم</option>
              <option value="REQUIREMENTS">المتطلبات</option>
              <option value="ELIGIBILITY">الأهلية</option>
            </select>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg px-3 text-sm font-bold text-red-600 hover:bg-red-50"
              onClick={() => setLinks(links.filter((_, i) => i !== index))}
            >
              حذف
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={add}
            className="rounded-xl border border-[#0E7C86] px-4 py-2 text-sm font-bold text-[#0E7C86] hover:bg-[#DDEFF2]/50"
          >
            + إضافة رابط
          </button>
          <button
            type="button"
            disabled={busy || links.some((link) => !link.targetId.trim())}
            onClick={() => void onSave()}
            className="rounded-xl bg-[#142B5F] px-4 py-2 text-sm font-bold text-white hover:bg-[#0E7C86] disabled:opacity-50"
          >
            حفظ الروابط
          </button>
        </div>
      </div>
    </Panel>
  );
}

function TaxonomyPanel({
  taxonomy,
  setTaxonomy,
  createTaxonomy,
  busy,
}: {
  taxonomy: TaxonomyState;
  setTaxonomy: (value: TaxonomyState) => void;
  createTaxonomy: (kind: 'category' | 'tag') => Promise<void>;
  busy: boolean;
}) {
  return (
    <Panel title="التصنيفات والوسوم" icon={<FolderTree className="h-5 w-5" />}>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-bold">
            <FolderTree className="h-4 w-4" />
            تصنيف جديد
          </p>
          <Field
            label="الرابط"
            dir="ltr"
            value={taxonomy.categorySlug}
            onChange={(v) => setTaxonomy({ ...taxonomy, categorySlug: v })}
          />
          <Field
            label="الاسم العربي"
            value={taxonomy.categoryAr}
            onChange={(v) => setTaxonomy({ ...taxonomy, categoryAr: v })}
          />
          <Field
            label="الاسم الإنجليزي"
            dir="ltr"
            value={taxonomy.categoryEn}
            onChange={(v) => setTaxonomy({ ...taxonomy, categoryEn: v })}
          />
          <Action disabled={busy} onClick={() => void createTaxonomy('category')}>
            إضافة التصنيف
          </Action>
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Tags className="h-4 w-4" />
            وسم جديد
          </p>
          <Field
            label="القيمة المطبّعة"
            dir="ltr"
            value={taxonomy.tagValue}
            onChange={(v) => setTaxonomy({ ...taxonomy, tagValue: v })}
          />
          <Field
            label="العربي"
            value={taxonomy.tagAr}
            onChange={(v) => setTaxonomy({ ...taxonomy, tagAr: v })}
          />
          <Field
            label="English"
            dir="ltr"
            value={taxonomy.tagEn}
            onChange={(v) => setTaxonomy({ ...taxonomy, tagEn: v })}
          />
          <Action disabled={busy} onClick={() => void createTaxonomy('tag')}>
            إضافة الوسم
          </Action>
        </div>
      </div>
    </Panel>
  );
}

function toEditor(value: Localized | undefined, fallbackSlug: string): EditorState {
  if (!value) return { ...blankEditor(), localizedSlug: fallbackSlug };
  const seo = value.seoMetadata;
  return {
    openGraphTitle: seo?.openGraphTitle ?? '',
    openGraphDescription: seo?.openGraphDescription ?? '',
    localizedSlug: value.localizedSlug,
    title: value.title,
    summary: value.summary ?? '',
    body: value.body,
    readingTimeMinutes: String(value.readingTimeMinutes ?? 5),
    featuredAssetId: value.featuredAssetId ?? '',
    attachmentAssetIds: (value.attachmentAssetIds ?? []).join(', '),
    tagIds: value.tagIds ?? [],
    seoTitle: seo?.title ?? '',
    seoDescription: seo?.description ?? '',
    canonicalUrl: seo?.canonicalUrl ?? '',
    keywords: seo?.keywords?.join(', ') ?? '',
    openGraphAssetId: seo?.openGraphAssetId ?? '',
    noIndex: seo?.noIndex ?? false,
    noFollow: seo?.noFollow ?? false,
    version: value.version,
  };
}
function splitValues(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,،\n]/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
}
function messageOf(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : 'تعذر إكمال العملية.';
  const explanations: Record<string, string> = {
    CMS_VERSION_CONFLICT:
      'تغيرت النسخة لدى مستخدم آخر. أعد تحميل المادة قبل الحفظ؛ تعديلاتك الحالية لم تُحذف.',
    CMS_MAKER_CHECKER_VIOLATION:
      'يلزم ناشر آخر لاعتماد هذه النسخة؛ لا يستطيع محررها اعتمادها بنفسه.',
    CMS_CONTENT_LOCKED_FOR_WORKFLOW:
      'النسخة مقفلة للمراجعة أو الجدولة. أعدها للمسودة عبر الإجراء الرسمي أولًا.',
    CMS_INVALID_LIFECYCLE_TRANSITION: 'هذا الإجراء لا يتوافق مع حالة النسخة الحالية.',
    CMS_REJECTION_REASON_REQUIRED: 'أدخل سبب إعادة المادة للمحرر.',
    CMS_UNSAFE_RICH_TEXT:
      'يتضمن النص تنسيق HTML غير مسموح. استخدم العناوين والفقرات والقوائم والروابط الآمنة.',
  };
  const code = Object.keys(explanations).find((key) => message.includes(key));
  return code ? explanations[code] : message;
}
function labelOf(value: string): string {
  return (
    (
      {
        ARTICLE: 'مقال',
        NEWS: 'خبر',
        STUDY_GUIDE: 'دليل دراسي',
        CHECKLIST: 'قائمة تجهيز',
        FAQ: 'أسئلة شائعة',
        STATIC_PAGE: 'صفحة ثابتة',
        LANDING_PAGE: 'صفحة هبوط',
        DRAFT: 'مسودة',
        IN_REVIEW: 'قيد المراجعة',
        READY_TO_PUBLISH: 'جاهز للنشر',
        SCHEDULED: 'مجدول',
        PUBLISHED: 'منشور',
        ARCHIVED: 'مؤرشف',
      } as Record<string, string>
    )[value] ?? value.replaceAll('_', ' ')
  );
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
