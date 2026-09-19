import React from 'react';
import { ArrowRight, Globe, HelpCircle, Mail } from 'lucide-react';

const questions = [
  ['كيف أجد فرصة تناسبني؟', 'ابدأ بالبحث العام أو اختر قسم المنح أو الجامعات أو التخصصات. استخدم الفلاتر ثم راجع متطلبات الفرصة ورابطها الرسمي.'],
  ['هل حفظ الفرصة يعني أنني قدمت عليها؟', 'لا. المفضلة تحفظ الفرصة للرجوع إليها فقط؛ التقديم يتم عبر الجهة الرسمية وفق تعليماتها.'],
  ['هل القبول أو الحصول على منحة مضمون؟', 'لا. القرار لدى الجامعة أو الجهة المانحة، ويجب التأكد من الشروط والمواعيد من المصدر الرسمي.'],
  ['هل البحث الذكي وتسجيل الدخول يعملان فعليًا؟', 'هذه نسخة معاينة للواجهة. البحث الذكي محاكاة محلية، وتسجيل الدخول والطلبات بانتظار الربط بالخادم.'],
  ['أين تحفظ المفضلة في هذه النسخة؟', 'تُحفظ محليًا في هذا المتصفح. حذف بيانات المتصفح قد يحذفها، ولا تتم مزامنتها مع جهاز آخر قبل ربط الحساب.'],
];
export function PublicInfoPage({page, onBack, onServices}: {page: 'faq' | 'contact' | 'language'; onBack: () => void; onServices: () => void}) {
  const title = page === 'faq' ? 'الأسئلة الشائعة' : page === 'contact' ? 'الاتصال والدعم' : 'لغة الواجهة';
  const Icon = page === 'faq' ? HelpCircle : page === 'contact' ? Mail : Globe;
  return <div className="min-h-screen bg-[var(--mn-page)] pb-24" dir="rtl">
    <div className="mn-search-hero mn-inverse p-4 text-white">
      <button onClick={onBack} aria-label="رجوع" className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center"><ArrowRight className="w-5 h-5" /></button>
      <h1 className="text-xl font-bold mt-3 flex items-center gap-2"><Icon className="w-5 h-5" />{title}</h1>
    </div>
    <div className="max-w-3xl mx-auto p-4 space-y-3">
      {page === 'faq' ? questions.map(([question, answer]) => <details key={question} className="mn-panel rounded-2xl p-4 border border-[var(--mn-border)] bg-[var(--mn-surface)]">
        <summary className="font-bold text-sm cursor-pointer">{question}</summary><p className="text-sm leading-7 mt-3 text-[var(--mn-text-muted)]">{answer}</p>
      </details>) : page === 'language' ? <section className="mn-panel rounded-2xl p-4 border border-[var(--mn-border)] bg-[var(--mn-surface)]">
        <h2 className="font-bold">العربية — اللغة المفعّلة</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--mn-text-muted)]">English — قيد التجهيز. ستُفعّل الإنجليزية بعد اكتمال ترجمة الصفحات والبيانات. تبقى الواجهة عربية باتجاه صحيح حتى ذلك الحين.</p>
      </section> : <section className="mn-panel rounded-2xl p-4 border border-[var(--mn-border)] bg-[var(--mn-surface)]">
        <h2 className="font-bold">قنوات التواصل والوكلاء</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--mn-text-muted)]">لم تُربط بيانات التواصل والوكلاء المعتمدة بهذه النسخة بعد. لن نعرض أرقامًا أو عناوين غير مؤكدة.</p>
        <button onClick={onServices} className="mt-4 rounded-xl px-4 py-3 bg-[var(--mn-primary)] text-white font-bold text-sm mn-inverse">استكشف خدمات منارتك</button>
      </section>}
    </div>
  </div>;
}

