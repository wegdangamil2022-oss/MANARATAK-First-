import { Loader2, Save, ShieldCheck, Database } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';
import {
  nonEmpty,
  reviewStates,
  type SupportedLocale,
  type UniversityTranslationReviewStatus,
  type TranslationStorage,
} from './workspaceModel';

export function LocaleEditor(props: {
  locale: SupportedLocale;
  label: string;
  name: string;
  description: string;
  status: UniversityTranslationReviewStatus;
  supportsDescriptions: boolean;
  supportsReviewStatus: boolean;
  saving: boolean;
  contentAuthoringEnabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: UniversityTranslationReviewStatus) => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const textDirection = props.locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <div className="rounded-2xl border border-[#DDEFF2] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LocaleBadge locale={props.locale.toUpperCase()} complete={nonEmpty(props.name)} />
          <span className="text-xs font-black text-[#142B5F]">{props.label}</span>
        </div>
        {props.supportsReviewStatus && (
          <select
            aria-label={props.label + ' review status'}
            value={props.status}
            disabled={!props.contentAuthoringEnabled}
            onChange={(event) =>
              props.onStatusChange(event.target.value as UniversityTranslationReviewStatus)
            }
            className="rounded-lg border border-[#DDEFF2] bg-[#FAF7F0]/50 px-2 py-1.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reviewStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        )}
      </div>
      <label
        htmlFor={`translation-${props.locale}-name`}
        className="block text-[10px] font-black text-slate-500"
      >
        {t('translation_display_name')}
      </label>
      <input
        id={`translation-${props.locale}-name`}
        dir={textDirection}
        value={props.name}
        readOnly={!props.contentAuthoringEnabled}
        onChange={(event) => props.onNameChange(event.target.value)}
        className={`mt-1 min-h-11 w-full rounded-xl border border-[#DDEFF2] px-3 text-sm font-bold outline-none focus:border-[#21A7B4] ${props.contentAuthoringEnabled ? 'bg-[#FAF7F0]/40' : 'cursor-not-allowed bg-slate-50 text-slate-500'}`}
      />
      {props.supportsDescriptions && (
        <>
          <label
            htmlFor={`translation-${props.locale}-description`}
            className="mt-3 block text-[10px] font-black text-slate-500"
          >
            {t('translation_description')}
          </label>
          <textarea
            id={`translation-${props.locale}-description`}
            dir={textDirection}
            value={props.description}
            readOnly={!props.contentAuthoringEnabled}
            onChange={(event) => props.onDescriptionChange(event.target.value)}
            rows={4}
            className={`mt-1 w-full rounded-xl border border-[#DDEFF2] p-3 text-xs font-medium leading-6 outline-none focus:border-[#21A7B4] ${props.contentAuthoringEnabled ? 'bg-[#FAF7F0]/40' : 'cursor-not-allowed bg-slate-50 text-slate-500'}`}
          />
        </>
      )}
      <button
        type="button"
        onClick={props.onSave}
        disabled={props.saving || !props.contentAuthoringEnabled}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white transition hover:bg-[#0E7C86] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{' '}
        {props.contentAuthoringEnabled
          ? t('translation_save_locale')
          : t('translation_content_deferred')}
      </button>
    </div>
  );
}

export function LocaleBadge({ locale, complete }: { locale: string; complete: boolean }) {
  return (
    <span
      className={`translation-locale-badge rounded-full border px-2.5 py-1 font-black ${complete ? 'border-[#0E7C86]/20 bg-[#0E7C86]/8 text-[#0E7C86]' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
    >
      {locale} {complete ? '✓' : '—'}
    </span>
  );
}

export function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#DDEFF2] bg-white px-3 py-2">
      <div className="text-[9px] font-black text-slate-400">{label}</div>
      <div className="mt-1 text-[11px] font-black text-[#203442]">{value}</div>
    </div>
  );
}

export function RuntimeNotice({ storage }: { storage: TranslationStorage }) {
  const { t } = useTranslation();
  if (storage !== 'COMPATIBILITY_OVERLAY') {
    return (
      <div className="flex gap-3 rounded-2xl border border-[#0E7C86]/15 bg-[#DDEFF2]/30 p-4 text-xs font-semibold leading-6 text-[#203442]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E7C86]" />
        <span>{t('translation_source_only_notice')}</span>
      </div>
    );
  }
  return (
    <div className="flex gap-3 rounded-2xl border border-[#D6A43B]/25 bg-[#F2CD78]/15 p-4 text-xs font-semibold leading-6 text-[#725718]">
      <Database className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{t('translation_compatibility_storage_notice')}</span>
    </div>
  );
}
