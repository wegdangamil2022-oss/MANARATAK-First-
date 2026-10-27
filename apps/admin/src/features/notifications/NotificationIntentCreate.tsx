import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Search, UserCheck } from 'lucide-react';
import { AdminLink } from '../../components/AdminLink';
import { createAdminIdempotencyKey } from '../../api/client';
import { useAdministrationDraftGuard } from '../reference-data/useAdministrationDraftGuard';
import { useDebounced, useNotificationCommand, useNotificationRead } from './notificationHooks';
import { errorMessage, protectedTemplate, type Page, type Template } from './notificationModel';
import { Loading, ReadError, Variables } from './NotificationControls';
import { NotificationPreview } from './NotificationPreview';
type Recipient = { studentReferenceId: string; displayName?: string };
export function NotificationIntentCreate({ ar }: { ar: boolean }) {
  const c = (a: string, e: string) => (ar ? a : e),
    navigate = useNavigate(),
    command = useNotificationCommand();
  const [id] = useState(createAdminIdempotencyKey),
    [recipient, setRecipient] = useState<Recipient | null>(null),
    [query, setQuery] = useState(''),
    [recipientCursor, setRecipientCursor] = useState('');
  const [templateId, setTemplateId] = useState(''),
    [templateQuery, setTemplateQuery] = useState(''),
    [templateCursor, setTemplateCursor] = useState(''),
    [variables, setVariables] = useState<Record<string, string>>({}),
    [locale, setLocale] = useState('ar'),
    [previewed, setPreviewed] = useState('');
  const [scheduledAt, setScheduledAt] = useState(''),
    [expiresAt, setExpiresAt] = useState(''),
    [saved, setSaved] = useState(false);
  const recipientSearch = useDebounced(query),
    templateSearch = useDebounced(templateQuery);
  const recipients = useNotificationRead<Page<Recipient>>(
    '/notifications/recipients?' +
      new URLSearchParams({
        ...(recipientSearch ? { query: recipientSearch } : {}),
        ...(recipientCursor ? { cursor: recipientCursor } : {}),
      }),
  );
  const templates = useNotificationRead<Page<Template>>(
    '/notifications/templates?' +
      new URLSearchParams({
        active: 'true',
        limit: '25',
        ...(templateSearch ? { search: templateSearch } : {}),
        ...(templateCursor ? { cursor: templateCursor } : {}),
      }),
  );
  const template = useNotificationRead<Template>(
    templateId ? '/notifications/templates/' + encodeURIComponent(templateId) : null,
  );
  const locked = command.busy || command.uncertain,
    signature = JSON.stringify({ id: templateId, variables, locale });
  const variablesValid = Boolean(
    template.data?.requiredVariables.every((name) => variables[name]?.trim()),
  );
  const scheduleTime = scheduledAt ? new Date(scheduledAt).getTime() : null,
    expiryTime = expiresAt ? new Date(expiresAt).getTime() : null;
  const datesValid =
    (!scheduledAt || (Number.isFinite(scheduleTime) && scheduleTime! > Date.now())) &&
    (!expiresAt ||
      (Number.isFinite(expiryTime) &&
        expiryTime! > Date.now() &&
        (!scheduledAt || expiryTime! > scheduleTime!)));
  const valid = Boolean(
    recipient &&
    template.data?.active &&
    !protectedTemplate(templateId) &&
    variablesValid &&
    datesValid &&
    previewed === signature,
  );
  useAdministrationDraftGuard(
    !saved && Boolean(recipient || templateId || scheduledAt || expiresAt),
    ar,
  );
  const create = async () => {
    if (!valid && !command.uncertain) return;
    const result = await command.execute<{ id: string }>('/notifications/intents', {
      id,
      reference: 'admin:' + id,
      templateId,
      recipientReference: recipient!.studentReferenceId,
      variables,
      purpose: 'TRANSACTIONAL',
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
    });
    if (result) {
      setSaved(true);
      navigate('/notifications/intents/' + encodeURIComponent(result.id ?? id) + '?created=1', {
        replace: true,
      });
    }
  };
  return (
    <>
      <AdminLink to="/notifications">{c('العودة للسجل', 'Back to log')}</AdminLink>
      <h2>
        <Send />
        {c('إنشاء إشعار فردي', 'Create individual notification')}
      </h2>
      <p className="notification-note">
        {c(
          'طلب معاملاتي لطالب مؤهل. الإنشاء لا يعني التسليم؛ قنوات الطالب وتفضيلاته وسياسات المزوّد تطبق عند المعالجة.',
          'A transactional intent for an eligible student. Creation does not mean delivery; recipient preferences and provider policies apply during processing.',
        )}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <fieldset disabled={locked}>
          <div className="notification-author-grid">
            <section>
              <h3>
                <UserCheck />
                {c('المستلم', 'Recipient')}
              </h3>
              <label>
                <span>
                  <Search />
                  {c('البحث عن طالب', 'Find student')}
                </span>
                <input
                  type="search"
                  value={query}
                  maxLength={120}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setRecipientCursor('');
                  }}
                />
              </label>
              {recipients.loading ? (
                <Loading ar={ar} />
              ) : recipients.error ? (
                <ReadError error={recipients.error} retry={recipients.refresh} ar={ar} />
              ) : (
                recipients.data && (
                  <>
                    <div className="notification-options">
                      {recipients.data.items.map((item) => (
                        <button
                          type="button"
                          key={item.studentReferenceId}
                          aria-pressed={recipient?.studentReferenceId === item.studentReferenceId}
                          onClick={() => setRecipient(item)}
                        >
                          <strong>{item.displayName ?? c('طالب', 'Student')}</strong>
                          <small dir="ltr">{item.studentReferenceId}</small>
                        </button>
                      ))}
                    </div>
                    {!recipients.data.items.length && (
                      <p>
                        {c(
                          'لا يوجد طلاب مؤهلون في هذه الصفحة.',
                          'No eligible students on this page.',
                        )}
                      </p>
                    )}
                    <div className="notification-pagination">
                      <button
                        type="button"
                        disabled={!recipientCursor}
                        onClick={() => setRecipientCursor('')}
                      >
                        {c('الصفحة الأولى', 'First page')}
                      </button>
                      <button
                        type="button"
                        disabled={!recipients.data.nextCursor}
                        onClick={() => setRecipientCursor(recipients.data!.nextCursor!)}
                      >
                        {c('التالي', 'Next')}
                      </button>
                    </div>
                  </>
                )
              )}
              {recipient && (
                <p role="status">
                  {c('المستلم المختار', 'Selected recipient')}:{' '}
                  {recipient.displayName ?? recipient.studentReferenceId}
                </p>
              )}
            </section>
            <section>
              <h3>{c('القالب النشط', 'Active template')}</h3>
              <label>
                {c('البحث في القوالب', 'Find template')}
                <input
                  type="search"
                  maxLength={120}
                  value={templateQuery}
                  onChange={(e) => {
                    setTemplateQuery(e.target.value);
                    setTemplateCursor('');
                  }}
                />
              </label>
              {templates.loading ? (
                <Loading ar={ar} />
              ) : templates.error ? (
                <ReadError error={templates.error} retry={templates.refresh} ar={ar} />
              ) : (
                templates.data && (
                  <>
                    <div className="notification-options">
                      {templates.data.items
                        .filter((item) => !protectedTemplate(item.id))
                        .map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            aria-pressed={templateId === item.id}
                            onClick={() => {
                              setTemplateId(item.id);
                              setVariables({});
                              setPreviewed('');
                            }}
                          >
                            <bdi>{item.id}</bdi>
                            <small>{item.channels.join(' · ')}</small>
                          </button>
                        ))}
                    </div>
                    <div className="notification-pagination">
                      <button
                        type="button"
                        disabled={!templateCursor}
                        onClick={() => setTemplateCursor('')}
                      >
                        {c('الصفحة الأولى', 'First page')}
                      </button>
                      <button
                        type="button"
                        disabled={!templates.data.nextCursor}
                        onClick={() => setTemplateCursor(templates.data!.nextCursor!)}
                      >
                        {c('التالي', 'Next')}
                      </button>
                    </div>
                  </>
                )
              )}
              {templateId && (
                <p>
                  {c('القالب المختار', 'Selected template')}: <bdi>{templateId}</bdi>
                </p>
              )}
            </section>
          </div>
          {template.loading ? (
            <Loading ar={ar} />
          ) : template.error ? (
            <ReadError error={template.error} retry={template.refresh} ar={ar} />
          ) : (
            template.data && (
              <Variables
                names={template.data.requiredVariables}
                value={variables}
                change={(name, value) => {
                  setPreviewed('');
                  setVariables((old) => ({ ...old, [name]: value }));
                }}
                ar={ar}
              />
            )
          )}
          <div className="notification-fields">
            <label>
              {c('لغة المعاينة فقط', 'Preview language only')}
              <select
                value={locale}
                onChange={(e) => {
                  setLocale(e.target.value);
                  setPreviewed('');
                }}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              {c('الجدولة بتوقيت جهازك — اختياري', 'Schedule in device time — optional')}
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </label>
            <label>
              {c('انتهاء الصلاحية بتوقيت جهازك — اختياري', 'Expiry in device time — optional')}
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
          </div>
          {(scheduledAt || expiresAt) && (
            <p className="notification-note" dir="ltr">
              {c('التوقيت المرسل للخادم', 'Times submitted to server')}:{' '}
              {Number.isFinite(scheduleTime) && scheduleTime !== null
                ? new Date(scheduleTime).toISOString()
                : '—'}{' '}
              /{' '}
              {Number.isFinite(expiryTime) && expiryTime !== null
                ? new Date(expiryTime).toISOString()
                : '—'}
            </p>
          )}
          {!datesValid && (
            <p role="alert">
              {c(
                'اختر توقيتًا مستقبليًا وصلاحية بعد الجدولة.',
                'Choose a future time and an expiry after scheduling.',
              )}
            </p>
          )}
          {template.data?.active && (
            <NotificationPreview
              id={templateId}
              variables={variables}
              locale={locale}
              ar={ar}
              ready={variablesValid}
              onPreview={setPreviewed}
            />
          )}
        </fieldset>
        {command.error != null && <p role="alert">{errorMessage(command.error, ar)}</p>}
        {command.uncertain && (
          <p role="alert">
            {c(
              'نتيجة الإنشاء غير مؤكدة. الحقول مقفلة؛ أعد نفس الطلب للتحقق دون إرسال مكرر.',
              'Creation outcome uncertain. Fields are locked; retry the identical request without duplicating.',
            )}
          </p>
        )}
        <button
          className="notification-primary"
          type="submit"
          disabled={command.busy || (!valid && !command.uncertain)}
        >
          <Send />
          {command.uncertain
            ? c('إعادة التحقق من الإنشاء', 'Recheck creation')
            : c('تأكيد إنشاء الإشعار', 'Confirm creation')}
        </button>
      </form>
    </>
  );
}
