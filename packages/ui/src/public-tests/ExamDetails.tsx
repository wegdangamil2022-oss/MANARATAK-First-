import React from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  Monitor,
  RotateCcw,
  ShieldCheck,
  Target,
} from 'lucide-react';
import type { PublicExam as Exam, ExamEntityRef } from './presentation';
import './exam-details.css';




interface ExamDetailsProps {
  exam: Exam;
  onClose: () => void;
  onOpenUniversity?: (universityId: string) => void;
  onOpenScholarship?: (scholarshipId: string) => void;
  onOpenCountry?: (countryId: string) => void;
  onOpenArticle?: (articleId: string) => void;
  favoriteControl?: React.ReactNode;
  relatedArticles?: React.ReactNode;
}

export const ExamDetails: React.FC<ExamDetailsProps> = ({
  exam,
  onClose,
  onOpenUniversity,
  onOpenScholarship,
  onOpenCountry,
  favoriteControl,
  relatedArticles,
}) => {
  const facts = exam.keyFacts?.length
    ? exam.keyFacts
    : [
        { label: 'الدرجة', value: exam.scoreRange || 'حسب الاختبار' },
        { label: 'المدة', value: exam.duration || 'تختلف' },
        { label: 'الصلاحية', value: exam.validity || 'حسب الجهة' },
        { label: 'اللغة', value: exam.language || exam.category },
      ];

  return (
    <div className="mn-exam-details min-h-screen bg-[var(--mn-page)] pb-24 font-['Cairo',sans-serif] text-[var(--mn-heading)] mn-exam-panel " dir="rtl">
      <header className="relative overflow-hidden border-b-[3px] border-[var(--mn-accent)]/65 bg-gradient-to-b from-[var(--mn-primary)] via-[var(--mn-hero-secondary)] to-[var(--mn-primary)] px-4 pb-4 pt-3 text-white shadow-md mn-exam-inverse ">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full border border-[var(--mn-accent)]" />
          <div className="absolute -left-7 -top-7 h-52 w-52 rounded-full border border-[var(--mn-accent)]/60" />
          <div className="absolute -bottom-20 -right-14 h-48 w-48 rounded-full bg-[var(--mn-accent)]/15 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} className="mn-exam-close" aria-label="إغلاق">×</button>
            <div className="flex min-w-0 items-center gap-2">
              {favoriteControl}
              <span className="rounded-full border border-[var(--mn-accent)]/45 bg-[var(--mn-accent)]/10 px-2.5 py-1 text-[9.5px] font-bold text-[var(--mn-accent-text)]">
                {exam.categoryLabel || exam.category}
              </span>
              {exam.status && (
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9.5px] font-bold text-white">
                  {exam.status === 'PUBLISHED' ? 'منشور' : exam.status === 'READY_TO_PUBLISH' ? 'جاهز للنشر' : 'معاينة'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--mn-accent)]/60 bg-white/10 shadow-sm backdrop-blur-sm">
              <Award className="h-6 w-6 text-[var(--mn-accent-text)]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] font-bold leading-tight text-white sm:text-2xl">{exam.name}</h1>
              <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-[var(--mn-accent-text)]">
                {exam.nameEn}
                {exam.testCode && exam.testCode !== exam.nameEn ? ` • ${exam.testCode}` : ''}
              </p>
              {exam.providerName && (
                <p className="mt-1.5 text-[10.5px] font-semibold leading-5 text-[var(--mn-on-dark-muted)]">{exam.providerName}</p>
              )}
            </div>
          </div>

          <p className="mt-3 text-[11px] font-semibold leading-5 text-[var(--mn-on-dark-muted)]">{exam.description}</p>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {facts.slice(0, 4).map((fact) => (
              <div key={`${fact.label}-${fact.value}`} className="rounded-xl border border-white/10 bg-white/[0.08] px-2.5 py-2 backdrop-blur-sm">
                <p className="text-[8.5px] font-bold text-[var(--mn-text-muted)]">{fact.label}</p>
                <p className="mt-0.5 text-[11px] font-bold leading-4 text-white">{fact.value}</p>
              </div>
            ))}
          </div>

          {(exam.verificationLabel || exam.lastVerifiedAt) && (
            <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-[var(--mn-accent)]/25 bg-black/10 px-2.5 py-2 text-[9px] font-semibold leading-4 text-[var(--mn-on-dark-muted)]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
              <span>
                {exam.verificationLabel}
                {exam.lastVerifiedAt ? ` • آخر تحقق: ${exam.lastVerifiedAt}` : ''}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 mn-exam-gutter pt-4">
        {exam.studentUses && exam.studentUses.length > 0 && (
          <section>
            <SectionTitle icon={<Target className="h-4 w-4" />} id="exam-about" title="متى تحتاج هذا الاختبار؟" />
            <div className="grid grid-cols-2 gap-1.5">
              {exam.studentUses.map((item, index) => (
                <CompactTile key={item} index={index + 1} text={item} />
              ))}
            </div>
          </section>
        )}

        {exam.variants && exam.variants.length > 0 && (
          <section>
            <SectionTitle icon={<Languages className="h-4 w-4" />} id="exam-versions" title="النسخ وطرق الاستخدام" subtitle="اختر النسخة حسب هدفك، لا حسب الاسم فقط" />
            <div className="mn-exam-snap-row no-scrollbar">
              {exam.variants.map((variant) => (
                <article key={variant.name} className="w-[76%] min-w-[230px] max-w-[290px] snap-start rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3 shadow-sm mn-exam-panel ">
                  <p className="text-[11px] font-bold text-[var(--mn-heading)]">{variant.name}</p>
                  <p className="mt-1 text-[9.5px] font-semibold leading-4 text-[var(--mn-text-muted)]">{variant.meta}</p>
                  {variant.note && <p className="mt-2 rounded-lg bg-[var(--mn-exam-gold-surface)] px-2 py-1.5 text-[8.5px] font-bold leading-4 text-[var(--mn-accent-text)] mn-exam-panel ">{variant.note}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {exam.sections && exam.sections.length > 0 && (
          <section>
            <SectionTitle icon={<BookOpen className="h-4 w-4" />} id="exam-structure" title="بنية الاختبار والأقسام" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {exam.sections.map((section, index) => (
                <article key={`${section.name}-${index}`} className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3 shadow-sm mn-exam-panel ">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold leading-4 text-[var(--mn-heading)]">{section.name}</p>
                      {section.meta && <p className="mt-1 text-[9px] font-semibold leading-4 text-[var(--mn-text-muted)]">{section.meta}</p>}
                    </div>
                    <span className="rounded-lg bg-[var(--mn-primary)]/8 px-2 py-1 text-[8.5px] font-bold text-[var(--mn-heading)]">{index + 1}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    <MiniFact label="الأسئلة" value={section.questionCount || '—'} />
                    <MiniFact label="الوقت" value={section.duration || '—'} />
                    <MiniFact label="الدرجة" value={section.score || '—'} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {exam.scoreNotes && exam.scoreNotes.length > 0 && (
            <InfoPanel icon={<Award className="h-4 w-4" />} title="الدرجات والتقييم" items={exam.scoreNotes} />
          )}
          {exam.deliveryModes && exam.deliveryModes.length > 0 && (
            <InfoPanel icon={<Monitor className="h-4 w-4" />} title="طريقة التقديم" items={exam.deliveryModes} />
          )}
        </section>

        {(exam.registrationSteps?.length || exam.registrationRequirements?.length) && (
          <section>
            <SectionTitle icon={<FileText className="h-4 w-4" />} id="exam-registration" title="التسجيل والوثائق" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {exam.registrationSteps && exam.registrationSteps.length > 0 && (
                <NumberedPanel title="خطوات التسجيل" items={exam.registrationSteps} />
              )}
              {exam.registrationRequirements && exam.registrationRequirements.length > 0 && (
                <InfoPanel title="متطلبات أساسية" items={exam.registrationRequirements} compact />
              )}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {exam.resultNotes && exam.resultNotes.length > 0 && (
            <InfoPanel icon={<Calendar className="h-4 w-4" />} title="النتائج والصلاحية" items={exam.resultNotes} />
          )}
          <article className="rounded-2xl border border-[var(--mn-border-brand)]/25 bg-[var(--mn-surface)] p-3 shadow-sm mn-exam-panel ">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--mn-heading)]" />
              <h3 id="exam-scores" className="mn-exam-section-title scroll-mt-28">الرسوم والتوفر</h3>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              <MiniFact label="الرسوم" value={exam.feeSummary || 'تختلف حسب المركز'} wide />
              <MiniFact label="الانتشار / الاستخدام" value={exam.recognitionSummary || 'حسب الاختبار والجهة'} wide />
            </div>
          </article>
        </section>

        {exam.retakeNotes && exam.retakeNotes.length > 0 && (
          <InfoPanel icon={<RotateCcw className="h-4 w-4" />} title="الإعادة ومراجعة النتيجة" items={exam.retakeNotes} />
        )}

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {exam.testDayRules && exam.testDayRules.length > 0 && (
            <InfoPanel icon={<ShieldCheck className="h-4 w-4" />} title="يوم الاختبار والأمان" items={exam.testDayRules} />
          )}
          {exam.preparationTips && exam.preparationTips.length > 0 && (
            <InfoPanel icon={<BookOpen className="h-4 w-4" />} title="التحضير الذكي" items={exam.preparationTips} />
          )}
        </section>

        {exam.comparisonCards && exam.comparisonCards.length > 0 && (
          <section>
            <SectionTitle icon={<Globe2 className="h-4 w-4" />} id="exam-preparation" title="قرارات مهمة قبل الحجز" />
            <div className="grid grid-cols-2 gap-1.5">
              {exam.comparisonCards.map((item) => (
                <article key={item.title} className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2.5 shadow-sm mn-exam-panel ">
                  <p className="text-[10px] font-bold text-[var(--mn-heading)]">{item.title}</p>
                  <p className="mt-1 text-[8.8px] font-semibold leading-4 text-[var(--mn-text-muted)]">{item.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {(exam.relatedUniversities?.length || exam.relatedScholarships?.length || exam.relatedCountries?.length) && (
          <section>
            <SectionTitle icon={<Globe2 className="h-4 w-4" />} id="exam-recognition" title="ارتباطات منارتك" subtitle="روابط هوية مرتبطة بالقبول والمنح والدول عند توفرها" />
            {exam.relatedUniversities && exam.relatedUniversities.length > 0 && (
              <RelatedRow
                title="جامعات وبرامج مرتبطة"
                icon={<Building2 className="h-3.5 w-3.5" />}
                items={exam.relatedUniversities}
                onSelect={(item) => item.id && onOpenUniversity?.(item.id)}
              />
            )}
            {exam.relatedScholarships && exam.relatedScholarships.length > 0 && (
              <RelatedRow
                title="منح مرتبطة"
                icon={<GraduationCap className="h-3.5 w-3.5" />}
                items={exam.relatedScholarships}
                onSelect={(item) => item.id && onOpenScholarship?.(item.id)}
              />
            )}
            {exam.relatedCountries && exam.relatedCountries.length > 0 && (
              <RelatedRow
                title="دول مرتبطة بالاستخدام"
                icon={<MapPin className="h-3.5 w-3.5" />}
                items={exam.relatedCountries}
                onSelect={(item) => item.id && onOpenCountry?.(item.id)}
              />
            )}
          </section>
        )}

        {relatedArticles}

        {exam.importantWarnings && exam.importantWarnings.length > 0 && (
          <section className="rounded-2xl border border-[var(--mn-border-gold)] bg-[var(--mn-exam-gold-surface)]/80 p-3 shadow-sm mn-exam-panel ">
            <SectionTitle id="exam-warnings" icon={<AlertTriangle className="h-4 w-4" />} title="تنبيهات قبل الاعتماد على النتيجة" />
            <ul className="mt-2 space-y-1.5">
              {exam.importantWarnings.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-[9.5px] font-semibold leading-4 text-[var(--mn-accent-text)]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--mn-accent)] mn-exam-gold " />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {exam.officialLinks && exam.officialLinks.length > 0 && (
          <section>
            <SectionTitle icon={<ExternalLink className="h-4 w-4" />} id="exam-official-links" title="المصادر والروابط الرسمية" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {exam.officialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[var(--mn-border-brand)]/30 bg-[var(--mn-surface)] px-3 py-2.5 shadow-sm transition hover:border-[var(--mn-accent)] mn-exam-panel "
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[var(--mn-heading)]">{link.label}</p>
                    {link.note && <p className="mt-0.5 text-[8.5px] font-semibold text-[var(--mn-text-muted)]">{link.note}</p>}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)] transition group-hover:-translate-y-0.5" />
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

function SectionTitle({ id, icon, title, subtitle }: { id?: string; icon: React.ReactNode; title: string; subtitle?: string }) {
  return <div id={id} className="mn-exam-section-header scroll-mt-28 flex flex-col items-center text-center">
    <div className="flex items-center justify-center gap-2"><span className="mn-exam-section-icon">{icon}</span><h2 className="mn-exam-section-title">{title}</h2></div>
    {subtitle && <p className="mt-1 text-[11px] leading-5 text-[var(--mn-text-muted)]">{subtitle}</p>}
  </div>;
}

function CompactTile({ index, text }: { index: number; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2.5 shadow-sm mn-exam-panel ">
      <div className="flex items-start gap-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--mn-primary)] text-[8px] font-bold text-white mn-exam-inverse ">{index}</span>
        <p className="text-[9px] font-bold leading-4 text-[var(--mn-text-muted)]">{text}</p>
      </div>
    </div>
  );
}

function MiniFact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-2 py-1.5  mn-exam-panel ${wide ? 'text-right' : 'text-center'}`}>
      <p className="text-[7.8px] font-bold text-[var(--mn-text-muted)]">{label}</p>
      <p className="mt-0.5 text-[8.8px] font-bold leading-3.5 text-[var(--mn-text)]">{value}</p>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  items,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  items: string[];
  compact?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3 shadow-sm mn-exam-panel ">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[var(--mn-heading)]">{icon}</span>}
        <h3 className="text-[11px] font-bold text-[var(--mn-heading)]">{title}</h3>
      </div>
      <ul className={`${compact ? 'mt-1.5' : 'mt-2'} space-y-1.5`}>
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-[9px] font-semibold leading-4 text-[var(--mn-text-muted)]">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--mn-accent-text)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function NumberedPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3 shadow-sm mn-exam-panel ">
      <h3 className="text-[11px] font-bold text-[var(--mn-heading)]">{title}</h3>
      <ol className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={item} className="flex items-start gap-1.5 text-[9px] font-semibold leading-4 text-[var(--mn-text-muted)]">
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--mn-primary)]/8 text-[7.5px] font-bold text-[var(--mn-heading)]">{index + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function RelatedRow({
  title,
  icon,
  items,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  items: ExamEntityRef[];
  onSelect: (item: ExamEntityRef) => void;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-bold text-[var(--mn-text-muted)]">
        {icon}
        <span>{title}</span>
      </div>
      <div className="mn-exam-snap-row no-scrollbar">
        {items.map((item) => (
          <button
            type="button"
            key={`${title}-${item.id || item.name}`}
            onClick={() => onSelect(item)}
            className="w-[66%] min-w-[205px] max-w-[250px] snap-start rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2.5 text-right shadow-sm transition hover:border-[var(--mn-accent)] active:scale-[0.99] mn-exam-panel "
          >
            <p className="text-[10px] font-bold leading-4 text-[var(--mn-heading)]">{item.name}</p>
            {item.nameEn && <p className="mt-0.5 text-[8px] font-bold text-[var(--mn-accent-text)]">{item.nameEn}</p>}
            {item.meta && <p className="mt-1 text-[8.5px] font-semibold leading-4 text-[var(--mn-text-muted)]">{item.meta}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}
