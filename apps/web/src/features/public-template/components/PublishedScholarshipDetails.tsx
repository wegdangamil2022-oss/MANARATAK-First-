import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Building2, Calendar, DollarSign, FileText, GraduationCap, Globe, Languages, ShieldCheck, ExternalLink } from 'lucide-react';
import type { Scholarship } from '../types';
import { DetailSectionHeader } from './DetailUi';
import { FundedProgramPairs } from './FundedProgramPairs';
import { ManagedApplicationEntry, DirectApplicationSelfReport } from '../../analytics/ManagedApplicationEntry';

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
function StudyLanguageOptions({ options, locale }: {
  options: NonNullable<NonNullable<Scholarship['publishedData']>['studyOptions']>;
  locale: 'ar' | 'en';
}) {
  const languages = [...new Set(options.map(option => option.language))];
  const [selected, setSelected] = useState<'zh' | 'en'>();
  const active = selected && languages.includes(selected) ? selected : languages[0];
  const label = (code: 'zh' | 'en') => code === 'zh'
    ? (locale === 'ar' ? 'الصينية' : 'Chinese')
    : (locale === 'ar' ? 'الإنجليزية' : 'English');
  return <>
    <div className="flex flex-wrap gap-2">
      {languages.map(code => <button type="button" key={code} aria-pressed={active === code}
        className={`rounded-xl border px-4 py-2 ${active === code ? 'border-[#0E7C86] bg-[#0E7C86] text-white' : 'border-[var(--mn-border)] bg-[var(--mn-surface-muted)]'}`}
        onClick={() => setSelected(code)}>{label(code)}</button>)}
    </div>
    {options.filter(option => option.language === active).map(option =>
      <div key={option.institution} className="space-y-2"><h3>{option.institution}</h3>
        <ul className="grid gap-2 md:grid-cols-2">{option.programs.map(program =>
          <li key={program} className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)] p-2.5">{program}</li>)}</ul>
      </div>)}
  </>;
}

export function PublishedScholarshipDetails({ scholarship, onOpenUniversity, onOpenExam }: { scholarship: Scholarship; onOpenUniversity?: (id: string) => void; onOpenExam?: (id: string) => void }) {
  const { t: publicT, dir: publicDir, language } = usePublicTemplateTranslation();

  const dto = scholarship.publishedData!;
  const studyOptions = dto.studyOptions ?? [];
  const canonicalAmount = fundingAmount(dto.amountMinorUnits, dto.amountCurrencyCode, language);
  const section = (id: string, title: string, icon: typeof BookOpen, children: React.ReactNode) => <section key={id} dir={publicDir} className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
    <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
    <DetailSectionHeader id={id} icon={icon} title={title} className="mb-3 md:mb-4" />
    <div className="space-y-2 md:space-y-3 text-[11px] font-bold leading-[1.9] text-[var(--mn-heading)]">{children}</div>
  </section>;
  const eligibility = dto.eligibilityItems || [];
  const documents = dto.requiredDocumentItems || [];
  const benefits = dto.benefits || [];
  const benefitLabel = (item: (typeof benefits)[number]) =>
    [item.valueText || (benefitNames[item.benefitTypeCode] ? publicT(benefitNames[item.benefitTypeCode]) : item.benefitTypeCode),
      item.amount != null ? String(item.amount) : '', item.currency?.isoCode || dto.currency || '',
      item.durationText, item.frequencyCode, item.isOptional ? publicT('public_published_optional') : '',
      item.isCovered === false ? publicT('public_published_not_covered') : '', item.notes].filter(Boolean).join(' — ');
  const coverageGroups = ['FULL', 'PARTIAL'].map(code => ({
    code, items: benefits.filter(item => item.coverageTypeCode === code),
  })).filter(group => group.items.length);
  const sharedBenefits = benefits.filter(item => !coverageGroups.some(group => group.items.includes(item)));
  const list = (items: string[]) => items.length ? <ul className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 items-stretch">{items.map((item, index) => <li key={index} className="h-full p-2.5 md:p-3.5 rounded-xl bg-[var(--mn-surface-muted)] border border-[var(--mn-border)]"><Text value={item} /></li>)}</ul> : <Text />;
  const requirementList = (items: Array<{ key: string; text: string; testId?: string | null }>) => <ul className="space-y-2">{items.map(item => <li key={item.key} className="p-2.5 rounded-xl bg-[var(--mn-surface-muted)] border border-[var(--mn-border)]">
    <Text value={item.text} />
    {item.testId && onOpenExam && <button type="button" aria-label={`${publicT('public_view_linked_test')}: ${item.text}`} onClick={() => onOpenExam(item.testId!)} className="mt-2 rounded-lg border border-[var(--mn-border-brand)] p-2 text-[var(--mn-primary)]">{publicT('public_view_linked_test')}</button>}
  </li>)}</ul>;
  return <div className="px-0 md:px-4 space-y-2.5 md:space-y-4 z-20 relative -mt-2.5 sm:-mt-3">
    {dto.hasUnavailableRequirements && <p role="status" className="rounded-xl border border-[var(--mn-border)] p-3 text-[var(--mn-heading)]">{publicT('public_requirements_partial')}</p>}
    {section('scholarship-donor', publicT('public_published_funding_organization'), Building2, <Text value={dto.providerName || dto.sponsorName} />)}
    {section('scholarship-country', publicT('public_published_country_and_scholarship_scope'), Globe, <><Text value={dto.studyCountryLabel || dto.countrySourceLabel || dto.studyCountry} />{dto.countryScope && <Text value={dto.countryScope} />}</>)}
    {section('scholarship-overview', publicT('public_published_scholarship_overview'), BookOpen, <Text value={dto.description || scholarship.description} />)}
    {section('scholarship-degrees', publicT('public_published_target_degrees_and_majors'), GraduationCap, <>
      {scholarship.degreeLevel.length > 0 && list(scholarship.degreeLevel)}
      {(dto.fundedProgramPairs?.length ?? 0) > 0 && <FundedProgramPairs pairs={dto.fundedProgramPairs ?? []} language={language} />}
      {studyOptions.length > 0 && <StudyLanguageOptions options={studyOptions} locale={language} /> }
    </>)}
    {section('scholarship-funding', publicT('public_published_funding_and_financial_coverage'), DollarSign, <>
      <p>{scholarship.fundingType}</p>
      {coverageGroups.length > 1 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {coverageGroups.map(group => <div key={group.code} className="space-y-2 rounded-xl border border-[var(--mn-border)] p-3">
            <h3>{group.code === 'FULL' ? (language === 'ar' ? 'تمويل كامل' : 'Full funding') : (language === 'ar' ? 'تمويل جزئي' : 'Partial funding')}</h3>
            {list(group.items.map(benefitLabel))}
          </div>)}
          {sharedBenefits.length > 0 && list(sharedBenefits.map(benefitLabel))}
        </div>
      ) : benefits.length ? list(benefits.map(benefitLabel)) : <Text value={dto.coverageDetails} />}
      {dto.fundingAmount && <p>{dto.fundingAmount} {dto.currency}</p>}
      {canonicalAmount && <p>{canonicalAmount}</p>}
      {dto.duration && <Text value={dto.duration} />}
    </>)}
    {section('scholarship-eligibility', publicT('public_published_eligibility_and_admission_requirements'), ShieldCheck, eligibility.length ? list(eligibility.map(item => [item.valueText || item.itemTypeCode, item.countryLabel, item.countryLabel ? item.operatorCode : undefined,
      item.minimumValue != null ? publicT('public_minimum_value', { v0: item.minimumValue }) : '', item.maximumValue != null ? publicT('public_maximum_value', { v0: item.maximumValue }) : '',
      item.isRequired === false ? publicT('public_published_optional') : ''].filter(Boolean).join(' — '))) : <Text value={dto.eligibilityCriteria} />)}
    {section('scholarship-documents', publicT('public_published_required_documents'), FileText, documents.length ? requirementList(documents.map((item, index) => ({ key: item.documentKey || `document-${index}`, testId: item.internationalTestId, text: [item.displayName, item.description, item.isRequired === false ? publicT('public_published_optional') : ''].filter(Boolean).join(' — ') }))) : <Text value={dto.requiredDocuments} />)}
    {section('scholarship-language', publicT('public_published_study_language'), Languages, list((dto.fundedProgramPairs ?? []).map(pair => `${pair.programName}: ${pair.studyLanguages?.map(item=>item.name).join('، ') || (language === 'ar' ? 'غير محددة' : 'Unspecified')}`)))}
    {(scholarship.deadline || dto.deadlineType === 'OPEN_ALL_YEAR') && section('scholarship-deadlines', publicT('public_published_deadlines_and_application_round'), Calendar, <>
      <Text value={scholarship.deadline || (dto.deadlineType === 'OPEN_ALL_YEAR' ? publicT('public_applications_accepted_throughout_the_year') : undefined)} />
      {dto.academicYear && <p>{publicT('public_academic_year')}{' '}{dto.academicYear}</p>}
      {dto.cycleName && <Text value={dto.cycleName} />}
    </>)}
    {section('scholarship-application', publicT('public_published_how_to_apply_and_official_links'), ExternalLink, <>
      {dto.applicationMethod && <Text value={dto.applicationMethod} />}
      <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 items-stretch">
        {[[scholarship.applicationUrl, dto.deadlineType === 'NOT_STATED_IN_SOURCE' ? (language === 'ar' ? 'موقع البرنامج' : 'Program website') : publicT('public_published_apply_for_scholarship')], [dto.officialSourceUrl || dto.officialWebsite || dto.sourceUrl, 'المصدر الرسمي']].map(([url, label], index) => url && /^https?:\/\//i.test(url) ? <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="h-full flex items-center gap-2 p-3 md:p-4 rounded-xl border border-[var(--mn-border-brand)] text-[var(--mn-primary)]"><ExternalLink className="w-4 h-4 shrink-0" />{label}</a> : null)}
      </div>
    </>)}
    {dto.deadlineType !== 'NOT_STATED_IN_SOURCE' && <>
      <DirectApplicationSelfReport opportunityId={scholarship.slug} />
      <ManagedApplicationEntry opportunityId={scholarship.slug} />
    </>}
    {scholarship.participatingUniversities?.length ? section('scholarship-universities', publicT('public_published_participating_universities'), Building2, <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-3 items-stretch">{scholarship.participatingUniversities.map(item => <button key={item.id} type="button" onClick={() => onOpenUniversity?.(item.id)} className="w-full h-full rounded-xl border border-[var(--mn-border-brand)] p-3 md:p-3.5 text-start text-[var(--mn-primary)] cursor-pointer">{item.name}</button>)}</div>) : null}
    {scholarship.requiredExams?.length ? section('scholarship-tests', publicT('public_published_required_exams'), ShieldCheck, <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-3 items-stretch">{scholarship.requiredExams.map((item, index) => <button key={`${item.id}-${index}`} type="button" onClick={() => onOpenExam?.(item.id)} className="w-full h-full rounded-xl border border-[var(--mn-border-brand)] p-3 md:p-3.5 text-start text-[var(--mn-primary)] cursor-pointer">{item.name}</button>)}</div>) : null}
    {dto.notes && section('scholarship-notes', publicT('public_published_scholarship_notes'), FileText, <Text value={dto.notes} />)}
  </div>;
}
