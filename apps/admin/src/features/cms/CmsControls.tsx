import { CmsOwnerPicker } from './CmsOwnerPicker';
import React from 'react';
import { Loader2, FolderTree, Tags, Link2 } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';
import { useCmsCopy } from './cmsCopy';
import { DomainLink, TaxonomyState, labelOf } from './cmsModels';
export function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-[#142B5F]">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
export function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-emerald-100">{label}</p>
    </div>
  );
}
export function Alert({
  tone,
  children,
}: {
  tone: 'success' | 'error';
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 text-sm font-bold ${tone === 'success' ? 'border-[#DDEFF2] bg-[#DDEFF2]/55 text-[#0E7C86]' : 'border-red-200 bg-red-50 text-red-800'}`}
    >
      {children}
    </div>
  );
}
export function Field({
  label,
  value,
  onChange,
  required,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        dir={dir}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </label>
  );
}
export function TextArea({
  label,
  value,
  onChange,
  rows,
  required,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  required?: boolean;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <textarea
        dir={dir}
        required={required}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="input resize-y leading-7"
      />
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
export function PrimaryButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0E7C86] px-4 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
export function Action({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DDEFF2] bg-white px-3 text-sm font-bold text-[#0E7C86] hover:bg-[#DDEFF2]/55 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
export function LocaleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-5 py-2 text-sm font-bold ${active ? 'bg-[#0E7C86] text-white' : 'bg-slate-100 text-slate-600'}`}
    >
      {children}
    </button>
  );
}
export function Status({ value }: { value: string }) {
  const { language: uiLanguage } = useTranslation();
  const color =
    value === 'PUBLISHED'
      ? 'bg-emerald-100 text-[#0E7C86]'
      : value === 'IN_REVIEW' || value === 'READY_TO_PUBLISH'
        ? 'bg-amber-100 text-amber-800'
        : value === 'ARCHIVED'
          ? 'bg-slate-200 text-slate-700'
          : 'bg-blue-100 text-blue-800';
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black ${color}`}>
      {labelOf(value, uiLanguage)}
    </span>
  );
}
export function Loading() {
  return (
    <div className="grid min-h-40 place-items-center">
      <Loader2 className="h-7 w-7 animate-spin text-[#0E7C86]" />
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
export function DomainLinksPanel({
  links,
  setLinks,
  busy,
  onSave,
}: {
  links: DomainLink[];
  setLinks: (value: DomainLink[]) => void;
  busy: boolean;
  onSave: () => Promise<void>;
}) {
  const tr = useCmsCopy();
  const add = () =>
    setLinks([
      ...links,
      { targetType: 'UNIVERSITY', targetId: '', relationType: 'RELATED', sortOrder: links.length },
    ]);
  return (
    <Panel title={tr('الربط مع أقسام المنصة')} icon={<Link2 className="h-5 w-5" />}>
      <p className="mb-4 text-xs leading-6 text-slate-500">
        {tr(
          'اربط المادة بالـOwner UUID للكيان Canonical فقط. استخدم معرف السجل الفعلي من لوحة الإدارة. لا تستخدم الاسم أو الرابط المختصر، ولا تنسخ بيانات الكيان داخل المادة.',
        )}{' '}
      </p>
      <div className="space-y-3">
        {links.map((link, index) => (
          <div
            key={`${link.targetType}-${index}`}
            className="grid gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/50 p-3 md:grid-cols-[1fr_1.4fr_1fr_auto]"
          >
            <select
              disabled={busy}
              aria-label={tr('نوع العلاقة المستهدفة')}
              className="input"
              value={link.targetType}
              onChange={(e) =>
                setLinks(
                  links.map((item, i) =>
                    i === index ? { ...item, targetType: e.target.value, targetId: '' } : item,
                  ),
                )
              }
            >
              <option value="UNIVERSITY"> {tr('جامعة')} </option>
              <option value="ACADEMIC_PROGRAM"> {tr('برنامج جامعي')} </option>
              <option value="SCHOLARSHIP"> {tr('منحة')} </option>
              <option value="MAJOR"> {tr('تخصص')} </option>
              <option value="INTERNATIONAL_TEST"> {tr('اختبار دولي')} </option>
              <option value="COURSE"> {tr('دورة')} </option>
              <option value="REFERENCE_COUNTRY"> {tr('دولة / وجهة دراسية')} </option>
            </select>
            <CmsOwnerPicker
              type={link.targetType}
              value={link.targetId}
              disabled={busy}
              onChange={(value) =>
                setLinks(
                  links.map((item, i) => (i === index ? { ...item, targetId: value } : item)),
                )
              }
            />
            <select
              disabled={busy}
              className="input"
              aria-label={tr('دلالة العلاقة')}
              value={link.relationType}
              onChange={(e) =>
                setLinks(
                  links.map((item, i) =>
                    i === index ? { ...item, relationType: e.target.value } : item,
                  ),
                )
              }
            >
              <option value="RELATED"> {tr('مرتبط')} </option>
              <option value="FEATURED"> {tr('مميز')} </option>
              <option value="GUIDE"> {tr('دليل')} </option>
              <option value="APPLICATION"> {tr('التقديم')} </option>
              <option value="REQUIREMENTS"> {tr('المتطلبات')} </option>
              <option value="ELIGIBILITY"> {tr('الأهلية')} </option>
            </select>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg px-3 text-sm font-bold text-red-600 hover:bg-red-50"
              onClick={() => setLinks(links.filter((_, i) => i !== index))}
            >
              {tr('حذف')}{' '}
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || links.length >= 50}
            onClick={add}
            className="rounded-xl border border-[#0E7C86] px-4 py-2 text-sm font-bold text-[#0E7C86] hover:bg-[#DDEFF2]/50"
          >
            {tr('+ إضافة رابط')}{' '}
          </button>
          <button
            type="button"
            disabled={busy || links.some((link) => !link.targetId.trim())}
            onClick={() => void onSave()}
            className="rounded-xl bg-[#142B5F] px-4 py-2 text-sm font-bold text-white hover:bg-[#0E7C86] disabled:opacity-50"
          >
            {tr('حفظ الروابط')}{' '}
          </button>
        </div>
      </div>
    </Panel>
  );
}

export function TaxonomyPanel({
  taxonomy,
  setTaxonomy,
  createTaxonomy,
  busy,
}: {
  taxonomy: TaxonomyState;
  setTaxonomy: (value: TaxonomyState) => void;
  createTaxonomy: (kind: 'category' | 'tag') => Promise<void>;
  busy: boolean;
}) {
  const tr = useCmsCopy();
  return (
    <Panel title={tr('التصنيفات والوسوم')} icon={<FolderTree className="h-5 w-5" />}>
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-bold">
            <FolderTree className="h-4 w-4" />
            {tr('تصنيف جديد')}{' '}
          </p>
          <Field
            label={tr('الرابط')}
            dir="ltr"
            value={taxonomy.categorySlug}
            onChange={(v) => setTaxonomy({ ...taxonomy, categorySlug: v })}
          />
          <Field
            label={tr('الاسم العربي')}
            value={taxonomy.categoryAr}
            onChange={(v) => setTaxonomy({ ...taxonomy, categoryAr: v })}
          />
          <Field
            label={tr('الاسم الإنجليزي')}
            dir="ltr"
            value={taxonomy.categoryEn}
            onChange={(v) => setTaxonomy({ ...taxonomy, categoryEn: v })}
          />
          <Action disabled={busy} onClick={() => void createTaxonomy('category')}>
            {tr('إضافة التصنيف')}{' '}
          </Action>
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Tags className="h-4 w-4" />
            {tr('وسم جديد')}{' '}
          </p>
          <Field
            label={tr('القيمة المطبّعة')}
            dir="ltr"
            value={taxonomy.tagValue}
            onChange={(v) => setTaxonomy({ ...taxonomy, tagValue: v })}
          />
          <Field
            label={tr('العربي')}
            value={taxonomy.tagAr}
            onChange={(v) => setTaxonomy({ ...taxonomy, tagAr: v })}
          />
          <Field
            label="English"
            dir="ltr"
            value={taxonomy.tagEn}
            onChange={(v) => setTaxonomy({ ...taxonomy, tagEn: v })}
          />
          <Action disabled={busy} onClick={() => void createTaxonomy('tag')}>
            {tr('إضافة الوسم')}{' '}
          </Action>
        </div>
      </div>
    </Panel>
  );
}
