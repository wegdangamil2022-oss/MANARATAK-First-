import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Copy,
  RefreshCw,
  RotateCcw,
  Ban,
  Bell,
  MessageSquare,
  ListChecks,
} from 'lucide-react';
import { AdminLink } from '../../components/AdminLink';
import { ReferenceDialog } from '../reference-data/ReferenceDialog';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useNotificationCommand, useNotificationRead } from './notificationHooks';
import {
  date,
  errorMessage,
  safeReturn,
  nextAttempt,
  type Intent,
  type Page,
  type Receipt,
} from './notificationModel';
import { Loading, Panel, ReadError, Status } from './NotificationControls';
export function NotificationIntentDetails({ id, ar }: { id: string; ar: boolean }) {
  const [params] = useSearchParams(),
    { hasPermission } = useAdminAuthorization();
  const endpoint = '/notifications/intents/' + encodeURIComponent(id),
    read = useNotificationRead<Intent>(endpoint),
    receipts = useNotificationRead<Page<Receipt>>(endpoint + '/receipts');
  const command = useNotificationCommand(),
    [action, setAction] = useState<'retry' | 'cancel' | null>(null),
    [notice, setNotice] = useState('');
  const item = read.data,
    c = (arabic: string, en: string) => (ar ? arabic : en);
  const refresh = () => {
    read.refresh();
    receipts.refresh();
  };
  const canRetry = Boolean(
    item &&
    hasPermission('admin:notifications:delivery:retry') &&
    ['FAILED', 'DEAD_LETTER'].includes(item.deliveryState) &&
    (item.manualRetryCount ?? 0) < 3 &&
    (!item.expiresAt || Date.parse(item.expiresAt) > Date.now()),
  );
  const canCancel = Boolean(
    item &&
    hasPermission('admin:notifications:intents:cancel') &&
    ['PENDING', 'FAILED', 'DEAD_LETTER'].includes(item.deliveryState),
  );
  const apply = async () => {
    if (!action) return;
    const result = await command.execute(endpoint + '/' + action, {});
    if (result !== undefined) {
      setNotice(
        c(
          'تم قبول الإجراء؛ تابع النتيجة من حالة السجل. لا يعني ذلك تسليمًا جديدًا.',
          'Command accepted. Follow the record state; this does not confirm a new delivery.',
        ),
      );
      setAction(null);
      refresh();
    }
  };
  return (
    <>
      {params.get('created') === '1' && (
        <p role="status">
          {c(
            'تم إنشاء طلب الإشعار. راقب حالته هنا؛ الإنشاء لا يثبت التسليم.',
            'Notification intent created. Track its state here; creation does not confirm delivery.',
          )}
        </p>
      )}
      <div className="notification-actions">
        <AdminLink to={safeReturn(params.get('return'))}>
          <ArrowRight size={17} />
          {c('رجوع للسجل', 'Back to log')}
        </AdminLink>
        <button type="button" disabled={command.busy} onClick={refresh}>
          <RefreshCw size={17} />
          {c('تحديث الحالة', 'Refresh status')}
        </button>
      </div>
      {read.loading ? (
        <Loading ar={ar} />
      ) : read.error ? (
        <ReadError error={read.error} retry={read.refresh} ar={ar} />
      ) : (
        item && (
          <>
            <div className="notification-region-heading">
              <h2>
                <Bell size={19} />
                {c('تفاصيل الإشعار', 'Notification details')}
              </h2>
              <Status value={item.deliveryState} ar={ar} />
            </div>
            <div className="notification-actions">
              <span dir="ltr">{item.id}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(item.id)
                    .then(() => setNotice(c('نُسخ المعرّف.', 'ID copied.')))
                    .catch(() =>
                      setNotice(
                        c(
                          'تعذر النسخ؛ حدد المعرّف وانسخه يدويًا.',
                          'Copy failed; select the ID and copy it manually.',
                        ),
                      ),
                    );
                }}
              >
                <Copy size={16} />
                {c('نسخ المعرّف', 'Copy ID')}
              </button>
              {canRetry && (
                <button type="button" disabled={command.busy} onClick={() => setAction('retry')}>
                  <RotateCcw size={17} />
                  {c('إعادة محاولة', 'Retry delivery')}
                </button>
              )}
              {canCancel && (
                <button type="button" disabled={command.busy} onClick={() => setAction('cancel')}>
                  <Ban size={17} />
                  {c('إلغاء القنوات المتبقية', 'Cancel remaining channels')}
                </button>
              )}
            </div>
            {notice && <p role="status">{notice}</p>}
            <Panel title={c('ملخص الإشعار', 'Intent summary')} icon={<Bell size={18} />}>
              <dl className="notification-facts">
                {[
                  [
                    c('القالب', 'Template'),
                    <AdminLink
                      key="template"
                      to={'/notifications/templates/' + encodeURIComponent(item.templateId)}
                    >
                      {item.templateId}
                    </AdminLink>,
                  ],
                  [c('المستلم', 'Recipient'), item.recipientReference],
                  [c('المرجع', 'Reference'), item.reference ?? '—'],
                  [c('الإنشاء', 'Created'), date(item.createdAt, ar)],
                  [c('آخر تحديث', 'Last updated'), date(item.updatedAt, ar)],
                  [c('الجدولة', 'Scheduled'), date(item.scheduledAt, ar)],
                  [c('انتهاء الصلاحية', 'Expires'), date(item.expiresAt, ar)],
                  [c('المحاولات', 'Attempts'), String(item.attempts)],
                  [
                    c('المحاولات اليدوية', 'Manual retry cycles'),
                    String(item.manualRetryCount ?? '—'),
                  ],
                  [c('المحاولة التالية', 'Next attempt'), date(nextAttempt(item), ar)],
                  [c('التسليم المثبت', 'Delivered at'), date(item.deliveredAt, ar)],
                  [c('آخر رمز خطأ', 'Last error code'), item.lastErrorCode ?? '—'],
                  [c('القنوات المحفوظة', 'Snapshot channels'), item.channels?.join(' · ') || '—'],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <Panel
              title={c('محتوى الرسالة والخصوصية', 'Message content and privacy')}
              icon={<MessageSquare size={18} />}
            >
              <p>
                {c(
                  'لا تتوفر نسخة منقحة لعرض محتوى الرسالة في العقد الحالي. لا تُكشف المتغيرات المشفرة أو بيانات المزوّد من هذه الصفحة.',
                  'A redacted rendered message is not available in the current read contract. Encrypted variables and provider payloads are not exposed here.',
                )}
              </p>
              {item.payloadErasedAt && (
                <p>
                  {c(
                    'أُزيلت الحمولة وفق سياسة الاحتفاظ في',
                    'Payload removed under retention policy at',
                  )}{' '}
                  {date(item.payloadErasedAt, ar)}
                </p>
              )}
            </Panel>
            <Panel
              title={c(
                'نتائج القنوات والمحاولات المحفوظة',
                'Persisted channel results and attempts',
              )}
              icon={<ListChecks size={18} />}
            >
              {receipts.loading ? (
                <Loading ar={ar} />
              ) : receipts.error ? (
                <ReadError error={receipts.error} retry={receipts.refresh} ar={ar} />
              ) : receipts.data?.items.length ? (
                <div className="notification-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {[
                          c('القناة / المحاولة', 'Channel / attempt'),
                          c('الحالة', 'State'),
                          c('المحاولات', 'Attempts'),
                          c('آخر تحديث', 'Updated'),
                          c('رمز السبب', 'Reason code'),
                        ].map((label) => (
                          <th key={label}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.data.items.map((receipt, index) => (
                        <tr key={receipt.channel + receipt.updatedAt + index}>
                          <td>
                            {receipt.channel === 'ATTEMPT'
                              ? c('محاولة محفوظة', 'Persisted attempt')
                              : receipt.channel}
                          </td>
                          <td>
                            <Status value={receipt.status} ar={ar} />
                          </td>
                          <td>{receipt.attempts}</td>
                          <td>{date(receipt.updatedAt, ar)}</td>
                          <td>{receipt.errorCode ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>
                  {c(
                    'لم تُسجّل نتائج قنوات ضمن التغطية المتاحة.',
                    'No channel results have been recorded in the available history.',
                  )}
                </p>
              )}
              <p className="notification-note">
                {c(
                  'هذه إيصالات فعلية وليست سجل انتقالات كاملًا أو دليل قراءة للرسالة. قد يصل سجل المحاولات إلى حد القراءة المسموح.',
                  'These are actual receipts, not a full transition timeline or a read receipt. Attempt history is bounded by the read contract.',
                )}
              </p>
            </Panel>
          </>
        )
      )}
      {action && (
        <ReferenceDialog
          title={
            action === 'retry'
              ? c('تأكيد إعادة المحاولة', 'Confirm retry')
              : c('تأكيد إلغاء القنوات المتبقية', 'Confirm remaining-channel cancellation')
          }
          dirty={false}
          busy={command.busy}
          isAr={ar}
          close={() => {
            if (!command.uncertain) setAction(null);
          }}
        >
          <p>
            {action === 'retry'
              ? c(
                  'سيعاد طلب معالجة القنوات المؤهلة فقط، بحدود المحاولة والتفضيلات. راجع سبب الفشل قبل التأكيد.',
                  'Only eligible channels are queued again under retry and preference limits. Inspect the failure before confirming.',
                )
              : c(
                  'الإلغاء يوقف القنوات المتبقية فقط؛ لا يسحب رسالة قُبلت أو سُلّمت.',
                  'Cancellation affects remaining channels only; it cannot recall accepted or delivered messages.',
                )}
          </p>
          {command.error != null && <p role="alert">{errorMessage(command.error, ar)}</p>}
          {command.uncertain && (
            <p role="alert">
              {c(
                'النتيجة غير مؤكدة؛ المحاولة التالية تستخدم الطلب والمفتاح نفسيهما.',
                'Result unconfirmed; retry uses the same request and key.',
              )}
            </p>
          )}
          <button type="button" disabled={command.busy} onClick={() => void apply()}>
            {c('تأكيد الإجراء', 'Confirm action')}
          </button>
        </ReferenceDialog>
      )}
    </>
  );
}
