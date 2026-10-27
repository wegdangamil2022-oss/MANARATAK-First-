import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Copy, Ban, Eye } from 'lucide-react';
import { AdminLink } from '../../components/AdminLink';
import { createAdminIdempotencyKey } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { ReferenceDialog } from '../reference-data/ReferenceDialog';
import {
  date,
  errorMessage,
  protectedTemplate,
  safeReturn,
  type Template,
} from './notificationModel';
import { useNotificationCommand, useNotificationRead } from './notificationHooks';
import { Loading, ReadError, Panel, Variables } from './NotificationControls';
import { NotificationPreview } from './NotificationPreview';
export function NotificationTemplateDetails({ id, ar }: { id: string; ar: boolean }) {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    { hasPermission } = useAdminAuthorization(),
    c = (a: string, e: string) => (ar ? a : e);
  const read = useNotificationRead<Template>('/notifications/templates/' + encodeURIComponent(id)),
    command = useNotificationCommand();
  const [locale, setLocale] = useState('ar'),
    [values, setValues] = useState<Record<string, string>>({}),
    [action, setAction] = useState<'clone' | 'deactivate' | null>(null),
    [cloneId, setCloneId] = useState(''),
    [notice, setNotice] = useState('');
  const item = read.data,
    author = hasPermission('admin:notifications:templates:author'),
    canPreview =
      author ||
      (hasPermission('admin:notifications:intents:create') &&
        hasPermission('admin:notifications:recipients:pii') &&
        !protectedTemplate(id));
  const apply = async () => {
    if (!item || !action) return;
    const result = await command.execute(
      '/notifications/templates/' + encodeURIComponent(id) + '/' + action,
      action === 'clone' ? { id: cloneId } : { expectedVersion: item.version },
    );
    if (result) {
      setAction(null);
      if (action === 'clone') navigate('/notifications/templates/' + encodeURIComponent(cloneId));
      else {
        setNotice(c('تم تعطيل القالب.', 'Template deactivated.'));
        read.refresh();
      }
    }
  };
  return (
    <>
      <AdminLink to={safeReturn(params.get('return'), '/notifications?tab=templates')}>
        {c('العودة إلى القوالب', 'Back to templates')}
      </AdminLink>
      {read.loading ? (
        <Loading ar={ar} />
      ) : read.error ? (
        <ReadError error={read.error} retry={read.refresh} ar={ar} />
      ) : (
        item && (
          <>
            <div className="notification-region-heading">
              <h2>
                <FileText />
                <bdi>{item.id}</bdi>
              </h2>
              {author && (
                <div className="notification-actions">
                  {item.active && (
                    <button
                      onClick={() => {
                        setCloneId('manual.' + createAdminIdempotencyKey());
                        setAction('clone');
                      }}
                    >
                      <Copy />
                      {c('نسخ مستقل', 'Independent copy')}
                    </button>
                  )}
                  {item.contents && (
                    <AdminLink to={'/notifications/templates/new?from=' + encodeURIComponent(id)}>
                      {c('إنشاء تعريف معدل', 'Create revised definition')}
                    </AdminLink>
                  )}
                  {item.active && !protectedTemplate(id) && item.version && (
                    <button onClick={() => setAction('deactivate')}>
                      <Ban />
                      {c('تعطيل القالب', 'Deactivate')}
                    </button>
                  )}
                </div>
              )}
            </div>
            {notice && <p role="status">{notice}</p>}
            <dl className="notification-facts">
              {[
                [c('الحالة', 'Status'), item.active ? c('نشط', 'Active') : c('معطّل', 'Inactive')],
                [c('الإصدار', 'Version'), item.version ?? '—'],
                [c('الاستخدام التاريخي', 'Historical usage'), item.usageCount ?? '—'],
                [c('القنوات', 'Channels'), item.channels.join(' · ')],
                [c('اللغات', 'Languages'), item.localizations.join(' · ')],
                [c('التعديل', 'Updated'), date(item.updatedAt, ar)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {protectedTemplate(id) && (
              <p className="notification-note">
                {c(
                  'قالب مملوك للنظام؛ إنشاؤه وتعطيله يخضعان للقسم المالك.',
                  'System-owned template; its owner controls creation and deactivation.',
                )}
              </p>
            )}
            <Panel
              title={c('النص والمتغيرات والمعاينة', 'Content, variables and preview')}
              icon={<Eye />}
            >
              <label>
                {c('لغة العرض والمعاينة', 'Display and preview language')}
                <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </label>
              {item.contents?.[locale] ? (
                <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                  <h3>{item.contents[locale].subject}</h3>
                  <p className="notification-message">{item.contents[locale].body}</p>
                </div>
              ) : (
                <p className="notification-note">
                  {c(
                    'النص غير متاح لهذه اللغة أو محجوب حسب صلاحيتك.',
                    'Content is unavailable for this language or restricted by your permission.',
                  )}
                </p>
              )}
              <p>
                {c('المتغيرات المطلوبة', 'Required variables')}:{' '}
                {item.requiredVariables.join(' · ') || c('لا توجد', 'None')}
              </p>
              {item.active && canPreview && (
                <>
                  <Variables
                    names={item.requiredVariables}
                    value={values}
                    change={(name, value) => setValues((old) => ({ ...old, [name]: value }))}
                    ar={ar}
                  />
                  <NotificationPreview
                    id={id}
                    variables={values}
                    locale={locale}
                    ar={ar}
                    ready={item.requiredVariables.every((name) => Boolean(values[name]?.trim()))}
                  />
                </>
              )}
            </Panel>
            {action && (
              <ReferenceDialog
                title={c(
                  action === 'clone' ? 'نسخ القالب بمعرّف مستقل' : 'تأكيد تعطيل القالب',
                  action === 'clone' ? 'Copy to an independent ID' : 'Confirm deactivation',
                )}
                dirty={false}
                busy={command.busy || command.uncertain}
                close={() => setAction(null)}
                isAr={ar}
              >
                {action === 'clone' ? (
                  <label>
                    {c('المعرّف الجديد', 'New ID')}
                    <input
                      dir="ltr"
                      maxLength={160}
                      value={cloneId}
                      disabled={command.busy || command.uncertain}
                      onChange={(e) => setCloneId(e.target.value)}
                    />
                  </label>
                ) : (
                  <p>
                    {c(
                      'لن تتغير القوالب أو الإشعارات القديمة. يرفض الخادم التعطيل عند وجود طلبات نشطة أو تغير الإصدار.',
                      'Existing definitions and history are retained. The server rejects active usage and version conflicts.',
                    )}
                  </p>
                )}
                {command.error != null && <p role="alert">{errorMessage(command.error, ar)}</p>}
                {command.uncertain && (
                  <p role="alert">
                    {c(
                      'نتيجة الطلب غير مؤكدة. أعد التحقق بنفس الطلب؛ المعرّف محفوظ لمنع التكرار.',
                      'Outcome uncertain. Retry the same request with its retained idempotency key.',
                    )}
                  </p>
                )}
                <button
                  disabled={
                    command.busy ||
                    (action === 'clone' &&
                      (!cloneId.trim() || protectedTemplate(cloneId) || cloneId === id))
                  }
                  onClick={() => void apply()}
                >
                  {command.uncertain
                    ? c('إعادة التحقق من الطلب', 'Recheck request')
                    : c('تأكيد', 'Confirm')}
                </button>
              </ReferenceDialog>
            )}
          </>
        )
      )}
    </>
  );
}
