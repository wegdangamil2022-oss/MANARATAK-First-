import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../../api/client';

interface ContentSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  scheduledAt?: string | null;
}
interface Redirect {
  id: string;
  sourcePath: string;
  destinationPath: string;
  statusCode: number;
  active: boolean;
  version?: number;
  contentId?: string | null;
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
interface BlockSchema {
  id: string;
  key: string;
  version: number;
  nameAr: string;
  nameEn?: string;
  status: string;
}
interface ContentBlock {
  id: string;
  name: string;
  status: string;
  version: number;
}
interface Announcement {
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
  const sequence = useRef(0);
  const mutation = useRef(false);
  const [redirects, setRedirects] = useState<Redirect[]>([]);
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
  const [redirectTotalPages, setRedirectTotalPages] = useState(1);

  const load = useCallback(async () => {
    const current = ++sequence.current;
    setError(null);
    const suffix = `siteIdentifier=manaratak&locale=${locale}`;
    const redirectQuery = new URLSearchParams({
      siteIdentifier: 'manaratak', locale, page: String(redirectPage), pageSize: '20',
    });
    if (redirectSearch.trim()) redirectQuery.set('q', redirectSearch.trim());
    if (redirectStatus !== 'all') redirectQuery.set('active', redirectStatus);
    try {
      const [redirectResult, navigationResult, schemaResult, blockResult, announcementResult] =
        await Promise.allSettled([
          adminApiClient.request<List<Redirect> & { totalPages: number }>(`/admin/cms/redirects?${redirectQuery}`),
          adminApiClient.request<List<NavigationMenu>>(`/admin/cms/navigation?${suffix}`),
          adminApiClient.request<List<BlockSchema>>('/admin/cms/block-schemas'),
          adminApiClient.request<List<ContentBlock>>(`/admin/cms/blocks?${suffix}`),
          adminApiClient.request<List<Announcement>>(`/admin/cms/announcements?${suffix}`),
        ]);
      if (current !== sequence.current) return;
      setRedirects(redirectResult.status === 'fulfilled' ? redirectResult.value.data : []);
      setRedirectTotalPages(redirectResult.status === 'fulfilled' ? Math.max(1, redirectResult.value.totalPages) : 1);
      setNavigation(navigationResult.status === 'fulfilled' ? navigationResult.value.data : []);
      setSchemas(schemaResult.status === 'fulfilled' ? schemaResult.value.data : []);
      setBlocks(blockResult.status === 'fulfilled' ? blockResult.value.data : []);
      setAnnouncements(announcementResult.status === 'fulfilled' ? announcementResult.value.data : []);
      const failed = [redirectResult, navigationResult, schemaResult, blockResult, announcementResult]
        .filter((result) => result.status === 'rejected').length;
      if (failed) setError(locale === 'ar' ? 'تعذر تحميل بعض الأقسام؛ البيانات المتأثرة مخفية مؤقتًا.' : 'Some panels failed to load; their stale data has been cleared.');
    } catch (reason) {
      if (current === sequence.current)
        setError(reason instanceof Error ? reason.message : 'تعذر تحميل عمليات المحتوى.');
    }
  }, [locale, redirectPage, redirectSearch, redirectStatus]);

  useEffect(() => {
    void load();
  }, [load]);

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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إكمال العملية.');
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };

  const createRedirect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(
      () =>
        adminApiClient.request('/admin/cms/redirects', {
          method: 'POST',
          body: JSON.stringify({
            siteIdentifier: 'manaratak',
            locale,
            sourcePath: form.get('sourcePath'),
            destinationPath: form.get('destinationPath'),
            statusCode: 301,
            reason: form.get('reason'),
            active: true,
          }),
        }),
      'تم حفظ التحويل الدائم.',
    );
  };
  const updateRedirect = (item: Redirect, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item.version || item.contentId) return;
    const form = new FormData(event.currentTarget);
    const destinationPath = String(form.get('destinationPath') || '').trim();
    const reason = String(form.get('reason') || '').trim();
    if (!reason || !destinationPath || !window.confirm(
      locale === 'ar' ? 'هل تؤكد تحديث التحويل ونشر أثره؟' : 'Confirm redirect update?'
    )) return;
    void submit(() => adminApiClient.request('/admin/cms/redirects/' + encodeURIComponent(item.id), {
      method: 'PATCH', body: JSON.stringify({
        expectedVersion: item.version, destinationPath, reason,
        active: form.get('active') === 'true',
      }),
    }), locale === 'ar' ? 'تم تحديث التحويل.' : 'Redirect updated.');
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
            siteIdentifier: 'manaratak',
            locale,
            locationKey,
            nodes: [...preservedNodes, newNode],
          }),
        }),
      'تمت إضافة الرابط إلى قائمة التنقل مع الحفاظ على الروابط الموجودة.',
    );
  };
  const createBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submit(
      () =>
        adminApiClient.request('/admin/cms/blocks', {
          method: 'PUT',
          body: JSON.stringify({
            siteIdentifier: 'manaratak',
            locale,
            schemaId: form.get('schemaId'),
            name: form.get('name'),
            payload: { title: form.get('title') },
            status: 'DRAFT',
          }),
        }),
      'تم حفظ الكتلة الديناميكية كمسودة.',
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
            siteIdentifier: 'manaratak',
            locale,
            title: form.get('title'),
            body: form.get('body'),
            urgency: form.get('urgency'),
            startsAt: new Date().toISOString(),
          }),
        }),
      'تم حفظ الإعلان كمسودة؛ النشر يحتاج اعتمادًا منفصلًا.',
    );
  };

  const reviewQueue = contents.filter(
    (item) => item.status === 'IN_REVIEW' || item.status === 'READY_TO_PUBLISH',
  );
  const calendar = contents.filter((item) => item.status === 'SCHEDULED');

  return (
    <section aria-labelledby="cms-operations" className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white">
        <p className="text-xs font-bold text-[#F2CD78]">SITE EXPERIENCE</p>
        <h2 id="cms-operations" className="mt-1 text-2xl font-black">
          عمليات الموقع والنشر
        </h2>
        <p className="mt-2 text-sm text-white/80">
          وظائف تشغيلية مستقلة عن المقالات: المراجعة، الجدولة، التنقل، التحويلات، الكتل والإعلانات.
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
        <Card title="مراجعة مواد الصفحة الحالية">
          <Items
            empty="لا توجد مواد CMS بانتظار المراجعة."
            items={reviewQueue.map((x) => `${x.title} — ${x.status}`)}
          />
        </Card>
        <Card title="جدولة مواد الصفحة الحالية">
          <Items
            empty="لا توجد مواد مجدولة."
            items={calendar.map(
              (x) =>
                `${x.title} — ${x.scheduledAt ? new Date(x.scheduledAt).toLocaleString(locale === 'ar' ? 'ar' : 'en') : 'الموعد غير متاح'}`,
            )}
          />
        </Card>
        <Card title="التحويلات الدائمة">
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
              placeholder="سبب التحويل"
            />
            <button className={button} disabled={busy}>
              حفظ التحويل
            </button>
          </form>
          <label className="block text-xs">
            {locale === 'ar' ? 'بحث في التحويلات' : 'Search redirects'}
            <input className={input} maxLength={200} value={redirectSearch} onChange={(event) => { setRedirectPage(1); setRedirectSearch(event.target.value); }} />
            <select className={input} aria-label={locale === 'ar' ? 'حالة التحويل' : 'Redirect status'} value={redirectStatus} onChange={(event) => { setRedirectPage(1); setRedirectStatus(event.target.value); }}>
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
              <option value="true">{locale === 'ar' ? 'المفعلة' : 'Active only'}</option>
              <option value="false">{locale === 'ar' ? 'المعطلة' : 'Disabled only'}</option>
            </select>
          </label>
          <ul className="mt-4 space-y-3">
            {redirects.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs">
              <p dir="ltr">{item.sourcePath} → {item.destinationPath}</p>
              <p>{item.statusCode} · {item.active ? 'ACTIVE' : 'DISABLED'} · v{item.version ?? '—'}</p>
              {!item.contentId && item.version ? <form key={item.version} className="mt-2 space-y-2" onSubmit={(event) => updateRedirect(item, event)}>
                <input className={input} dir="ltr" name="destinationPath" defaultValue={item.destinationPath} required />
                <input className={input} name="reason" minLength={3} required placeholder={locale === 'ar' ? 'سبب التعديل' : 'Change reason'} />
                <select className={input} name="active" defaultValue={item.active ? 'true' : 'false'}>
                  <option value="true">{locale === 'ar' ? 'مفعل' : 'Active'}</option>
                  <option value="false">{locale === 'ar' ? 'معطل' : 'Disabled'}</option>
                </select>
                <button type="submit" disabled={busy} className={button}>{locale === 'ar' ? 'حفظ التعديل' : 'Save changes'}</button>
              </form> : <p className="text-amber-800">{locale === 'ar' ? 'تحويل محكوم بالنشر أو يحتاج ترحيل الإصدار' : 'Publisher-owned redirect or version migration required'}</p>}
            </li>)}
          </ul>
          <div className="mt-3 flex items-center justify-between text-xs">
            <button type="button" disabled={busy || redirectPage === 1} onClick={() => setRedirectPage((p) => Math.max(1, p - 1))} className={button}>{locale === 'ar' ? 'السابق' : 'Previous'}</button>
            <span aria-live="polite">{redirectPage} / {redirectTotalPages}</span>
            <button type="button" disabled={busy || redirectPage >= redirectTotalPages} onClick={() => setRedirectPage((p) => Math.min(redirectTotalPages, p + 1))} className={button}>{locale === 'ar' ? 'التالي' : 'Next'}</button>
          </div>
        </Card>
        <Card title="قوائم التنقل — إضافة آمنة">
          <form onSubmit={saveNavigation} className="space-y-2">
            <select className={input} name="locationKey">
              <option value="HEADER">الرأس</option>
              <option value="FOOTER">التذييل</option>
              <option value="SIDEBAR">الجانبي</option>
            </select>
            <input className={input} name="displayText" required placeholder="نص الرابط" />
            <select className={input} name="targetType">
              <option value="CMS_CONTENT">محتوى CMS</option>
              <option value="DOMAIN_REFERENCE">قسم من المنصة</option>
              <option value="EXTERNAL_URL">رابط خارجي HTTPS</option>
            </select>
            <input
              className={input}
              name="targetValue"
              dir="ltr"
              required
              placeholder="Content ID / Canonical ID / URL"
            />
            <button className={button} disabled={busy}>
              إضافة إلى القائمة كمسودة
            </button>
          </form>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            الإضافة تحفظ العقد الموجودة وتستخدم رقم الإصدار الحالي لمنع الاستبدال المتزامن.
          </p>
          <ul className="mt-4 space-y-3">
            {navigation.map((menu) => (
              <li key={menu.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <span>{menu.locationKey} — {menu.status} — {menu.nodes.length}</span>
                {menu.status === 'DRAFT' && <button type="button" disabled={busy} className={button}
                  onClick={() => void submit(() => adminApiClient.request('/admin/cms/navigation/' + encodeURIComponent(menu.id) + '/publish', {
                    method: 'POST', body: JSON.stringify({ expectedVersion: menu.version }),
                  }), locale === 'ar' ? 'نُشرت القائمة بعد اعتماد المراجع.' : 'Menu reviewed and published.')}>
                  {locale === 'ar' ? 'اعتماد ونشر القائمة' : 'Approve and publish menu'}
                </button>}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="الكتل الديناميكية">
          <p className="mb-3 text-xs leading-5 text-slate-500">
            مخططات الكتل تُدار تقنيًا خارج شاشة المحرر. هنا تستخدم فقط المخططات المعتمدة.
          </p>
          {schemas.length > 0 ? (
            <form onSubmit={createBlock} className="space-y-2">
              <select className={input} name="schemaId">
                {schemas
                  .filter((x) => x.status === 'ACTIVE')
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {locale === 'ar' ? x.nameAr : x.nameEn || x.nameAr} v{x.version}
                    </option>
                  ))}
              </select>
              <input className={input} name="name" required placeholder="اسم الكتلة" />
              <input className={input} name="title" required placeholder="عنوان الكتلة" />
              <button className={button} disabled={busy}>
                حفظ الكتلة
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-400">لا توجد مخططات كتل معتمدة.</p>
          )}
          <ul className="mt-4 space-y-3">
            {blocks.map((block) => <li key={block.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <span>{block.name} — {block.status} — v{block.version}</span>
              {block.status === 'DRAFT' && <button type="button" disabled={busy} className={button}
                onClick={() => {
                  if (!window.confirm(locale === 'ar' ? 'اعتماد ونشر الكتلة؟' : 'Approve and publish block?')) return;
                  void submit(() => adminApiClient.request('/admin/cms/blocks/' + encodeURIComponent(block.id) + '/publish', {
                    method: 'POST', body: JSON.stringify({ expectedVersion: block.version }),
                  }), locale === 'ar' ? 'نُشرت الكتلة بعد الموافقة.' : 'Block approved and published.');
                }}>
                {locale === 'ar' ? 'اعتماد ونشر الكتلة' : 'Approve and publish block'}
              </button>}
            </li>)}
          </ul>
        </Card>
        <Card title="الإعلانات المؤسسية">
          <form onSubmit={createAnnouncement} className="space-y-2">
            <input className={input} name="title" required placeholder="عنوان الإعلان" />
            <textarea className={input} name="body" required placeholder="نص الإعلان" />
            <select className={input} name="urgency">
              <option value="LOW">منخفض</option>
              <option value="MEDIUM">متوسط</option>
              <option value="HIGH">مرتفع</option>
              <option value="CRITICAL">حرج</option>
            </select>
            <button className={button} disabled={busy}>
              حفظ كمسودة
            </button>
          </form>
          <ul className="mt-4 space-y-3">
            {announcements.map((notice) => (
              <li key={notice.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                <span>{notice.title} — {notice.status}</span>
                {notice.status === 'DRAFT' && <button type="button" disabled={busy} className={button}
                  onClick={() => void submit(() => adminApiClient.request('/admin/cms/announcements/' + encodeURIComponent(notice.id) + '/publish', {
                    method: 'POST', body: JSON.stringify({ expectedVersion: notice.version }),
                  }), locale === 'ar' ? 'نُشر الإعلان بعد الاعتماد.' : 'Announcement published.')}>
                  {locale === 'ar' ? 'اعتماد ونشر الإعلان' : 'Approve and publish'}
                </button>}
                {notice.status === 'PUBLISHED' && <button type="button" disabled={busy} className={button}
                  onClick={() => void submit(() => adminApiClient.request('/admin/cms/announcements/' + encodeURIComponent(notice.id) + '/archive', {
                    method: 'POST', body: JSON.stringify({ expectedVersion: notice.version }),
                  }), locale === 'ar' ? 'أُرشف الإعلان.' : 'Announcement archived.')}>
                  {locale === 'ar' ? 'أرشفة' : 'Archive'}
                </button>}
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
