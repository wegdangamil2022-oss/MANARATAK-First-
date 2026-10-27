import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilePlus2, Save, Eye, Plus, X } from 'lucide-react';
import { AdminLink } from '../../components/AdminLink';
import { createAdminIdempotencyKey } from '../../api/client';
import { useAdministrationDraftGuard } from '../reference-data/useAdministrationDraftGuard';
import { channels, errorMessage, validateTemplate, type Template } from './notificationModel';
import { useNotificationCommand, useNotificationRead } from './notificationHooks';
import { Loading, ReadError, Variables } from './NotificationControls';
export function NotificationTemplateEditor({ ar }: { ar: boolean }) {
  const c = (a: string, e: string) => (ar ? a : e),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    source = params.get('from');
  const read = useNotificationRead<Template>(
      source ? '/notifications/templates/' + encodeURIComponent(source) : null,
    ),
    command = useNotificationCommand();
  const [id, setId] = useState(() => 'manual.' + createAdminIdempotencyKey()),
    [selected, setSelected] = useState<string[]>(['IN_APP']),
    [variables, setVariables] = useState<string[]>([]),
    [variable, setVariable] = useState('');
  const [contents, setContents] = useState<Record<string, { subject: string; body: string }>>({
      ar: { subject: '', body: '' },
      en: { subject: '', body: '' },
    }),
    [locale, setLocale] = useState('ar'),
    [samples, setSamples] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState(false),
    [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false);
  useAdministrationDraftGuard(dirty && !saved, ar);
  useEffect(() => {
    if (read.data?.contents) {
      setContents(read.data.contents);
      setSelected(read.data.channels);
      setVariables(read.data.requiredVariables);
      setDirty(true);
    }
  }, [read.data]);
  const locked = command.busy || command.uncertain,
    valid = validateTemplate({ id, channels: selected, variables, contents });
  const edit = (field: 'subject' | 'body', value: string) => {
    setDirty(true);
    setPreview(false);
    setContents((old) => ({ ...old, [locale]: { ...old[locale], [field]: value } }));
  };
  const save = async () => {
    const result = await command.execute('/notifications/templates', {
      id,
      channels: selected,
      requiredVariables: variables,
      localizations: ['ar', 'en'],
      contents,
    });
    if (result) {
      setSaved(true);
      navigate('/notifications/templates/' + encodeURIComponent(id), { replace: true });
    }
  };
  const render = (text: string) =>
    text.replace(
      /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g,
      (_, name: string) => samples[name] ?? '{{' + name + '}}',
    );
  if (source && read.loading) return <Loading ar={ar} />;
  if (source && read.error) return <ReadError error={read.error} retry={read.refresh} ar={ar} />;
  if (source && read.data && !read.data.contents)
    return (
      <p role="alert">
        {c(
          'يلزم إذن تأليف القوالب للوصول إلى المحتوى.',
          'Template author permission is required to access content.',
        )}
      </p>
    );
  return (
    <>
      <AdminLink to="/notifications?tab=templates">
        {c('العودة إلى القوالب', 'Back to templates')}
      </AdminLink>
      <h2>
        <FilePlus2 />
        {c('إنشاء تعريف قالب مستقل', 'Create an independent template definition')}
      </h2>
      <p className="notification-note">
        {c(
          'يحفظ هذا الإجراء قالبًا نشطًا جديدًا؛ لا يرسل أي إشعار. لا يمكن تحرير النص المحفوظ في مكانه.',
          'This saves a new active definition without sending a notification. Saved content cannot be edited in place.',
        )}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) void save();
        }}
      >
        <fieldset disabled={locked}>
          <div className="notification-fields">
            <label>
              {c('معرّف القالب', 'Template ID')}
              <input
                required
                maxLength={160}
                dir="ltr"
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
          </div>
          <fieldset>
            <legend>{c('قنوات التسليم', 'Delivery channels')}</legend>
            <div className="notification-actions">
              {channels.map((channel) => (
                <label className="notification-check" key={channel}>
                  <input
                    type="checkbox"
                    checked={selected.includes(channel)}
                    onChange={(e) => {
                      setDirty(true);
                      setSelected((old) =>
                        e.target.checked ? [...old, channel] : old.filter((x) => x !== channel),
                      );
                    }}
                  />
                  {channel}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="notification-variable-editor">
            <label>
              {c(
                'اسم متغير جديد — أحرف لاتينية وأرقام وشرطة سفلية',
                'New variable — letters, digits and underscore',
              )}
              <input
                dir="ltr"
                maxLength={120}
                value={variable}
                onChange={(e) => setVariable(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={
                !/^[a-zA-Z][a-zA-Z0-9_]{0,119}$/.test(variable) ||
                /password|token|secret|authorization|email|phone/i.test(variable) ||
                variables.includes(variable) ||
                variables.length >= 40
              }
              onClick={() => {
                setVariables((old) => [...old, variable]);
                setVariable('');
                setDirty(true);
                setPreview(false);
              }}
            >
              <Plus />
              {c('إضافة متغير', 'Add variable')}
            </button>
          </div>
          <div className="notification-actions">
            {variables.map((name) => (
              <button
                type="button"
                key={name}
                onClick={() => {
                  setVariables((old) => old.filter((x) => x !== name));
                  setDirty(true);
                  setPreview(false);
                }}
              >
                <X />
                {name}
              </button>
            ))}
          </div>
          <p className="notification-note">
            {c(
              'استخدم {{name}} في النص. لا تُدرج كلمات مرور أو بيانات اتصال أو HTML. يجب إكمال العربية والإنجليزية.',
              'Use {{name}} in the text. Do not include passwords, contact information or HTML. Both Arabic and English are required.',
            )}
          </p>
          <label>
            {c('لغة التأليف', 'Authoring language')}
            <select
              value={locale}
              onChange={(e) => {
                setLocale(e.target.value);
                setPreview(false);
              }}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <label>
              {c('عنوان الرسالة', 'Message subject')}
              <input
                required
                maxLength={240}
                value={contents[locale]?.subject ?? ''}
                onChange={(e) => edit('subject', e.target.value)}
              />
            </label>
            <label>
              {c('نص الرسالة', 'Message body')}
              <textarea
                required
                rows={6}
                maxLength={10000}
                value={contents[locale]?.body ?? ''}
                onChange={(e) => edit('body', e.target.value)}
              />
            </label>
          </div>
          <Variables
            names={variables}
            value={samples}
            change={(name, value) => {
              setSamples((old) => ({ ...old, [name]: value }));
              setPreview(false);
            }}
            ar={ar}
          />
          <button
            type="button"
            disabled={!valid || !variables.every((name) => samples[name]?.trim())}
            onClick={() => setPreview(true)}
          >
            <Eye />
            {c('معاينة تأليف محلية دون إرسال', 'Local authoring preview — no send')}
          </button>
        </fieldset>
        {preview && (
          <div className="notification-preview" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <strong>{render(contents[locale].subject)}</strong>
            <p className="notification-message">{render(contents[locale].body)}</p>
          </div>
        )}
        {!valid && (
          <p className="notification-note">
            {c(
              'أكمل اللغتين والقنوات والمتغيرات الصحيحة قبل الحفظ.',
              'Complete both languages, channels and valid variable declarations before saving.',
            )}
          </p>
        )}
        {command.error != null && <p role="alert">{errorMessage(command.error, ar)}</p>}
        {command.uncertain && (
          <p role="alert">
            {c(
              'لم تتأكد نتيجة الحفظ. أعد نفس الطلب للتحقق دون إنشاء نسخة مكررة.',
              'Save outcome is uncertain. Retry the identical request to check without duplicating.',
            )}
          </p>
        )}
        <button className="notification-primary" disabled={!valid || command.busy} type="submit">
          <Save />
          {command.uncertain
            ? c('إعادة التحقق من الحفظ', 'Recheck save')
            : c('حفظ قالب جديد', 'Save new template')}
        </button>
      </form>
    </>
  );
}
