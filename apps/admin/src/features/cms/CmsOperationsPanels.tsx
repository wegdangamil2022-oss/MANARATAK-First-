import { FormEvent, useCallback, useEffect, useState } from 'react';
import { adminApiClient } from '../../api/client';

interface ContentSummary { id: string; title: string; status: string; updatedAt: string }
interface Redirect { id: string; sourcePath: string; destinationPath: string; statusCode: number; active: boolean }
interface NavigationNode { id: string; parentNodeId?: string | null; displayText: string; targetType: 'CMS_CONTENT' | 'EXTERNAL_URL' | 'DOMAIN_REFERENCE'; targetValue: string; sortOrder: number; openInNewWindow: boolean; metadata?: Record<string, unknown> | null }
interface NavigationMenu { id: string; locationKey: 'HEADER' | 'FOOTER' | 'SIDEBAR' | 'OTHER'; status: string; version: number; nodes: NavigationNode[] }
interface BlockSchema { id: string; key: string; version: number; nameAr: string; nameEn?: string; status: string }
interface ContentBlock { id: string; name: string; status: string; version: number }
interface Announcement { id: string; title: string; urgency: string; status: string; startsAt: string; expiresAt?: string | null; version: number }
interface List<T> { data: T[] }
type Locale = 'ar' | 'en';

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#21A7B4] focus:ring-2 focus:ring-[#DDEFF2]';
const button = 'rounded-xl bg-[#142B5F] px-4 py-2 text-sm font-bold text-white hover:bg-[#0E7C86] disabled:opacity-50';

export function CmsOperationsPanels({ contents, locale }: { contents: ContentSummary[]; locale: Locale }) {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [navigation, setNavigation] = useState<NavigationMenu[]>([]);
  const [schemas, setSchemas] = useState<BlockSchema[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const suffix = `siteIdentifier=manaratak&locale=${locale}`;
    try {
      const [redirectResult, navigationResult, schemaResult, blockResult, announcementResult] = await Promise.all([
        adminApiClient.request<List<Redirect>>(`/admin/cms/redirects?${suffix}`),
        adminApiClient.request<List<NavigationMenu>>(`/admin/cms/navigation?${suffix}`),
        adminApiClient.request<List<BlockSchema>>('/admin/cms/block-schemas'),
        adminApiClient.request<List<ContentBlock>>(`/admin/cms/blocks?${suffix}`),
        adminApiClient.request<List<Announcement>>(`/admin/cms/announcements?${suffix}`),
      ]);
      setRedirects(redirectResult.data); setNavigation(navigationResult.data); setSchemas(schemaResult.data);
      setBlocks(blockResult.data); setAnnouncements(announcementResult.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحميل عمليات المحتوى.'); }
  }, [locale]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(null); setNotice(null);
    try { await operation(); setNotice(success); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إكمال العملية.'); }
    finally { setBusy(false); }
  };

  const createRedirect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void submit(() => adminApiClient.request('/admin/cms/redirects', { method: 'POST', body: JSON.stringify({ siteIdentifier: 'manaratak', locale, sourcePath: form.get('sourcePath'), destinationPath: form.get('destinationPath'), statusCode: 301, reason: form.get('reason'), active: true }) }), 'تم حفظ التحويل الدائم.');
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
      () => adminApiClient.request('/admin/cms/navigation', {
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
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void submit(() => adminApiClient.request('/admin/cms/blocks', { method: 'PUT', body: JSON.stringify({ siteIdentifier: 'manaratak', locale, schemaId: form.get('schemaId'), name: form.get('name'), payload: { title: form.get('title') }, status: 'DRAFT' }) }), 'تم حفظ الكتلة الديناميكية كمسودة.');
  };
  const createAnnouncement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void submit(() => adminApiClient.request('/admin/cms/announcements', { method: 'PUT', body: JSON.stringify({ siteIdentifier: 'manaratak', locale, title: form.get('title'), body: form.get('body'), urgency: form.get('urgency'), startsAt: new Date().toISOString() }) }), 'تم حفظ الإعلان كمسودة؛ النشر يحتاج اعتمادًا منفصلًا.');
  };

  const reviewQueue = contents.filter((item) => item.status === 'IN_REVIEW' || item.status === 'READY_TO_PUBLISH');
  const calendar = contents.filter((item) => item.status === 'SCHEDULED');

  return (
    <section aria-labelledby="cms-operations" className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white">
        <p className="text-xs font-bold text-[#F2CD78]">SITE EXPERIENCE</p>
        <h2 id="cms-operations" className="mt-1 text-2xl font-black">عمليات الموقع والنشر</h2>
        <p className="mt-2 text-sm text-white/80">وظائف تشغيلية مستقلة عن المقالات: المراجعة، الجدولة، التنقل، التحويلات، الكتل والإعلانات.</p>
      </div>
      {notice && <p role="status" className="rounded-xl bg-[#DDEFF2] p-3 text-sm font-bold text-[#0E7C86]">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="موجز المراجعة المركزي"><Items empty="لا توجد مواد CMS بانتظار المراجعة." items={reviewQueue.map((x) => `${x.title} — ${x.status}`)} /></Card>
        <Card title="تقويم النشر"><Items empty="لا توجد مواد مجدولة." items={calendar.map((x) => `${x.title} — ${new Date(x.updatedAt).toLocaleDateString(locale === 'ar' ? 'ar' : 'en')}`)} /></Card>
        <Card title="التحويلات الدائمة">
          <form onSubmit={createRedirect} className="space-y-2"><input className={input} name="sourcePath" dir="ltr" required placeholder={`/${locale}/old-path`} /><input className={input} name="destinationPath" dir="ltr" required placeholder={`/${locale}/new-path`} /><input className={input} name="reason" required minLength={3} placeholder="سبب التحويل" /><button className={button} disabled={busy}>حفظ التحويل</button></form>
          <Items empty="لا توجد تحويلات." items={redirects.slice(0, 4).map((x) => `${x.sourcePath} ← ${x.destinationPath}`)} />
        </Card>
        <Card title="قوائم التنقل — إضافة آمنة">
          <form onSubmit={saveNavigation} className="space-y-2">
            <select className={input} name="locationKey"><option value="HEADER">الرأس</option><option value="FOOTER">التذييل</option><option value="SIDEBAR">الجانبي</option></select>
            <input className={input} name="displayText" required placeholder="نص الرابط" />
            <select className={input} name="targetType"><option value="CMS_CONTENT">محتوى CMS</option><option value="DOMAIN_REFERENCE">قسم من المنصة</option><option value="EXTERNAL_URL">رابط خارجي HTTPS</option></select>
            <input className={input} name="targetValue" dir="ltr" required placeholder="Content ID / Canonical ID / URL" />
            <button className={button} disabled={busy}>إضافة إلى القائمة كمسودة</button>
          </form>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">الإضافة تحفظ العقد الموجودة وتستخدم رقم الإصدار الحالي لمنع الاستبدال المتزامن.</p>
          <Items empty="لا توجد قوائم." items={navigation.map((x) => `${x.locationKey} — ${x.status} — ${x.nodes.length} روابط`)} />
        </Card>
        <Card title="الكتل الديناميكية">
          <p className="mb-3 text-xs leading-5 text-slate-500">مخططات الكتل تُدار تقنيًا خارج شاشة المحرر. هنا تستخدم فقط المخططات المعتمدة.</p>
          {schemas.length > 0 ? <form onSubmit={createBlock} className="space-y-2"><select className={input} name="schemaId">{schemas.filter((x) => x.status === 'ACTIVE').map((x) => <option key={x.id} value={x.id}>{locale === 'ar' ? x.nameAr : x.nameEn || x.nameAr} v{x.version}</option>)}</select><input className={input} name="name" required placeholder="اسم الكتلة" /><input className={input} name="title" required placeholder="عنوان الكتلة" /><button className={button} disabled={busy}>حفظ الكتلة</button></form> : <p className="text-sm text-slate-400">لا توجد مخططات كتل معتمدة.</p>}
          <Items empty="لا توجد كتل." items={blocks.map((x) => `${x.name} — ${x.status}`)} />
        </Card>
        <Card title="الإعلانات المؤسسية">
          <form onSubmit={createAnnouncement} className="space-y-2"><input className={input} name="title" required placeholder="عنوان الإعلان" /><textarea className={input} name="body" required placeholder="نص الإعلان" /><select className={input} name="urgency"><option value="LOW">منخفض</option><option value="MEDIUM">متوسط</option><option value="HIGH">مرتفع</option><option value="CRITICAL">حرج</option></select><button className={button} disabled={busy}>حفظ كمسودة</button></form>
          <Items empty="لا توجد إعلانات." items={announcements.map((x) => `${x.title} — ${x.status}`)} />
        </Card>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm"><h3 className="mb-4 text-lg font-black text-[#142B5F]">{title}</h3>{children}</section>; }
function Items({ items, empty }: { items: string[]; empty: string }) { return items.length ? <ul className="mt-4 space-y-2 text-sm text-slate-600">{items.map((item) => <li className="rounded-lg bg-slate-50 p-2" key={item}>{item}</li>)}</ul> : <p className="mt-4 text-sm text-slate-400">{empty}</p>; }
