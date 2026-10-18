import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Building2, Calendar, DollarSign, FileText, GraduationCap, Globe, Languages, ShieldCheck, ExternalLink } from 'lucide-react';
import type { Scholarship } from '../types';
import { DetailSectionHeader } from './DetailUi';
import { FundedProgramPairs } from './FundedProgramPairs';

const benefitNames: Record<string, string> = { TUITION: "public_published_tuition_fees", TUITION_FEES: "public_published_tuition_fees", STIPEND: "public_published_stipend_or_allowance", ACCOMMODATION: "public_published_accommodation", HEALTH_INSURANCE: "public_published_health_insurance", TRAVEL: "public_published_travel", LIVING_ALLOWANCE: "public_published_living_allowance" };
function Text({ value }: { value?: string | null }) {
  const { t: publicT } = usePublicTemplateTranslation();

  return value ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    table: ({ children }) => <div className="overflow-x-auto"><table className="w-full">{children}</table></div>,
    td: ({ children }) => <td className="p-2 border border-[var(--mn-border)]">{children}</td>,
    th: ({ children }) => <th className="p-2 border border-[var(--mn-border)] bg-[var(--mn-surface-muted)]">{children}</th>,
    ul: ({ children }) => <ul className="list-disc pr-4 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pr-4 space-y-1">{children}</ol>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-[var(--mn-primary)]">{children}</a>,
  }}>{value}</ReactMarkdown> : <span className="text-[var(--mn-text-muted)]">{publicT('public_not_specified_in_published_information')}</span>;
}
function fundingAmount(value?: string | null, currency?: string | null, locale: 'ar' | 'en' = 'ar'): string | undefined {
  if (!value || !currency || !/^-?\d+$/.test(value)) return undefined;
  try {
    const digits = new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const amount = BigInt(value);
    const sign = amount < 0n ? '-' : '';
    const absolute = amount < 0n ? -amount : amount;
    const divisor = 10n ** BigInt(digits);
    const fraction = digits ? `.${(absolute % divisor).toString().padStart(digits, '0')}` : '';
    return `${sign}${new Intl.NumberFormat(locale).format(absolute / divisor)}${fraction} ${currency}`;
  } catch { return undefined; }
}
export function PublishedScholarshipDetails({ scholarship, onOpenUniversity, onOpenExam }: { scholarship: Scholarship; onOpenUniversity?: (id: string) => void; onOpenExam?: (id: string) => void }) {
  const { t: publicT, dir: publicDir, language } = usePublicTemplateTranslation();

  const dto = scholarship.publishedData!;
  const canonicalAmount = fundingAmount(dto.amountMinorUnits, dto.amountCurrencyCode, language);
  const section = (id: string, title: string, icon: typeof BookOpen, children: React.ReactNode) => <section key={id} dir={publicDir} className="relative bg-[var(--mn-surface)] rounded-2xl p-3.5 border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
    <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-primary)] to-transparent" />
    <DetailSectionHeader id={id} icon={icon} title={title} className="mb-3" />
    <div className="space-y-2 text-[11px] font-bold leading-[1.9] text-[var(--mn-heading)]">{children}</div>
  </section>;
  const eligibility = dto.eligibilityItems || [];
  const documents = dto.requiredDocumentItems || [];
  const benefits = dto.benefits || [];
  const list = (items: string[]) => items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={index} className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)] border border-[var(--mn-border)]"><Text value={item} /></li>)}</ul> : <Text />;
  return <div className="px-1.5 sm:px-2 space-y-2.5 z-20 relative -mt-2.5 sm:-mt-3">
    {section('scholarship-donor', publicT('public_published_funding_organization'), Building2, <Text value={dto.providerName || dto.sponsorName} />)}
    {section('scholarship-country', publicT('public_published_country_and_scholarship_scope'), Globe, <><Text value={dto.countrySourceLabel || dto.studyCountry} />{dto.countryScope && <Text value={dto.countryScope} />}</>)}
    {section('scholarship-overview', publicT('public_published_scholarship_overview'), BookOpen, <Text value={dto.description || scholarship.description} />)}
    {section('scholarship-degrees', publicT('public_published_target_degrees_and_majors'), GraduationCap, <>
      <FundedProgramPairs pairs={dto.fundedProgramPairs ?? []} language={language} />
    </>)}
    {section('scholarship-funding', publicT('public_published_funding_and_financial_coverage'), DollarSign, <>
      <p>{scholarship.fundingType}</p>
      {benefits.length ? list(benefits.map(item => [item.valueText || (benefitNames[item.benefitTypeCode] ? publicT(benefitNames[item.benefitTypeCode]) : item.benefitTypeCode),
        item.amount != null ? String(item.amount) : '', item.currency?.isoCode || dto.currency || '',
        item.durationText, item.frequencyCode, item.isOptional ? publicT('public_published_optional') : '', item.isCovered === false ? publicT('public_published_not_covered') : '', item.notes].filter(Boolean).join(' — '))) : <Text value={dto.coverageDetails} />}
      {dto.fundingAmount && <p>{dto.fundingAmount} {dto.currency}</p>}
      {canonicalAmount && <p>{canonicalAmount}</p>}
      {dto.duration && <Text value={dto.duration} />}
    </>)}
    {section('scholarship-eligibility', publicT('public_published_eligibility_and_admission_requirements'), ShieldCheck, eligibility.length ? list(eligibility.map(item => [item.valueText || item.itemTypeCode,
      item.minimumValue != null ? publicT('public_minimum_value', { v0: item.minimumValue }) : '', item.maximumValue != null ? publicT('public_maximum_value', { v0: item.maximumValue }) : '',
      item.isRequired === false ? publicT('public_published_optional') : ''].filter(Boolean).join(' — '))) : <Text value={dto.eligibilityCriteria} />)}
    {section('scholarship-documents', publicT('public_published_required_documents'), FileText, documents.length ? list(documents.map(item => [item.displayName, item.description, item.isRequired === false ? publicT('public_published_optional') : ''].filter(Boolean).join(' — '))) : <Text value={dto.requiredDocuments} />)}
    {section('scholarship-language', publicT('public_published_study_language'), Languages, <Text value={dto.studyLanguageSourceLabel || dto.studyLanguage} />)}
    {section('scholarship-deadlines', publicT('public_published_deadlines_and_application_round'), Calendar, <>
      <Text value={scholarship.deadline || (dto.deadlineType === 'OPEN_ALL_YEAR' ? publicT('public_applications_accepted_throughout_the_year') : undefined)} />
      {dto.academicYear && <p>{publicT('public_academic_year')}{' '}{dto.academicYear}</p>}
      {dto.cycleName && <Text value={dto.cycleName} />}
    </>)}
    {section('scholarship-application', publicT('public_published_how_to_apply_and_official_links'), ExternalLink, <>
      {dto.applicationMethod && <Text value={dto.applicationMethod} />}
      {[[scholarship.applicationUrl, publicT('public_published_apply_for_scholarship')], [dto.officialSourceUrl || dto.officialWebsite || dto.sourceUrl, 'المصدر الرسمي']].map(([url, label], index) => url && /^https?:\/\//i.test(url) ? <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="flex gap-2 p-3 rounded-xl border border-[var(--mn-border-brand)] text-[var(--mn-primary)]"><ExternalLink className="w-4 h-4" />{label}</a> : null)}
    </>)}
    {scholarship.participatingUniversities?.length ? section('scholarship-universities', publicT('public_published_participating_universities'), Building2, <div className="space-y-2">{scholarship.participatingUniversities.map(item => <button key={item.id} type="button" onClick={() => onOpenUniversity?.(item.id)} className="w-full rounded-xl border border-[var(--mn-border-brand)] p-3 text-start text-[var(--mn-primary)]">{item.name}</button>)}</div>) : null}
    {scholarship.requiredExams?.length ? section('scholarship-tests', publicT('public_published_required_exams'), ShieldCheck, <div className="space-y-2">{scholarship.requiredExams.map((item, index) => <button key={`${item.id}-${index}`} type="button" onClick={() => onOpenExam?.(item.id)} className="w-full rounded-xl border border-[var(--mn-border-brand)] p-3 text-start text-[var(--mn-primary)]">{item.name}</button>)}</div>) : null}
    {dto.notes && section('scholarship-notes', publicT('public_published_scholarship_notes'), FileText, <Text value={dto.notes} />)}
  </div>;
}
