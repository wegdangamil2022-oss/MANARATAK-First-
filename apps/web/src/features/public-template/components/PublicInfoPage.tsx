import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import {useTranslation} from '../../../i18n/I18nProvider';
import {isPublicTemplateLocaleEnabled} from '@absheer/shared';
import { ArrowRight, Globe, HelpCircle, Mail, ShieldCheck } from 'lucide-react';

export function PublicInfoPage({page, onBack, onServices, dataMode = 'api'}: {dataMode?: 'api' | 'prototype'; page: 'faq' | 'contact' | 'language'; onBack: () => void; onServices: () => void}) {
  const { t: publicT } = usePublicTemplateTranslation();

  const {language,setLanguage,dir}=useTranslation();
  const ar = language === 'ar';
  const questions = ar ? [
    ['كيف أجد فرصة تناسبني؟', 'استخدم البحث العام أو فلاتر القسم ثم راجع المتطلبات والمواعيد والرابط الرسمي للفرصة.'],
    ['هل حفظ الفرصة يعني أنني قدمت عليها؟', 'المحفوظات للرجوع إلى الفرصة؛ التقديم يتم عبر المسار المحدد في تفاصيلها ووفق تعليمات الجهة.'],
    ['هل القبول أو الحصول على منحة مضمون؟', 'القرار لدى الجامعة أو الجهة المانحة. تحقق من شروطها الحالية ومواعيدها من المصدر الرسمي.'],
    ['كيف يعمل البحث والدخول؟', dataMode === 'prototype' ? 'هذه معاينة تجريبية للواجهة والنتائج.' : 'البحث يستعلم عن العناصر المنشورة. الإجراءات التي تتطلب حسابًا تطلب تسجيل الدخول؛ عرض الفرصة لا يعني إرسال طلب.'],
    ['أين أجد محفوظاتي؟', dataMode === 'prototype' ? 'في المعاينة، تحفظ في هذا المتصفح وقد تزول عند حذف بياناته.' : 'تجد العناصر المحفوظة في مساحة حساب الطالب بعد تسجيل الدخول.'],
  ] : [
    ['How do I find an opportunity?', 'Use public search or catalog filters, then check the requirements, deadlines and official source.'],
    ['Does saving mean I have applied?', 'Saved items help you return to opportunities. Apply through the route specified in the details and follow the provider instructions.'],
    ['Is admission or funding guaranteed?', 'The university or funding provider makes the decision. Check their current conditions and deadlines.'],
    ['How do search and sign-in work?', dataMode === 'prototype' ? 'This is an interface preview with demonstration results.' : 'Search queries published items. Account actions require sign-in; viewing an opportunity does not submit an application.'],
    ['Where are my saved items?', dataMode === 'prototype' ? 'Preview items are stored in this browser and may disappear when browser data is cleared.' : 'Sign in to find saved items in your student account workspace.'],
  ];

  const title = page === 'faq' ? (ar ? 'الأسئلة الشائعة' : 'Frequently asked questions') : page === 'contact' ? (ar ? 'الاتصال والدعم' : 'Contact and support') : (ar ? 'لغة الواجهة' : 'Interface language');
  const Icon = page === 'faq' ? HelpCircle : page === 'contact' ? Mail : Globe;
  return <div className="min-h-screen bg-[var(--ab-page)] pb-24" dir={dir}>
    <div className="ab-search-hero ab-inverse p-4 text-white">
      <button onClick={onBack} aria-label={publicT('public_back_2')} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center"><ArrowRight className="w-5 h-5" /></button>
      <h1 className="text-xl font-bold mt-3 flex items-center gap-2"><Icon className="w-5 h-5" />{title}</h1>
    </div>
    <div className="max-w-3xl mx-auto p-4 space-y-3">
      {page === 'faq' ? questions.map(([question, answer]) => <details key={question} className="ab-panel rounded-2xl p-4 border border-[var(--ab-border)] bg-[var(--ab-surface)]">
        <summary className="font-bold text-sm cursor-pointer">{question}</summary><p className="text-sm leading-7 mt-3 text-[var(--ab-text-muted)]">{answer}</p>
      </details>) : page === 'language' ? <section className="ab-panel rounded-2xl p-4 border border-[var(--ab-border)] bg-[var(--ab-surface)]">
        <h2 className="font-bold">{language==='ar'?publicT('public_interface_language'):'Interface language'}</h2>
        <div className="mt-3 flex gap-3"><button type="button" onClick={()=>setLanguage('ar')}>{publicT('public_arabic')}</button><button type="button" disabled={!isPublicTemplateLocaleEnabled('en')} onClick={()=>setLanguage('en')}>English</button></div>
        <p className="mt-3 text-sm leading-7 text-[var(--ab-text-muted)]">{publicT('public_english_in_preparation_english_will_become_available_when')}</p>
      </section> : <section className="ab-panel rounded-2xl p-4 border border-[var(--ab-border)] bg-[var(--ab-surface)]">
        <h2 className="font-bold">{publicT('public_contact_channels_and_agents')}</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ab-text-muted)]">{publicT('public_approved_contact_and_agent_information_has_not_been')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={onServices} className="rounded-xl px-4 py-3 bg-[var(--ab-primary)] text-white font-bold text-sm ab-inverse">{publicT('public_explore_absheer_services')}</button>
          <a href="/admin/login" className="rounded-xl px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-2 transition-colors">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>{publicT('public_open_administration_portal')}</span>
          </a>
        </div>
      </section>}
    </div>
  </div>;
}

