import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Building2, Calendar, DollarSign, FileText, GraduationCap, Globe, Languages, ShieldCheck, ExternalLink } from 'lucide-react';
import type { Scholarship } from '../types';
import { DetailSectionHeader } from './DetailUi';

const benefitNames: Record<string, string> = { TUITION: 'الرسوم الدراسية', TUITION_FEES: 'الرسوم الدراسية', STIPEND: 'الراتب أو البدل', ACCOMMODATION: 'السكن', HEALTH_INSURANCE: 'التأمين الصحي', TRAVEL: 'السفر', LIVING_ALLOWANCE: 'بدل المعيشة' };
function Text({ value }: { value?: string | null }) {
  return value ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    table: ({ children }) => <div className="overflow-x-auto"><table className="w-full">{children}</table></div>,
    td: ({ children }) => <td className="p-2 border border-[var(--mn-border)]">{children}</td>,
    th: ({ children }) => <th className="p-2 border border-[var(--mn-border)] bg-[var(--mn-surface-muted)]">{children}</th>,
    ul: ({ children }) => <ul className="list-disc pr-4 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pr-4 space-y-1">{children}</ol>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-[var(--mn-primary)]">{children}</a>,
  }}>{value}</ReactMarkdown> : <span className="text-[var(--mn-text-muted)]">غير محدد في البيانات المنشورة</span>;
}
function fundingAmount(value?: string | null, currency?: string | null): string | undefined {
  if (!value || !currency || !/^-?\d+$/.test(value)) return undefined;
  try {
    const digits = new Intl.NumberFormat('ar', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const amount = BigInt(value);
    const sign = amount < 0n ? '-' : '';
    const absolute = amount < 0n ? -amount : amount;
    const divisor = 10n ** BigInt(digits);
    const fraction = digits ? `.${(absolute % divisor).toString().padStart(digits, '0')}` : '';
    return `${sign}${new Intl.NumberFormat('ar').format(absolute / divisor)}${fraction} ${currency}`;
  } catch { return undefined; }
}
export function PublishedScholarshipDetails({ scholarship, onOpenUniversity, onOpenExam }: { scholarship: Scholarship; onOpenUniversity?: (id: string) => void; onOpenExam?: (id: string) => void }) {
  const dto = scholarship.publishedData!;
  const canonicalAmount = fundingAmount(dto.amountMinorUnits, dto.amountCurrencyCode);
  const section = (id: string, title: string, icon: typeof BookOpen, children: React.ReactNode) => <section key={id} dir="rtl" className="relative bg-[var(--mn-surface)] rounded-2xl p-3.5 border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
    <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-primary)] to-transparent" />
    <DetailSectionHeader id={id} icon={icon} title={title} className="mb-3" />
    <div className="space-y-2 text-[11px] font-bold leading-[1.9] text-[var(--mn-heading)]">{children}</div>
  </section>;
  const eligibility = dto.eligibilityItems || [];
  const documents = dto.requiredDocumentItems || [];
  const benefits = dto.benefits || [];
  const list = (items: string[]) => items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={index} className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)] border border-[var(--mn-border)]"><Text value={item} /></li>)}</ul> : <Text />;
  return <div className="px-1.5 sm:px-2 space-y-2.5 z-20 relative -mt-2.5 sm:-mt-3">
    {section('scholarship-donor', 'الجهة المانحة', Building2, <Text value={dto.providerName || dto.sponsorName} />)}
    {section('scholarship-country', 'الدولة ونطاق المنحة', Globe, <><Text value={dto.countrySourceLabel || dto.studyCountry} />{dto.countryScope && <Text value={dto.countryScope} />}</>)}
    {section('scholarship-overview', 'نبذة عن المنحة', BookOpen, <Text value={dto.description || scholarship.description} />)}
    {section('scholarship-degrees', 'الدرجات والتخصصات المستهدفة', GraduationCap, <>
      {list(scholarship.degreeLevel)}
      {list((dto.majorTargets || []).map(item => item.sourceLabel || '').filter(Boolean))}
      {!dto.majorTargets?.length && dto.eligibleMajorsOrFields && <Text value={Array.isArray(dto.eligibleMajorsOrFields) ? dto.eligibleMajorsOrFields.join('، ') : dto.eligibleMajorsOrFields} />}
    </>)}
    {section('scholarship-funding', 'التمويل والتغطية المالية', DollarSign, <>
      <p>{scholarship.fundingType}</p>
      {benefits.length ? list(benefits.map(item => [item.valueText || benefitNames[item.benefitTypeCode] || item.benefitTypeCode,
        item.amount != null ? String(item.amount) : '', item.currency?.isoCode || dto.currency || '',
        item.durationText, item.frequencyCode, item.isOptional ? 'اختياري' : '', item.isCovered === false ? 'غير مشمول' : '', item.notes].filter(Boolean).join(' — '))) : <Text value={dto.coverageDetails} />}
      {dto.fundingAmount && <p>{dto.fundingAmount} {dto.currency}</p>}
      {canonicalAmount && <p>{canonicalAmount}</p>}
      {dto.duration && <Text value={dto.duration} />}
    </>)}
    {section('scholarship-eligibility', 'شروط الأهلية والقبول', ShieldCheck, eligibility.length ? list(eligibility.map(item => [item.valueText || item.itemTypeCode,
      item.minimumValue != null ? `الحد الأدنى: ${item.minimumValue}` : '', item.maximumValue != null ? `الحد الأعلى: ${item.maximumValue}` : '',
      item.isRequired === false ? 'اختياري' : ''].filter(Boolean).join(' — '))) : <Text value={dto.eligibilityCriteria} />)}
    {section('scholarship-documents', 'الوثائق المطلوبة', FileText, documents.length ? list(documents.map(item => [item.displayName, item.description, item.isRequired === false ? 'اختياري' : ''].filter(Boolean).join(' — '))) : <Text value={dto.requiredDocuments} />)}
    {section('scholarship-language', 'لغة الدراسة', Languages, <Text value={dto.studyLanguageSourceLabel || dto.studyLanguage} />)}
    {section('scholarship-deadlines', 'المواعيد ودورة التقديم', Calendar, <>
      <Text value={scholarship.deadline || (dto.deadlineType === 'OPEN_ALL_YEAR' ? 'التقديم متاح طوال العام' : undefined)} />
      {dto.academicYear && <p>العام الأكاديمي: {dto.academicYear}</p>}
      {dto.cycleName && <Text value={dto.cycleName} />}
    </>)}
    {section('scholarship-application', 'طريقة التقديم والروابط الرسمية', ExternalLink, <>
      {dto.applicationMethod && <Text value={dto.applicationMethod} />}
      {[[scholarship.applicationUrl, 'التقديم للمنحة'], [dto.officialSourceUrl || dto.officialWebsite || dto.sourceUrl, 'المصدر الرسمي']].map(([url, label], index) => url && /^https?:\/\//i.test(url) ? <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex gap-2 p-3 rounded-xl border border-[var(--mn-border-brand)] text-[var(--mn-primary)]"><ExternalLink className="w-4 h-4" />{label}</a> : null)}
    </>)}
    {scholarship.participatingUniversities?.length ? section('scholarship-universities', 'الجامعات المشاركة', Building2, <div className="space-y-2">{scholarship.participatingUniversities.map(item => <button key={item.id} type="button" onClick={() => onOpenUniversity?.(item.id)} className="w-full rounded-xl border border-[var(--mn-border-brand)] p-3 text-right text-[var(--mn-primary)]">{item.name}</button>)}</div>) : null}
    {scholarship.requiredExams?.length ? section('scholarship-tests', 'الاختبارات المطلوبة', ShieldCheck, <div className="space-y-2">{scholarship.requiredExams.map((item, index) => <button key={`${item.id}-${index}`} type="button" onClick={() => onOpenExam?.(item.id)} className="w-full rounded-xl border border-[var(--mn-border-brand)] p-3 text-right text-[var(--mn-primary)]">{item.name}</button>)}</div>) : null}
    {dto.notes && section('scholarship-notes', 'ملاحظات المنحة', FileText, <Text value={dto.notes} />)}
  </div>;
}
