import { useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Activity,
  Bell,
  ExternalLink,
  Clock3,
} from 'lucide-react';
import { AdminLink } from '../../components/AdminLink';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useDebounced, useNotificationRead } from './notificationHooks';
import {
  dateWindow,
  date,
  deliveryStates,
  statusName,
  nextAttempt,
  type Intent,
  type Page,
  type Summary,
} from './notificationModel';
import { Loading, ReadError, Status } from './NotificationControls';
export function NotificationIntentList({
  ar,
  delivery = false,
  revision,
}: {
  ar: boolean;
  delivery?: boolean;
  revision: number;
}) {
  const [params, setParams] = useSearchParams(),
    location = useLocation(),
    { hasPermission } = useAdminAuthorization();
  const [advanced, setAdvanced] = useState(false);
  const q = params.get('q') ?? '',
    search = useDebounced(q),
    state = params.get('state') ?? (delivery ? 'FAILED' : ''),
    period = params.get('period') ?? '24h';
  const from = params.get('from') ?? '',
    to = params.get('to') ?? '',
    cursor = params.get('cursor') ?? '',
    template = params.get('template') ?? '';
  const pii = hasPermission('admin:notifications:recipients:pii'),
    recipient = pii ? (params.get('recipient') ?? '') : '';
  const window = useMemo(() => dateWindow(period, from, to), [period, from, to, revision]);
  const query = new URLSearchParams({
    limit: '25',
    ...(search ? { search } : {}),
    ...(state ? { deliveryState: state } : {}),
    ...(cursor ? { cursor } : {}),
    ...(template ? { templateId: template } : {}),
    ...(recipient ? { recipientReference: recipient } : {}),
    ...(window ?? {}),
  });
  const list = useNotificationRead<Page<Intent>>(window ? '/notifications/intents?' + query : null);
  // Endpoint refresh is represented in component identity by the shell, never sent as an API filter.
  const summary = useNotificationRead<Summary>(
    window ? '/notifications/summary?' + new URLSearchParams(window) : null,
  );
  const set = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        value || key === 'state' ? next.set(key, value) : next.delete(key);
        next.delete('cursor');
        next.delete('previous');
        return next;
      },
      { replace: true },
    );
  const reset = () => setParams(delivery ? { tab: 'delivery' } : {});
  let previous: string[] = [];
  try {
    const parsed = JSON.parse(params.get('previous') ?? '[]');
    if (
      Array.isArray(parsed) &&
      parsed.length < 100 &&
      parsed.every((value) => typeof value === 'string')
    )
      previous = parsed;
  } catch {
    /* Invalid navigation history is ignored. */
  }
  const page = (next: boolean) =>
    setParams((old) => {
      const value = new URLSearchParams(old);
      if (next) {
        value.set('previous', JSON.stringify([...previous, cursor]));
        value.set('cursor', list.data?.nextCursor ?? '');
      } else {
        const prev = [...previous],
          back = prev.pop();
        back ? value.set('cursor', back) : value.delete('cursor');
        prev.length ? value.set('previous', JSON.stringify(prev)) : value.delete('previous');
      }
      return value;
    });
  const c = (arabic: string, en: string) => (ar ? arabic : en);
  const details = (id: string) =>
    '/notifications/intents/' +
    encodeURIComponent(id) +
    '?return=' +
    encodeURIComponent(location.pathname + location.search);
  const count = (key: string) => (summary.data ? (summary.data.counts[key] ?? 0) : null);
  return (
    <>
      <div className="notification-region-heading">
        <h2>
          {delivery ? <Activity /> : <Bell />}
          {c(
            delivery ? 'مراقبة التسليم' : 'سجل الإشعارات',
            delivery ? 'Delivery monitoring' : 'Notification log',
          )}
        </h2>
        {delivery && hasPermission('admin:platform:manage') && (
          <AdminLink to="/health-readiness">
            <ExternalLink size={17} />
            {c('صحة المنصة', 'Platform health')}
          </AdminLink>
        )}
      </div>
      <div className="notification-period">
        <label>
          {c('الفترة حسب إنشاء الطلب — UTC', 'Period by intent creation — UTC')}
          <select value={period} onChange={(event) => set('period', event.target.value)}>
            <option value="24h">{c('آخر 24 ساعة', 'Last 24 hours')}</option>
            <option value="7d">{c('آخر 7 أيام', 'Last 7 days')}</option>
            <option value="custom">{c('فترة محددة', 'Custom dates')}</option>
          </select>
        </label>
        {period === 'custom' && (
          <>
            <label>
              {c('من يوم UTC', 'From UTC day')}
              <input
                type="date"
                value={from}
                onChange={(event) => set('from', event.target.value)}
              />
            </label>
            <label>
              {c('حتى يوم UTC شاملًا', 'Through UTC day, inclusive')}
              <input type="date" value={to} onChange={(event) => set('to', event.target.value)} />
            </label>
          </>
        )}
        {window && (
          <small>
            {date(window.from, ar)} — {date(window.to, ar)} ·{' '}
            {c('الحد النهائي غير شامل', 'End boundary exclusive')}
          </small>
        )}
      </div>
      {!window && (
        <p role="alert">
          {c('اختر فترة صحيحة لا تتجاوز 31 يومًا.', 'Choose a valid window of at most 31 days.')}
        </p>
      )}
      {summary.error != null && (
        <>
          <p role="status">
            {c(
              'مؤشرات الفترة غير متاحة؛ السجل يعرض نتائج طلبه المستقل.',
              'Period metrics unavailable; the log has an independent read.',
            )}
          </p>
          <ReadError error={summary.error} retry={summary.refresh} ar={ar} />
        </>
      )}
      <div
        className="notification-metrics"
        aria-label={c('مؤشرات الفترة من الخادم', 'Server period counts')}
      >
        {[
          [
            '',
            c('إجمالي الطلبات', 'Total intents'),
            summary.data
              ? Object.values(summary.data.counts).reduce((sum, value) => sum + value, 0)
              : null,
          ],
          ['PENDING', c('قيد الانتظار', 'Pending'), count('PENDING')],
          ['DELIVERED', c('تم التسليم', 'Delivered'), count('DELIVERED')],
          ['FAILED', c('فشل', 'Failed'), count('FAILED')],
          ['DEAD_LETTER', c('فشل نهائي', 'Dead letter'), count('DEAD_LETTER')],
          ['ACCEPTED', c('قبله المزوّد', 'Provider accepted'), count('ACCEPTED')],
          ['SUPPRESSED', c('محجوب', 'Suppressed'), count('SUPPRESSED')],
        ].map(([key, label, value]) => (
          <button
            key={String(key)}
            type="button"
            aria-pressed={state === key}
            onClick={() => set('state', String(key))}
          >
            <span>{label}</span>
            <strong>{value === null ? '—' : Number(value).toLocaleString(ar ? 'ar' : 'en')}</strong>
          </button>
        ))}
      </div>
      {delivery && (
        <p className="notification-note">
          {c(
            'قبول المزوّد لا يثبت الوصول. هذا العرض لا يشغّل العامل ولا يعيد الإرسال تلقائيًا.',
            'Provider acceptance does not prove arrival. This view never starts the worker or resends automatically.',
          )}
        </p>
      )}
      <div className="notification-filters">
        <label>
          <span>
            <Search size={17} />
            {c('معرّف الإشعار أو القالب', 'Intent ID or template')}
          </span>
          <input
            type="search"
            maxLength={120}
            value={q}
            onChange={(event) => set('q', event.target.value)}
          />
        </label>
        <label>
          {c('الحالة', 'Status')}
          <select value={state} onChange={(event) => set('state', event.target.value)}>
            <option value="">{c('جميع الحالات', 'All states')}</option>
            {deliveryStates.map((value) => (
              <option key={value} value={value}>
                {statusName(value, ar)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c('مرجع القالب', 'Template ID')}
          <input
            dir="ltr"
            maxLength={160}
            value={template}
            onChange={(event) => set('template', event.target.value)}
          />
        </label>
        {pii && (
          <button
            type="button"
            aria-expanded={advanced}
            onClick={() => setAdvanced((value) => !value)}
          >
            <SlidersHorizontal size={18} />
            {c('فلاتر إضافية', 'Additional filters')}
          </button>
        )}
        <button type="button" onClick={reset}>
          <RotateCcw size={17} />
          {c('مسح الفلاتر', 'Reset filters')}
        </button>
        {advanced && pii && (
          <label>
            {c('مرجع المستلم المصرّح', 'Authorized recipient reference')}
            <input
              dir="ltr"
              maxLength={160}
              value={recipient}
              onChange={(event) => set('recipient', event.target.value)}
            />
          </label>
        )}
      </div>
      {list.loading || search !== q ? (
        <Loading ar={ar} />
      ) : list.error ? (
        <ReadError error={list.error} retry={list.refresh} ar={ar} />
      ) : (
        list.data && (
          <>
            {!list.data.items.length ? (
              <div className="notification-empty">
                {c(
                  'لا توجد إشعارات تطابق الفترة والفلاتر الحالية.',
                  'No notifications match the current period and filters.',
                )}
                <button type="button" onClick={reset}>
                  {c('مسح الفلاتر', 'Reset filters')}
                </button>
              </div>
            ) : (
              <div className="notification-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{c('الإشعار / القالب', 'Intent / template')}</th>
                      <th>{c('المستلم', 'Recipient')}</th>
                      <th>{c('الحالة', 'Status')}</th>
                      <th>{c('الإنشاء / المحاولة التالية', 'Created / next attempt')}</th>
                      <th>{c('المحاولات', 'Attempts')}</th>
                      <th>{c('الإجراء', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.templateId}</strong>
                          <small dir="ltr">{item.id}</small>
                          {delivery && item.lastErrorCode && <small>{item.lastErrorCode}</small>}
                        </td>
                        <td>{item.recipientReference}</td>
                        <td>
                          <Status value={item.deliveryState} ar={ar} />
                        </td>
                        <td>
                          {date(item.createdAt, ar)}
                          <small>
                            <Clock3 size={14} />
                            {date(nextAttempt(item), ar)}
                          </small>
                        </td>
                        <td>{item.attempts}</td>
                        <td>
                          <AdminLink to={details(item.id)}>{c('تفاصيل', 'Details')}</AdminLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <footer className="notification-pagination">
              <span>
                {c('سجلات هذه الصفحة', 'Records on this page')}: {list.data.items.length} ·{' '}
                {c('ليست إجمالي الفترة', 'Not the period total')}
              </span>
              <button type="button" disabled={!previous.length} onClick={() => page(false)}>
                {c('السابق', 'Previous')}
              </button>
              <button type="button" disabled={!list.data.nextCursor} onClick={() => page(true)}>
                {c('التالي', 'Next')}
              </button>
            </footer>
          </>
        )
      )}
      {delivery && summary.data && (
        <section className="notification-panel">
          <h2>
            <Activity size={18} />
            {c('نتائج القنوات خلال الفترة', 'Channel results in the period')}
          </h2>
          {summary.data.channels?.length ? (
            <div className="notification-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{c('القناة', 'Channel')}</th>
                    <th>{c('النتيجة', 'Outcome')}</th>
                    <th>{c('عدد نتائج القنوات', 'Channel result count')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.data.channels.map((item) => (
                    <tr key={item.channel + item.status}>
                      <td>{item.channel}</td>
                      <td>
                        <Status value={item.status} ar={ar} />
                      </td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              {c(
                'لا توجد نتائج قنوات محفوظة ضمن الفترة.',
                'No channel results recorded in this period.',
              )}
            </p>
          )}
          <p className="notification-note">
            {c('أقدم طلب منتظر ضمن الفترة', 'Oldest pending intent in this period')}:{' '}
            {date(summary.data.oldestPendingAt, ar)} ·{' '}
            {c(
              'نتائج القنوات ليست عدد إشعارات فريدة.',
              'Channel results are not unique intent counts.',
            )}
          </p>
          <h2>
            <Activity size={18} />
            {c('أسباب الإخفاق من الخادم', 'Server error-code aggregation')}
          </h2>
          {summary.data.errors?.length ? (
            <ul>
              {summary.data.errors.map((item) => (
                <li key={item.code}>
                  <span dir="ltr">{item.code}</span> · {item.count}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {c(
                'لا توجد أسباب إخفاق مجمعة متاحة ضمن الفترة.',
                'No aggregated failure reasons are available for this period.',
              )}
            </p>
          )}
          <p className="notification-note">
            {c(
              'حالة المزوّد والعامل تُراجع من صحة المنصة. لا توجد هنا إشارة تثبت جاهزية إرسال خارجي.',
              'Review worker/provider readiness in platform health. This view does not establish external delivery readiness.',
            )}
          </p>
        </section>
      )}
    </>
  );
}
