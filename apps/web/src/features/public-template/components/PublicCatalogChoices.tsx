import { useState } from 'react';
import { ApiClient } from '../../../api/client';
import { useBoundedCatalog } from '../useBoundedCatalog';
import { useTranslation } from '../../../i18n/I18nProvider';
export function PublicCatalogChoices({ kind, value, onChange, label:labelOverride }: { kind: 'country' | 'degree' | 'major' | 'language'; value: string; onChange: (id: string) => void; label?:string }) {
  const { language } = useTranslation(); const locale = language === 'en' ? 'en' : 'ar', ar = locale === 'ar';
  const [query, setQuery] = useState('');
  const page = useBoundedCatalog(`${kind}:${locale}:${query}`, async (cursor, signal) => {
    if (kind !== 'country') {
      const result = await ApiClient.getPublicProgramFacetChoices({ locale, query, cursor, signal, facet: ({ degree: 'DEGREE', major: 'MAJOR', language: 'LANGUAGE' } as const)[kind] });
      return { data: result.items, total: result.total, nextCursor: result.nextCursor };
    }
    const number = Number(cursor ?? 1);
    const rows = await ApiClient.getReferenceCountries({ q: query || undefined, locale, page: number, pageSize: 50 }, signal);
    return { data: rows.map(row => ({ id: row.id, label: ar ? row.nameAr || row.name : row.name })), total: null, nextCursor: rows.length === 50 ? String(number + 1) : null };
  });
  const label = labelOverride ?? (kind === 'country' ? (ar ? 'الدولة' : 'Country') : ({ degree: ar ? 'الدرجة' : 'Degree', major: ar ? 'التخصص' : 'Major', language: ar ? 'لغة الدراسة' : 'Study language' }[kind]) + (ar ? ' — من البرامج المنشورة' : ' — from published programs'));
  return <fieldset className="space-y-2 rounded border p-3"><legend>{label}</legend>
    <input aria-label={`${label} search`} type="search" maxLength={200} value={query} onChange={e => setQuery(e.target.value)} placeholder={ar ? 'ابحث عن خيار' : 'Search options'} />
    <select aria-label={labelOverride ?? kind} value={value} disabled={page.busy} onChange={e => onChange(e.target.value)}><option value="">{ar ? 'الكل' : 'All'}</option>
      {value && !page.rows.some(row => row.id === value) && <option value={value}>{ar ? 'الاختيار الحالي' : 'Current selection'}</option>}
      {page.rows.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
    </select>
    {page.cursor && <button type="button" disabled={page.busy} onClick={page.more}>{ar ? 'خيارات أكثر' : 'More options'}</button>}
    {page.error && <button type="button" onClick={page.retry}>{ar ? 'إعادة تحميل الخيارات' : 'Retry options'}</button>}
  </fieldset>;
}
