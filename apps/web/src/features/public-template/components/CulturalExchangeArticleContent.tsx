import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Award,
  Beaker,
  Bell,
  BookMarked,
  BookOpen,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Compass,
  FileText,
  Globe,
  GraduationCap,
  HelpCircle,
  Landmark,
  Languages,
  MapPin,
  PlaneTakeoff,
  Scale,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { DetailSectionHeader } from './DetailUi';
import { CulturalExchangeGovernoratesAccordion } from './CulturalExchangeGovernoratesAccordion';

/* أيقونة العناوين الفرعية باللون النيلي وداخلها أبيض — مطابقة لقسم الآيلتس */
const StandaloneHeadingBadge: React.FC<{ icon: React.ElementType }> = ({ icon: Icon }) => (
  <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon inline-flex items-center justify-center shrink-0 shadow-2xs">
    <Icon className="w-3.5 h-3.5 text-white" />
  </span>
);

/* خط ونقطة خفيفة — مخصصة لفهرس التنقل السريع فقط */
const NavDashDotIcon: React.FC = () => (
  <span
    aria-hidden="true"
    className="inline-flex items-center gap-1 align-middle ml-2 shrink-0"
  >
    <span className="w-3.5 h-[2px] rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
    <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
  </span>
);

/* نقطة نيلي صافية — للأقسام والبطاقات الفرعية بدلاً من شرطة ونقطة */
const InlineDashDotIcon: React.FC = () => (
  <span
    aria-hidden="true"
    className="inline-block w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0"
  />
);

/* جوهرة نيلي فقط — للخلاصات والقواعد الذهبية والملاحظات المهمة (مطابقة لقسم الآيلتس) */
const InlineDiamondIcon: React.FC = () => (
  <span
    aria-hidden="true"
    className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0"
  />
);

/* B-20: زاوية هندسية قائمة بنقطة نيلية — للأسئلة الرئيسية المستقلة (مطابقة لقسم الآيلتس) */
const InlineCornerB20: React.FC = () => (
  <span
    aria-hidden="true"
    className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-2 shrink-0"
  >
    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
  </span>
);

/* نقطة بترولية صافية — موحدة داخل القوائم والتعداد */
const InlinePetrolDot: React.FC = () => (
  <span
    aria-hidden="true"
    className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-2 shrink-0"
  />
);

/* خط جانبي انتقائي بترولي مع نيلي — يوضع فقط في بعض المربعات الهامة (التعريفات والقاعدة الذهبية) */
const SelectiveAccentBar: React.FC = () => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]"
  />
);

export const CulturalExchangeArticleContent: React.FC = () => {
  const [checkGradYear, setCheckGradYear] = useState<string>('2026');
  const [calcHsGrade, setCalcHsGrade] = useState<number>(92);
  const [calcExamGrade, setCalcExamGrade] = useState<number>(85);

  const navItems = [
    { id: 'def-section', title: 'التعريف بمنح التبادل الثقافي والأهلية' },
    { id: 'diff-section', title: 'الفرق بين التبادل الثقافي والمنح المستقلة' },
    { id: 'test-section', title: 'اختبار المفاضلة والحاسبة التفاعلية' },
    { id: 'outside-yemen-section', title: 'مفاضلة خريجي الخارج والدراسات العليا' },
    { id: 'docs-section', title: 'التسجيل والوثائق ومواد الاختبار' },
    { id: 'before-exam-section', title: 'ما قبل اختبار المفاضلة وما بعده' },
    { id: 'hungary-scholarship-section', title: 'ملحق منحة الحكومة المجرية' },
    { id: 'china-scholarship-section', title: 'ملحق منحة الحكومة الصينية' },
    { id: 'pmu-scholarship-section', title: 'ملحق منحة جامعة الأمير محمد بن فهد' },
    { id: 'egypt-scholarship-section', title: 'ملحق منح مصر والجزائر وكوبا وباكستان' },
    { id: 'governorate-quotas-section', title: 'توزيع المقاعد وحصص المحافظات' },
    { id: 'results-and-appeals-section', title: 'النتائج والتظلمات' },
    { id: 'post-acceptance-phase-section', title: 'ما بعد القبول والإيفاد والسفر' },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 text-right font-['Cairo',sans-serif]" dir="rtl">
      {/* فهرس التنقل السريع بين الأقسام — خط ونقطة خفيفة بدون خط جانبي أو جوهرة */}
      <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3 mn-panel">
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={Compass}
          title="فهرس التنقل السريع بين الأقسام"
          subtitle="13 قسمًا مرجعيًا — اختر أي قسم للانتقال المباشر"
          className="mb-1"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-2.5 items-stretch w-full">
          {navItems.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                const el = document.getElementById(item.id);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`group h-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[var(--mn-page)] hover:bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[#0E7C86]/50 transition-all shadow-2xs text-right font-['Cairo',sans-serif] cursor-pointer w-full ${
                idx === navItems.length - 1 ? 'sm:col-span-2 lg:col-span-3' : ''
              }`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <NavDashDotIcon />
                <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] group-hover:text-[#0E7C86] transition-colors leading-[1.45] text-right flex-1">
                  {item.title}
                </span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 text-[#0E7C86] opacity-70 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ١. منح التبادل الثقافي والأهلية                                           */}
      {/* ========================================================================= */}
      <div
        id="def-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={GraduationCap}
          title="١. منح التبادل الثقافي والأهلية"
          className="mb-1"
        />

        {/* 1. ما هي منح التبادل الثقافي؟ */}
        <div className="space-y-2 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={BookOpen} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ما هي منح التبادل الثقافي؟
            </h3>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full space-y-2">
            <SelectiveAccentBar />
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <strong className="text-[var(--mn-heading)] ml-1">منح التبادل الثقافي:</strong>
              هي بعض المنح أو المقاعد الدراسية التي تحصل عليها اليمن من دول أخرى ضمن اتفاقيات التعاون والتبادل الثقافي بين الحكومات. ثم تقوم وزارة التعليم العالي اليمنية بالإعلان عن هذه المنح واستقبال طلبات الطلاب وإجراء اختبار للمفاضلة بينهم.
            </p>
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pt-2 border-t border-[var(--mn-border)]/70">
              ويكون اختبار المفاضلة في المواد التي تحددها الوزارة، مثل الكيمياء والرياضيات واللغة الإنجليزية، ثم تتم مقارنة نتائج المتقدمين واختيار الطلاب الأعلى والأقوى في المفاضلة بحسب النظام المعتمد لكل محافظة وعدد المقاعد المتاحة، وبعد ذلك تقوم الوزارة بترشيح الفائزين إلى الدولة أو الجامعة المانحة لاستكمال إجراءات القبول والمنحة.
            </p>
          </div>
        </div>

        {/* 2. شروط الأهلية وحداثة التخرج */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Calendar} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              شروط الأهلية وحداثة التخرج
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
              <InlineCornerB20 />
              <span>من يستطيع دخول اختبار التبادل الثقافي؟</span>
            </h4>

            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              اختبار التبادل الثقافي لا يكون مفتوحًا لجميع خريجي الثانوية من أي سنة، وإنما يُحدد عادةً لحديثي التخرج لآخر دفعتين تخرجتا وفق السنة التي تُعلنها وزارة التعليم العالي.
            </p>

            {/* بطاقات بيضاء متوازنة داخل المربع لإبراز الدفعتين بوضوح */}
            <div className="pt-2 border-t border-[var(--mn-border)]/70 space-y-2">
              <span className="block text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                مثال توضيحي (إذا أُقيم الاختبار في بداية عام 2027) — أحدث دفعتين فقط:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-stretch">
                <div className="h-full rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] px-3 py-2.5 flex items-center shadow-2xs">
                  <InlineDashDotIcon />
                  <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)]">
                    خريجو الثانوية لعام <strong className="text-[var(--mn-heading)]">2026</strong>
                  </span>
                </div>
                <div className="h-full rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] px-3 py-2.5 flex items-center shadow-2xs">
                  <InlineDashDotIcon />
                  <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)]">
                    خريجو الثانوية لعام <strong className="text-[var(--mn-heading)]">2025</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* فاحص الأهلية التفاعلي كمربع أبيض مستقل وواضح */}
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 space-y-2.5 shadow-2xs w-full">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                  فاحص أهليتك بحسب سنة التخرج (دورة 2027 كمثال):
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11.5px] font-bold text-[var(--mn-text-muted)]">سنة تخرجك:</span>
                {['2026', '2025', '2024', '2023'].map((yr) => {
                  const isSelected = checkGradYear === yr;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setCheckGradYear(yr)}
                      className={
                        'px-2.5 py-1 rounded-md text-[11.5px] font-bold transition-all border cursor-pointer leading-tight ' +
                        (isSelected
                          ? 'bg-[#142B5F] text-white border-[#142B5F] shadow-2xs'
                          : 'bg-[var(--mn-page)] text-[var(--mn-text)] border-[var(--mn-border)] hover:border-[#0E7C86]/40')
                      }
                    >
                      عام {yr}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[var(--mn-border)]/70 text-[11.5px] sm:text-[12px] font-bold flex items-center gap-2">
                {checkGradYear === '2026' || checkGradYear === '2025' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#0E7C86]" />
                    <span className="text-[#0E7C86] dark:text-[#21A7B4]">
                      أنت مؤهل! خريجو سنة {checkGradYear} هم ضمن أحدث دفعتين مقبولتين للمفاضلة العامة وفق المثال.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#142B5F] dark:text-[#7EB6FF]" />
                    <span className="text-[var(--mn-heading)]">
                      غير مشمول بالمفاضلة لحديثي التخرج لعام {checkGradYear}؛ فالشرط يقتصر على آخر دفعتين، ويُنصح بالتقديم على المنح الخارجية المباشرة.
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* بمعنى أبسط */}
          <div className="p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlineDiamondIcon />
              <strong className="text-[var(--mn-heading)] ml-1">بمعنى أبسط:</strong>
              كلما جاءت دورة جديدة لاختبار التبادل الثقافي، ننظر إلى أحدث دفعتين من خريجي الثانوية وقت فتح التسجيل. ويجب دائمًا مراجعة إعلان وزارة التعليم العالي الرسمي لذلك العام لاعتماد الدفع المقبولة بدقة.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ٢. الفرق بين منح التبادل الثقافي والمنح الخارجية                         */}
      {/* ========================================================================= */}
      <div
        id="diff-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={ArrowRightLeft}
          title="٢. التبادل الثقافي والمنح الخارجية"
          className="mb-1"
        />

        {/* 1. أولًا: مفهوم مسار التبادل الثقافي الحكومي */}
        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Landmark} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: مفهوم مسار التبادل الثقافي الحكومي
            </h3>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full space-y-2">
            <SelectiveAccentBar />
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              من المهم التفريق بين منح التبادل الثقافي والمنح العامة أو الخارجية؛ لأن الطالب قد يرى منحة حكومية أو جامعية في إحدى الدول ويظن أنها تدخل تلقائيًا ضمن التبادل الثقافي، وهذا غير صحيح.
            </p>
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pt-2 border-t border-[var(--mn-border)]/70">
              منح التبادل الثقافي تشمل عادةً الفرص التي تحصل عليها اليمن من عدد من الدول ضمن اتفاقيات التعاون بين الحكومات، ومن أبرز الدول في هذا المسار: <strong className="text-[var(--mn-heading)]">المجر، الصين، الأردن، الجزائر، المغرب، باكستان، وكوبا</strong>. هذه المنح مرتبطة بوزارة التعليم العالي اليمنية، حيث تعلن الوزارة عن المقاعد المتاحة، ويسجل الطلاب لديها، ثم تتم المفاضلة بينهم وترشيح الأعلى إلى الدولة أو الجامعة المانحة.
            </p>
          </div>

          {/* هل أستطيع التقديم بشكل مستقل؟ + أمثلة ببطاقات بيضاء متوازنة */}
          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                <InlineCornerB20 />
                <span>هل أستطيع التقديم بشكل مستقل في نفس دول التبادل؟</span>
              </h4>
              <span className="text-[10.5px] font-bold text-[#0E7C86] dark:text-[#21A7B4]">
                مثال: المجر والصين والأردن وكوبا
              </span>
            </div>

            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              وجود دولة ضمن منح التبادل الثقافي لا يعني أن الطالب لا يستطيع التقديم على أي منحة أخرى داخلها؛ بل نفرّق بين <strong className="text-[var(--mn-heading)]">المنحة الحكومية المخصصة لليمن عبر الوزارة</strong> وبين <strong className="text-[var(--mn-heading)]">المنح الأخرى التي تقدمها الجامعات أو المقاطعات بشكل مستقل</strong>:
            </p>

            {/* بطاقات بيضاء داخلية متوازنة الارتفاع */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-stretch pt-1">
              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <h5 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>مقاعد التبادل الحكومية (المجر، الأردن، كوبا...)</span>
                </h5>
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  تتطلب الدخول في إجراءات المفاضلة والاختبار والترشيح عن طريق وزارة التعليم العالي اليمنية، ولا يستطيع الطالب التقديم على المقعد الحكومي المخصص للتبادل بشكل مستقل.
                </p>
              </div>

              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <h5 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>منح الجامعات والجهات المستقلة في نفس الدول</span>
                </h5>
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  إذا كانت هناك جامعة داخل المجر أو الأردن أو غيرها تقدم منحتها الخاصة أو منحة إقليمية لا ترتبط بالتبادل الثقافي، فيستطيع الطالب التقديم عليها بصورة مستقلة مباشرة.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ثانيًا: الصين حالة مختلفة قليلًا (مسارا Type A و Type B) */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Compass} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: الصين حالة مختلفة قليلًا (مسارات منحة CSC والمنح الجامعية)
            </h3>
          </div>

          <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] px-0.5">
            منحة الحكومة الصينية CSC لها أكثر من مسار، وأهم ما يهمنا هنا:
          </p>

          {/* جدول مقارنة مساري الصين بأسلوب الجداول Edge-to-Edge */}
          <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
            <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
              <div className="col-span-4 py-2 px-2.5 sm:px-3 text-[11.5px] font-bold text-white border-l border-white/15">
                المسار
              </div>
              <div className="col-span-8 py-2 px-2.5 sm:px-3 text-[11.5px] font-bold text-white">
                آلية التقديم وعلاقته بالتبادل الثقافي اليمني
              </div>
            </div>
            <div className="divide-y divide-[var(--mn-border)] text-[11.5px] sm:text-[12px] font-bold">
              <div className="grid grid-cols-12 items-stretch bg-[var(--mn-surface)]">
                <div className="col-span-4 py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[var(--mn-heading)] flex items-center">
                  الفئة A – Type A
                </div>
                <div className="col-span-8 py-2.5 px-2.5 sm:px-3 text-[var(--mn-text)] leading-[1.85] text-justify">
                  وهي المسار المرتبط عادةً بالتعاون الحكومي والجهات المرسلة، وبالنسبة للمقاعد التي تأتي لليمن عن طريق التبادل الثقافي ووزارة التعليم العالي فإن الطالب يدخل اختبار المفاضلة، ثم يتم الترشيح من الوزارة وفق الإجراءات المعلنة.
                </div>
              </div>
              <div className="grid grid-cols-12 items-stretch bg-[var(--mn-page)]">
                <div className="col-span-4 py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[#0E7C86] dark:text-[#21A7B4] flex items-center">
                  الفئة B – Type B
                </div>
                <div className="col-span-8 py-2.5 px-2.5 sm:px-3 text-[var(--mn-text)] leading-[1.85] text-justify">
                  وهي مسار يكون التقديم فيه عن طريق الجامعات الصينية المشاركة، ولا يحتاج الطالب فيه إلى الدخول في مفاضلة وزارة التعليم العالي اليمنية الخاصة بالتبادل الثقافي.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 space-y-2.5 shadow-2xs w-full">
            <div className="space-y-1.5">
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <InlinePetrolDot />
                يجب الانتباه إلى أن فرص البكالوريوس في مسار Type B محدودة جدًا مقارنة بفرص الماجستير والدكتوراه، ولذلك نجد أن هذا المسار أكثر انتشارًا بين طلاب الدراسات العليا.
              </p>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pt-1.5 border-t border-[var(--mn-border)]/70">
                <InlinePetrolDot />
                والأهم أن الصين لا تقتصر أصلًا على منحة الحكومة الصينية CSC؛ فهناك عدد كبير جدًا من الجامعات الصينية التي تقدم منحًا جامعية، ومنح مقاطعات ومدن، وإعفاءات دراسية لا علاقة لها بمقاعد التبادل الثقافي اليمني، ويستطيع الطالب التقديم عليها مباشرة.
              </p>
            </div>

            {/* مقارنة بين طالبين ببطاقات بيضاء متوازنة */}
            <div className="pt-2 border-t border-[var(--mn-border)]/70 space-y-2">
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-[1.75]">
                لذلك يمكن أن نجد طالبين يريدان الدراسة في الدولة نفسها، لكن طريقة التقديم مختلفة تمامًا:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-stretch w-full">
                <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1.5 shadow-2xs">
                  <strong className="text-[var(--mn-heading)] text-[11.5px] sm:text-[12px] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                    <InlineDashDotIcon />
                    <span>الطالب الأول (مسار التبادل الثقافي):</span>
                  </strong>
                  <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    يتقدم على المنحة الحكومية المخصصة ضمن التبادل الثقافي، فيدخل اختبار المفاضلة وإجراءات الترشيح عن طريق الوزارة.
                  </p>
                </div>
                <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1.5 shadow-2xs">
                  <strong className="text-[var(--mn-heading)] text-[11.5px] sm:text-[12px] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                    <InlineDashDotIcon />
                    <span>الطالب الثاني (التقديم المستقل المباشر):</span>
                  </strong>
                  <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    يتقدم مباشرة على منحة جامعة أو مقاطعة أو برنامج مستقل داخل الدولة نفسها، ولا يدخل في مفاضلة التبادل الثقافي.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* المزايا المالية الإضافية + الخلاصة ببطاقات متوازنة الارتفاع */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch w-full">
            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
              <h5 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDiamondIcon />
                <span>المزايا المالية الإضافية في التبادل الثقافي:</span>
              </h5>
              <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                يحصل الطالب الموفد عبر التبادل الثقافي على مساعدة مالية من وزارة التعليم العالي اليمنية (تختلف قيمتها بحسب دولة الابتعاث) إلى جانب الراتب أو المخصصات التي تقدمها الدولة أو المنحة المانحة نفسها.
              </p>
            </div>

            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
              <h5 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDiamondIcon />
                <span>الخلاصة المعتمدة للمسارين:</span>
              </h5>
              <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                الذي يرتبط بالمفاضلة والترشيح عن طريق الوزارة هو المقعد الحكومي المخصص ضمن اتفاقية التبادل الثقافي، أما منح الجامعات والمقاطعات والبرامج المستقلة فيمكن التقديم عليها مباشرة.
              </p>
            </div>
          </div>
        </div>

        {/* 3. ثالثًا: المنح الخارجية المستقلة */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Globe} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثالثًا: المنح الخارجية المستقلة (خارج مسار التبادل الثقافي)
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 space-y-2.5 shadow-2xs w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <strong className="text-[var(--mn-heading)] ml-1">الالتحاق بالمنح الخارجية:</strong>
              يقصد بالمنح الخارجية بقية المنح الدراسية التي لا تدخل ضمن مسار التبادل الثقافي اليمني، ولا تعتمد على ترشيح وزارة التعليم العالي اليمنية، ويكون التقديم فيها مباشرة عبر الجهة المانحة (ومن أمثلتها: المنحة التركية، الروسية، العراقية، الكورية، اليابانية، وغيرها):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-stretch pt-1">
              {[
                'تقديم مباشر عبر بوابة الجهة المانحة الرسمية',
                'لا تشترط امتحان مفاضلة وزارة التعليم العالي',
                'تخضع لمعايير ومفاضلة الجهة المانحة الدولية',
                'تشمل منح حكومية، منح جامعية، ومنح مؤسسات',
              ].map((pt, idx) => (
                <div
                  key={idx}
                  className="h-full rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] px-3 py-2.5 flex items-center shadow-2xs"
                >
                  <InlineDashDotIcon />
                  <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ٣. اختبار المفاضلة والحاسبة التفاعلية                                      */}
      {/* ========================================================================= */}
      <div
        id="test-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={Calculator}
          title="٣. اختبار المفاضلة والحاسبة التفاعلية"
          className="mb-1"
        />

        {/* 1. الأركان الأربعة لنظام امتحان المفاضلة */}
        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={ClipboardCheck} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              الأركان الأربعة لنظام امتحان المفاضلة
            </h3>
          </div>

          <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify px-0.5">
            نأخذ عام 2025/2026 كنموذج يوضح الطريقة التي كانت تُستخدم للمنافسة على منح التبادل الثقافي عبر أربعة أركان أساسية:
          </p>

          {/* جدول الأركان الأربعة بأسلوب جداول IELTS Edge-to-Edge */}
          <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
            <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] text-white text-[11.5px] font-bold">
              <div className="col-span-4 py-2 px-2.5 sm:px-3 border-l border-white/15">
                المعيار الأساسي
              </div>
              <div className="col-span-8 py-2 px-2.5 sm:px-3">
                التفاصيل المعتمدة في نموذج اختبار المفاضلة
              </div>
            </div>
            <div className="divide-y divide-[var(--mn-border)] text-[11.5px] sm:text-[12px] font-bold">
              {[
                {
                  num: '١',
                  label: 'المعدل المطلوب للتسجيل',
                  desc: 'كان الحد الأدنى لمعدل الثانوية العامة في بداية الإعلان 90%، ثم خُفّض لاحقًا إلى 85%؛ للدخول في المنافسة وفق معايير الوزارة.',
                },
                {
                  num: '٢',
                  label: 'مواد امتحان المفاضلة',
                  desc: 'يُجرى الامتحان في ثلاث مواد علمية رئيسية: الرياضيات + الكيمياء + اللغة الإنجليزية.',
                },
                {
                  num: '٣',
                  label: 'طريقة ونظام الامتحان',
                  desc: 'الامتحان بنظام اختيار من متعدد (أتمتة)، مدته ساعتان، ويتم تصحيحه آلياً وإلكترونياً لضمان الشفافية.',
                },
                {
                  num: '٤',
                  label: 'مراكز الامتحان المعتمدة',
                  desc: 'يُعقد الامتحان في أربعة مراكز رئيسية: (عدن – تعز – حضرموت – مأرب) بحسب تعليمات وإجراءات الوزارة.',
                },
              ].map((row, idx) => (
                <div
                  key={row.num}
                  className={`grid grid-cols-12 items-stretch ${
                    idx % 2 === 0 ? 'bg-[var(--mn-surface)]' : 'bg-[var(--mn-page)]'
                  }`}
                >
                  <div className="col-span-4 py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[var(--mn-heading)] flex items-center gap-1.5">
                    <span className="text-[#0E7C86] shrink-0">{row.num}.</span>
                    <span>{row.label}</span>
                  </div>
                  <div className="col-span-8 py-2.5 px-2.5 sm:px-3 text-[var(--mn-text)] leading-[1.85] text-justify">
                    {row.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. معادلة الوزن النسبي والحاسبة التفاعلية */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Calculator} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              كيف تُحسب نتيجة المفاضلة؟ (معادلة الوزن النسبي)
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              لم يكن الترتيب يعتمد على معدل الثانوية وحده، بل على المجموع الموزون لمعدل الثانوية مع نتيجة امتحان المفاضلة وفق المعادلة:
            </p>

            {/* بطاقتان بيضاوان متوازنتان لمعادلة الوزن النسبي */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-stretch">
              <div className="h-full rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] px-3 py-2.5 flex items-center shadow-2xs">
                <InlineDashDotIcon />
                <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                  30% من معدل الثانوية العامة
                </span>
              </div>
              <div className="h-full rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] px-3 py-2.5 flex items-center shadow-2xs">
                <InlinePetrolDot />
                <span className="text-[11.5px] sm:text-[12px] font-bold text-[#0E7C86] dark:text-[#21A7B4]">
                  70% من امتحان المفاضلة
                </span>
              </div>
            </div>

            {/* الحاسبة التفاعلية داخل بطاقة بيضاء متباينة */}
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                  حاسبة نتيجة المفاضلة التفاعلية (احسب درجاتك الموزونة):
                </span>
                <span className="text-[10.5px] font-bold text-[#0E7C86] dark:text-[#21A7B4]">
                  معادلة معتمدة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11.5px] font-bold">
                    <span className="text-[var(--mn-text)]">معدل الثانوية العامة (30%):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="50"
                        max="100"
                        step="0.5"
                        value={calcHsGrade}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, Number(e.target.value)));
                          setCalcHsGrade(val);
                        }}
                        className="w-14 px-1 py-0.5 text-center text-[11.5px] font-bold bg-[var(--mn-page)] border border-[var(--mn-border)] rounded text-[var(--mn-heading)]"
                      />
                      <span className="text-[var(--mn-heading)] text-[11.5px]">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="0.5"
                    value={calcHsGrade}
                    onChange={(e) => setCalcHsGrade(Number(e.target.value))}
                    className="w-full accent-[#142B5F] cursor-pointer h-1.5"
                  />
                  <div className="text-[11px] text-[var(--mn-text-muted)] font-bold flex justify-between">
                    <span>المساهمة الفعلية:</span>
                    <strong className="text-[var(--mn-heading)]">{(calcHsGrade * 0.3).toFixed(1)} درجة</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11.5px] font-bold">
                    <span className="text-[var(--mn-text)]">درجة اختبار المفاضلة (70%):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={calcExamGrade}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, Number(e.target.value)));
                          setCalcExamGrade(val);
                        }}
                        className="w-14 px-1 py-0.5 text-center text-[11.5px] font-bold bg-[var(--mn-page)] border border-[var(--mn-border)] rounded text-[#0E7C86] dark:text-[#21A7B4]"
                      />
                      <span className="text-[#0E7C86] dark:text-[#21A7B4] text-[11.5px]">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={calcExamGrade}
                    onChange={(e) => setCalcExamGrade(Number(e.target.value))}
                    className="w-full accent-[#0E7C86] cursor-pointer h-1.5"
                  />
                  <div className="text-[11px] text-[var(--mn-text-muted)] font-bold flex justify-between">
                    <span>المساهمة الفعلية:</span>
                    <strong className="text-[#0E7C86] dark:text-[#21A7B4]">{(calcExamGrade * 0.7).toFixed(1)} درجة</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[var(--mn-border)]/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[var(--mn-text-muted)] block">
                      النتيجة النهائية المركبة:
                    </span>
                    <div className="text-[17px] font-bold text-[var(--mn-heading)] leading-tight">
                      {(calcHsGrade * 0.3 + calcExamGrade * 0.7).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-48 space-y-0.5">
                  <div className="h-2 w-full bg-[var(--mn-border)] rounded-full overflow-hidden flex shadow-inner">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 100 1"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`الثانوية ${(calcHsGrade * 0.3).toFixed(1)}% والاختبار ${(calcExamGrade * 0.7).toFixed(1)}%`}
                    >
                      <rect
                        x={100 - Number((calcHsGrade * 0.3).toFixed(1))}
                        width={(calcHsGrade * 0.3).toFixed(1)}
                        height="1"
                        className="fill-[#142B5F] transition-all duration-300"
                      />
                      <rect
                        x={
                          100 -
                          Number((calcHsGrade * 0.3).toFixed(1)) -
                          Number((calcExamGrade * 0.7).toFixed(1))
                        }
                        width={(calcExamGrade * 0.7).toFixed(1)}
                        height="1"
                        className="fill-[#0E7C86] transition-all duration-300"
                      />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-[var(--mn-text-muted)] font-bold">
                    <span>ثانوية ({(calcHsGrade * 0.3).toFixed(1)}%)</span>
                    <span>اختبار ({(calcExamGrade * 0.7).toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* الخلاصة والقاعدة الذهبية */}
          <div className="relative overflow-hidden p-3 pr-4 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs w-full">
            <SelectiveAccentBar />
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlineDiamondIcon />
              <strong className="text-[var(--mn-heading)] ml-1">الخلاصة والقاعدة الذهبية:</strong>
              امتحان المفاضلة يمتلك الوزن الأكبر (70%) في الترتيب؛ لذلك يمكن لطالب معدله في الثانوية 88% أن يتقدم في الترشيح على طالب معدله 98% إذا حقق نتيجة أقوى في اختبار المفاضلة.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ٤. مفاضلة الخارج والدراسات العليا                                          */}
      {/* ========================================================================= */}
      <div
        id="outside-yemen-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={Globe}
          title="٤. مفاضلة الخارج والدراسات العليا"
          className="mb-1"
        />

        {/* 1. أولًا: مفاضلة خريجي الثانوية من خارج اليمن */}
        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Globe} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: مفاضلة خريجي الثانوية من خارج اليمن
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              الطلاب اليمنيون الحاصلون على الثانوية من خارج اليمن لا يظهرون ضمن حصة محافظة يمنية مثل عدن أو تعز، وإنما ظهرت لهم في نتائج دورة 2026/2027 فئة مستقلة باسم{' '}
              <strong className="text-[var(--mn-heading)] font-bold">«الخارج»</strong>
              ، ويتم التنافس على المقاعد المخصصة لهذه الفئة (ظهرت لها 5 مقاعد بكالوريوس في دورة 2026/2027).
            </p>

            {/* بطاقتان بيضاوان متوازنتان لآلية المفاضلة والسنوات التي يُعقد فيها اختبار */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch w-full">
              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 space-y-2 shadow-2xs">
                <div className="space-y-1.5">
                  <h4 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                    <InlineDashDotIcon />
                    <span>آلية المفاضلة وفك التساوي (دورة 2026/2027)</span>
                  </h4>
                  <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    في دورة 2026/2027 كانت المفاضلة على أساس <strong className="text-[var(--mn-heading)]">معدل الثانوية العامة</strong>، وعند تساوي المعدلات يُنظر إلى مجموع درجات المواد العلمية الأربع:
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                  <span>الرياضيات</span>
                  <span className="text-[#0E7C86] font-bold">+</span>
                  <span>الفيزياء</span>
                  <span className="text-[#0E7C86] font-bold">+</span>
                  <span>الكيمياء</span>
                  <span className="text-[#0E7C86] font-bold">+</span>
                  <span>الأحياء</span>
                </div>
              </div>

              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 space-y-2 shadow-2xs">
                <div className="space-y-1.5">
                  <h4 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                    <InlineCornerB20 />
                    <span>ماذا عن السنوات التي يوجد فيها اختبار مفاضلة؟</span>
                  </h4>
                  <p className="w-full text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    إذا عادت الوزارة إلى نظام اختبار المفاضلة، فإن خريجي الثانوية من خارج اليمن يدخلون في نظام المفاضلة والاختبار المعتمد لذلك العام مثل بقية المتقدمين، ما لم تعلن الوزارة استثناءً خاصًا.
                  </p>
                </div>
                <div className="py-1.5 px-2.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)] text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] text-center">
                  المعادلة العامة: 30% معدل الثانوية + 70% نتيجة الاختبار
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ثانيًا: مفاضلة طلاب الدراسات العليا */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={GraduationCap} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: مفاضلة طلاب الدراسات العليا (الماجستير والدكتوراه)
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              طلاب الماجستير والدكتوراه لا يدخلون اختبار المفاضلة الخاص بخريجي الثانوية، وإنما تتم المفاضلة بينهم وفق معايير أكاديمية تحددها وزارة التعليم العالي في إعلان كل دورة:
            </p>

            {/* 3 بطاقات بيضاء متوازنة الارتفاع للماجستير والدكتوراه وطبيعة المنافسة */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-stretch w-full">
              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <h4 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>١. مفاضلة الماجستير</span>
                </h4>
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  عندما تكون المنح متاحة للمنافسة العامة على مستوى المحافظات، تتم مقارنة المتقدمين للماجستير داخل كل محافظة على حدة، ويكون الأساس هو <strong className="text-[var(--mn-heading)]">معدل البكالوريوس</strong> في نفس التخصص المقبول للمنحة.
                </p>
              </div>

              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <h4 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>٢. مفاضلة الدكتوراه</span>
                </h4>
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  تعتمد الوزارة على المؤهلات الأكاديمية السابقة؛ فمثلًا في إعلان منح مصر 2026/2027 كانت معادلة الدكتوراه: <strong className="text-[var(--mn-heading)]">70% معدل البكالوريوس + 30% معدل الماجستير</strong>.
                </p>
              </div>

              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <h4 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineCornerB20 />
                  <span>٣. طبيعة المنافسة العامة</span>
                </h4>
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  في بعض الإعلانات تكون المقاعد متاحة للمنافسة العامة وفق المحافظة والمعدل، بينما قد تخصص الوزارة في دورات أخرى بعض المقاعد لأعضاء هيئة التدريس بالجامعات الحكومية.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ٥. التسجيل والوثائق ومواد الاختبار                                         */}
      {/* ========================================================================= */}
      <div
        id="docs-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={ClipboardCheck}
          title="٥. التسجيل والوثائق ومواد الاختبار"
          className="mb-1"
        />

        {/* 1. إجراءات ووثائق التسجيل الإلكتروني */}
        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={FileText} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: إجراءات ووثائق التسجيل الإلكتروني
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              عندما تعلن وزارة التعليم العالي فتح التسجيل لاختبار المفاضلة، تنشر رابطًا إلكترونيًا مخصصًا للتسجيل، ويدخل الطالب لتعبئة بياناته ورفع الوثائق المطلوبة:
            </p>

            {/* شبكة الوثائق المطلوبة بـ 8 بطاقات بيضاء متوازنة (4 صفوف × عمودين) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
              {[
                'صورة شخصية حديثة وواضحة للمتقدم.',
                'جواز السفر أو وثيقة الهوية المعتمدة.',
                'شهادة الثانوية العامة وكشف الدرجات.',
                'رقم الجلوس والبيانات الدراسية المقررة.',
                'رقم الهاتف الفعال وبيانات التواصل الدقيقة.',
                'تحديد الرغبات والدول المتاحة بدقة.',
                'اختيار مركز الامتحان من المراكز المعتمدة.',
                'إثبات سداد رسوم التسجيل وحفظ الاستمارة.',
              ].map((doc, idx) => (
                <div
                  key={idx}
                  className="h-full rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] px-3 py-2 flex items-center shadow-2xs"
                >
                  <InlineDashDotIcon />
                  <span className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-[1.5]">
                    {doc}
                  </span>
                </div>
              ))}
            </div>

            {/* مسار وخطوات التسجيل في بطاقة بيضاء */}
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2 w-full">
              <span className="text-[var(--mn-heading)] font-bold text-[11.5px] sm:text-[12px] flex items-center">
                <InlineDiamondIcon />
                <span>مسار وخطوات التسجيل بالترتيب:</span>
              </span>
              <div className="pt-1.5 border-t border-[var(--mn-border)]/70 font-bold inline-flex flex-wrap items-center justify-start gap-y-2 gap-x-1.5 w-full">
                {[
                  'إعلان فتح التسجيل',
                  'الدخول للرابط المخصص',
                  'تعبئة البيانات ورفع الوثائق',
                  'اختيار مركز الامتحان',
                  'دفع الرسوم واعتماد الطلب',
                  'حضور الاختبار بالمركز',
                  'صدور النتائج والترشيح',
                ].map((step, idx, arr) => (
                  <React.Fragment key={idx}>
                    <span className="text-[var(--mn-heading)] text-[11px] sm:text-[11.5px] font-bold">
                      <span className="text-[#0E7C86] ml-0.5 font-bold">{idx + 1}.</span>
                      {step}
                    </span>
                    {idx < arr.length - 1 && (
                      <ArrowLeft className="w-3.5 h-3.5 text-[#0E7C86] mx-0.5 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. مواد الامتحان والوحدات الداخلة */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={BookMarked} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: مواد الامتحان والوحدات الداخلة (نظام 2025–2026م)
            </h3>
          </div>

          <div className="p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlineDiamondIcon />
              <strong className="text-[var(--mn-heading)] ml-1">قاعدة اعتماد المقررات والمحذوفات:</strong>
              المواد والوحدات المقررة والأجزاء المحذوفة في اختبار المفاضلة تكون بحسب مقررات آخر دفعة تخرجت من الثانوية العامة قبل موعد الاختبار (مثال: لاختبار يناير 2027 يُعتمد مقرر ومحذوفات العام الدراسي 2025–2026م).
            </p>
          </div>

          {/* جدول المواد والوحدات والمحذوفات بأسلوب Edge-to-Edge — مع أيقونات نيلية للمواد الثلاث */}
          <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-x-auto font-['Cairo',sans-serif]">
            <table className="w-full min-w-[420px] text-right border-collapse">
              <thead>
                <tr className="bg-gradient-to-l from-[#153B75] to-[#056579] text-white text-[11.5px] font-bold">
                  <th className="py-2 px-2.5 sm:px-3 border-l border-white/15 w-1/5">المادة</th>
                  <th className="py-2 px-2.5 sm:px-3 border-l border-white/15 w-2/5">الوحدات والدروس المقررة</th>
                  <th className="py-2 px-2.5 sm:px-3">الأجزاء والدروس المحذوفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mn-border)] text-[11.5px] sm:text-[12px] font-bold">
                <tr className="bg-[var(--mn-surface)]">
                  <td className="py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[var(--mn-heading)]">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                      <span>مادة الرياضيات</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[var(--mn-text)] leading-[1.85]">
                    6 وحدات: الوحدة الأولى (1-1 إلى 6-1)، الوحدة الثانية (1-2 حتى 4-2)، الوحدة الثالثة (1-3 إلى 3-3)، الوحدة الرابعة (1-4 حتى 4-4)، الوحدة السادسة (1-6 إلى 9-6)، الوحدة السابعة (1-7 حتى 4-7).
                  </td>
                  <td className="py-2.5 px-2.5 sm:px-3 text-[var(--mn-text)] leading-[1.85]">
                    • الوحدة 1: التمثيل الهندسي لجمع وطرح الأعداد المركبة، إثبات خواص الجمع والمرافق والصورة القطبية، وإيجاد الجذر التربيعي بالصيغة الجبرية.<br />
                    • الوحدة 3: إثبات المبرهنات الأساسية في الاحتمال.<br />
                    • الوحدة 6: المسائل التطبيقية على القيم القصوى، ودراسة تغير الدالة ورسمها.
                  </td>
                </tr>
                <tr className="bg-[var(--mn-page)]">
                  <td className="py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[var(--mn-heading)]">
                    <div className="flex items-center gap-1.5">
                      <Beaker className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                      <span>مادة الكيمياء</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[var(--mn-text)] leading-[1.85]">
                    جميع الوحدات داخلة في الامتحان (من الوحدة 1 إلى الوحدة 6) شاملة كافة المفاهيم والمعادلات والقوانين المقررة للصف الثالث الثانوي.
                  </td>
                  <td className="py-2.5 px-2.5 sm:px-3 text-[#0E7C86] dark:text-[#21A7B4]">
                    كاملة بدون أي دروس ملغاة.
                  </td>
                </tr>
                <tr className="bg-[var(--mn-surface)]">
                  <td className="py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[var(--mn-heading)]">
                    <div className="flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#F2CD78] shrink-0" />
                      <span>اللغة الإنجليزية</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 sm:px-3 border-l border-[var(--mn-border)] text-[var(--mn-text)] leading-[1.85]">
                    • المنهج الأساسي (Coursebook): Units 1–5<br />
                    • Science Reader: الدروس 1–4 & 6<br />
                    • Art Reader: الدروس 2، 4، 6، 10
                  </td>
                  <td className="py-2.5 px-2.5 sm:px-3 text-[var(--mn-text)] leading-[1.85]">
                    ما عدا الوحدات والدروس المذكورة في الكتب الثلاثة المقررة.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. لماذا لم يوجد اختبار مفاضلة في عام 2026؟ */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={ShieldAlert} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثالثًا: لماذا لم يوجد اختبار مفاضلة في عام 2026؟ وكيف تمت المفاضلة؟
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              <strong className="text-[var(--mn-heading)] ml-1">استثناء عام 2026/2027:</strong>
              ألغت وزارة التعليم العالي اختبار المفاضلة <strong className="text-[var(--mn-heading)]">بصورة استثنائية</strong> بسبب الأوضاع وصعوبة تنقل آلاف الطلاب بين المحافظات للوصول إلى مراكز الاختبار في (عدن – تعز – حضرموت – مأرب)، واعتمدت الآلية البديلة التالية:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-stretch">
              <div className="h-full flex items-center rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs">
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.75]">
                  <InlineDashDotIcon />
                  الاعتماد في منح البكالوريوس على <strong className="text-[var(--mn-heading)]">معدل الثانوية العامة</strong> في ترتيب الطلاب.
                </p>
              </div>
              <div className="h-full flex items-center rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs">
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.75]">
                  <InlineDashDotIcon />
                  عند تساوي المعدل يتم الرجوع إلى <strong className="text-[var(--mn-heading)]">المجموع العلمي</strong> (رياضيات، فيزياء، كيمياء، أحياء).
                </p>
              </div>
              <div className="h-full flex items-center rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs">
                <p className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-text)] leading-[1.75]">
                  <InlineDashDotIcon />
                  تتم المفاضلة <strong className="text-[var(--mn-heading)]">داخل كل محافظة على حدة</strong> بحسب المقاعد المخصصة لها.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ٦. ماذا أفعل قبل اختبار المفاضلة وما بعده؟ */}
      <div
        id="before-exam-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={Compass}
          title="٦. ما قبل اختبار المفاضلة وما بعده"
          className="mb-1"
        />

        {/* 1. قبل الاختبار */}
        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={AlertCircle} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: قبل الاختبار — الخطأ الشائع الذي يضيع الفرص!
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              هناك خطأ يقع فيه كثير من الطلاب، وهو أن ينتظر الطالب أولًا حتى يؤدي اختبار التبادل الثقافي، ثم يبدأ بعد ذلك بالتقديم على المنح التي يريد المنافسة عليها. وهذا قد يتسبب في ضياع بعض الفرص؛ لأن مواعيد التقديم في بعض الدول قد تنتهي قبل موعد اختبار المفاضلة نفسه.
            </p>
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pt-2 border-t border-[var(--mn-border)]/70">
              <InlineDashDotIcon />
              <strong className="text-[var(--mn-heading)] ml-1">المبادرة المبكرة:</strong>
              لذلك من لحظة إعلان الوزارة عن منح التبادل الثقافي، يجب أن تتابع صفحة وزارة التعليم العالي وإعلانات كل دولة، وتعرف هل توجد دولة تشترط منك أن تقدم في موقعها أو في موقع المنحة قبل موعد الاختبار.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1 items-stretch">
              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1 border-b border-[var(--mn-border)]">
                  <InlineDiamondIcon />
                  <span>مثال توضيحي: منحة المجر</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  إذا كان آخر موعد للتقديم على المنحة المجرية هو 15 يناير، واختبار المفاضلة يوم 20 يناير، فلا تنتظر! سجل في المنحة المجرية قبل 15 يناير، ثم ادخل الاختبار، وإذا فزت ستقوم الوزارة بترشيحك.
                </p>
              </div>

              <div className="h-full flex flex-col justify-between rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-1.5">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1 border-b border-[var(--mn-border)]">
                  <InlineDiamondIcon />
                  <span>مثال توضيحي: الصين (اختبار CSCA)</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  إذا كان الترشيح يشترط اختبار CSCA والتقديم ينتهي في مارس، فيجب إنهاء اختبار CSCA في إحدى الدورات المبكرة (ديسمبر أو يناير) لتكون النتيجة جاهزة قبل انتهاء موعد المنحة.
                </p>
              </div>
            </div>
          </div>

          <div className="relative p-3 pr-4 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs w-full overflow-hidden">
            <SelectiveAccentBar />
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlineDiamondIcon />
              <strong className="text-[var(--mn-heading)] ml-1">القاعدة الذهبية:</strong>
              لا تجعل اختبار المفاضلة هو أول خطوة في كل الحالات؛ تابع مواعيد كل دولة من البداية، وقدّم مبكرًا على موقع المنحة نفسه إذا كان إعلانها يتطلب ذلك.
            </p>
          </div>
        </div>

        {/* 2. ماذا أفعل بعد اختبار المفاضلة؟ */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Bell} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: ماذا أفعل بعد اختبار المفاضلة؟
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              بعد أداء اختبار المفاضلة، لا تنتظر النتيجة فقط، بل استمر في متابعة صفحات وزارة التعليم العالي وإعلاناتها أولًا بأول؛ لأن طريقة استكمال التقديم تختلف من دولة إلى أخرى.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full items-stretch">
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1.5 shadow-2xs">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>المجر والصين</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  لا يكفي التسجيل لدى الوزارة فقط، بل يجب أن تكون قد قدمت في{' '}
                  <strong className="text-[var(--mn-heading)]">الموقع الرسمي للمنحة</strong> حسب تعليمات كل دولة، ثم تأتي مرحلة ترشيحك من الوزارة إذا كنت من الفائزين ومستوفيًا للشروط.
                </p>
              </div>

              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1.5 shadow-2xs">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>بقية دول التبادل الثقافي</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  مثل (الأردن، الجزائر، المغرب، كوبا، باكستان). عادةً تعلن الوزارة لاحقًا عن{' '}
                  <strong className="text-[var(--mn-heading)]">رابط التسجيل الخاص بكل دولة</strong>، ويتقدم الطالب من خلال الرابط ويستكمل إجراءاته المطلوبة.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-2 shadow-2xs w-full">
              <span className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                <InlineDiamondIcon />
                <span>مهمتك الأساسية بعد الاختبار:</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5 border-t border-[var(--mn-border)]/70 text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] items-stretch">
                {[
                  'متابعة النتائج',
                  'أسماء المرشحين',
                  'روابط التسجيل',
                  'تعليمات كل دولة',
                  'المواعيد النهائية',
                  'استكمال الوثائق المطلوبة',
                ].map((tag) => (
                  <div
                    key={tag}
                    className="h-full flex items-center px-2.5 py-1.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)]"
                  >
                    <InlinePetrolDot />
                    <span>{tag}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text-muted)] pt-1.5 border-t border-[var(--mn-border)]/70">
                وعدم التأخر عن أي خطوة أو إعلان رسمي تنشره وزارة التعليم العالي.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ٧. ملحق خاص: منحة الحكومة المجرية */}
      <div
        id="hungary-scholarship-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={Landmark}
          title="٧. ملحق خاص: منحة الحكومة المجرية"
          className="mb-1"
        />

        {/* نظرة عامة وملاحظة حاسمة */}
        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={BookOpen} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: طبيعة المسار المزدوج في المنحة المجرية
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              <strong className="text-[var(--mn-heading)] ml-1">منحة الحكومة المجرية</strong>
              من أهم منح التبادل الثقافي لليمنيين، ويختلف مسارها قليلًا عن بقية الدول؛ لأن الطالب لا يكتفي بالتسجيل لدى وزارة التعليم العالي اليمنية، بل يجب عليه أيضًا التقديم في موقع المنحة المجرية نفسه.
            </p>
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              ولهذا فإن التقديم على المجر يمر بمسارين مرتبطين ببعض: التسجيل في منصة المنحة المجرية + الترشيح من وزارة التعليم العالي اليمنية. وإذا أهمل الطالب أحد المسارين، فقد يفقد فرصة الترشيح حتى لو كانت نتيجته قوية في المفاضلة.
            </p>

            <div className="relative rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 pr-3.5 shadow-2xs overflow-hidden">
              <SelectiveAccentBar />
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <InlineDiamondIcon />
                <strong className="text-[#0E7C86] dark:text-[#21A7B4] ml-1">ملاحظة حاسمة:</strong>
                فإذا أغلقت المنصة المجرية ولم يكن لديك طلب مسجل فيها، فلن تستطيع وزارة التعليم العالي ترشيحك للمجر لاحقًا، حتى لو حصلت على أعلى نتيجة في اختبار المفاضلة أو كنت الأول على محافظتك.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full items-stretch">
            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--mn-border)]">
                  <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                    <InlineCornerB20 />
                    <span>كم عدد منح المجر لليمن؟</span>
                  </h4>
                  <span className="text-[11px] font-bold text-[var(--mn-heading)] shrink-0">
                    62 مقعداً
                  </span>
                </div>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  في دورة 2026/2027 كان العدد 62 مقعدًا موزعة إلى:
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[var(--mn-border)] rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] py-2 text-center text-[11.5px] sm:text-[12px] font-bold">
                <div className="text-[var(--mn-heading)] px-2">
                  <span className="block text-[13.5px] font-bold">47</span>
                  <span>مقعد بكالوريوس</span>
                </div>
                <div className="text-[#0E7C86] dark:text-[#21A7B4] px-2">
                  <span className="block text-[13.5px] font-bold">15</span>
                  <span>مقعد ماجستير</span>
                </div>
              </div>
              <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text-muted)] leading-[1.85] text-justify">
                وهذا العدد ليس ثابتًا كل عام، فقد يزيد أو ينقص بحسب الحصة المخصصة لليمن في كل دورة.
              </p>
            </div>

            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--mn-border)]">
                  <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                    <InlineCornerB20 />
                    <span>متى يبدأ التقديم؟</span>
                  </h4>
                  <span className="text-[11px] font-bold text-[#0E7C86] dark:text-[#21A7B4] shrink-0">
                    قبل المفاضلة
                  </span>
                </div>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  يبدأ التقديم على منحة الحكومة المجرية عادة قبل موعد اختبار المفاضلة اليمني، ولهذا يجب على الطالب الانتباه إلى موعد إغلاق المنصة المجرية وعدم انتظار الاختبار.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] px-2.5 py-2 space-y-1 text-[11.5px] sm:text-[12px] font-bold">
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--mn-heading)]">إعلان وزارة التعليم العالي:</span>
                  <strong className="text-[var(--mn-text)]">20 نوفمبر 2025</strong>
                </div>
                <div className="flex justify-between gap-2 border-t border-[var(--mn-border)]/70 pt-1">
                  <span className="text-[var(--mn-heading)]">آخر موعد في منصة المنحة:</span>
                  <strong className="text-[var(--mn-text)]">15 يناير 2026</strong>
                </div>
              </div>
              <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text-muted)] leading-[1.85] text-justify">
                لذلك إذا كنت تريد المنافسة على منحة المجر، يجب أن تقدم في الموقع الرسمي للمنحة المجرية قبل موعد الإغلاق.
              </p>
            </div>
          </div>
        </div>

        {/* خطوات التقديم والوثائق والترشيح */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={ClipboardCheck} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: طريقة التقديم والوثائق ومراحل التقييم الجامعي
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <div className="p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-2 w-full">
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDashDotIcon />
                <span>كيف يتم التقديم؟</span>
              </h4>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                يدخل الطالب إلى منصة منحة الحكومة المجرية وينشئ طلبه، ثم يختار البرامج والجامعات التي يريدها، ويسمح له باختيار برنامجين دراسيين كحد أقصى بحسب البرامج المتاحة لليمن في تلك الدورة. بعد ذلك يكمل الطالب أيضًا إجراءات التسجيل التي تطلبها وزارة التعليم العالي اليمنية حتى يدخل في المفاضلة والترشيح للمقاعد المخصصة لليمن.
              </p>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-[1.85] pt-1.5 border-t border-[var(--mn-border)]/70">
                <InlineDiamondIcon />
                إذن التسجيل في الموقع المجري وحده لا يكفي، وكذلك التسجيل لدى الوزارة وحده لا يكفي؛ يجب استكمال المسارين.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-2 w-full">
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDashDotIcon />
                <span>ما الوثائق المطلوبة؟</span>
              </h4>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                عند التقديم في منصة المنحة المجرية يرفع الطالب الوثائق المطلوبة بحسب الدرجة العلمية والتخصص والجامعة، وتشمل عادة: جواز السفر أو البطاقة الشخصية + شهادة المؤهل الدراسي + كشف الدرجات + إثبات اللغة + خطاب الدافع + الصورة الشخصية، مع ترجمة الوثائق إلى اللغة المطلوبة عند الحاجة.
              </p>
              <div className="pt-2 border-t border-[var(--mn-border)]/70 space-y-1.5 text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <p className="w-full">
                  <InlinePetrolDot />
                  وإذا لم يكن جواز السفر جاهزًا وقت التقديم، يمكن للطالب التقديم باستخدام البطاقة الشخصية السارية مع رفع تعهد باستكمال جواز السفر لاحقًا، وكان آخر موعد لاستكمال الجواز في دورة 2026/2027 هو 1 أغسطس 2026.
                </p>
                <p className="w-full">
                  <InlinePetrolDot />
                  وكذلك إذا كان الطالب ينتظر صدور شهادة اللغة الإنجليزية أو نتيجة اختبار اللغة، فيمكنه رفع التعهد المطلوب وقت التقديم ثم استكمال إثبات اللغة لاحقًا، وكان آخر موعد لذلك في تلك الدورة 1 أغسطس 2026.
                </p>
                <p className="w-full">
                  <InlinePetrolDot />
                  وفي بعض الحالات، إذا كان الطالب في السنة الأخيرة ولم تصدر شهادته النهائية بعد، يسمح له البرنامج برفع التعهد والمستندات المتاحة ثم استكمال الشهادة النهائية في الموعد المحدد للوثائق المؤجلة.
                </p>
              </div>
              <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text-muted)] leading-[1.85] text-justify pt-1.5 border-t border-[var(--mn-border)]/70">
                وقد تطلب بعض الجامعات أو التخصصات مستندات إضافية، لذلك بعد اختيار البرنامج يجب فتح صفحته وقراءة متطلباته بالتحديد، وعدم الاعتماد على قائمة عامة فقط.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-2 w-full">
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDashDotIcon />
                <span>ماذا يحدث بعد التقديم والترشيح؟</span>
              </h4>
              <div className="space-y-2 text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <p>
                  بعد إرسال الطلب في المنصة المجرية، يتم أولًا فحص الطلب والتأكد من اكتمال البيانات والوثائق، ثم تأتي مرحلة الترشيح من الجانب اليمني بحسب نتائج المفاضلة وعدد المقاعد المتاحة. إذا رشحتك وزارة التعليم العالي، ينتقل ملفك بعد ذلك إلى الجامعة أو الجامعات المجرية التي اخترتها، وهنا تبدأ مرحلة التقييم الأكاديمي (مقابلة شخصية، اختبار قبول، أو اختبار لغة).
                </p>
                <p className="text-[var(--mn-heading)]">
                  لذلك ترشيحك من وزارة التعليم العالي لا يعني أنك حصلت على المنحة النهائية؛ بل يجب أيضًا أن تقبلك الجامعة المجرية.
                </p>
                <p>
                  وإذا لم تُقبل في خيارك الأول، فقد يستمر النظر في الخيار الثاني إذا كان متاحًا ضمن طلبك وترشيحك. أما إذا تم رفضك في الخيارين معًا، فلا يوجد تعويض تلقائي من وزارة التعليم العالي بجامعة أو تخصص آخر. بعد اجتياز التقييم الجامعي واستكمال بقية مراحل البرنامج، تصدر النتيجة النهائية للمنحة من الجانب المجري.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* التمويل وما بعد القبول */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Award} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثالثًا: التمويل والمزايا وما بعد القبول النهائي
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full items-stretch">
            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <div className="space-y-2">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>ما تمويل ومزايا المنحة؟</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  تغطي منحة الحكومة المجرية الرسوم الدراسية كاملة طوال مدة الدراسة. كما يحصل طلاب البكالوريوس والماجستير والبرامج ذات المرحلة الواحدة على راتب شهري قدره 43,700 فورنت مجري، أي حوالي 137 دولارًا تقريبًا وقت إعداد هذا الشرح، إضافة إلى السكن الجامعي المجاني (أو بدل سكن 40,000 فورنت مجري شهريًا) والتأمين الصحي.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1">
                <span className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                  <InlineDiamondIcon />
                  <span>مخصصات الطلاب اليمنيين الموفدين:</span>
                </span>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  توجد أيضًا مخصصات مالية من وزارة التعليم العالي اليمنية إلى جانب مزايا المنحة المجرية، وفق نظام الإيفاد والاعتمادات المالية المعمول بها.
                </p>
              </div>
            </div>

            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <div className="space-y-2">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>ماذا بعد القبول النهائي؟</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بعد صدور القبول النهائي، يبدأ الطالب بإجراءات قبول المنحة، واستخراج التأشيرة، وتجهيز وثائق السفر، واستكمال إجراءات الإيفاد والمخصصات المالية لدى وزارة التعليم العالي اليمنية، ثم السفر إلى المجر والتسجيل في الجامعة.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1">
                <span className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                  <InlineDiamondIcon />
                  <span>القاعدة الأهم في منحة المجر:</span>
                </span>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  قدّم في المنصة المجرية مبكرًا، ثم أكمل مسار وزارة التعليم العالي، ولا تعتبر الترشيح من الوزارة قبولًا نهائيًا حتى تجتاز تقييم الجامعة وتصدر النتيجة النهائية للمنحة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ٨. ملحق خاص: منحة الحكومة الصينية */}
      <div
        id="china-scholarship-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={Globe}
          title="٨. ملحق خاص: منحة الحكومة الصينية"
          className="mb-1"
        />

        {/* نظرة عامة ومقاعد ومواعيد */}
        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={BookOpen} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: نظام التقديم المزدوج وعدد المقاعد والمواعيد
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              <strong className="text-[var(--mn-heading)] ml-1">منحة الحكومة الصينية</strong>
              تختلف عن كثير من منح التبادل الثقافي؛ لأن التقديم عليها لا يقتصر على التسجيل لدى وزارة التعليم العالي اليمنية فقط، بل يمر بمسارين مرتبطين ببعض: التسجيل في منصة منحة الحكومة الصينية{' '}
              <span className="font-mono text-[var(--mn-heading)]">CampusChina</span> ضمن مسار{' '}
              <span className="font-mono text-[var(--mn-heading)]">Type A</span>، ثم استكمال الترشيح عبر وزارة التعليم العالي اليمنية.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full items-stretch">
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--mn-border)]">
                  <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                    <InlineCornerB20 />
                    <span>عدد المقاعد المتاحة لعام 2026</span>
                  </h4>
                  <span className="text-[11px] font-bold text-[var(--mn-heading)] shrink-0">
                    عام 2026
                  </span>
                </div>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[var(--mn-heading)]">عدد المقاعد المتاحة لعام 2026:</strong> 10 مقاعد بكالوريوس و22 ماجستير.
                </p>
              </div>

              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--mn-border)]">
                  <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                    <InlineCornerB20 />
                    <span>مواعيد التقديم</span>
                  </h4>
                  <span className="text-[11px] font-bold text-[#0E7C86] dark:text-[#21A7B4] shrink-0">
                    فبراير إلى مارس
                  </span>
                </div>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <strong className="text-[var(--mn-heading)]">آخر موعد للتقديم في كل سنة:</strong> فبراير إلى مارس.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* طريقة التسجيل واختبار CSCA والوثائق */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={ClipboardCheck} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: طريقة التسجيل واختبار CSCA والوثائق المطلوبة
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <div className="relative p-3 pr-4 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-2 w-full overflow-hidden">
              <SelectiveAccentBar />
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDashDotIcon />
                <span>طريقة التسجيل ورقم الوكالة (Agency Number)</span>
              </h4>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                يبدأ الطالب بالتسجيل في منصة <span className="font-mono">CampusChina</span> ضمن مسار <span className="font-mono">Type A</span>، وبالنسبة لليمن يستخدم <strong className="text-[var(--mn-heading)]">Agency Number: 8861</strong>. وبعد إكمال الطلب يجب حفظ استمارة الطلب بصيغة PDF ورقم الطلب؛ لأن وزارة التعليم العالي قد تطلبهما عند فتح مرحلة التسجيل والترشيح لديها.
              </p>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                وفي دورة 2026/2027 بدأ التسجيل في المنصة الصينية أولًا، ثم فتحت الوزارة بعد ذلك المرحلة الخاصة بها للطلاب الذين أتموا التسجيل الخارجي. لذلك لا تنتظر رابط الوزارة إذا كان التسجيل الصيني قد بدأ، بل أنجز تسجيلك في المنصة أولًا ثم أكمل تسجيل الوزارة عندما تعلن عنه.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-2 w-full">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--mn-border)]">
                <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                  <InlineDashDotIcon />
                  <span>اختبار CSCA لطلاب البكالوريوس</span>
                </h4>
                <span className="text-[11px] font-bold text-[#0E7C86] dark:text-[#21A7B4] shrink-0">
                  خاص بالبكالوريوس
                </span>
              </div>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                طلاب البكالوريوس عليهم الانتباه إلى اختبار CSCA؛ لأنه مختلف عن اختبار المفاضلة اليمني. اختبار المفاضلة تستخدمه وزارة التعليم العالي لترتيب واختيار المرشحين داخل اليمن، بينما CSCA اختبار صيني يدخل ضمن متطلبات التقديم والقبول للبكالوريوس.
              </p>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                لذلك من الأفضل أن يؤدي الطالب الاختبار مبكرًا، مثل ديسمبر أو يناير، حتى تكون النتيجة جاهزة قبل إغلاق التقديم على منحة الحكومة الصينية. وفي الدورة السابقة كان عدد الطلاب الذين تم ترشيحهم للصين قليلًا (حوالي 10 طلاب فقط) لأن عددًا كبيرًا من الطلاب لم يكن قد أدى اختبار CSCA المطلوب.
              </p>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text-muted)] leading-[1.85] text-justify pt-1.5 border-t border-[var(--mn-border)]/70">
                وتختلف مواد CSCA حسب التخصص، ومن المواد التي قد تدخل فيه الرياضيات والكيمياء والفيزياء واللغة الصينية بحسب البرنامج والجامعة.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-2 w-full">
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDashDotIcon />
                <span>الوثائق المطلوبة ولغة الدراسة</span>
              </h4>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                تشمل الوثائق المطلوبة عادة جواز سفر ساري المفعول، الشهادة الدراسية، كشف الدرجات، ترجمة وتصديق الوثائق المطلوبة، إثبات اللغة، استمارة الطلب من CampusChina، نتيجة CSCA لطلاب البكالوريوس، خطة الدراسة، الفحص الطبي، والسجل الجنائي، بالإضافة إلى رسالتي توصية أكاديمية للماجستير والدكتوراه.
              </p>
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pt-1.5 border-t border-[var(--mn-border)]/70">
                <InlinePetrolDot />
                ويجب الانتباه أيضًا إلى لغة الدراسة؛ فبعض البرامج تكون باللغة الصينية وتطلب مستوى معينًا في اللغة مثل HSK، وقد يحتاج الطالب في بعض الحالات إلى دراسة سنة لغة تحضيرية قبل بدء التخصص.
              </p>
            </div>
          </div>
        </div>

        {/* ما بعد الترشيح والتمويل */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Award} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثالثًا: التغطية المالية وما بعد الترشيح والقبول
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full items-stretch">
            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <div className="space-y-2">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>تغطية المنحة</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  تغطي منحة الحكومة الصينية الرسوم الدراسية كاملة + السكن الجامعي أو بدل السكن + التأمين الطبي + راتب شهري للمعيشة.
                </p>
                <div className="rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1 text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)]">
                  <p>ويبلغ الراتب عادة:</p>
                  <ul className="space-y-1">
                    <li>
                      <InlinePetrolDot />
                      <strong className="text-[var(--mn-heading)] ml-1">البكالوريوس:</strong>
                      2,500 يوان شهريًا، أي حوالي 373 دولارًا.
                    </li>
                    <li>
                      <InlinePetrolDot />
                      <strong className="text-[var(--mn-heading)] ml-1">الماجستير:</strong>
                      3,000 يوان شهريًا، أي حوالي 447 دولارًا.
                    </li>
                  </ul>
                </div>
              </div>
              <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text-muted)] leading-[1.85] text-justify">
                وبالنسبة للطلاب اليمنيين الموفدين عبر وزارة التعليم العالي، توجد أيضًا مخصصات مالية من الوزارة اليمنية إلى جانب مزايا المنحة الصينية.
              </p>
            </div>

            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <div className="space-y-2">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>ماذا يحدث بعد الترشيح والقبول النهائي؟</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بعد أن ترشحك وزارة التعليم العالي، ينتقل الملف إلى الجانب الصيني والجامعة المعنية لمراجعته والتأكد من استيفاء شروط القبول والمنحة؛ فالمنحة لا تصبح نهائية إلا بعد موافقة الجانب الصيني وصدور نتيجة القبول.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1 text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)]">
                <span className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                  <InlineDiamondIcon />
                  <span>إجراءات ما بعد القبول النهائي:</span>
                </span>
                <p className="leading-[1.85] text-justify">
                  يستلم الطالب خطاب القبول ووثائق المنحة للتأشيرة، ويتابع مع وزارة التعليم العالي لاستكمال قرار الإيفاد والإجراءات المالية والمخصصات الخاصة به قبل السفر.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ٩. ملحق خاص: منحة جامعة الأمير محمد بن فهد */}
      <div
        id="pmu-scholarship-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={Award}
          title="٩. منحة جامعة الأمير محمد بن فهد"
          className="mb-1"
        />

        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={BookOpen} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: آلية التقديم وشروط القبول في الجامعة
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              في دورة 2026/2027 أعلنت وزارة التعليم العالي اليمنية عن منحتين دراسيتين ممولتين بالكامل في{' '}
              <strong className="text-[var(--mn-heading)]">جامعة الأمير محمد بن فهد</strong> بالسعودية ضمن برنامج المنح العالمية، بالتعاون مع اتحاد الجامعات العربية. ويختلف هذا المسار عن المجر والصين؛ لأنه يبدأ بالتقديم في جامعة الأمير محمد بن فهد نفسها، ثم يكمل الطالب المرحلة الثانية لدى وزارة التعليم العالي اليمنية.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full items-stretch">
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>طريقة وموعد التسجيل</span>
                </h4>
                <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  التقديم هنا <strong className="text-[var(--mn-heading)]">يبدأ من الجامعة نفسها أولًا</strong>. يدخل الطالب إلى موقع جامعة الأمير محمد بن فهد، ويملأ طلب القبول والمنحة ويرفع المستندات المطلوبة، وبعد إتمام التسجيل في الجامعة ينتقل إلى المرحلة الثانية ويسجل في رابط وزارة التعليم العالي اليمنية.
                </p>
              </div>

              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>شروط ووثائق التقديم</span>
                </h4>
                <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  شهادة الثانوية (بمعدل لا يقل عن 85% للمنحة الكاملة)، جواز السفر، صورتان شخصيتان، ونتيجة SAT أو ما يعادلها، بالإضافة إلى إثبات اللغة مثل IELTS بدرجة 6.0 على الأقل (وبحد أدنى 5.5 في الكتابة) وإجراء مقابلة مع مكتب القبول.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={CheckCircle2} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: التغطية المالية وما بعد الترشيح والقبول
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full items-stretch">
            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <div className="space-y-2">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>تغطية المنحة</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  بحسب دليل برنامج المنح العالمية الذي أحالت إليه الوزارة، فإن فئة التغطية الكاملة للطلاب الدوليين المتميزين تشمل:
                </p>
              </div>
              <div className="rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-[1.85] text-justify">
                إعفاء كامل من الرسوم الدراسية والكتب + سكن جامعي مجاني + مواصلات + تأمين صحي + راتب شهري قدره 800 دولار + تذكرة طيران اقتصادية ذهابًا وعودة مرة كل سنة، إضافة إلى حافز يصل إلى 1,000 دولار لكل فصل دراسي عند تحقيق التميز الأكاديمي.
              </div>
            </div>

            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <div className="space-y-2">
                <h5 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>ماذا بعد التقديم والقبول؟</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  ترشيحك من الوزارة يعني أنك فزت بمرحلة الترشيح اليمني، ثم يجب استكمال إجراءات الجامعة والحصول على قبولها النهائي قبل اكتمال المنحة، وبعدها استكمال إجراءات التأشيرة والسكن والسفر.
                </p>
              </div>
              <div className="relative rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 pr-3.5 space-y-1 overflow-hidden">
                <SelectiveAccentBar />
                <span className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
                  <InlineDiamondIcon />
                  <span>قاعدة منحة جامعة الأمير محمد بن فهد:</span>
                </span>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  التقديم يبدأ من بوابة الجامعة أولاً ثم التسجيل في رابط وزارة التعليم العالي اليمنية، وترشيح الوزارة خطوة أولى مشروطة بموافقة وقبول الجامعة النهائي.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ١٠. ملحق خاص: منح مصر والجزائر وكوبا وباكستان */}
      <div
        id="egypt-scholarship-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={MapPin}
          title="١٠. منح مصر والجزائر وكوبا وباكستان"
          className="mb-1"
        />

        {/* أولًا: المنح الدراسية في مصر */}
        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Landmark} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">أولًا: المنح الدراسية في مصر</h3>
          </div>

          <div className="p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              في دورة 2026/2027 أعلنت وزارة التعليم العالي اليمنية عن مسارين مختلفين للدراسة في <strong className="text-[var(--mn-heading)]">مصر</strong>، ويجب على الطالب التفريق بينهما لأن التمويل والتخصصات ليست واحدة:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <h5 className="text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>المسار الأول: منح التبادل الثقافي الشاملة</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  مخصصة للتخصصات النوعية مثل الطب البشري وطب الأسنان وبقية العلوم الصحية (باستثناء التمريض والعلاج الطبيعي)، والهندسة، وعلوم الحاسوب والذكاء الاصطناعي، والعلوم الأساسية.
                </p>
              </div>

              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <h5 className="text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>المسار الثاني: المقاعد الدراسية المجانية</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  مخصصة للتخصصات الأدبية والإنسانية والاجتماعية والاقتصادية والإدارية. والمقعد المجاني هنا يعني إعفاءً من الرسوم الدراسية فقط، ولا تتحمل الوزارة بقية تكاليف الطالب المالية.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <InlineDiamondIcon />
                <strong className="text-[var(--mn-heading)] ml-1">طريقة التسجيل وشروط المفاضلة:</strong>
                يتم التقديم مباشرة عبر روابط ومنصة وزارة التعليم العالي اليمنية دون الحاجة لفتح طلب مستقل في منصة مصرية قبل المفاضلة. للبكالوريوس يشترط ألا يتجاوز العمر 22 عامًا وتعتمد المفاضلة على معدل الثانوية العامة (وعند التساوي مجموع المواد العلمية)، وللماجستير الحد العمري 30 عامًا، وللدكتوراه 32 عامًا (70% بكالوريوس + 30% ماجستير).
              </p>
            </div>
          </div>
        </div>

        {/* ثانيًا: الدراسة في الجزائر */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Globe} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">ثانيًا: الدراسة في الجزائر</h3>
          </div>

          <div className="p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              في دورة 2026/2027 ظهر للجزائر <strong className="text-[var(--mn-heading)]">38 مقعد بكالوريوس</strong> ضمن البيانات المدققة، منها <strong className="text-[var(--mn-heading)]">10 مقاعد للطب البشري</strong>. وهذه الأرقام تخص تلك الدورة فقط، وقد يتغير عدد المقاعد والتخصصات من سنة إلى أخرى.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <h5 className="text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>موعد وطريقة التسجيل</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  كانت الجزائر ضمن جولة يونيو 2026، وكان التقديم الأولي يتم من خلال بوابة وزارة التعليم العالي اليمنية <span className="font-mono text-[var(--mn-heading)]">portal.moheye.net</span> دون الحاجة لإنشاء حساب في منصة جزائرية قبل دخول المفاضلة.
                </p>
              </div>
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <h5 className="text-[12px] font-bold text-[var(--mn-heading)] flex items-center pb-1 border-b border-[var(--mn-border)]">
                  <InlineDashDotIcon />
                  <span>ماذا عن منصة Study in Algeria؟</span>
                </h5>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  مسار التقديم المباشر في Study in Algeria مستقل عن مقعد التبادل الثقافي اليمني. التزم أولًا بالتسجيل في بوابة الوزارة اليمنية، وبعد الفوز بالترشيح اتبع التعليمات الرسمية لاستكمال القبول مع الجانب الجزائري.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ثالثًا: منحة كوبا ورابعًا: الدراسة في باكستان */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Compass} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">ثالثًا ورابعًا: منحة كوبا والدراسة في باكستان</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full items-stretch">
            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDiamondIcon />
                <span>ثالثًا: منحة كوبا (10 مقاعد طب بشري)</span>
              </h4>
              <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <InlineDashDotIcon />
                  <strong className="text-[var(--mn-heading)] ml-1">المقاعد وطريقة التسجيل:</strong>
                  في دورة 2026/2027 ظهر لكوبا 10 مقاعد بكالوريوس جميعها في الطب البشري ضمن جولة يونيو 2026، ويتم التسجيل الأولي عبر رابط وزارة التعليم العالي اليمنية مباشرة، ويتضمن المسار سنة لدراسة اللغة الإسبانية قبل بدء البرنامج.
                </p>
              </div>
            </div>

            <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                <InlineDiamondIcon />
                <span>رابعًا: الدراسة في باكستان</span>
              </h4>
              <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)]">
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <InlineDashDotIcon />
                  <strong className="text-[var(--mn-heading)] ml-1">طريقة التسجيل والقاعدة العامة:</strong>
                  يتم التقديم الأولي عبر بوابة وزارة التعليم العالي اليمنية ضمن جولة يونيو، ولا يلزم التسجيل في موقع باكستاني خارجي قبل المفاضلة، وبعد الفوز بالترشيح يتم استكمال إجراءات القبول وفق تأكيد الجانب الباكستاني.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ١١. كيف يتم توزيع حصص المحافظات وجدول الـ 22 محافظة */}
      <div
        id="governorate-quotas-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={Scale}
          title="١١. توزيع المقاعد وحصص المحافظات"
          className="mb-1"
        />

        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={Scale} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: قاعدة التوازن وآلية توزيع المقاعد بين المحافظات
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              من المهم أن تعرف أن وزارة التعليم العالي لا تقسم مقاعد كل دولة بالتساوي بين المحافظات، ولا يوجد عدد ثابت يتكرر كل عام لكل محافظة. وتوزيع الحصص يكون إجمالًا على أساس{' '}
              <strong className="text-[var(--mn-heading)]">50% للمحافظات الجنوبية والشرقية</strong>، و
              <strong className="text-[var(--mn-heading)]">50% لبقية المحافظات</strong>، ثم تتوزع المقاعد داخل كل مجموعة بحسب حصص المحافظات والمقاعد المتاحة خلال موسم المنح.
            </p>
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              وفي نتائج دورة 2026/2027 ظهر 205 مقاعد بكالوريوس؛ منها 200 مقعد لطلاب محافظات اليمن و5 مقاعد لفئة الخارج. وعند تجميع عدن ولحج وأبين وحضرموت وشبوة والضالع والمهرة وسقطرى حصلت هذه المحافظات على 101 مقعدًا، مقابل 99 مقعدًا لبقية المحافظات داخل اليمن؛ أي ما يقارب 50.5% مقابل 49.5%.
            </p>
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              لكن قاعدة 50/50 لا تعني أن كل دولة وحدها يجب أن توزع مقاعدها بالنصف؛ فقد تحصل إحدى المجموعتين على مقاعد أكثر في دولة، ثم يُعوَّض الفرق في دولة أخرى خلال نفس موسم المنح.
            </p>
          </div>
        </div>

        {/* كيف تتم المنافسة داخل المحافظة نفسها؟ */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={HelpCircle} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: كيف تتم المنافسة داخل المحافظة نفسها؟
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlineCornerB20 />
              بعد تحديد حصة المحافظة تبدأ المنافسة بين طلاب المحافظة نفسها. وهنا لا يعتمد الاختيار على المعدل أو الترتيب وحده، بل على: <strong className="text-[var(--mn-heading)]">ترتيب الطالب داخل محافظته + رغباته المسجلة + الدولة التي اختارها + التخصص المطلوب + عدد المقاعد المتاحة</strong>.
            </p>
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-3 shadow-2xs">
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <InlineDashDotIcon />
                <strong className="text-[var(--mn-heading)] ml-1">مثال توضيحي:</strong>
                إذا كان لمحافظة تعز مقعدان للطب، وكان الطالب الأول اختار الهندسة، والطالب الثاني اختار الطب، والطالب الثالث اختار الطب، فقد يحصل الطالبان الثاني والثالث على مقعدي الطب. وقد يكون ترتيبك الرابع في محافظتك ومع ذلك تحصل على التخصص الذي تريده لأن الطلاب الثلاثة الذين قبلك اختاروا دولًا أو تخصصات مختلفة.
              </p>
            </div>
          </div>

          {/* ملاحظة مهمة قبل جدول المحافظات */}
          <div className="relative p-3 pr-4 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs w-full overflow-hidden">
            <SelectiveAccentBar />
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlineDiamondIcon />
              <strong className="text-[var(--mn-heading)] ml-1">ملاحظة مهمة:</strong>
              الأعداد المعروضة هي مثال من توزيع مقاعد دورة 2026/2027 فقط وليست أعدادًا ثابتة للمحافظات. فقد يختلف عدد المقاعد من سنة إلى أخرى؛ فمثلًا إذا ظهرت المحويت بـ4 مقاعد في 2026، فقد حصلت في سنوات سابقة على نحو 7–10 مقاعد. لذلك استخدم هذه الأرقام لفهم طريقة التوزيع فقط.
            </p>
          </div>
        </div>

        <CulturalExchangeGovernoratesAccordion />
      </div>

      {/* ١٢. النتائج والتظلمات: الترشيح ليس قبولًا نهائيًا */}
      <div
        id="results-and-appeals-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={ShieldAlert}
          title="١٢. النتائج والتظلمات ومراحل القبول"
          className="mb-1"
        />

        <div className="space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={CheckCircle2} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              أولًا: الفرق بين الترشيح والقبول النهائي والإيفاد
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <InlinePetrolDot />
              بعد إعلان نتائج المفاضلة يجب أن يفرّق الطالب بين الفوز في مفاضلة الوزارة، والقبول من الجامعة أو الدولة، واكتمال إجراءات الإيفاد والسفر؛ فهذه مراحل مختلفة ولا تنتقل من واحدة إلى الأخرى تلقائيًا:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full items-stretch">
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <strong className="text-[var(--mn-heading)] text-[12px] sm:text-[12.5px] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDiamondIcon />
                  <span>1. فائز في مفاضلة الوزارة = مرشح</span>
                </strong>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  تم اختيارك ضمن المقاعد المتاحة وإرسال اسمك للجهة المانحة.
                </p>
              </div>
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <strong className="text-[var(--mn-heading)] text-[12px] sm:text-[12.5px] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDiamondIcon />
                  <span>2. قبول الجامعة أو الدولة = مقبول نهائيًا</span>
                </strong>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  وافقت الجهة المانحة أو الجامعة على ملفك وأصدرت القبول المطلوب.
                </p>
              </div>
              <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-1.5">
                <strong className="text-[#0E7C86] dark:text-[#21A7B4] text-[12px] sm:text-[12.5px] flex items-center pb-1.5 border-b border-[var(--mn-border)]">
                  <InlineDiamondIcon />
                  <span>3. اكتمال الإيفاد والسفر</span>
                </strong>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  استكملت إجراءات الوزارة والتأشيرة والوثائق وأصبحت جاهزًا للسفر.
                </p>
              </div>
            </div>

            <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pt-1">
              ولهذا فإن ظهور اسم الطالب في نتائج الوزارة لا يعني أن المنحة أصبحت نهائية؛ فقد يبقى عليه قبول الجامعة، أو مراجعة الوثائق، أو مقابلة، أو اختبار، أو إجراءات أخرى بحسب الدولة والبرنامج.
            </p>
          </div>
        </div>

        {/* التظلمات */}
        <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
          <div className="flex items-center gap-2">
            <StandaloneHeadingBadge icon={FileText} />
            <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
              ثانيًا: فترة التظلمات ومراجعة النتيجة
            </h3>
          </div>

          <div className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 shadow-2xs space-y-2.5 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 w-full items-stretch">
              <div className="h-full flex items-center p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs">
                <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <InlineDashDotIcon />
                  عند إعلان النتائج تفتح الوزارة عادة باب التظلمات لمدة محددة. لذلك يجب على الطالب مراجعة النتيجة فور صدورها وعدم تأجيلها إلى ما بعد انتهاء فترة التظلم. إذا لاحظ الطالب خطأ في معدله، أو محافظته، أو ترتيبه، أو رغباته، فعليه تقديم التظلم خلال المدة المحددة.
                </p>
              </div>
              <div className="h-full flex items-center p-3 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs">
                <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <InlineDashDotIcon />
                  ويُنصح بالاحتفاظ منذ بداية التقديم بـ رقم الطلب، ونسخة PDF من الاستمارة، ولقطات للرغبات، ورسائل التأكيد، وأي مستند يثبت البيانات التي تم التسجيل بها؛ لأنها قد تكون مهمة عند الاعتراض أو مراجعة النتيجة.
                </p>
              </div>
            </div>
            <div className="relative rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 pr-3.5 overflow-hidden">
              <SelectiveAccentBar />
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-[1.85] text-justify">
                <InlineDiamondIcon />
                ملاحظة: وبعد البت في التظلمات يصبح الترشيح نهائيًا من جانب الوزارة، ثم تبدأ إجراءات القبول لدى الدولة أو الجامعة المانحة.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ١٣. ما بعد القبول: الإيفاد، التمويل، التأشيرة والتذكرة والسفر */}
      <div
        id="post-acceptance-phase-section"
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-4 mn-panel"
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
        <DetailSectionHeader
          icon={PlaneTakeoff}
          title="١٣. ما بعد القبول والإيفاد والسفر"
          className="mb-1"
        />

        <div className="p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs w-full">
          <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
            <InlinePetrolDot />
            بعد الحصول على القبول النهائي تبدأ مرحلة جديدة تختلف عن مرحلة المفاضلة والترشيح، وهي استكمال إجراءات الإيفاد والسفر.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full items-stretch">
          <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--mn-border)]">
                <StandaloneHeadingBadge icon={FileText} />
                <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)]">أولًا: قبل السفر</h4>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-2">
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <InlineDashDotIcon />
                  يبدأ الطالب باستكمال الوثائق المطلوبة من الوزارة والدولة المانحة والجامعة، ثم إجراءات التأشيرة، والفحص الطبي إن طُلب، والتصديقات، وخطاب الإيفاد وأي معاملات مالية أو إدارية مرتبطة بالبعثة.
                </p>
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify pt-1.5 border-t border-[var(--mn-border)]/70">
                  <InlineDashDotIcon />
                  وفي منح التبادل الثقافي يتحمل الطالب غالبًا في البداية تكاليف استخراج التأشيرة وتذكرة السفر والمصاريف الشخصية الأولية، ولا ينبغي شراء التذكرة أو تحمل التزامات مالية كبيرة قبل صدور القبول النهائي ومعرفة تعليمات التأشيرة والسفر بشكل واضح.
                </p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)]">
              <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <InlineDashDotIcon />
                كما يجب على الطالب معرفة ما الذي تغطيه الدولة المانحة وما الذي تغطيه وزارة التعليم العالي اليمنية؛ لأن إجراءات صرف المخصصات قد تبدأ بعد استكمال الإيفاد والوصول، فلا ينبغي السفر بالاعتماد على استلامها فورًا.
              </p>
            </div>
          </div>

          <div className="h-full flex flex-col justify-between p-3 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs space-y-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--mn-border)]">
                <StandaloneHeadingBadge icon={MapPin} />
                <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)]">ثانيًا: بعد الوصول إلى بلد الدراسة</h4>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)] space-y-1.5">
                <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-[1.85] text-justify">
                  بعد وصول الطالب إلى بلد الدراسة يبدأ في:
                </p>
                <ul className="space-y-1.5 text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85]">
                  <li className="w-full text-justify">
                    <InlinePetrolDot />
                    <span>استكمال التسجيل الجامعي والإقامة والتأمين.</span>
                  </li>
                  <li className="w-full text-justify">
                    <InlinePetrolDot />
                    <span>الالتحاق بسنة لغة أو برنامج تحضيري إذا كان جزءًا من المنحة أو القبول، مثل اللغة الإسبانية في مسار كوبا.</span>
                  </li>
                  <li className="w-full text-justify">
                    <InlinePetrolDot />
                    <span>اجتياز أي اختبارات قبول أو تحديد مستوى تبقى مطلوبة بعد الوصول بحسب الجامعة والبرنامج.</span>
                  </li>
                  <li className="w-full text-justify">
                    <InlinePetrolDot />
                    <span>المحافظة على الانتظام الأكاديمي والحصول على شهادة قيد حديثة عند الحاجة، لأن بعض إجراءات المخصصات أو التجديد قد تعتمد عليها.</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--mn-surface)] border border-[var(--mn-border)]">
              <p className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <InlinePetrolDot />
                <span>متابعة الملحقية الثقافية أو السفارة والجهات المختصة في أي إجراءات تستلزمها الوزارة أثناء الدراسة.</span>
              </p>
            </div>
          </div>
        </div>

        {/* الخلاصة للعملية بالكامل */}
        <div className="relative p-3 pr-4 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] shadow-2xs space-y-2 w-full overflow-hidden">
          <SelectiveAccentBar />
          <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)] flex items-center">
            <InlineDiamondIcon />
            <span>الخلاصة للعملية بالكامل</span>
          </h4>
          <div className="pt-2 border-t border-[var(--mn-border)]/70 font-bold inline-flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-1.5 w-full text-center">
            <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">الفوز في المفاضلة</span>
            <ArrowLeft className="text-[#0E7C86] w-3.5 h-3.5 mx-0.5 shrink-0" />
            <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">الترشيح</span>
            <ArrowLeft className="text-[#0E7C86] w-3.5 h-3.5 mx-0.5 shrink-0" />
            <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">قبول الجامعة أو الدولة</span>
            <ArrowLeft className="text-[#0E7C86] w-3.5 h-3.5 mx-0.5 shrink-0" />
            <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">استكمال الإيفاد والتأشيرة</span>
            <ArrowLeft className="text-[#0E7C86] w-3.5 h-3.5 mx-0.5 shrink-0" />
            <span className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">السفر</span>
            <ArrowLeft className="text-[#0E7C86] w-3.5 h-3.5 mx-0.5 shrink-0" />
            <span className="text-[11.5px] sm:text-[12px] font-bold text-[#0E7C86] dark:text-[#21A7B4]">التسجيل والدراسة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
