import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { School } from 'lucide-react';
import { useTranslation } from '../../../i18n/I18nProvider';
import type { PublicScholarshipDto } from '../../../api/client';
import type { ScholarshipBenefitGroup } from '../types';

const benefitNames: Record<string, string> = { TUITION: "public_published_tuition_fees", TUITION_FEES: "public_published_tuition_fees", STIPEND: "public_published_stipend_or_allowance", ACCOMMODATION: "public_published_accommodation", HEALTH_INSURANCE: "public_published_health_insurance", TRAVEL: "public_published_travel", LIVING_ALLOWANCE: "public_published_living_allowance" };
export function ScholarshipMarkdown({ value }: { value?: string | null }) {
  const { t: publicT } = useTranslation();

  return value ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    table: ({ children }) => <div className="overflow-x-auto"><table className="w-full">{children}</table></div>,
    td: ({ children }) => <td className="p-2 border border-[var(--mn-border)]">{children}</td>,
    th: ({ children }) => <th className="p-2 border border-[var(--mn-border)] bg-[var(--mn-surface-muted)]">{children}</th>,
    ul: ({ children }) => <ul className="list-disc pr-4 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pr-4 space-y-1">{children}</ol>,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-[var(--mn-primary)]">{children}</a>,
  }}>{value}</ReactMarkdown> : <span className="text-[var(--mn-text-muted)]">{publicT('public_not_specified_in_published_information')}</span>;
}
export function formatScholarshipFundingAmount(value?: string | null, currency?: string | null, locale: 'ar' | 'en' = 'ar'): string | undefined {
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

type Translate = ReturnType<typeof useTranslation>['t'];

export function publishedBenefitGroups(dto: PublicScholarshipDto, t: Translate): ScholarshipBenefitGroup[] {
  const groups: ScholarshipBenefitGroup[] = [];
  for (const item of dto.benefits ?? []) {
    const code = (item.coverageTypeCode ?? '').toUpperCase();
    const id = ['FULL', 'FULLY_FUNDED'].includes(code) ? 'full'
      : ['PARTIAL', 'PARTIALLY_FUNDED'].includes(code) ? 'partial' : 'shared';
    const key = benefitNames[item.benefitTypeCode];
    const label = [
      item.valueText || (key ? t(key) : item.benefitTypeCode),
      item.amount == null ? '' : [item.amount, item.currency?.isoCode || dto.currency].filter(Boolean).join(' '),
      item.durationText, item.frequencyCode, item.isOptional ? t('public_published_optional') : '',
      item.isCovered === false ? t('public_published_not_covered') : '', item.notes,
    ].filter(Boolean).join(' — ');
    let group = groups.find(current => current.id === id);
    if (!group) {
      const title = id === 'full' ? t('public_scholarship_full_funding') : id === 'partial' ? t('public_scholarship_partial_funding') : '';
      group = { id, title, items: [] };
      groups.push(group);
    }
    group.items.push(label);
  }
  return groups;
}

export function scholarshipDetailTabClass(isActive: boolean) {
  return `px-3.5 md:px-5 py-1.5 md:py-2 text-[10.5px] sm:text-[11px] font-bold rounded-xl transition-all whitespace-nowrap border cursor-pointer ${
    isActive
      ? 'bg-[#142B5F] dark:bg-[#1B3A78] text-white border-[#142B5F] dark:border-[#F2CD78]/40 shadow-[0_3px_10px_rgba(20,43,95,0.18)]'
      : 'bg-[#F4F7FA] dark:bg-[#0B1529] text-[#5C707C] dark:text-[#9BB4C7] border-[#142B5F]/10 dark:border-white/10 hover:border-[#0E7C86]/40 hover:text-[#142B5F] dark:hover:text-white'
  }`;
}

export function PublishedStudyOptions({ options }: { options: NonNullable<PublicScholarshipDto['studyOptions']> }) {
  const { t } = useTranslation();
  const languages = [...new Set(options.map(option => option.language))];
  const [selected, setSelected] = useState(languages[0]);
  const active = languages.includes(selected) ? selected : languages[0];

  return (
    <div className="space-y-3.5 md:space-y-4">
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {languages.map(code => (
          <button key={code} type="button" aria-pressed={code === active}
            className={scholarshipDetailTabClass(code === active)} onClick={() => setSelected(code)}>
            {t(code === 'zh' ? 'public_scholarship_chinese' : 'public_scholarship_english')}
          </button>
        ))}
      </div>
      {options.filter(option => option.language === active).map(option => (
        <div key={option.institution} className="space-y-2.5">
          <h4 className="flex items-center gap-2 text-[11px] sm:text-xs md:text-[13px] font-bold text-[#142B5F] dark:text-[#F1F5F9]">
            <span className="w-5.5 h-5.5 rounded-md bg-[#142B5F] text-white flex items-center justify-center shrink-0">
              <School className="w-3 h-3" aria-hidden="true" />
            </span>
            {option.institution}
          </h4>
          <ul className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-2.5">
            {option.programs.map(program => (
              <li key={program} className="px-3 md:px-3.5 py-1.5 md:py-2 bg-[#F6F8FA] dark:bg-[#0B1529]/75 border border-[#142B5F]/10 dark:border-white/10 text-[#203442] dark:text-[#E2ECF4] text-[10.5px] font-bold rounded-xl">
                {program}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
