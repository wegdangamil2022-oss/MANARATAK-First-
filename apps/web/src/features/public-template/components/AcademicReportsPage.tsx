import React, { useState } from 'react';
import {
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Database,
  Search,
  BookOpen,
  PieChart,
  Code,
  Layers,
  ChevronLeft,
  Share2,
  FileText,
  HelpCircle,
  Activity,
  Award,
  Zap,
} from 'lucide-react';

interface AcademicReportsPageProps {
  locale: 'ar' | 'en';
  onBack: () => void;
  dataMode?: 'prototype' | 'api';
}

type ReportTab = 'overview' | 'linkage' | 'unresolved' | 'simulator' | 'explorer';

export function AcademicReportsPage({ locale, onBack, dataMode = 'api' }: AcademicReportsPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<ReportTab>('overview');
  const [simulatedQuery, setSimulatedQuery] = useState('');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [selectedBroadField, setSelectedBroadField] = useState<string>('09');
  const [isCopied, setIsCopied] = useState(false);

  const isAr = locale === 'ar';

  const t = (arVal: string, enVal: string) => (isAr ? arVal : enVal);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Simulated Resolver Logic
  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedQuery.trim()) return;

    const query = simulatedQuery.trim();
    const norm = query.replace(/^ال/, '');

    let res: any = null;

    if (
      norm === 'علاج تنفسي' ||
      norm === 'نطق ولغة' ||
      norm === 'ميكانيكا حيوية' ||
      norm === 'العلاج التنفسي' ||
      norm === 'النطق واللغة' ||
      norm === 'الميكانيكا الحيوية'
    ) {
      res = {
        code: '0915',
        broadCode: '09',
        broadTitle: 'الصحة والرفاه (Health and Welfare)',
        detailedTitle: 'Therapy and rehabilitation',
        outcome: 'EXACT_MATCH',
        description: 'تم ربطه بنجاح بتصنيف ISCED 0915 بناءً على قواعد الملاءمة لمهن العلاج والـتأهيل المضافة حديثاً.',
      };
    } else if (
      norm === 'تروية قلبية' ||
      norm === 'تقنية قلب' ||
      norm === 'علم الدم ونقل الدم' ||
      norm === 'إسعاف' ||
      norm === 'التروية القلبية' ||
      norm === 'تقنية القلب' ||
      norm === 'علم الدم ونقل الدم' ||
      norm === 'الإسعاف'
    ) {
      res = {
        code: '0914',
        broadCode: '09',
        broadTitle: 'الصحة والرفاه (Health and Welfare)',
        detailedTitle: 'Medical diagnostic and treatment technology',
        outcome: 'EXACT_MATCH',
        description: 'تم ربطه بنجاح بتصنيف ISCED 0914 لتغطية تقنيات التشخيص الطبي المتطورة مثل قسطرة وتقنيات القلب.',
      };
    } else if (
      norm === 'صحة مجتمع' ||
      norm === 'صحة أم وطفل' ||
      norm === 'تغذية بشرية' ||
      norm === 'صحة المجتمع' ||
      norm === 'صحة الأم والطفل' ||
      norm === 'التغذية البشرية'
    ) {
      res = {
        code: '0917',
        broadCode: '09',
        broadTitle: 'الصحة والرفاه (Health and Welfare)',
        detailedTitle: 'Public health',
        outcome: 'EXACT_MATCH',
        description: 'تم توجيهه بنجاح إلى تصنيف الصحة العامة ISCED 0917 لتوفير مطابقة حقيقية دون تزييف البيانات.',
      };
    } else if (
      norm === 'تطوير تطبيقات ويب' ||
      norm === 'حوسبة متنقلة' ||
      norm === 'تطوير تطبيقات الويب' ||
      norm === 'الحوسبة المتنقلة'
    ) {
      res = {
        code: '0613',
        broadCode: '06',
        broadTitle: 'تكنولوجيا المعلومات والاتصالات (ICTs)',
        detailedTitle: 'Software and applications development and analysis',
        outcome: 'EXACT_MATCH',
        description: 'ربط مباشر وصحيح برمز تطوير البرمجيات والأنظمة 0613 بفضل توسيع مصطلحات البرمجة السحابية والذكية.',
      };
    } else if (
      norm === 'حوسبة سحابية' ||
      norm === 'إنترنت أشياء' ||
      norm === 'الحوسبة السحابية' ||
      norm === 'إنترنت الأشياء'
    ) {
      res = {
        code: '0612',
        broadCode: '06',
        broadTitle: 'تكنولوجيا المعلومات والاتصالات (ICTs)',
        detailedTitle: 'Database and network design and administration',
        outcome: 'EXACT_MATCH',
        description: 'تم توجيهه لرمز هندسة وتصميم قواعد البيانات والشبكات 0612 بناءً على المفردات التقنية المحدثة.',
      };
    } else if (norm === 'معلوماتية صحية' || norm === 'المعلوماتية الصحية') {
      res = {
        code: '09 / 06',
        broadCode: '09',
        broadTitle: 'الصحة وتكنولوجيا المعلومات (Health & ICT)',
        detailedTitle: 'Interdisciplinary (Health Informatics)',
        outcome: 'AMBIGUOUS',
        description: 'تم تصنيف التخصص كـ "متداخل ومبهم" لتداخله المتساوي بين قطاع الرعاية الصحية والأنظمة البرمجية، ويتطلب تدخلاً بشرياً لمنع التحيزات التلقائية.',
      };
    } else if (norm === 'هندسة طبية حيوية' || norm === 'الهندسة الطبية الحيوية') {
      res = {
        code: '09 / 07',
        broadCode: '09',
        broadTitle: 'الصحة والهندسة (Health & Engineering)',
        detailedTitle: 'Interdisciplinary (Biomedical Engineering)',
        outcome: 'AMBIGUOUS',
        description: 'تصنيف متداخل (AMBIGUOUS). يجمع بين هندسة الأجهزة الطبية والممارسات الإكلينيكية، وتم عزله للفرز اليدوي الآمن.',
      };
    } else if (
      norm === 'علوم بيانات' ||
      norm === 'علوم البيانات' ||
      norm === 'بيانات ضخمة' ||
      norm === 'البيانات الضخمة'
    ) {
      res = {
        code: '06 / 05',
        broadCode: '06',
        broadTitle: 'تكنولوجيا المعلومات والرياضيات والتحليل (ICT & Math/Stats)',
        detailedTitle: 'Interdisciplinary (Data Science & Big Data)',
        outcome: 'AMBIGUOUS',
        description: 'تخصص بيني متداخل يقع في المنطقة المشتركة لعلوم الحاسوب والإحصاء الكمي والرياضي.',
      };
    } else if (
      norm === 'أمن سيبراني' ||
      norm === 'الأمن السيبراني' ||
      norm === 'أمن معلومات' ||
      norm === 'أمن المعلومات'
    ) {
      res = {
        code: '06 / 10',
        broadCode: '06',
        broadTitle: 'تكنولوجيا المعلومات والخدمات الأمنية (ICT & Security Services)',
        detailedTitle: 'Interdisciplinary (Cybersecurity)',
        outcome: 'AMBIGUOUS',
        description: 'تم عزله كحالة متداخلة نظراً لتشعب مواضيعه بين دفاع الشبكات وحماية الأصول المادية والسرية العامة.',
      };
    } else if (norm === 'تحليل أعمال' || norm === 'تحليل الأعمال') {
      res = {
        code: '04 / 06',
        broadCode: '04',
        broadTitle: 'إدارة الأعمال وتكنولوجيا المعلومات (Business & ICT)',
        detailedTitle: 'Interdisciplinary (Business Analytics)',
        outcome: 'AMBIGUOUS',
        description: 'تخصص هجين يجمع بين تحسين نماذج الأعمال الإدارية والتحليل التقني الذكي للبيانات.',
      };
    } else if (norm === 'إعادة تأهيل رياضي' || norm === 'إعادة التأهيل الرياضي') {
      res = {
        code: 'GAP',
        broadCode: '09',
        broadTitle: 'الصحة والرفاه (Health and Welfare)',
        detailedTitle: 'Sports Rehabilitation',
        outcome: 'TRUE_TAXONOMY_GAP',
        description: 'فجوة حقيقية في تصنيف ISCED-F 2013 (True Taxonomy Gap). على الرغم من شعبيته في جامعات الخليج والشرق الأوسط، إلا أن التصنيف العالمي لا يفرده برمز مستقل، ويحتاج خطة التوسيع في الخطوة 8.8.',
      };
    } else if (norm === 'تحليل سلوك تطبيقي' || norm === 'تحليل السلوك التطبيقي') {
      res = {
        code: 'GAP',
        broadCode: '03',
        broadTitle: 'العلوم الاجتماعية والسلوكية (Social & Behavioral Sciences)',
        detailedTitle: 'Applied Behavior Analysis',
        outcome: 'TRUE_TAXONOMY_GAP',
        description: 'فجوة حقيقية في التصنيف الكنسي. ممارسة سلوكية علاجية لا تجد تمثيلاً دقيقاً برمز رباعي الأرقام.',
      };
    } else if (norm === 'ديموغرافيا' || norm === 'الديموغرافيا') {
      res = {
        code: 'GAP',
        broadCode: '03',
        broadTitle: 'العلوم الاجتماعية (Social Sciences)',
        detailedTitle: 'Demography',
        outcome: 'TRUE_TAXONOMY_GAP',
        description: 'فجوة تصنيف حقيقية. الإحصاء والدراسات السكانية تخصصات مستقلة في المنطقة العربية دون رموز فرعية كافية.',
      };
    } else if (norm === 'تنمية اجتماعية' || norm === 'التنمية الاجتماعية') {
      res = {
        code: 'GAP',
        broadCode: '03',
        broadTitle: 'العلوم الاجتماعية (Social Sciences)',
        detailedTitle: 'Social Development',
        outcome: 'TRUE_TAXONOMY_GAP',
        description: 'فجوة تصنيف حقيقية. يرتبط بالعلوم التنموية والمجتمعية ولا يمتلك عقداً هيكلية صريحة.',
      };
    } else if (norm === 'علم شيخوخة' || norm === 'علم الشيخوخة') {
      res = {
        code: 'GAP',
        broadCode: '09',
        broadTitle: 'الصحة والرعاية والرفاه (Health & Welfare)',
        detailedTitle: 'Gerontology',
        outcome: 'TRUE_TAXONOMY_GAP',
        description: 'فجوة تصنيف حقيقية. رعاية كبار السن ودراسة الشيخوخة تفتقر إلى تمثيل مباشر في النماذج القديمة وتتطلب تعديلاً كنسياً.',
      };
    } else if (norm.includes('علم نفس') || norm.includes('علم النفس')) {
      res = {
        code: '0313',
        broadCode: '03',
        broadTitle: 'العلوم الاجتماعية والصحافة والإعلام (Social sciences, journalism and info)',
        detailedTitle: 'Psychology',
        outcome: 'EXACT_MATCH',
        description: 'تطابق كامل ومؤكد (EXACT_MATCH) مع الرمز الكنسي القياسي لعلم النفس 0313.',
      };
    } else if (norm.includes('علم اجتماع') || norm.includes('علم الاجتماع')) {
      res = {
        code: '0314',
        broadCode: '03',
        broadTitle: 'العلوم الاجتماعية والصحافة والإعلام (Social sciences, journalism and info)',
        detailedTitle: 'Sociology and cultural studies',
        outcome: 'EXACT_MATCH',
        description: 'تطابق كامل ومؤكد (EXACT_MATCH) مع رمز علم الاجتماع والدراسات الثقافية 0314.',
      };
    } else if (
      norm.includes('علوم حاسب') ||
      norm.includes('علوم الحاسب') ||
      norm.includes('حاسب آلي') ||
      norm.includes('الحاسب الآلي')
    ) {
      res = {
        code: '0613',
        broadCode: '06',
        broadTitle: 'تكنولوجيا المعلومات والاتصالات (ICTs)',
        detailedTitle: 'Computer Science / Software development',
        outcome: 'EXACT_MATCH',
        description: 'ربط مباشر وصحيح برمز علوم الحاسب والأنظمة الأساسية 0613.',
      };
    } else if (norm.includes('إدارة أعمال') || norm.includes('إدارة الأعمال')) {
      res = {
        code: '0413',
        broadCode: '04',
        broadTitle: 'الأعمال والإدارة والقانون (Business, admin and law)',
        detailedTitle: 'Management and administration',
        outcome: 'EXACT_MATCH',
        description: 'تم ربطه بنجاح برمز إدارة الأعمال والعلوم التنظيمية القياسي 0413.',
      };
    } else if (norm.includes('هندسة مدنية') || norm.includes('الهندسة المدنية')) {
      res = {
        code: '0732',
        broadCode: '07',
        broadTitle: 'الهندسة والتصنيع والبناء (Engineering, manufacturing & const.)',
        detailedTitle: 'Building and civil engineering',
        outcome: 'EXACT_MATCH',
        description: 'تم ربطه بنجاح برمز الهندسة المدنية وتشييد المباني 0732.',
      };
    } else if (norm.includes('طب بشر') || norm.includes('الطب البشري')) {
      res = {
        code: '0912',
        broadCode: '09',
        broadTitle: 'الصحة والرفاه (Health and Welfare)',
        detailedTitle: 'Medicine',
        outcome: 'EXACT_MATCH',
        description: 'تطابق كامل وصحيح مع الرمز الطبي الكنسي 0912 لمجال الطب والجراحة.',
      };
    } else {
      res = {
        code: '0011',
        broadCode: '00',
        broadTitle: 'البرامج والمؤهلات العامة (Generic programmes and qualifications)',
        detailedTitle: 'Basic programmes and qualifications',
        outcome: 'TRUE_TAXONOMY_GAP',
        description: 'لم يتم العثور على قاعدة تخصيص مطابقة صريحة. تم اعتباره فجوة تصنيف أو مؤهل عام لا يقبل إسقاط ورقة تصنيفية مباشرة.',
      };
    }

    setSimulationResult(res);
  };

  const iscedBroadFields = [
    { code: '00', title: 'برامج ومؤهلات عامة', count: 1169, matched: 471, gap: 698, desc: 'البرامج التحضيرية والتأسيسية العامة.' },
    { code: '01', title: 'التربية والتعليم', count: 146, matched: 140, gap: 6, desc: 'الدبلومات التربوية وإعداد المعلمين.' },
    { code: '02', title: 'الفنون والعلوم الإنسانية', count: 184, matched: 162, gap: 22, desc: 'التاريخ، اللغات، الدراسات الإسلامية.' },
    { code: '03', title: 'العلوم الاجتماعية والصحافة', count: 181, matched: 100, gap: 81, desc: 'علم النفس، وعلم الاجتماع، والإعلام.' },
    { code: '04', title: 'الأعمال والإدارة والقانون', count: 440, matched: 440, gap: 0, desc: 'المحاسبة والتمويل والقوانين (مكتمل 100%).' },
    { code: '05', title: 'العلوم الطبيعية والرياضيات', count: 455, matched: 455, gap: 0, desc: 'الفيزياء، الكيمياء، الرياضيات (مكتمل 100%).' },
    { code: '06', title: 'تكنولوجيا الاتصالات والمعلومات', count: 101, matched: 58, gap: 43, desc: 'علوم الحاسب، والشبكات، ومسارات الذكاء الاصطناعي.' },
    { code: '07', title: 'الهندسة والتصنيع والبناء', count: 225, matched: 212, gap: 13, desc: 'الهندسة المدنية والميكانيكية والمعمارية.' },
    { code: '08', title: 'الزراعة والحراجة ومصايد الأسماك', count: 88, matched: 64, gap: 24, desc: 'الإنتاج الحيواني والنباتي والبيطرة الإقليمية.' },
    { code: '09', title: 'الصحة والرفاه', count: 365, matched: 296, gap: 69, desc: 'الطب، التمريض، الصيدلة، والتأهيل الطبي.' },
    { code: '10', title: 'الخدمات العامة والشخصية', count: 48, matched: 31, gap: 17, desc: 'إدارة الفنادق، السلامة المهنية، والرياضة.' },
  ];

  const currentBroadField = iscedBroadFields.find((f) => f.code === selectedBroadField);

  if (dataMode !== 'prototype') {
    return (
      <section dir={isAr ? 'rtl' : 'ltr'} className="mn-public-container py-6 space-y-4">
        <h1 className="text-xl font-bold text-[var(--mn-heading)]">{t('التقارير الأكاديمية', 'Academic reports')}</h1>
        <p role="status" className="text-[var(--mn-text-muted)]">
          {t('التقارير الأكاديمية غير متاحة حاليًا؛ لم تُربط هذه الصفحة بخدمة تقارير موثّقة.', 'Academic reports are currently unavailable; this page is not connected to a verified reporting service.')}
        </p>
        <button type="button" onClick={onBack} className="mn-button-secondary">{t('العودة', 'Back')}</button>
      </section>
    );
  }

  return (
    <section dir={isAr ? 'rtl' : 'ltr'} className="mn-public-container py-4 sm:py-6 space-y-6">
      <p role="status" className="rounded-xl p-3 bg-[var(--mn-warning-soft)] text-[var(--mn-warning-text)]">
        {t('بيانات توضيحية للنموذج فقط، وليست نتائج قاعدة البيانات أو تقرير تدقيق فعلي.', 'Prototype sample data only, not database results or an actual audit report.')}
      </p>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--mn-border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-10 w-10 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] flex items-center justify-center cursor-pointer transition-colors"
            aria-label={t('العودة', 'Back')}
          >
            <ArrowRight className="h-4 w-4 text-[var(--mn-text)]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--mn-heading)] flex items-center gap-2">
              <Layers className="h-5 w-5 text-[var(--mn-accent-text)]" />
              {t('تقارير تدقيق وتصنيف البرمجيات والأكاديمية', 'Academic Classification & Audit Reports')}
            </h1>
            <p className="text-xs text-[var(--mn-text-muted)] mt-1">
              {t(
                'عرض تفاعلي شامل وموثق لتقارير الربط والتدقيق الكنسي (ISCED-F) مع الكتالوج الموحد.',
                'Interactive unified canonical UNESCO ISCED-F linkage and audit dashboard.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleShare}
            className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer text-[var(--mn-text)] transition-all"
          >
            <Share2 className="h-3.5 w-3.5" />
            {isCopied ? t('تم نسخ الرابط!', 'Copied!') : t('مشاركة التقرير', 'Share Report')}
          </button>
        </div>
      </div>

      {/* Audit Highlights / Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="mn-card p-4 rounded-2xl border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)]/20 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--mn-accent-soft)] text-[var(--mn-accent-text)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{t('معدل الربط الكنسي الموحد', 'Canonical Linkage Rate')}</div>
            <div className="text-lg font-bold text-[var(--mn-heading)]">81.4%</div>
          </div>
        </div>

        <div className="mn-card p-4 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--mn-success-soft)] text-[var(--mn-success-text)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{t('حالات التطابق الكنسي', 'Exact Matches')}</div>
            <div className="text-lg font-bold text-[var(--mn-heading)]">2,770 {t('سجل', 'items')}</div>
          </div>
        </div>

        <div className="mn-card p-4 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--mn-warning-soft)] text-[var(--mn-warning-text)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{t('فجوات التصنيف الحقيقية', 'True Classification Gaps')}</div>
            <div className="text-lg font-bold text-[var(--mn-heading)]">577 {t('سجل', 'items')}</div>
          </div>
        </div>

        <div className="mn-card p-4 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--mn-info-soft)] text-[var(--mn-info-text)]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{t('حالات بينية متداخلة', 'Interdisciplinary / Ambiguous')}</div>
            <div className="text-lg font-bold text-[var(--mn-heading)]">55 {t('سجل', 'items')}</div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-[var(--mn-border)]">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-[#142B5F] text-[#D6A43B] dark:bg-[#D6A43B] dark:text-[#142B5F]'
              : 'bg-[var(--mn-surface)] border border-[var(--mn-border)] text-[var(--mn-text-muted)] hover:text-[var(--mn-text)]'
          }`}
        >
          <PieChart className="h-3.5 w-3.5 inline ml-1.5" />
          {t('نظرة عامة والتدقيق', 'Overview & Audit')}
        </button>

        <button
          onClick={() => setActiveSubTab('linkage')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'linkage'
              ? 'bg-[#142B5F] text-[#D6A43B] dark:bg-[#D6A43B] dark:text-[#142B5F]'
              : 'bg-[var(--mn-surface)] border border-[var(--mn-border)] text-[var(--mn-text-muted)] hover:text-[var(--mn-text)]'
          }`}
        >
          <FileText className="h-3.5 w-3.5 inline ml-1.5" />
          {t('تقرير الربط (8.7-C)', 'Linkage Report (8.7-C)')}
        </button>

        <button
          onClick={() => setActiveSubTab('unresolved')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'unresolved'
              ? 'bg-[#142B5F] text-[#D6A43B] dark:bg-[#D6A43B] dark:text-[#142B5F]'
              : 'bg-[var(--mn-surface)] border border border-[var(--mn-border)] text-[var(--mn-text-muted)] hover:text-[var(--mn-text)]'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 inline ml-1.5" />
          {t('تقرير الحالات المعلقة (8.7-D)', 'Unresolved Gaps (8.7-D)')}
        </button>

        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'simulator'
              ? 'bg-[#142B5F] text-[#D6A43B] dark:bg-[#D6A43B] dark:text-[#142B5F]'
              : 'bg-[var(--mn-surface)] border border-[var(--mn-border)] text-[var(--mn-text-muted)] hover:text-[var(--mn-text)]'
          }`}
        >
          <Zap className="h-3.5 w-3.5 inline ml-1.5 text-amber-500 animate-pulse" />
          {t('مُحاكي ومُحلل الحلّال الذكي', 'Smart Resolver Simulator')}
        </button>

        <button
          onClick={() => setActiveSubTab('explorer')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'explorer'
              ? 'bg-[#142B5F] text-[#D6A43B] dark:bg-[#D6A43B] dark:text-[#142B5F]'
              : 'bg-[var(--mn-surface)] border border-[var(--mn-border)] text-[var(--mn-text-muted)] hover:text-[var(--mn-text)]'
          }`}
        >
          <Layers className="h-3.5 w-3.5 inline ml-1.5" />
          {t('مستكشف دليل التصنيفات', 'ISCED Guide Explorer')}
        </button>
      </div>

      {/* Tab Content Rendering */}

      {/* 1. OVERVIEW & AUDIT */}
      {activeSubTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="mn-card p-5 rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] space-y-4">
            <h2 className="text-base font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-[var(--mn-accent-text)]" />
              {t('التحليل الإحصائي لتوزيع الفئات الأكاديمية والمطابقة', 'Statistical Distribution of Mappings')}
            </h2>
            <p className="text-xs text-[var(--mn-text-muted)] leading-relaxed">
              {t(
                'يبين الجدول التالي نتائج التدقيق الشامل لـ 3,402 سجل كتالوج ضد مجالات التصنيف الدولي الموحد للتعليم (ISCED-F 2013). تم دحر الفئات الافتراضية العشوائية وحُددت الفجوات بدقة رياضية كنسية.',
                'Audited breakdown of 3,402 catalog items against canonical UNESCO ISCED-F fields. Dummy/unknown nodes are fully deprecated.'
              )}
            </p>

            <div className="overflow-x-auto rounded-xl border border-[var(--mn-border)]">
              <table className="w-full text-xs text-[var(--mn-text)] text-right">
                <thead className="bg-[var(--mn-surface-muted)] text-[var(--mn-heading)] font-bold">
                  <tr className="border-b border-[var(--mn-border)]">
                    <th className="p-2.5 text-center w-12">#</th>
                    <th className="p-2.5">{t('فئة التصنيف (ISCED-F)', 'ISCED Broad Field')}</th>
                    <th className="p-2.5 text-center">{t('السجلات المدققة', 'Audited Items')}</th>
                    <th className="p-2.5 text-center">{t('ربط ناجح (EXACT)', 'Exact Mapped')}</th>
                    <th className="p-2.5 text-center">{t('فجوات تصنيف (GAP)', 'Taxonomy Gap')}</th>
                    <th className="p-2.5 text-center">{t('الحالة ونسبة الإكمال', 'Completion Rate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mn-border)]">
                  {iscedBroadFields.map((field) => {
                    const pct = ((field.matched / field.count) * 100).toFixed(1);
                    return (
                      <tr key={field.code} className="hover:bg-[var(--mn-surface-muted)]/40 transition-colors">
                        <td className="p-2.5 text-center font-mono font-bold text-[var(--mn-accent-text)]">{field.code}</td>
                        <td className="p-2.5">
                          <div className="font-bold">{field.title}</div>
                          <div className="text-[10px] text-[var(--mn-text-muted)]">{field.desc}</div>
                        </td>
                        <td className="p-2.5 text-center font-bold">{field.count}</td>
                        <td className="p-2.5 text-center font-bold text-[var(--mn-success-text)]">{field.matched}</td>
                        <td className="p-2.5 text-center font-bold text-[var(--mn-warning-text)]">{field.gap}</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono font-bold text-xs">{pct}%</span>
                            <progress className="mn-native-progress mn-native-progress-accent w-16 h-1.5"
                              value={Number(pct)} max={100}
                              aria-label={t('نسبة ربط المجال', 'Field linkage percentage')} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Breakdown By Degree Levels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mn-card p-5 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] space-y-4">
              <h3 className="text-sm font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-[var(--mn-accent-text)]" />
                {t('توزيع التصنيف حسب الدرجة العلمية', 'Distribution by Degree Level')}
              </h3>
              <div className="space-y-3.5">
                {[
                  { label: t('البكالوريوس (MJR)', 'Bachelor (MJR)'), exact: 737, ambiguous: 16, gap: 90, total: 843 },
                  { label: t('الماجستير (MAS)', 'Master (MAS)'), exact: 909, ambiguous: 18, gap: 189, total: 1116 },
                  { label: t('الدكتوراه (DOC)', 'Doctorate (DOC)'), exact: 898, ambiguous: 18, gap: 198, total: 1114 },
                  { label: t('الزمالة الطبية (FEL)', 'Fellowship (FEL)'), exact: 226, ambiguous: 3, gap: 100, total: 329 },
                ].map((deg) => {
                  const exactPct = ((deg.exact / deg.total) * 100).toFixed(0);
                  return (
                    <div key={deg.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-[var(--mn-text)]">
                        <span>{deg.label}</span>
                        <span className="font-mono">{deg.total} {t('سجل', 'items')} ({exactPct}% {t('مكتمل', 'mapped')})</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <progress className="mn-native-progress mn-native-progress-secondary w-full h-3" value={deg.exact} max={deg.total} aria-label={t('تطابق دقيق', 'Exact matches')} />
                        <progress className="mn-native-progress mn-native-progress-primary w-full h-3" value={deg.ambiguous} max={deg.total} aria-label={t('تطابق متداخل', 'Ambiguous matches')} />
                        <progress className="mn-native-progress mn-native-progress-accent w-full h-3" value={deg.gap} max={deg.total} aria-label={t('غير مرتبط', 'Unmapped')} />
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--mn-text-muted)]">
                        <span>{t('تطابق:', 'Exact:')} {deg.exact}</span>
                        <span>{t('متداخل:', 'Ambiguous:')} {deg.ambiguous}</span>
                        <span>{t('ثغرة:', 'Gap:')} {deg.gap}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Safety & Constraints Verification List */}
            <div className="mn-card p-5 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] space-y-4">
              <h3 className="text-sm font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[var(--mn-success-text)]" />
                {t('فحص قيود السلامة الأكاديمية وهيكل البيانات', 'Academic Safety & Constraints Verification')}
              </h3>
              <p className="text-xs text-[var(--mn-text-muted)]">
                {t(
                  'ضمانات صارمة لمنع انحراف البيانات أثناء عمليات الربط الكنسية:',
                  'Strict validation policies applied during database canonicalization.'
                )}
              </p>
              <div className="space-y-2 text-xs">
                {[
                  { rule: t('تزييف العُقد التصنيفية الكنسية', 'Fabricating taxonomy nodes'), status: t('تم المنع (PASS)', 'Blocked'), desc: t('صفر عُقد وهمية أو افتراضية مثل "أخرى" أو "غير معروف".', 'Zero wildcard or fake codes added to force mapping.') },
                  { rule: t('سلامة المعرفات العامة الكنسية (Public Codes)', 'Public IDs Integrity'), status: t('تم الحفظ (PASS)', 'Intact'), desc: t('تم الحفاظ الكامل على رموز MJR, MAS, DOC, FEL دون أي تعديل عشوائي.', 'All public codes and profiles preserved intact.') },
                  { rule: t('حذف حقول كنسية كلاسيكية', 'Removing legacy fields'), status: t('تم المنع (PASS)', 'Zero removals'), desc: t('لم يتم حذف أي بيانات أو حقول نصية تقليدية لضمان التوافق التراجعي.', 'Backwards compatibility fully guarded.') },
                  { rule: t('معالجة بادئات "ال" التعريف والجمع', 'Definite Article Normalization'), status: t('مكتمل (PASS)', 'Completed'), desc: t('تم إدراج معالجة مرنة للبادئات العربية والجمع لتفادي ثغرات المطابقة الفردية.', 'Seamless Arabic prefix normalizations included.') },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)] space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-[var(--mn-heading)]">{item.rule}</span>
                      <span className="text-[var(--mn-success-text)]">{item.status}</span>
                    </div>
                    <p className="text-[10px] text-[var(--mn-text-muted)]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ISCED-F LINKAGE REPORT */}
      {activeSubTab === 'linkage' && (
        <div className="mn-card p-5 sm:p-6 rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] space-y-4 animate-in fade-in duration-150 text-right">
          <div className="flex items-center justify-between border-b border-[var(--mn-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--mn-heading)]">
              {t('تقرير التحقق من توسيع فئة ISCED-F ووثيقة التدقيق المالي والأكاديمي', 'UNESCO ISCED-F 2013 Expansion & Linkage Audit Document')}
            </h2>
            <span className="px-2 py-1 bg-[var(--mn-success-soft)] text-[var(--mn-success-text)] rounded-lg text-[10px] font-bold">
              {t('مكتمل وموثق صراحةً', 'VERIFIED & COMPLETED')}
            </span>
          </div>

          <div className="text-xs text-[var(--mn-text)] space-y-4 leading-relaxed font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-[var(--mn-surface-muted)] rounded-xl">
              <div><b>{t('تاريخ التدقيق:', 'Audit Date:')}</b> 2026-08-10</div>
              <div><b>{t('الجهة المرجعية الكنسية:', 'Authoritative Source:')}</b> UNESCO Institute for Statistics (UIS)</div>
              <div><b>{t('موقع قاعدة البيانات الحية:', 'PostgreSQL Database Connection:')}</b> <span className="text-red-500 font-bold">{t('محظورة/غير متصلة في البيئة المحلية', 'Blocked in local container')}</span></div>
              <div><b>{t('العُقد الكنسية المستهدفة:', 'Canonical Target Nodes:')}</b> 163 {t('عقدة معتمدة', 'canonical nodes')}</div>
            </div>

            <h3 className="text-sm font-bold text-[var(--mn-heading)] mt-4 border-r-4 border-[var(--mn-accent)] pr-2">
              {t('1. غرض الوثيقة والخطوة 8.7-C', '1. Document Purpose & Step 8.7-C')}
            </h3>
            <p>
              {t(
                'توثق هذه الوثيقة الملاءمة الكاملة والصلابة المنهجية المتبعة لمطابقة 3,402 سجل كتالوج ضد الهياكل الكنسية لـ ISCED-F. بموجب متطلبات الحماية، تم حظر أي توليد لعقد تصنيف وهمية أو استخدام تسميات غامضة لفرض المطابقة القسرية.',
                'This report documents the methodological rigor behind mapping 3,402 catalog items to authoritative UNESCO ISCED-F 2013 structures without creating synthetic taxonomy codes.'
              )}
            </p>

            <h3 className="text-sm font-bold text-[var(--mn-heading)] mt-4 border-r-4 border-[var(--mn-accent)] pr-2">
              {t('2. نتائج مصفوفة التغطية الكنسية', '2. Linkage Coverage Matrix Results')}
            </h3>
            <p>
              {t(
                'حقق التدقيق في البداية نسبة ربط ضئيلة بلغت 0.3% فقط بسبب الحساسية الشديدة للمطابقات اللغوية المباشرة. وبعد معالجة مرونة البادئات اللغوية وإثراء حلّال الفئات، ارتفعت نسبة التطابق إلى 71.9% في المرحلة الأولى ثم بلغت 81.4% بعد استكمال حلّال الفجوات اللغوية.',
                'Initially, the audit suffered from a 0.3% match rate due to strict lexical matching. After updating prefix normalizations and specialized Arabic vocabularies, exact matches jumped to 71.9% and finally reached 81.4%.'
              )}
            </p>

            <h3 className="text-sm font-bold text-[var(--mn-heading)] mt-4 border-r-4 border-[var(--mn-accent)] pr-2">
              {t('3. مبررات الاعتماد والإقرار النهائي', '3. Canonical Approval & Justifications')}
            </h3>
            <ul className="list-disc list-inside space-y-1.5 pr-4 text-[11px]">
              <li><b>{t('مرجعية كنسية معتمدة:', 'Authoritative Lineage:')}</b> {t('الاعتماد الصارم على كود التوثيق UIS/2014/ED/PI/H/1 الصادر رسمياً من اليونسكو.', 'Strict adherence to UNESCO document code UIS/2014/ED/PI/H/1.')}</li>
              <li><b>{t('سلامة الرسوم البيانية التوجيهية:', 'Graph Integrity:')}</b> {t('امتثال بنسبة 100% لخلو الرسم البياني من الحلقات (Strict Directed Acyclic Graph - DAG) دون عُقد منقطعة.', '100% DAG compliance with zero cycles or disconnected nodes.')}</li>
              <li><b>{t('منع العشوائية والأصالة المضمونة:', 'Zero Fabrications:')}</b> {t('الامتناع الصارم عن ابتكار رموز تخصص عشوائية للحفاظ على موثوقية الشهادات الأكاديمية الصادرة.', 'Zero wildcard taxonomy nodes created to force mapping.')}</li>
            </ul>
          </div>
        </div>
      )}

      {/* 3. UNRESOLVED GAPS REPORT */}
      {activeSubTab === 'unresolved' && (
        <div className="mn-card p-5 sm:p-6 rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] space-y-4 animate-in fade-in duration-150 text-right">
          <div className="flex items-center justify-between border-b border-[var(--mn-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--mn-heading)]">
              {t('تقرير تحليل الحالات المعلقة والفجوات الحقيقية للتصنيف (Step 8.7-D)', 'Final Unresolved Major Classification & Gaps Analysis (Step 8.7-D)')}
            </h2>
            <span className="px-2 py-1 bg-[var(--mn-success-soft)] text-[var(--mn-success-text)] rounded-lg text-[10px] font-bold">
              {t('معتمد وموثق صراحةً', 'STEP 8.7-D PASS')}
            </span>
          </div>

          <div className="text-xs text-[var(--mn-text)] space-y-4 leading-relaxed font-mono">
            <div className="p-3 bg-[var(--mn-warning-soft)] border-r-4 border-amber-500 rounded-lg text-amber-800 dark:text-amber-400">
              <b>{t('معالجة فجوات الحلّال (Resolver Gaps):', 'Resolver Gaps Corrected:')}</b>{' '}
              {t(
                'تم تحديث منطق AcademicTaxonomyResolver بنجاح وبقواعد لغوية صارمة دون مطابقة ضبابية (Fuzzy Matching)، مما أدى لخفض الحالات المعلقة بشكل آمن تماماً وعزل التخصصات المشتركة.',
                'The AcademicTaxonomyResolver ruleset was safely upgraded with exact keyword maps, completely removing fuzzy matching risks and isolating interdisciplinary majors.'
              )}
            </div>

            <h3 className="text-sm font-bold text-[var(--mn-heading)] mt-4 border-r-4 border-[var(--mn-accent)] pr-2">
              {t('1. معالجة الثغرات والتطبيع اللغوي العربي', '1. Arabic Linguistic Normalization Gaps')}
            </h3>
            <p>
              {t(
                'تضمنت ثغرات المطابقة السابقة عيوباً لغوية مثل البادئات ومطابقة صيغة التعريف (مثل "علم النفس" ضد "علم نفس") والجمع والمفرد. تم تحديث خوارزمية التطبيع لتجاهل مرن ومقيد لأدوات التعريف مما حقق قفزة لنسبة الربط الكلي.',
                'Linguistic discrepancies (e.g. Al- prefixes or plural forms) were resolved through clean structural normalizations, capturing localized Arabic terms.'
              )}
            </p>

            <h3 className="text-sm font-bold text-[var(--mn-heading)] mt-4 border-r-4 border-[var(--mn-accent)] pr-2">
              {t('2. حظر التخصصات المتداخلة وعزلها (AMBIGUOUS)', '2. Interdisciplinary Ambiguities Isolated')}
            </h3>
            <p>
              {t(
                'تم فرض عزل صارم للتخصصات التي تجمع بين مجالين أكاديميين مختلفين ووصفها كحالات بينية (AMBIGUOUS) لضمان الفرز اليدوي البشري، مما منع وقوع تحيزات برمجية خاطئة. تشمل الأمثلة:',
                'Interdisciplinary programs bridging multiple broad domains are explicitly trapped as AMBIGUOUS for manual review:'
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
              <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]">
                <span className="font-bold text-[var(--mn-heading)] block">المعلوماتية الصحية (Health Informatics)</span>
                <span className="text-[10px] text-[var(--mn-text-muted)]">تتقاطع بين الصحة (09) وتكنولوجيا المعلومات (06)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]">
                <span className="font-bold text-[var(--mn-heading)] block">الهندسة الطبية الحيوية (Biomedical Engineering)</span>
                <span className="text-[10px] text-[var(--mn-text-muted)]">تتقاطع بين الصحة (09) والهندسة (07)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]">
                <span className="font-bold text-[var(--mn-heading)] block">علوم البيانات (Data Science)</span>
                <span className="text-[10px] text-[var(--mn-text-muted)]">تتقاطع بين تكنولوجيا المعلومات (06) والرياضيات والإحصاء (05)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)]">
                <span className="font-bold text-[var(--mn-heading)] block">الأمن السيبراني (Cybersecurity)</span>
                <span className="text-[10px] text-[var(--mn-text-muted)]">تتقاطع بين تكنولوجيا المعلومات (06) والخدمات الأمنية (10)</span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-[var(--mn-heading)] mt-4 border-r-4 border-[var(--mn-accent)] pr-2">
              {t('3. فجوات التصنيف الحقيقية لليونسكو (TRUE_TAXONOMY_GAP)', '3. Genuine UNESCO Taxonomy Gaps')}
            </h3>
            <p>
              {t(
                'هناك تخصصات حيوية ومطلوبة بشدة في المنطقة العربية ودول الشرق الأوسط والخليج، لكن تصنيف ISCED-F 2013 الكنسي لا يستوعبها في الرموز المكونة من 4 أرقام. تم إثباتها رسمياً كفجوات تصنيف حقيقية لحين معالجتها في الخطوة 8.8 للتوسيع الأكاديمي، ومنها:',
                'Certain regional specializations lack exact 4-digit anchors in UNESCO ISCED-F 2013. These are verified as true gaps to be structurally expanded in Step 8.8:'
              )}
            </p>
            <ul className="list-disc list-inside space-y-1 pr-4 text-amber-700 dark:text-amber-400">
              <li><b>إعادة التأهيل الرياضي (Sports Rehabilitation)</b> - تفتقر الصحة الرياضية لرمز تخصصي مستقل.</li>
              <li><b>تحليل السلوك التطبيقي (Applied Behavior Analysis)</b> - ممارسة سلوكية نفسية إقليمية هامة.</li>
              <li><b>الديموغرافيا وعلم السكان (Demography)</b> - دراسة التغيرات السكانية والإحصاء الحيوي البشري.</li>
              <li><b>التنمية الاجتماعية (Social Development)</b> - دراسة التطور المستدام وحوكمة شؤون المجتمع.</li>
            </ul>
          </div>
        </div>
      )}

      {/* 4. SMART RESOLVER SIMULATOR */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-5 animate-in fade-in duration-150 text-right">
          <div className="mn-card p-5 rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] space-y-4">
            <h2 className="text-base font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
              <Zap className="h-5 w-5 text-amber-500" />
              {t('محاكي الفرز والربط التلقائي للتصنيفات الأكاديمية المتقدمة', 'Interactive Academic Taxonomy Resolver Simulator')}
            </h2>
            <p className="text-xs text-[var(--mn-text-muted)] leading-relaxed">
              {t(
                'أدخل اسم تخصص باللغة العربية (مثل "تقنية القلب"، "المعلوماتية الصحية"، "الأمن السيبراني"، "إعادة التأهيل الرياضي" أو "علم النفس") لاختبار آلية عمل الحلّال الكنسي المطور في الخطوتين 8.7-C و 8.7-D ورؤية مخرجات الربط وقرارات العزل في الوقت الفعلي!',
                'Enter an Arabic major name to simulate live canonical UIS classification rules. Test matches, ambiguities, normalizations, and gaps instantly.'
              )}
            </p>

            <form onSubmit={handleSimulate} className="flex gap-2 max-w-xl">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={simulatedQuery}
                  onChange={(e) => setSimulatedQuery(e.target.value)}
                  placeholder={t('مثال: تقنية القلب، علوم البيانات، إعادة التأهيل الرياضي...', 'e.g. Cybersecurity, Medicine...')}
                  className="w-full h-11 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] px-4 text-xs font-bold text-[var(--mn-text)] outline-none focus:border-[var(--mn-accent)]"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-[#142B5F] text-[#D6A43B] dark:bg-[#D6A43B] dark:text-[#142B5F] font-bold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Code className="h-4 w-4" />
                {t('فرز التخصص', 'Resolve Major')}
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold">
              <span className="text-[var(--mn-text-muted)]">{t('تخصصات مقترحة للتجربة:', 'Suggested terms:')}</span>
              {['تقنية القلب', 'المعلوماتية الصحية', 'إعادة التأهيل الرياضي', 'علم النفس'].map((suggest) => (
                <button
                  key={suggest}
                  type="button"
                  onClick={() => {
                    setSimulatedQuery(suggest);
                    setTimeout(() => {
                      const form = document.querySelector('form');
                      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }, 50);
                  }}
                  className="px-2 py-1 rounded-lg border border-[var(--mn-border)] hover:bg-[var(--mn-surface-muted)] cursor-pointer text-[var(--mn-secondary)]"
                >
                  {suggest}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Output Result */}
          {simulationResult && (
            <div className="mn-card p-5 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] space-y-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-[var(--mn-border)] pb-2.5">
                <h3 className="text-sm font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-[var(--mn-accent-text)]" />
                  {t('مخرجات عُقدة التدقيق الكنسي وقرار المحاكي', 'Canonical Verification Output Result')}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    simulationResult.outcome === 'EXACT_MATCH'
                      ? 'bg-[var(--mn-success-soft)] text-[var(--mn-success-text)]'
                      : simulationResult.outcome === 'AMBIGUOUS'
                      ? 'bg-[var(--mn-info-soft)] text-[var(--mn-info-text)] animate-pulse'
                      : 'bg-[var(--mn-warning-soft)] text-[var(--mn-warning-text)]'
                  }`}
                >
                  {simulationResult.outcome}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs font-mono">
                <div className="p-3 bg-[var(--mn-surface-muted)] rounded-xl">
                  <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{t('الرمز والفرز الكنسي الرباعي', 'Canonical Detailed ISCED Code')}</div>
                  <div className="text-sm font-bold text-[var(--mn-heading)] mt-1">{simulationResult.code}</div>
                </div>

                <div className="p-3 bg-[var(--mn-surface-muted)] rounded-xl">
                  <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{t('المجال العريض للتصنيف الرئيسي', 'Broad Classification Field')}</div>
                  <div className="text-sm font-bold text-[var(--mn-heading)] mt-1">
                    {simulationResult.broadCode} - {simulationResult.broadTitle}
                  </div>
                </div>

                <div className="p-3 bg-[var(--mn-surface-muted)] rounded-xl">
                  <div className="text-[10px] text-[var(--mn-text-muted)] font-bold">{t('التسمية التفصيلية لليونسكو', 'UNESCO Standard Detailed Title')}</div>
                  <div className="text-sm font-bold text-[var(--mn-heading)] mt-1">
                    {simulationResult.detailedTitle}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-[var(--mn-border)] text-xs leading-relaxed text-[var(--mn-text)] space-y-1">
                <span className="font-bold text-[var(--mn-heading)] block">{t('تفاصيل قرار الحلّال الذكي وتحليل الفجوات:', 'Smart decision details:')}</span>
                <p>{simulationResult.description}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. ISCED GUIDE EXPLORER */}
      {activeSubTab === 'explorer' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-150 text-right">
          {/* Broad Fields Menu Column */}
          <div className="md:col-span-1 space-y-2 max-h-[500px] overflow-y-auto pr-1">
            <h3 className="text-xs font-bold text-[var(--mn-text-muted)] px-2 mb-2">
              {t('اختر المجال الأكاديمي العريض لليونسكو (11 مجالاً)', 'UNESCO 11 Broad Academic Fields')}
            </h3>
            {iscedBroadFields.map((field) => (
              <button
                key={field.code}
                type="button"
                onClick={() => setSelectedBroadField(field.code)}
                className={`w-full text-right p-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer border ${
                  selectedBroadField === field.code
                    ? 'border-[var(--mn-accent)] bg-[var(--mn-primary)]/10 text-[var(--mn-secondary)]'
                    : 'border-transparent hover:bg-[var(--mn-surface-muted)] text-[var(--mn-text)]'
                }`}
              >
                <span>
                  <b className="font-mono text-xs text-[var(--mn-accent-text)] ml-1">({field.code})</b> {field.title}
                </span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {field.count} {t('سجل', 'items')}
                </span>
              </button>
            ))}
          </div>

          {/* Broad Field Detailed Explorer Analysis */}
          <div className="md:col-span-2 mn-card p-5 sm:p-6 rounded-3xl border border-[var(--mn-border)] bg-[var(--mn-surface)] space-y-5 flex flex-col justify-between">
            {currentBroadField ? (
              <div className="space-y-4">
                <div className="border-b border-[var(--mn-border)] pb-3">
                  <span className="font-mono font-bold text-xs text-[var(--mn-accent-text)] uppercase block tracking-wider">
                    {t('المجال العريض المحدد من قبل اليونسكو', 'Broad Field Code')} {currentBroadField.code}
                  </span>
                  <h3 className="text-lg font-bold text-[var(--mn-heading)] mt-0.5">
                    {currentBroadField.title}
                  </h3>
                  <p className="text-xs text-[var(--mn-text-muted)] leading-relaxed mt-1">
                    {currentBroadField.desc}
                  </p>
                </div>

                {/* Statistics of Selected Broad Field */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--mn-surface-muted)]">
                    <span className="text-[10px] text-[var(--mn-text-muted)] font-bold">{t('إجمالي السجلات المدققة', 'Total Audited')}</span>
                    <span className="text-sm font-bold text-[var(--mn-heading)] block mt-1">{currentBroadField.count}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--mn-success-soft)]">
                    <span className="text-[10px] text-[var(--mn-success-text)] font-bold">{t('ربط دقيق (EXACT)', 'Exact Matched')}</span>
                    <span className="text-sm font-bold text-[var(--mn-success-text)] block mt-1">{currentBroadField.matched}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--mn-warning-soft)]">
                    <span className="text-[10px] text-[var(--mn-warning-text)] font-bold">{t('فجوة متبقية (GAP)', 'Remaining Gap')}</span>
                    <span className="text-sm font-bold text-[var(--mn-warning-text)] block mt-1">{currentBroadField.gap}</span>
                  </div>
                </div>

                {/* Subdiscipline Examples */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[var(--mn-heading)] flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-[var(--mn-accent-text)]" />
                    {t('تفاصيل التخصصات والأمثلة الفرعية في الكتالوج:', 'Linked Specializations and Catalog Examples:')}
                  </h4>
                  <div className="text-xs leading-relaxed text-[var(--mn-text)] space-y-1 bg-[var(--mn-surface-muted)]/50 p-3 rounded-xl">
                    {currentBroadField.code === '09' && (
                      <ul className="list-disc list-inside space-y-1.5 pr-3 text-[11px]">
                        <li><b>{t('عقدة الطب البشري (0912):', 'Medicine (0912):')}</b> {t('الطب البشري، الجراحة العامة، الباطنية، طب الشيخوخة الكنسي.', 'Medicine and surgical specialties.')}</li>
                        <li><b>{t('عقدة التمريض والتوليد (0913):', 'Nursing & Midwifery (0913):')}</b> {t('التمريض الإكلينيكي، التمريض المكثف، القبالة القانونية.', 'Clinical nursing and specialized care.')}</li>
                        <li><b>{t('عقدة تقنيات التشخيص الطبي (0914):', 'Diagnostic Tech (0914):')}</b> {t('التروية القلبية، تقنية القلب، علوم الأشعة التشخيصية.', 'Cardiovascular technology and radiography.')}</li>
                        <li><b>{t('عقدة التأهيل والعلاج (0915):', 'Therapy & Rehab (0915):')}</b> {t('العلاج الطبيعي، العلاج التنفسي، تقويم النطق واللغة والميكانيكا الحيوية.', 'Physical therapy, respiratory therapy, and speech pathology.')}</li>
                      </ul>
                    )}
                    {currentBroadField.code === '06' && (
                      <ul className="list-disc list-inside space-y-1.5 pr-3 text-[11px]">
                        <li><b>{t('عقدة تصميم الشبكات وإدارتها (0612):', 'Networks & Databases (0612):')}</b> {t('الحوسبة السحابية، إنترنت الأشياء، إدارة قواعد البيانات الضخمة.', 'Cloud computing, IoT, and database systems.')}</li>
                        <li><b>{t('عقدة البرمجة وتطوير الأنظمة (0613):', 'Software & Coding (0613):')}</b> {t('علوم الحاسب الأساسية، تطوير تطبيقات الويب، الحوسبة المتنقلة.', 'Computer science and mobile application development.')}</li>
                      </ul>
                    )}
                    {currentBroadField.code === '04' && (
                      <p className="text-[11px] pr-2">
                        {t(
                          'تطابق كامل بنسبة 100%! جميع سجلات الكتالوج البالغة 440 ترتبط بشكل كنسي دقيق برمز الإدارة والتنظيم 0413، والمحاسبة 0411، والقانون والتشريع 0421 دون تزييف أو تداخل.',
                          '100% Exact Match! All 440 records cleanly link to canonical administration (0413), accounting (0411), and law (0421).'
                        )}
                      </p>
                    )}
                    {currentBroadField.code === '05' && (
                      <p className="text-[11px] pr-2">
                        {t(
                          'تطابق كامل بنسبة 100%! ترتبط كافة سجلات الكيمياء والفيزياء والأحياء والرياضيات برمتها بالترميزات الكنسية 0531 و 0532 و 0541 دون أي معوقات تشغيلية.',
                          '100% Exact Match! All physics, chemistry, biology, and math items link precisely to standard ISCED codes 0531, 0532, and 0541.'
                        )}
                      </p>
                    )}
                    {currentBroadField.code !== '09' && currentBroadField.code !== '06' && currentBroadField.code !== '04' && currentBroadField.code !== '05' && (
                      <p className="text-[11px] pr-2 text-[var(--mn-text-muted)]">
                        {t(
                          'يضم هذا المجال مجموعة من السجلات المدققة مع وجود توازن كنسي بين التطابق التام وفجوات التصنيف الحقيقية التي سيتم معالجة التوسيع والحلول المبتكرة لها في الخطوة 8.8.',
                          'This field contains various audited items with a balanced mix of exact mappings and true gaps scheduled for Step 8.8 expansion.'
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-[var(--mn-text-muted)] py-12">
                {t('يرجى اختيار مجال عريض من القائمة الجانبية.', 'Please select a broad field.')}
              </p>
            )}

            <div className="border-t border-[var(--mn-border)] pt-3.5 mt-4 text-[10px] text-[var(--mn-text-muted)] leading-relaxed">
              {t(
                'البيانات المعروضة مستمدة من تحليلات ونتائج الخطوة 8.7-C و 8.7-D لضمان الجاهزية القصوى قبل الانتقال التدريجي لخطط ترقية واستيراد التخصصات في المرحلة التاسعة.',
                'Data and analysis derived directly from Step 8.7-C & 8.7-D compliance rules to secure launch readiness.'
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
