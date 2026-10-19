import { CmsBlockEditor, EditableBlockSchema, EditableBlock } from './CmsBlockEditor';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useTranslation } from '../../i18n/I18nProvider';
import { adminApiClient } from '../../api/client';
import { useCmsCopy } from './cmsCopy';

interface ContentSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  scheduledAt?: string | null;
  localizedStates?: Array<{ locale: string; state: string; scheduledAt: string | null }>;
}
interface FailedSchedule {
  id: string;
  contentId: string;
  locale: string;
  attemptCount: number;
  failureCode: string | null;
  scheduledAt: string;
}
interface Redirect {
  id: string;
  sourcePath: string;
  destinationPath: string;
  statusCode: number;
  active: boolean;
  version?: number;
  contentId?: string | null;
  reason: string;
  updatedBy?: string | null;
  createdBy: string;
}
interface NavigationNode {
  id: string;
  parentNodeId?: string | null;
  displayText: string;
  targetType: 'CMS_CONTENT' | 'EXTERNAL_URL' | 'DOMAIN_REFERENCE';
  targetValue: string;
  sortOrder: number;
  openInNewWindow: boolean;
  metadata?: Record<string, unknown> | null;
}
interface NavigationMenu {
  id: string;
  locationKey: 'HEADER' | 'FOOTER' | 'SIDEBAR' | 'OTHER';
  status: string;
  version: number;
  nodes: NavigationNode[];
}
interface BlockSchema extends EditableBlockSchema {
  id: string;
  key: string;
  version: number;
  nameAr: string;
  nameEn?: string;
  status: string;
}
interface ContentBlock extends EditableBlock {
  id: string;
  name: string;
  status: string;
  version: number;
}
interface Announcement {
  hasPublicSnapshot?: boolean;
  id: string;
  title: string;
  urgency: string;
  status: string;
  startsAt: string;
  expiresAt?: string | null;
  version: number;
}
interface List<T> {
  data: T[];
}
type Locale = 'ar' | 'en';
type Panel = 'redirects' | 'navigation' | 'schemas' | 'blocks' | 'announcements';
const panels: Panel[] = ['redirects', 'navigation', 'schemas', 'blocks', 'announcements'];

const input =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#21A7B4] focus:ring-2 focus:ring-[#DDEFF2]';
const button =
  'rounded-xl bg-[#142B5F] px-4 py-2 text-sm font-bold text-white hover:bg-[#0E7C86] disabled:opacity-50';

export function CmsOperationsPanels({
  contents,
  locale,
}: {
  contents: ContentSummary[];
  locale: Locale;
}) {
  const tr = useCmsCopy();
  const { language: uiLanguage } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const canPublish = hasPermission('admin:cms:publish');
  const sequence = useRef<Record<Panel, number>>({
    redirects: 0,
    navigation: 0,
    schemas: 0,
    blocks: 0,
    announcements: 0,
  });
  const failedSequence = useRef(0);
  const [panelState, setPanelState] = useState<
    Partial<Record<Panel, 'loading' | 'ready' | 'error'>>
  >({});
  const mutation = useRef(false);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [failedSchedules, setFailedSchedules] = useState<FailedSchedule[]>([]);
  const [navigation, setNavigation] = useState<NavigationMenu[]>([]);
  const [schemas, setSchemas] = useState<BlockSchema[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [redirectSearch, setRedirectSearch] = useState('');
  const [redirectStatus, setRedirectStatus] = useState('all');
  const [redirectPage, setRedirectPage] = useState(1);
  const [redirectTotal, setRedirectTotal] = useState(0);
  const [redirectTotalPages, setRedirectTotalPages] = useState(1);

  const load = useCallback(
    async (only?: Panel) => {
      const suffix = `siteIdentifier=absheer&locale=${locale}`;
      const query = new URLSearchParams({
        siteIdentifier: 'absheer',
        locale,
        page: String(redirectPage),
        pageSize: '20',
      });
      if (redirectSearch.trim()) query.set('q', redirectSearch.trim());
      if (redirectStatus !== 'all') query.set('active', redirectStatus);
      const urls: Record<Panel, string> = {
        redirects: `/admin/cms/redirects?${query}`,
        navigation: `/admin/cms/navigation?${suffix}`,
        schemas: '/admin/cms/block-schemas',
        blocks: `/admin/cms/blocks?${suffix}`,
        announcements: `/admin/cms/announcements?${suffix}`,
      };
      const clear = (panel: Panel) => {
        if (panel === 'redirects') {
          setRedirects([]);
          setRedirectTotalPages(1);
          setRedirectTotal(0);
        }
        if (panel === 'navigation') setNavigation([]);
        if (panel === 'schemas') setSchemas([]);
        if (panel === 'blocks') setBlocks([]);
        if (panel === 'announcements') setAnnouncements([]);
      };
      await Promise.allSettled(
        (only ? [only] : panels).map(async (panel) => {
          const current = ++sequence.current[panel];
          clear(panel);
          setPanelState((previous) => ({ ...previous, [panel]: 'loading' }));
          try {
            const result = await adminApiClient.request<
              List<unknown> & { totalPages?: number; total?: number }
            >(urls[panel]);
            if (current !== sequence.current[panel]) return;
            if (panel === 'redirects') {
              setRedirects(result.data as Redirect[]);
              setRedirectTotal(result.total ?? 0);
              setRedirectTotalPages(Math.max(1, result.totalPages ?? 1));
            }
            if (panel === 'navigation') setNavigation(result.data as NavigationMenu[]);
            if (panel === 'schemas') setSchemas(result.data as BlockSchema[]);
            if (panel === 'blocks') setBlocks(result.data as ContentBlock[]);
            if (panel === 'announcements') setAnnouncements(result.data as Announcement[]);
            setPanelState((previous) => ({ ...previous, [panel]: 'ready' }));
          } catch {
            if (current === sequence.current[panel]) {
              clear(panel);
              setPanelState((previous) => ({ ...previous, [panel]: 'error' }));
            }
          }
        }),
      );
    },
    [locale, redirectPage, redirectSearch, redirectStatus],
  );

  const invalidateRequests = useCallback(() => {
    for (const panel of panels) sequence.current[panel]++;
    failedSequence.current++;
  }, []);
  useEffect(() => {
    failedSequence.current++;
    setFailedSchedules([]);
    void load();
    return invalidateRequests;
  }, [load, invalidateRequests]);
  const panelFeedback = (panel: Panel) => (
    <div className="mb-3 text-xs">
      {panelState[panel] === 'loading' && (
        <p role="status">{uiLanguage === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}</p>
      )}
      {panelState[panel] === 'error' && (
        <p role="alert">
          {uiLanguage === 'ar'
            ? 'تعذر تحميل هذه اللوحة؛ أعد المحاولة.'
            : 'Could not load this panel. Retry.'}
        </p>
      )}
      {panelState[panel] === 'ready' && (
        <p>{uiLanguage === 'ar' ? 'تم تحميل أحدث البيانات.' : 'Latest data loaded.'}</p>
      )}
      <button
        type="button"
        className={button}
        disabled={panelState[panel] === 'loading' || busy}
        onClick={() => void load(panel)}
      >
        {uiLanguage === 'ar' ? 'تحديث هذه اللوحة' : 'Refresh this panel'}
      </button>
    </div>
  );

  const submit = async (operation: () => Promise<unknown>, success: string) => {
    if (mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await operation();
      setNotice(success);
      await load();
    } catch {
      setError(
        tr('تعذر إكمال العملية.') +
          (uiLanguage === 'ar'
            ? ' حدّث اللوحة وتحقق من الصلاحيات أو تعارض الإصدار.'
            : ' Refresh and check permissions or a version conflict.'),
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };

  const loadFailedSchedules = async () => {
    if (!hasPermission('admin:cms:operations:run')) return;
    const current = ++failedSequence.current;
    setError(null);
    try {
      const params = new URLSearchParams({ siteIdentifier: 'absheer', locale, limit: '50' });
      const result = await adminApiClient.request<List<FailedSchedule>>(
        '/admin/cms/operations/failed-schedules?' + params,
      );
      if (current === failedSequence.current) setFailedSchedules(result.data);
    } catch {
      if (current === failedSequence.current) {
        setFailedSchedules([]);
        setError(tr('تعذر تحميل عمليات المحتوى.'));
      }
    }
  };

  const retryFailedSchedule = (job: FailedSchedule, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim();
    if (
      reason.length < 3 ||
      !window.confirm(
        uiLanguage === 'ar'
          ? tr('إعادة محاولة المهمة بعد إعادة فحص الموافقة؟')
          : 'Retry after rechecking editorial approval?',
      )
    )
      return;
    void submit(
      async () => {
        await adminApiClient.request(
          '/admin/cms/operations/failed-schedules/' + encodeURIComponent(job.id) + '/retry',
          {
            method: 'POST',
            body: JSON.stringify({ expectedAttemptCount: job.attemptCount, reason }),
          },
        );
        await loadFailedSchedules();
      },
      uiLanguage === 'ar'
        ? tr('أُعيدت المهمة لطابور النشر دون تجاوز الموافقة.')
        : 'Job queued for a governed retry.',
    );
  };

  const createRedirect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(
      () =>
        adminApiClient.request('/admin/cms/redirects', {
          method: 'POST',
          body: JSON.stringify({
            siteIdentifier: 'absheer',
            locale,
            sourcePath: form.get('sourcePath'),
            destinationPath: form.get('destinationPath'),
            statusCode: 301,
            reason: form.get('reason'),
            active: true,
          }),
        }),
      tr('تم حفظ التحويل الدائم.'),
    );
  };
  const updateRedirect = (item: Redirect, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item.version || item.contentId) return;
    const form = new FormData(event.currentTarget);
    const destinationPath = String(form.get('destinationPath') || '').trim();
    const reason = String(form.get('reason') || '').trim();
    if (
      !reason ||
      !destinationPath ||
      !window.confirm(
        uiLanguage === 'ar' ? tr('هل تؤكد تحديث التحويل ونشر أثره؟') : 'Confirm redirect update?',
      )
    )
      return;
    void submit(
      () =>
        adminApiClient.request('/admin/cms/redirects/' + encodeURIComponent(item.id), {
          method: 'PATCH',
          body: JSON.stringify({
            expectedVersion: item.version,
            destinationPath,
            reason,
            active: form.get('active') === 'true',
          }),
        }),
      uiLanguage === 'ar' ? tr('تم تحديث التحويل.') : 'Redirect updated.',
    );
  };
  const saveNavigation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const locationKey = String(form.get('locationKey')) as NavigationMenu['locationKey'];
    const existing = navigation.find((menu) => menu.locationKey === locationKey);
    const preservedNodes = (existing?.nodes ?? []).map((node, index) => ({
      id: node.id,
      parentNodeId: node.parentNodeId ?? null,
      displayText: node.displayText,
      targetType: node.targetType,
      targetValue: node.targetValue,
      sortOrder: node.sortOrder ?? index,
      openInNewWindow: node.openInNewWindow ?? false,
      metadata: node.metadata ?? null,
    }));
    const newNode = {
      displayText: String(form.get('displayText')),
      targetType: String(form.get('targetType')) as NavigationNode['targetType'],
      targetValue: String(form.get('targetValue')),
      sortOrder: preservedNodes.length,
      openInNewWindow: false,
    };
    void submit(
      () =>
        adminApiClient.request('/admin/cms/navigation', {
          method: 'PUT',
          body: JSON.stringify({
            id: existing?.id,
            expectedVersion: existing?.version,
            siteIdentifier: 'absheer',
            locale,
            locationKey,
            nodes: [...preservedNodes, newNode],
          }),
        }),
      tr('تمت إضافة الرابط إلى قائمة التنقل مع الحفاظ على الروابط الموجودة.'),
    );
  };
  const createAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(
      () =>
        adminApiClient.request('/admin/cms/announcements', {
          method: 'PUT',
          body: JSON.stringify({
            siteIdentifier: 'absheer',
            locale,
            title: form.get('title'),
            body: form.get('body'),
            urgency: form.get('urgency'),
            startsAt: new Date(String(form.get('startsAt'))).toISOString(),
            expiresAt: form.get('expiresAt')
              ? new Date(String(form.get('expiresAt'))).toISOString()
              : null,
            audience: 'PUBLIC',
          }),
        }),
      tr('تم حفظ الإعلان كمسودة؛ النشر يحتاج اعتمادًا منفصلًا.'),
    );
  };

  const localizedContents = contents.flatMap((item) => {
    const state = item.localizedStates?.find((entry) => entry.locale === locale);
    return state ? [{ ...item, status: state.state, scheduledAt: state.scheduledAt }] : [];
  });
  const reviewQueue = localizedContents.filter((item) =>
    ['IN_REVIEW', 'READY_TO_PUBLISH'].includes(item.status),
  );
  const calendar = localizedContents.filter((item) => item.status === 'SCHEDULED');

  return (
    <section aria-labelledby="cms-operations" className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white">
        <p className="text-xs font-bold text-[#F2CD78]">SITE EXPERIENCE</p>
        <h2 id="cms-operations" className="mt-1 text-2xl font-black">
          {tr('عمليات الموقع والنشر')}{' '}
        </h2>
        <p className="mt-2 text-sm text-white/80">
          {tr(
            'وظائف تشغيلية مستقلة عن المقالات: المراجعة، الجدولة، التنقل، التحويلات، الكتل والإعلانات.',
          )}{' '}
        </p>
      </div>
      {notice && (
        <p role="status" className="rounded-xl bg-[#DDEFF2] p-3 text-sm font-bold text-[#0E7C86]">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title={tr('مراجعة مواد الصفحة الحالية')}>
          <Items
            empty={tr('لا توجد مواد CMS بانتظار المراجعة.')}
            items={reviewQueue.map((x) => `${x.title} — ${x.status}`)}
          />
        </Card>
        <Card title={tr('جدولة مواد الصفحة الحالية')}>
          <Items
            empty={tr('لا توجد مواد مجدولة.')}
            items={calendar.map(
              (x) =>
                `${x.title} — ${x.scheduledAt ? new Date(x.scheduledAt).toLocaleString(uiLanguage === 'ar' ? 'ar' : 'en') : tr('الموعد غير متاح')}`,
            )}
          />
        </Card>
        <Card title={tr('التحويلات الدائمة')}>
          {panelFeedback('redirects')}
          <fieldset
            disabled={busy || !hasPermission('admin:cms:redirects:manage')}
            aria-label={uiLanguage === 'ar' ? 'إجراءات اللوحة' : 'Panel actions'}
          >
            <form onSubmit={createRedirect} className="space-y-2">
              <input
                className={input}
                name="sourcePath"
                dir="ltr"
                required
                placeholder={`/${locale}/old-path`}
              />
              <input
                className={input}
                name="destinationPath"
                dir="ltr"
                required
                placeholder={`/${locale}/new-path`}
              />
              <input
                className={input}
                name="reason"
                required
                minLength={3}
                placeholder={tr('سبب التحويل')}
              />
              <button className={button} disabled={busy}>
                {tr('حفظ التحويل')}{' '}
              </button>
            </form>
          </fieldset>
          <label className="block text-xs">
            {uiLanguage === 'ar' ? tr('بحث في التحويلات') : 'Search redirects'}
            <input
              className={input}
              maxLength={200}
              value={redirectSearch}
              onChange={(event) => {
                setRedirectPage(1);
                setRedirectSearch(event.target.value);
              }}
            />
            <select
              className={input}
              aria-label={uiLanguage === 'ar' ? tr('حالة التحويل') : 'Redirect status'}
              value={redirectStatus}
              onChange={(event) => {
                setRedirectPage(1);
                setRedirectStatus(event.target.value);
              }}
            >
              <option value="all">{uiLanguage === 'ar' ? tr('كل الحالات') : 'All statuses'}</option>
              <option value="true">{uiLanguage === 'ar' ? tr('المفعلة') : 'Active only'}</option>
              <option value="false">{uiLanguage === 'ar' ? tr('المعطلة') : 'Disabled only'}</option>
            </select>
          </label>
          {panelState.redirects === 'ready' && (
            <p className="text-xs">
              {uiLanguage === 'ar' ? 'نتائج البحث' : 'Search results'}: {redirectTotal}
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {redirects.map((item) => (
              <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                <p dir="ltr">
                  {item.sourcePath} → {item.destinationPath}
                </p>
                <p>
                  {item.statusCode} · {item.active ? 'ACTIVE' : 'DISABLED'} · v{item.version ?? '—'}
                </p>
                <p>
                  {uiLanguage === 'ar' ? 'آخر محرر' : 'Last editor'}:{' '}
                  {item.updatedBy || item.createdBy || '—'}
                </p>
                <p>
                  {tr('سبب التعديل')}: {item.reason}
                </p>
                {!item.contentId && item.version ? (
                  <fieldset
                    disabled={busy || !hasPermission('admin:cms:redirects:manage')}
                    aria-label={uiLanguage === 'ar' ? 'إجراءات اللوحة' : 'Panel actions'}
                  >
                    <form
                      key={item.version}
                      className="mt-2 space-y-2"
                      onSubmit={(event) => updateRedirect(item, event)}
                    >
                      <input
                        className={input}
                        dir="ltr"
                        name="destinationPath"
                        defaultValue={item.destinationPath}
                        required
                      />
                      <input
                        className={input}
                        name="reason"
                        minLength={3}
                        required
                        placeholder={uiLanguage === 'ar' ? tr('سبب التعديل') : 'Change reason'}
                      />
                      <select
                        className={input}
                        name="active"
                        defaultValue={item.active ? 'true' : 'false'}
                      >
                        <option value="true">{uiLanguage === 'ar' ? tr('مفعل') : 'Active'}</option>
                        <option value="false">
                          {uiLanguage === 'ar' ? tr('معطل') : 'Disabled'}
                        </option>
                      </select>
                      <button type="submit" disabled={busy} className={button}>
                        {uiLanguage === 'ar' ? tr('حفظ التعديل') : 'Save changes'}
                      </button>
                    </form>
                  </fieldset>
                ) : (
                  <p className="text-amber-800">
                    {uiLanguage === 'ar'
                      ? tr('تحويل محكوم بالنشر أو يحتاج ترحيل الإصدار')
                      : 'Publisher-owned redirect or version migration required'}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={busy || redirectPage === 1}
              onClick={() => setRedirectPage((p) => Math.max(1, p - 1))}
              className={button}
            >
              {uiLanguage === 'ar' ? tr('السابق') : 'Previous'}
            </button>
            <span aria-live="polite">
              {redirectPage} / {redirectTotalPages}
            </span>
            <button
              type="button"
              disabled={busy || redirectPage >= redirectTotalPages}
              onClick={() => setRedirectPage((p) => Math.min(redirectTotalPages, p + 1))}
              className={button}
            >
              {uiLanguage === 'ar' ? tr('التالي') : 'Next'}
            </button>
          </div>
        </Card>
        <Card title={tr('قوائم التنقل — إضافة آمنة')}>
          {panelFeedback('navigation')}
          <fieldset
            disabled={busy || !hasPermission('admin:cms:navigation:manage')}
            aria-label={uiLanguage === 'ar' ? 'إجراءات اللوحة' : 'Panel actions'}
          >
            <form onSubmit={saveNavigation} className="space-y-2">
              <select className={input} name="locationKey">
                <option value="HEADER"> {tr('الرأس')} </option>
                <option value="FOOTER"> {tr('التذييل')} </option>
                <option value="SIDEBAR"> {tr('الجانبي')} </option>
              </select>
              <input className={input} name="displayText" required placeholder={tr('نص الرابط')} />
              <select className={input} name="targetType">
                <option value="CMS_CONTENT"> {tr('محتوى CMS')} </option>
                <option value="DOMAIN_REFERENCE"> {tr('قسم من المنصة')} </option>
                <option value="EXTERNAL_URL"> {tr('رابط خارجي HTTPS')} </option>
              </select>
              <input
                className={input}
                name="targetValue"
                dir="ltr"
                required
                placeholder="Content ID / Canonical ID / URL"
              />
              <button className={button} disabled={busy}>
                {tr('إضافة إلى القائمة كمسودة')}{' '}
              </button>
            </form>
          </fieldset>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            {tr(
              'الإضافة تحفظ العقد الموجودة وتستخدم رقم الإصدار الحالي لمنع الاستبدال المتزامن.',
            )}{' '}
          </p>
          <ul className="mt-4 space-y-3">
            {navigation.map((menu) => (
              <li key={menu.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <span>
                  {menu.locationKey} — {menu.status} — {menu.nodes.length}
                </span>
                {menu.status === 'DRAFT' && (
                  <button
                    type="button"
                    disabled={busy || !canPublish}
                    className={button}
                    onClick={() =>
                      void submit(
                        () =>
                          adminApiClient.request(
                            '/admin/cms/navigation/' + encodeURIComponent(menu.id) + '/publish',
                            {
                              method: 'POST',
                              body: JSON.stringify({ expectedVersion: menu.version }),
                            },
                          ),
                        uiLanguage === 'ar'
                          ? tr('نُشرت القائمة بعد اعتماد المراجع.')
                          : 'Menu reviewed and published.',
                      )
                    }
                  >
                    {uiLanguage === 'ar' ? tr('اعتماد ونشر القائمة') : 'Approve and publish menu'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={tr('الكتل الديناميكية')}>
          {panelFeedback('schemas')}
          {panelFeedback('blocks')}
          <p className="mb-3 text-xs leading-5 text-slate-500">
            {tr(
              'مخططات الكتل تُدار تقنيًا خارج شاشة المحرر. هنا تستخدم فقط المخططات المعتمدة.',
            )}{' '}
          </p>
          <ul className="mb-3 space-y-2">
            {schemas
              .filter((schema) => schema.status === 'DRAFT')
              .map((schema) => (
                <li
                  key={schema.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-xs"
                >
                  <span>
                    {uiLanguage === 'ar' ? schema.nameAr : schema.nameEn || schema.nameAr} · v
                    {schema.version} · DRAFT
                  </span>
                  <button
                    type="button"
                    className={button}
                    disabled={busy || !hasPermission('admin:cms:schemas:approve')}
                    onClick={() => {
                      if (
                        !window.confirm(
                          locale === 'ar'
                            ? tr('اعتماد مخطط الكتلة يتطلب مراجعًا مختلفًا عن منشئه. هل تتابع؟')
                            : 'Schema approval requires a checker other than its author. Continue?',
                        )
                      )
                        return;
                      void submit(
                        () =>
                          adminApiClient.request(
                            '/admin/cms/block-schemas/' +
                              encodeURIComponent(schema.id) +
                              '/approve',
                            {
                              method: 'POST',
                              body: JSON.stringify({}),
                            },
                          ),
                        uiLanguage === 'ar'
                          ? tr('اعتُمد المخطط بواسطة المراجع.')
                          : 'Schema approved by reviewer.',
                      );
                    }}
                  >
                    {uiLanguage === 'ar' ? tr('اعتماد المخطط') : 'Approve schema'}
                  </button>
                </li>
              ))}
          </ul>
          {schemas.some((schema) => schema.status === 'ACTIVE') ? (
            <CmsBlockEditor
              key={locale}
              schemas={schemas.filter((schema) => schema.status === 'ACTIVE')}
              blocks={blocks}
              disabled={busy || panelState.blocks !== 'ready' || !hasPermission('admin:cms:author')}
              onSave={(data) =>
                void submit(
                  () =>
                    adminApiClient.request('/admin/cms/blocks', {
                      method: 'PUT',
                      body: JSON.stringify({
                        ...data,
                        siteIdentifier: 'absheer',
                        locale,
                        status: 'DRAFT',
                      }),
                    }),
                  tr('تم حفظ الكتلة الديناميكية كمسودة.'),
                )
              }
            />
          ) : (
            <p>{tr('لا توجد مخططات كتل معتمدة.')}</p>
          )}
          <ul className="mt-4 space-y-3">
            {blocks.map((block) => (
              <li key={block.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <span>
                  {block.name} — {block.status} — v{block.version}
                </span>
                {block.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    className={button}
                    disabled={busy || !canPublish}
                    onClick={() => {
                      if (
                        !window.confirm(
                          uiLanguage === 'ar'
                            ? 'أرشفة الكتلة وإخفاء نسختها العامة؟'
                            : 'Archive this block and remove its public version?',
                        )
                      )
                        return;
                      void submit(
                        () =>
                          adminApiClient.request(
                            '/admin/cms/blocks/' + encodeURIComponent(block.id) + '/archive',
                            {
                              method: 'POST',
                              body: JSON.stringify({ expectedVersion: block.version }),
                            },
                          ),
                        uiLanguage === 'ar' ? 'أُرشفت الكتلة.' : 'Block archived.',
                      );
                    }}
                  >
                    {tr('أرشفة')}
                  </button>
                )}
                {block.status === 'DRAFT' && (
                  <button
                    type="button"
                    disabled={busy || !canPublish}
                    className={button}
                    onClick={() => {
                      if (
                        !window.confirm(
                          uiLanguage === 'ar'
                            ? tr('اعتماد ونشر الكتلة؟')
                            : 'Approve and publish block?',
                        )
                      )
                        return;
                      void submit(
                        () =>
                          adminApiClient.request(
                            '/admin/cms/blocks/' + encodeURIComponent(block.id) + '/publish',
                            {
                              method: 'POST',
                              body: JSON.stringify({ expectedVersion: block.version }),
                            },
                          ),
                        uiLanguage === 'ar'
                          ? tr('نُشرت الكتلة بعد الموافقة.')
                          : 'Block approved and published.',
                      );
                    }}
                  >
                    {uiLanguage === 'ar' ? tr('اعتماد ونشر الكتلة') : 'Approve and publish block'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={tr('الإعلانات المؤسسية')}>
          {panelFeedback('announcements')}
          <fieldset
            disabled={busy || !hasPermission('admin:cms:author')}
            aria-label={uiLanguage === 'ar' ? 'إجراءات اللوحة' : 'Panel actions'}
          >
            <form onSubmit={createAnnouncement} className="space-y-2">
              <input className={input} name="title" required placeholder={tr('عنوان الإعلان')} />
              <textarea className={input} name="body" required placeholder={tr('نص الإعلان')} />
              <label className="block">
                {uiLanguage === 'ar' ? 'بداية ظهور الإعلان' : 'Announcement starts at'}
                <input
                  type="datetime-local"
                  name="startsAt"
                  required
                  className={input}
                  defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16)}
                />
              </label>
              <label className="block">
                {uiLanguage === 'ar' ? 'نهاية الظهور (اختياري)' : 'Expires at (optional)'}
                <input type="datetime-local" name="expiresAt" className={input} />
              </label>
              <select className={input} name="urgency">
                <option value="LOW"> {tr('منخفض')} </option>
                <option value="MEDIUM"> {tr('متوسط')} </option>
                <option value="HIGH"> {tr('مرتفع')} </option>
                <option value="CRITICAL"> {tr('حرج')} </option>
              </select>
              <button className={button} disabled={busy}>
                {tr('حفظ كمسودة')}{' '}
              </button>
            </form>
          </fieldset>
          <ul className="mt-4 space-y-3">
            {announcements.map((notice) => (
              <li key={notice.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <span>
                  {notice.title} — {notice.status}{' '}
                  {notice.hasPublicSnapshot
                    ? uiLanguage === 'ar'
                      ? '(نسخة عامة منشورة)'
                      : '(public version live)'
                    : ''}
                </span>
                {notice.status === 'DRAFT' && (
                  <button
                    type="button"
                    disabled={busy || !canPublish}
                    className={button}
                    onClick={() =>
                      void submit(
                        () =>
                          adminApiClient.request(
                            '/admin/cms/announcements/' +
                              encodeURIComponent(notice.id) +
                              '/publish',
                            {
                              method: 'POST',
                              body: JSON.stringify({ expectedVersion: notice.version }),
                            },
                          ),
                        uiLanguage === 'ar'
                          ? tr('نُشر الإعلان بعد الاعتماد.')
                          : 'Announcement published.',
                      )
                    }
                  >
                    {uiLanguage === 'ar' ? tr('اعتماد ونشر الإعلان') : 'Approve and publish'}
                  </button>
                )}
                {(notice.status === 'PUBLISHED' || notice.hasPublicSnapshot) && (
                  <button
                    type="button"
                    disabled={busy || !canPublish}
                    className={button}
                    onClick={() => {
                      const reason = window.prompt(
                        uiLanguage === 'ar'
                          ? 'سبب إيقاف الإعلان المنشور (6 أحرف على الأقل)'
                          : 'Reason for retiring the published announcement (at least 6 characters)',
                      );
                      if (!reason || reason.trim().length < 6 || reason.trim().length > 1000)
                        return;
                      void submit(
                        () =>
                          adminApiClient.request(
                            '/admin/cms/announcements/' +
                              encodeURIComponent(notice.id) +
                              '/archive',
                            {
                              method: 'POST',
                              body: JSON.stringify({
                                expectedVersion: notice.version,
                                reason: reason.trim(),
                              }),
                            },
                          ),
                        uiLanguage === 'ar' ? tr('أُرشف الإعلان.') : 'Announcement archived.',
                      );
                    }}
                  >
                    {uiLanguage === 'ar' ? tr('أرشفة') : 'Archive'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title={
            uiLanguage === 'ar'
              ? tr('إصلاح مهام النشر الفاشلة (المشغّلون فقط)')
              : 'Failed publication recovery (operators only)'
          }
        >
          <button
            type="button"
            className={button}
            disabled={busy || !hasPermission('admin:cms:operations:run')}
            onClick={() => void loadFailedSchedules()}
          >
            {uiLanguage === 'ar' ? tr('عرض المهام الفاشلة') : 'Load failed jobs'}
          </button>
          <ul className="mt-3 space-y-2">
            {failedSchedules.map((job) => (
              <li key={job.id} className="rounded-xl bg-slate-50 p-3 text-xs">
                <p>
                  {job.contentId} · {job.locale} · {job.failureCode ?? 'UNKNOWN'} ·{' '}
                  {job.attemptCount} attempts
                </p>
                <fieldset
                  disabled={busy || !hasPermission('admin:cms:operations:run')}
                  aria-label={uiLanguage === 'ar' ? 'إجراءات اللوحة' : 'Panel actions'}
                >
                  <form
                    className="mt-2 flex flex-wrap gap-2"
                    onSubmit={(event) => retryFailedSchedule(job, event)}
                  >
                    <input
                      className={input}
                      name="reason"
                      minLength={3}
                      maxLength={2000}
                      required
                      placeholder={uiLanguage === 'ar' ? tr('سبب إعادة المحاولة') : 'Retry reason'}
                    />
                    <button type="submit" className={button} disabled={busy}>
                      {uiLanguage === 'ar' ? tr('إعادة المحاولة') : 'Retry'}
                    </button>
                  </form>
                </fieldset>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-black text-[#142B5F]">{title}</h3>
      {children}
    </section>
  );
}
function Items({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? (
    <ul className="mt-4 space-y-2 text-sm text-slate-600">
      {items.map((item) => (
        <li className="rounded-lg bg-slate-50 p-2" key={item}>
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-4 text-sm text-slate-400">{empty}</p>
  );
}
