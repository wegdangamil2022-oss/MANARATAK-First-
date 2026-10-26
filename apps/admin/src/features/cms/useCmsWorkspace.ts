import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { reviewOwnerSearch } from '../review-queue/ReviewOwnerNavigation';
import { useAdministrationDraftGuard } from '../reference-data/useAdministrationDraftGuard';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useCmsCopy } from './cmsCopy';
import { useCmsActionDialog } from './CmsActionDialog';
import {
  Locale,
  Content,
  Detail,
  Category,
  Tag,
  ListResponse,
  EditorState,
  DomainLink,
  blankEditor,
  toEditor,
  splitValues,
  messageOf,
  labelOf,
} from './cmsModels';
export function safeListSearch(value: string | null) {
  const query = new URLSearchParams(value ?? ''),
    clean = new URLSearchParams();
  for (const key of ['q', 'page', 'status', 'type', 'category']) {
    const entry = query.get(key);
    if (entry) clean.set(key, entry);
  }
  if (!clean.has('q') && reviewOwnerSearch(query)) clean.set('q', reviewOwnerSearch(query));
  return clean.toString();
}
export function useCmsWorkspace() {
  const tr = useCmsCopy();
  const { language: uiLanguage } = useTranslation();
  const [reviewParams, setParams] = useSearchParams();
  const location = useLocation(),
    navigate = useNavigate();
  const route = location.pathname.replace(/^\/cms\/?/, '');
  const contentId = route.startsWith('content/') && route !== 'content/new' ? route.slice(8) : null;
  const screen =
    route === 'taxonomy'
      ? 'taxonomy'
      : route === 'content/new'
        ? 'create'
        : contentId
          ? 'detail'
          : 'list';
  const sections = ['content', 'media', 'links', 'seo', 'preview', 'history'];
  const section = sections.includes(reviewParams.get('section') ?? '')
    ? reviewParams.get('section')!
    : 'content';
  const { requestAction, actionDialog } = useCmsActionDialog();
  const [editing, setEditing] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const detailSequence = useRef(0);
  const listSearch =
    screen === 'list'
      ? safeListSearch(reviewParams.toString())
      : safeListSearch(reviewParams.get('return'));
  const listUrl = '/cms/content' + (listSearch ? '?' + listSearch : '');
  const go = (path: string) => {
    if (busy || mutationLock.current) return;
    if (dirty && !window.confirm(tr('توجد تعديلات غير محفوظة. هل تريد تجاهلها وفتح المادة؟')))
      return;
    navigate(path);
  };
  const changeParam = useCallback(
    (key: string, value: string, resetPage = false) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value) next.set(key, value);
          else next.delete(key);
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const { hasPermission } = useAdminAuthorization();
  const canAuthor = hasPermission('admin:cms:author');
  const canReview = hasPermission('admin:cms:review');
  const canPublish = hasPermission('admin:cms:publish');
  const [list, setList] = useState<ListResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const locale: Locale = reviewParams.get('locale') === 'en' ? 'en' : 'ar';
  const setLocale = (value: Locale) => {
    if (busy) return;
    if (dirty && !window.confirm(tr('توجد تعديلات غير محفوظة. هل تريد تجاهلها وفتح المادة؟')))
      return;
    changeParam('locale', value);
  };
  const [editors, setEditors] = useState<Record<Locale, EditorState>>({
    ar: blankEditor(),
    en: blankEditor(),
  });
  const page = Math.min(500, Math.max(1, Math.floor(Number(reviewParams.get('page'))) || 1));
  const setPage = useCallback(
    (value: number | ((value: number) => number)) =>
      changeParam('page', String(typeof value === 'function' ? value(page) : value)),
    [page, changeParam],
  );
  const typeFilter = reviewParams.get('type') ?? '';
  const setTypeFilter = (value: string) => changeParam('type', value, true);
  const categoryFilter = reviewParams.get('category') ?? '';
  const setCategoryFilter = (value: string) => changeParam('category', value, true);
  const listSequence = useRef(0);
  const mutationLock = useRef(false);
  const baseline = useRef<Record<Locale, EditorState>>({ ar: blankEditor(), en: blankEditor() });
  const linksBaseline = useRef('[]');
  const query = reviewParams.get('q') ?? reviewOwnerSearch(reviewParams);
  const setQuery = (value: string) => changeParam('q', value, true);
  const status = reviewParams.get('status') ?? '';
  const setStatus = (value: string) => changeParam('status', value, true);
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
  const [categoryId, setCategoryId] = useState('');
  const [taxonomy, setTaxonomy] = useState({
    categorySlug: '',
    categoryAr: '',
    categoryEn: '',
    tagValue: '',
    tagAr: '',
    tagEn: '',
  });

  const loadDashboard = useCallback(async () => {
    if (screen !== 'list') return;
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
      const contentResult = await adminApiClient.request<ListResponse>(
        `/admin/cms/content?${params}`,
      );
      if (sequence !== listSequence.current) return;
      if (page > Math.max(1, contentResult.totalPages)) {
        setPage(Math.max(1, contentResult.totalPages));
        return;
      }
      setList(contentResult);
    } catch (reason) {
      if (sequence === listSequence.current) {
        setListError(messageOf(reason, uiLanguage));
        setList(null);
      }
    } finally {
      if (sequence === listSequence.current) setLoading(false);
    }
  }, [query, status, page, typeFilter, categoryFilter, uiLanguage, screen, setPage]);

  useEffect(() => {
    const requests = listSequence;
    if (screen === 'list') void loadDashboard();
    return () => {
      requests.current++;
    };
  }, [loadDashboard, screen]);
  const loadCatalogs = useCallback(async () => {
    setCatalogError(null);
    const results = await Promise.allSettled([
      adminApiClient.request<{ data: Category[] }>('/admin/cms/categories'),
      adminApiClient.request<{ data: Tag[] }>('/admin/cms/tags'),
    ]);
    if (results[0].status === 'fulfilled') setCategories(results[0].value.data);
    if (results[1].status === 'fulfilled') setTags(results[1].value.data);
    if (results.some((result) => result.status === 'rejected'))
      setCatalogError(
        tr('تعذر تحميل بعض التصنيفات أو الوسوم. قائمة المحتوى متاحة؛ أعد التحميل قبل استخدامها.'),
      );
  }, [tr]);
  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  const dirtyLocales = {
    ar: JSON.stringify(editors.ar) !== JSON.stringify(baseline.current.ar),
    en: JSON.stringify(editors.en) !== JSON.stringify(baseline.current.en),
  };
  const linksDirty = JSON.stringify(domainLinks) !== linksBaseline.current;
  const dirty =
    Boolean(
      selected &&
      (dirtyLocales.ar ||
        dirtyLocales.en ||
        linksDirty ||
        categoryId !== (selected.categoryId ?? '')),
    ) ||
    (screen === 'create' &&
      Boolean(create.title || create.slug || create.categoryId || create.featuredAssetId)) ||
    (screen === 'taxonomy' && Object.values(taxonomy).some(Boolean));
  useAdministrationDraftGuard(dirty || busy, uiLanguage === 'ar');
  const openContent = async (
    id: string,
    preservedLocale?: Locale,
    savedRoot?: 'links' | 'classification',
  ) => {
    const sequence = ++detailSequence.current;
    setBusy(true);
    setError(null);
    try {
      const detail = await adminApiClient.request<Detail>(`/admin/cms/content/${id}`);
      if (sequence !== detailSequence.current) return;
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
      if (!detail.localizedPayloads.some((entry) => entry.locale === detail.primaryLocale))
        next[detail.primaryLocale].title = detail.title;
      const keep = (language: Locale) =>
        selected?.id === id &&
        (Boolean(savedRoot) || preservedLocale === language) &&
        dirtyLocales[language];
      const preserveRelated = selected?.id === id && Boolean(savedRoot || preservedLocale);
      const keepCategory =
        preserveRelated &&
        savedRoot !== 'classification' &&
        categoryId !== (selected?.categoryId ?? '');
      const keepLinks = preserveRelated && savedRoot !== 'links' && linksDirty;
      baseline.current = next;
      setSelected(detail);
      if (!keepCategory) setCategoryId(detail.categoryId ?? '');
      if (!keepLinks) {
        setDomainLinks(detail.domainLinks ?? []);
        linksBaseline.current = JSON.stringify(detail.domainLinks ?? []);
      }
      setEditors((previous) => ({
        ar: keep('ar') ? previous.ar : next.ar,
        en: keep('en') ? previous.en : next.en,
      }));
    } catch (reason) {
      if (sequence === detailSequence.current) setError(messageOf(reason, uiLanguage));
    } finally {
      if (sequence === detailSequence.current) setBusy(false);
    }
  };
  const chooseContent = (id: string) =>
    go('/cms/content/' + encodeURIComponent(id) + '?return=' + encodeURIComponent(listSearch));
  const openLatest = useRef(openContent);
  openLatest.current = openContent;
  useEffect(() => {
    const requests = detailSequence;
    setSelected(null);
    setEditing(false);
    if (contentId) void openLatest.current(contentId);
    return () => {
      requests.current++;
    };
  }, [contentId]);
  const createContent = async (event: FormEvent) => {
    event.preventDefault();
    if (mutationLock.current || !canAuthor) return;
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
        tr('تم إنشاء المسودة. أكمل اللغة المطلوبة واربطها بالكيانات ذات الصلة ثم أرسلها للمراجعة.'),
      );
      navigate(
        '/cms/content/' +
          encodeURIComponent(created.id) +
          '?return=' +
          encodeURIComponent(listSearch),
      );
      setEditing(true);
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
      setBusy(false);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const changeSlug = async () => {
    if (!selected || dirty || busy || mutationLock.current || !canAuthor) return;
    const current = selected.localizedPayloads.find((item) => item.locale === locale);
    if (!current) return;
    const answer = await requestAction({
      title: tr('تغيير الرابط بمراجعة جديدة'),
      description: current.title + ' · ' + locale,
      fields: [
        { name: 'slug', label: tr('الرابط المحلي'), value: current.localizedSlug },
        { name: 'reason', label: tr('سبب التعديل'), minLength: 3 },
      ],
    });
    if (!answer) return;
    const newSlug = answer.slug.trim(),
      reason = answer.reason.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSlug)) {
      setError(tr('الرابط يجب أن يستخدم حروفًا لاتينية صغيرة وأرقامًا وشرطات.'));
      return;
    }
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    try {
      await adminApiClient.request(`/admin/cms/content/${selected.id}/change-slug`, {
        method: 'POST',
        body: JSON.stringify({ locale, expectedVersion: current.version, newSlug, reason }),
      });
      await openContent(selected.id, locale === 'ar' ? 'en' : 'ar');
      setNotice(
        uiLanguage === 'ar'
          ? 'حُفظ الرابط في المسودة؛ النسخة العامة مستمرة حتى النشر الجديد.'
          : 'Draft slug saved; the current publication remains available until republishing.',
      );
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
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
    if (!selected || mutationLock.current || !canAuthor) return;
    if (
      !currentEditor.title.trim() ||
      !currentEditor.body.trim() ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(currentEditor.localizedSlug)
    ) {
      setError(tr('تحقق من العنوان والنص والرابط المحلي.'));
      return;
    }
    if (Boolean(currentEditor.seoTitle.trim()) !== Boolean(currentEditor.seoDescription.trim())) {
      setError(tr('أكمل عنوان SEO ووصفه معًا أو اتركهما فارغين.'));
      return;
    }
    const minutes = Number(currentEditor.readingTimeMinutes);
    if (currentEditor.readingTimeMinutes.trim() && (!Number.isInteger(minutes) || minutes <= 0)) {
      setError(tr('وقت القراءة يجب أن يكون عدد دقائق صحيحًا موجبًا.'));
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
          metadata:
            selected.localizedPayloads.find((entry) => entry.locale === locale)?.metadata ?? null,
          seoMetadata:
            currentEditor.seoTitle.trim() && currentEditor.seoDescription.trim()
              ? {
                  title: currentEditor.seoTitle.trim(),
                  description: currentEditor.seoDescription.trim(),
                  keywords: splitValues(currentEditor.keywords),
                  noIndex: currentEditor.noIndex,
                  noFollow: currentEditor.noFollow,
                  openGraphTitle: currentEditor.openGraphTitle.trim() || null,
                  openGraphDescription: currentEditor.openGraphDescription.trim() || null,
                  openGraphAssetId: currentEditor.openGraphAssetId.trim() || null,
                }
              : null,
        }),
      });
      setNotice(
        uiLanguage === 'ar'
          ? `حُفظت النسخة ${locale === 'ar' ? 'العربية' : 'الإنجليزية'}.`
          : `Saved the ${locale === 'ar' ? 'Arabic' : 'English'} version.`,
      );
      await openContent(selected.id, locale === 'ar' ? 'en' : 'ar');
      await loadDashboard();
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
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
    if (
      (action === 'submit-review' && !canAuthor) ||
      (['approve', 'reject'].includes(action) && !canReview) ||
      (['publish', 'archive'].includes(action) && !canPublish)
    )
      return;
    if (dirty) {
      setError(tr('احفظ تعديلات المحتوى والروابط قبل تغيير حالة النشر.'));
      return;
    }
    let comments: string | null = null;
    if (['publish', 'archive', 'reject'].includes(action)) {
      const answer = await requestAction({
        title: labelOf(
          action === 'publish' ? 'PUBLISHED' : action === 'archive' ? 'ARCHIVED' : 'IN_REVIEW',
          uiLanguage,
        ),
        description: currentEditor.title + ' · ' + locale,
        fields:
          action === 'reject'
            ? [{ name: 'reason', label: tr('سبب الرفض (إلزامي):'), minLength: 3 }]
            : [],
      });
      if (!answer) return;
      comments = answer.reason?.trim() ?? null;
    }
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
          ? tr('أُرسلت النسخة للمراجعة.')
          : action === 'approve'
            ? tr('اعتمدها الناشر وأصبحت جاهزة للنشر.')
            : action === 'publish'
              ? tr('نُشرت النسخة بنجاح.')
              : action === 'archive'
                ? tr('أُرشفت النسخة.')
                : tr('أُعيدت للمحرر مع سبب الرفض.'),
      );
      await Promise.all([openContent(selected.id), loadDashboard()]);
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
      setBusy(false);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const schedule = async () => {
    if (!selected || mutationLock.current) return;
    if (dirty) {
      setError(tr('احفظ التعديلات قبل جدولة النشر.'));
      return;
    }
    const answer = await requestAction({
      title: tr('جدولة'),
      description:
        currentEditor.title +
        ' · ' +
        locale +
        ' · ' +
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      fields: [
        { name: 'scheduledAt', label: tr('موعد النشر بالتوقيت المحلي'), type: 'datetime-local' },
      ],
    });
    if (!answer) return;
    const value = answer.scheduledAt;
    if (!Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()) {
      setError(tr('اختر موعد نشر صالحًا في المستقبل.'));
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
          scheduledAt: new Date(value).toISOString(),
        }),
      });
      setNotice(tr('تمت الجدولة دون نشر تلقائي من الواجهة؛ عامل الجدولة ينفذها في بيئة التشغيل.'));
      await Promise.all([openContent(selected.id), loadDashboard()]);
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
      setBusy(false);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const cancelSchedule = async () => {
    if (!selected || mutationLock.current || dirty || !canPublish) return;
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    try {
      await adminApiClient.request(`/admin/cms/content/${selected.id}/cancel-schedule`, {
        method: 'POST',
        body: JSON.stringify({ locale, expectedVersion: currentEditor.version }),
      });
      await Promise.all([openContent(selected.id), loadDashboard()]);
      setNotice(tr('أُلغيت الجدولة وأُعيدت النسخة إلى المسودة.'));
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const saveDomainLinks = async () => {
    if (!selected || mutationLock.current || !canAuthor) return;
    const keys = domainLinks.map((link) =>
      [link.targetType, link.targetId, link.relationType].join(':'),
    );
    if (
      domainLinks.length > 50 ||
      new Set(keys).size !== keys.length ||
      domainLinks.some(
        (link) =>
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(link.targetId),
      )
    ) {
      setError(tr('اختر علاقات صحيحة دون تكرار وبحد أقصى 50 علاقة.'));
      return;
    }
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApiClient.request(`/admin/cms/content/${selected.id}/domain-links`, {
        method: 'PUT',
        body: JSON.stringify({
          expectedVersion: selected.version,
          links: domainLinks.map((link, index) => ({ ...link, sortOrder: index })),
        }),
      });
      setNotice(tr('تم حفظ روابط المحتوى مع أقسام المنصة باستخدام المعرّفات Canonical.'));
      await openContent(selected.id, undefined, 'links');
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const saveClassification = async () => {
    if (!selected || mutationLock.current || !canAuthor || catalogError) return;
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApiClient.request('/admin/cms/content/' + selected.id, {
        method: 'PATCH',
        body: JSON.stringify({ expectedVersion: selected.version, categoryId: categoryId || null }),
      });
      await openContent(selected.id, undefined, 'classification');
      setNotice(
        uiLanguage === 'ar'
          ? 'حُفظ تصنيف المادة بصورة مستقلة عن نسخة اللغة.'
          : 'Content classification saved separately from the locale draft.',
      );
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };
  const createTaxonomy = async (kind: 'category' | 'tag') => {
    if (mutationLock.current || !canAuthor) return;
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
      setNotice(kind === 'category' ? tr('تم إنشاء التصنيف.') : tr('تم إنشاء الوسم.'));
      setTaxonomy((previous) =>
        kind === 'category'
          ? { ...previous, categorySlug: '', categoryAr: '', categoryEn: '' }
          : { ...previous, tagValue: '', tagAr: '', tagEn: '' },
      );
      await loadCatalogs();
    } catch (reason) {
      setError(messageOf(reason, uiLanguage));
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

  return {
    tr,
    uiLanguage,
    canAuthor,
    canReview,
    canPublish,
    list,
    listError,
    categories,
    tags,
    selected,
    locale,
    setLocale,
    editors,
    setEditors,
    page,
    setPage,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    query,
    setQuery,
    status,
    setStatus,
    loading,
    busy,
    notice,
    error,
    create,
    setCreate,
    domainLinks,
    setDomainLinks,
    taxonomy,
    setTaxonomy,
    loadDashboard,
    dirtyLocales,
    linksDirty,
    dirty,
    openContent,
    chooseContent,
    createContent,
    changeSlug,
    currentEditor,
    updateEditor,
    saveLocale,
    runWorkflow,
    schedule,
    cancelSchedule,
    saveDomainLinks,
    createTaxonomy,
    categoryId,
    setCategoryId,
    saveClassification,
    readiness,
    localizedState,
    editorLocked,
    publicUrl,
    preview,
    contentId,
    screen,
    section,
    changeParam,
    listUrl,
    go,
    editing,
    setEditing,
    catalogError,
    loadCatalogs,
    actionDialog,
  };
}
export type CmsWorkspace = ReturnType<typeof useCmsWorkspace>;
