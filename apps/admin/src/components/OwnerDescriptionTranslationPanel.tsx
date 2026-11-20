import {adminOptionLabel} from './adminOptionLabels';
import { useEffect, useRef, useState } from 'react';
import { canAuthorDomainTranslations, reviewReasonHeaders, type TranslationDomainKey } from '@manaratak/shared';
import { adminApiClient } from '../api/client';
export function OwnerDescriptionTranslationPanel({
  domain,
  ownerId,
  endpoint,
  optionalFields,
  status,
  onSaved,
  revision,
  uiLanguage = 'ar',
  blocked = false,
  beginMutation,
  onUnverified,
}: {
  domain: Extract<TranslationDomainKey, 'COURSE' | 'SCHOLARSHIP' | 'INTERNATIONAL_TEST'>;
  ownerId: string;
  endpoint: string;
  optionalFields?: Record<string, unknown>;
  status: string;
  onSaved: () => void | Promise<void>;
  revision?: number;
  uiLanguage?: string;
  blocked?: boolean;
  beginMutation?: () => (() => void) | undefined;
  onUnverified?: () => void;
}) {
  const tr = (ar: string, en: string) => (uiLanguage === 'ar' ? ar : en);
  const [locale, setLocale] = useState<'ar' | 'en'>('ar');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [displayFields,setDisplayFields]=useState<Record<string,string>>({});
  const fieldLabels:Record<string,string>={platformName:'المنصة / الجامعة',studyDuration:'المدة',difficultyLevel:'المستوى الدراسي',certificateType:'نوع الشهادة',learningLanguageLabel:'اسم لغة التدريس (ترجمة التسمية فقط)',shortTopics:'الموضوعات المختصرة'};
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadRequired, setReloadRequired] = useState(false);
  const saving = useRef(false);
  const enabled =
    !blocked && canAuthorDomainTranslations(domain) &&
    !['ARCHIVED', 'REJECTED'].includes(status) &&
    (domain === 'INTERNATIONAL_TEST' || status !== 'PUBLISHED');
  useEffect(() => {
    const pairs = optionalFields?.ownerLocalizedDescriptions as
      Record<string, { displayName?: string; description?: string; displayFields?:Record<string,string> }> | undefined;
    setTitle(pairs?.[locale]?.displayName ?? '');
    setDescription(pairs?.[locale]?.description ?? '');
    setDisplayFields(pairs?.[locale]?.displayFields ?? {});
    setError('');
    setNotice('');
    setReloadRequired(false);
  }, [ownerId, locale, optionalFields]);
  async function save(remove = false) {
    if (saving.current || !enabled || reloadRequired) return;
    const release = beginMutation?.();
    if (beginMutation && !release) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    let written = false;
    try {
      if ((domain === 'SCHOLARSHIP' || domain === 'COURSE') && (!Number.isSafeInteger(revision) || revision! < 1))
        throw new Error(domain + '_REVISION_PRECONDITION_REQUIRED');
      const desiredFields = Object.fromEntries(Object.entries(displayFields).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value));
      const saved = await adminApiClient.request<{ version?: number; status?: string }>(
        `${endpoint}/${encodeURIComponent(ownerId)}/localized-description`,
        {
          method: 'POST',
          headers: {
            ...reviewReasonHeaders(reason),
            ...((domain === 'SCHOLARSHIP' || domain === 'COURSE') ? { 'If-Match': String(revision) } : {}),
          },
          body: JSON.stringify(
            remove ? { locale, remove: true } : { locale, displayName: title, description, ...(domain==='COURSE'?{displayFields:desiredFields}:{}) },
          ),
        },
      );
      written = true;
      const response = await adminApiClient.request<Record<string, unknown>>(
        `${endpoint}/${encodeURIComponent(ownerId)}`,
        { cache: 'no-store' },
      );
      const readback = (response.scholarship ?? response) as {
        id?: string;
        version?: number;
        status?: string;
        optionalFields?: {
          ownerLocalizedDescriptions?: Record<
            string,
            { displayName?: string; description?: string; displayFields?: Record<string, string> }
          >;
        };
      };
      const pair = readback.optionalFields?.ownerLocalizedDescriptions?.[locale];
      if (
        readback.id !== ownerId ||
        (domain === 'COURSE' && (saved.version === undefined || saved.version <= revision! || readback.version !== saved.version || readback.status !== saved.status)) ||
        (remove
          ? pair !== undefined
          : pair?.displayName !== title.trim() || pair?.description !== description.trim() ||
            (domain === 'COURSE' && (Object.keys(pair?.displayFields ?? {}).length !== Object.keys(desiredFields).length ||
              Object.entries(desiredFields).some(([key, value]) => pair?.displayFields?.[key] !== value))))
      )
        throw new Error('تعذّر التحقق من القيم المحفوظة.');
      await onSaved();
      setNotice('حُفظ زوج الاسم والوصف في نسخة المالك؛ يلزم مسار المراجعة والنشر الأصلي.');
    } catch (error) {
      if (written) {
        setReloadRequired(true);
        onUnverified?.();
      }
      setError(
        (written ? 'نجح الحفظ وتعذرت إعادة القراءة؛ أعد تحميل السجل قبل المحاولة. ' : '') +
          (error instanceof Error ? error.message : 'تعذر الحفظ'),
      );
    } finally {
      release?.();
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      aria-label={tr('ترجمة وصف المالك', 'Owner description translation')}
      className="grid gap-4 rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-xs sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h2 className="font-black text-[#142B5F]">
          {tr('ترجمة الاسم والوصف', 'Translate name and description')}
        </h2>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          {tr(
            'يُراجع الاسم والوصف معًا ضمن نسخة هذا المحتوى. تغيير المصدر يستلزم إعادة المراجعة.',
            'Name and description are reviewed together in the owner version. Source changes require another review.',
          )}
        </p>
      </div>
      {!enabled && (
        <p role="status">
          {tr(
            'الكتابة معلقة وفق سياسة الترجمة أو حالة السجل. لا يفعّل هذا النموذج النشر.',
            'Writing is disabled by translation policy or owner state. This form does not publish content.',
          )}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <label>
        {tr('لغة النص', 'Content language')}
        <select
          value={locale}
          disabled={busy}
          onChange={(event) => setLocale(event.target.value as 'ar' | 'en')}
        >
          <option value="ar">{tr('العربية', 'Arabic')}</option>
          <option value="en">{adminOptionLabel("English")}</option>
        </select>
      </label>
      <label>
        {tr('الاسم المترجم', 'Translated name')}
        <input
          disabled={!enabled || busy}
          value={title}
          maxLength={500}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="sm:col-span-2">
        {tr('الوصف المترجم', 'Translated description')}
        <textarea
          className="min-h-32"
          disabled={!enabled || busy}
          value={description}
          maxLength={100000}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {domain==='COURSE' && Object.entries(fieldLabels).map(([key,label])=><label key={key}>{label}<textarea disabled={!enabled||busy} value={displayFields[key]??''} maxLength={10000} onChange={event=>setDisplayFields(previous=>({...previous,[key]:event.target.value}))}/></label>)}
      <label>
        {tr('سبب التعديل' , 'Edit reason')}
        <input
          disabled={!enabled || busy}
          value={reason}
          maxLength={2000}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <button
        disabled={
          !enabled ||
          busy ||
          reloadRequired ||
          reason.trim().length < 3 ||
          !title.trim() ||
          !description.trim()
        }
        onClick={() => void save()}
      >
        {tr('حفظ للمراجعة', 'Save for review')}
      </button>
      <button
        disabled={!enabled || busy || reloadRequired || reason.trim().length < 3}
        onClick={() => void save(true)}
      >
        {tr('إزالة ترجمة هذه اللغة', 'Remove this translation')}
      </button>
    </section>
  );
}
