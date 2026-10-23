import { ArrowLeft, CopyCheck, GitCompareArrows, Languages, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReviewPageState } from './ReviewLoader';

export function ReviewSupportingPanels({ language, states, canOpenTranslations }: {
  language: string;
  states: ReviewPageState[];
  canOpenTranslations: boolean;
}) {
  const tr = (ar: string, en: string) => language === 'ar' ? ar : en;
  const importSource = states.find(state => state.source.key === 'scholarships:import' && state.availability !== 'access_denied');
  return <>
    {canOpenTranslations || importSource ? <section aria-labelledby="review-specialist-workspaces" className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
      <h2 id="review-specialist-workspaces" className="text-lg font-black text-[#142B5F]">{tr('المراجعات المتخصصة', 'Specialist review workspaces')}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {canOpenTranslations ? <article className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0]/40 p-4">
          <Languages aria-hidden="true" className="mb-2 h-5 w-5 text-[#0E7C86]" />
          <h3 className="text-sm font-black">{tr('مراجعة الترجمات', 'Translation review')}</h3>
          <p className="mt-2 text-xs leading-6 text-slate-500">{tr('أدوات الترجمة والتحرير في مساحتها المخصصة.', 'Translation and editorial tools in their dedicated workspace.')}</p>
          <Link to="/translations" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#142B5F] px-3 py-2 text-xs font-bold text-white">{tr('فتح مساحة الترجمات', 'Open translation workspace')}<ArrowLeft aria-hidden="true" className="h-4 w-4 ltr:rotate-180" /></Link>
        </article> : null}
        {importSource ? [
          { title: tr('تكرارات استيراد المنح', 'Scholarship import duplicates'), Icon: CopyCheck },
          { title: tr('تعارضات وتحديثات الاستيراد', 'Import conflicts & updates'), Icon: GitCompareArrows },
        ].map(({ title, Icon }) => <article key={title} className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0]/40 p-4">
          <Icon aria-hidden="true" className="mb-2 h-5 w-5 text-[#0E7C86]" />
          <h3 className="text-sm font-black">{title}</h3>
          <p className="mt-2 text-xs leading-6 text-slate-500">{tr('التفاصيل والأعداد تُراجع في مركز الاستيراد؛ ليست مجمعة في هذه العينة.', 'Review counts and details in the import center; they are not aggregated in this sample.')}</p>
          <Link to={importSource.source.path} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#142B5F] px-3 py-2 text-xs font-bold text-white">{tr('فتح مركز استيراد المنح', 'Open scholarship import center')}<ArrowLeft aria-hidden="true" className="h-4 w-4 ltr:rotate-180" /></Link>
        </article>) : null}
      </div>
    </section> : null}
    <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm" aria-labelledby="review-priority-policy">
      <h2 id="review-priority-policy" className="flex items-center gap-2 text-lg font-black text-[#142B5F]"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-[#0E7C86]" />{tr('قاعدة الأولوية', 'Priority policy')}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [tr('حرجة', 'Critical'), tr('تظهر عند إرسال القسم أولوية حرجة صريحة.', 'Shown when the owner explicitly supplies critical priority.')],
          [tr('عالية', 'High'), tr('عند غياب أولوية القسم: اقتراح للبيانات الناقصة وتحقق المصدر والروابط المعطلة.', 'Without owner priority: suggested for incomplete data, source verification and broken links.')],
          [tr('متوسطة', 'Medium'), tr('عند غياب أولوية القسم: اقتراح لبقية إشارات المراجعة.', 'Without owner priority: suggested for the remaining review signals.')],
          [tr('منخفضة', 'Low'), tr('تظهر عندما يحددها القسم؛ الجاهزية وحدها لا تثبت أولوية منخفضة.', 'Shown when supplied by the owner; readiness alone does not establish low priority.')],
        ].map(([title, description]) => <div key={title} className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0]/40 p-4"><h3 className="text-sm font-black">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{description}</p></div>)}
      </div>
      <p className="mt-3 text-xs leading-6 text-slate-500">{tr('أولوية القسم مقدمة على الاقتراح. تأخر SLA يحتاج وقت دخول المراجعة والموعد وسياسة القسم، وتبقى الحالة مجهولة إذا غاب أحدها.', 'Owner priority takes precedence. SLA overdue requires review-entry time, due time and owner policy; missing evidence remains unknown.')}</p>
    </section>
  </>;
}
