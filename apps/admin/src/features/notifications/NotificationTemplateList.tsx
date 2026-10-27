import { useLocation, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Search } from 'lucide-react';
import { AdminLink } from '../../components/AdminLink';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useDebounced, useNotificationRead } from './notificationHooks';
import { channels, date, type Page, type Template } from './notificationModel';
import { Loading, ReadError } from './NotificationControls';
export function NotificationTemplateList({ ar }: { ar: boolean }) {
  const [params, setParams] = useSearchParams(),
    location = useLocation(),
    { hasPermission } = useAdminAuthorization();
  const c = (a: string, e: string) => (ar ? a : e),
    q = params.get('q') ?? '',
    search = useDebounced(q),
    cursor = params.get('cursor') ?? '';
  const query = new URLSearchParams({
    limit: '25',
    ...(search ? { search } : {}),
    ...(cursor ? { cursor } : {}),
  });
  for (const key of ['active', 'channel', 'locale']) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const read = useNotificationRead<Page<Template>>('/notifications/templates?' + query);
  const set = (key: string, value: string) =>
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        value ? next.set(key, value) : next.delete(key);
        next.delete('cursor');
        next.delete('previous');
        return next;
      },
      { replace: true },
    );
  let previous: string[] = [];
  try {
    const value = JSON.parse(params.get('previous') ?? '[]');
    if (Array.isArray(value) && value.length < 100 && value.every((x) => typeof x === 'string'))
      previous = value;
  } catch {
    /* Ignore malformed navigation state. */
  }
  const page = (forward: boolean) =>
    setParams((old) => {
      const next = new URLSearchParams(old),
        stack = [...previous];
      if (forward) {
        stack.push(cursor);
        next.set('cursor', read.data?.nextCursor ?? '');
      } else {
        const value = stack.pop();
        value ? next.set('cursor', value) : next.delete('cursor');
      }
      stack.length ? next.set('previous', JSON.stringify(stack)) : next.delete('previous');
      return next;
    });
  return (
    <>
      <div className="notification-region-heading">
        <h2>
          <FileText />
          {c('قوالب الإشعارات', 'Notification templates')}
        </h2>
        {hasPermission('admin:notifications:templates:author') && (
          <AdminLink to="/notifications/templates/new">
            <Plus />
            {c('قالب جديد', 'New template')}
          </AdminLink>
        )}
      </div>
      <p className="notification-note">
        {c(
          'القوالب المحفوظة ثابتة المحتوى. أنشئ تعريفًا مستقلًا عند تعديل النص؛ القوالب التابعة للنظام محمية.',
          'Saved template contents are immutable. Create an independent definition to change text; system templates are protected.',
        )}
      </p>
      <div className="notification-filters">
        <label>
          <span>
            <Search />
            {c('بحث بمعرّف القالب', 'Search template ID')}
          </span>
          <input
            type="search"
            maxLength={120}
            value={q}
            onChange={(e) => set('q', e.target.value)}
          />
        </label>
        <label>
          {c('الحالة', 'Status')}
          <select
            value={params.get('active') ?? ''}
            onChange={(e) => set('active', e.target.value)}
          >
            <option value="">{c('الكل', 'All')}</option>
            <option value="true">{c('نشط', 'Active')}</option>
            <option value="false">{c('معطّل', 'Inactive')}</option>
          </select>
        </label>
        <label>
          {c('القناة', 'Channel')}
          <select
            value={params.get('channel') ?? ''}
            onChange={(e) => set('channel', e.target.value)}
          >
            <option value="">{c('كل القنوات', 'All channels')}</option>
            {channels.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          {c('اللغة', 'Language')}
          <select
            value={params.get('locale') ?? ''}
            onChange={(e) => set('locale', e.target.value)}
          >
            <option value="">{c('كل اللغات', 'All languages')}</option>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
      {read.loading || q !== search ? (
        <Loading ar={ar} />
      ) : read.error ? (
        <ReadError error={read.error} retry={read.refresh} ar={ar} />
      ) : (
        read.data && (
          <>
            <div className="notification-table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      c('القالب', 'Template'),
                      c('الحالة', 'Status'),
                      c('القنوات / اللغات', 'Channels / languages'),
                      c('الاستخدام / الإصدار', 'Usage / version'),
                      c('آخر تعديل', 'Updated'),
                      c('الإجراء', 'Action'),
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {read.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong dir="ltr">{item.id}</strong>
                      </td>
                      <td>{item.active ? c('نشط', 'Active') : c('معطّل', 'Inactive')}</td>
                      <td>
                        {item.channels.join(' · ')}
                        <small>{item.localizations.join(' · ')}</small>
                      </td>
                      <td>
                        {item.usageCount ?? '—'} / {item.version ?? '—'}
                      </td>
                      <td>{date(item.updatedAt, ar)}</td>
                      <td>
                        <AdminLink
                          to={
                            '/notifications/templates/' +
                            encodeURIComponent(item.id) +
                            '?return=' +
                            encodeURIComponent(location.pathname + location.search)
                          }
                        >
                          {c('التفاصيل والمعاينة', 'Details and preview')}
                        </AdminLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!read.data.items.length && (
              <p className="notification-empty">
                {c('لا توجد قوالب مطابقة.', 'No matching templates.')}
              </p>
            )}
            <footer className="notification-pagination">
              <span>
                {c('سجلات الصفحة', 'Page records')}: {read.data.items.length}
              </span>
              <button disabled={!previous.length} onClick={() => page(false)}>
                {c('السابق', 'Previous')}
              </button>
              <button disabled={!read.data.nextCursor} onClick={() => page(true)}>
                {c('التالي', 'Next')}
              </button>
            </footer>
          </>
        )
      )}
    </>
  );
}
