import { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Bell, FileText, Activity, Plus, RefreshCw } from 'lucide-react';
import { AdminLink } from '../components/AdminLink';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useTranslation } from '../i18n/I18nProvider';
import { NotificationIntentList } from '../features/notifications/NotificationIntentList';
import { NotificationIntentDetails } from '../features/notifications/NotificationIntentDetails';
import { NotificationTemplateList } from '../features/notifications/NotificationTemplateList';
import { NotificationTemplateDetails } from '../features/notifications/NotificationTemplateDetails';
import { NotificationTemplateEditor } from '../features/notifications/NotificationTemplateEditor';
import { NotificationIntentCreate } from '../features/notifications/NotificationIntentCreate';
import '../features/reference-data/reference-data.css';
import '../features/notifications/notifications.css';
export function NotificationOperationsPage() {
  const { language, dir } = useTranslation(),
    { hasPermission } = useAdminAuthorization(),
    location = useLocation(),
    [params] = useSearchParams(),
    [revision, setRevision] = useState(0);
  const ar = language === 'ar',
    c = (a: string, e: string) => (ar ? a : e);
  const path = location.pathname.replace(/\/$/, ''),
    root = path === '/notifications',
    intent = path.match(/^\/notifications\/intents\/([^/]+)$/),
    template = path.match(/^\/notifications\/templates\/([^/]+)$/);
  const author = hasPermission('admin:notifications:templates:author'),
    create =
      hasPermission('admin:notifications:intents:create') &&
      hasPermission('admin:notifications:recipients:pii');
  const permissionScope = [
    'templates:author',
    'intents:create',
    'recipients:pii',
    'delivery:retry',
    'intents:cancel',
  ]
    .map((action) => String(hasPermission('admin:notifications:' + action)))
    .join(':');
  const tab = path.includes('/templates/')
    ? 'templates'
    : params.get('tab') === 'templates'
      ? 'templates'
      : params.get('tab') === 'delivery'
        ? 'delivery'
        : 'log';
  let content;
  if (!hasPermission('admin:notifications:view'))
    content = (
      <p role="alert">
        {c('لا تملك صلاحية عرض الإشعارات.', 'You do not have notification view permission.')}
      </p>
    );
  else if (root)
    content =
      tab === 'templates' ? (
        <NotificationTemplateList key={'templates' + revision} ar={ar} />
      ) : (
        <NotificationIntentList ar={ar} delivery={tab === 'delivery'} revision={revision} />
      );
  else if (path === '/notifications/new')
    content = create ? (
      <NotificationIntentCreate key={permissionScope} ar={ar} />
    ) : (
      <p role="alert">
        {c(
          'يلزم إذنا إنشاء الإشعار والوصول للمستلم.',
          'Intent creation and recipient access permissions are required.',
        )}
      </p>
    );
  else if (path === '/notifications/templates/new')
    content = author ? (
      <NotificationTemplateEditor key={`${params.get('from') ?? ''}:${permissionScope}`} ar={ar} />
    ) : (
      <p role="alert">{c('يلزم إذن تأليف القوالب.', 'Template author permission is required.')}</p>
    );
  else if (intent)
    content = (
      <NotificationIntentDetails
        key={intent[1] + permissionScope}
        id={decodeURIComponent(intent[1])}
        ar={ar}
      />
    );
  else if (template)
    content = (
      <NotificationTemplateDetails
        key={template[1] + permissionScope}
        id={decodeURIComponent(template[1])}
        ar={ar}
      />
    );
  else
    content = (
      <p role="alert">
        {c('مسار الإشعارات غير موجود.', 'Notification route not found.')}{' '}
        <AdminLink to="/notifications">{c('السجل', 'Log')}</AdminLink>
      </p>
    );
  return (
    <div className="reference-workspace notification-workspace" dir={dir}>
      <header className="reference-hero notification-hero">
        <div>
          <span className="notification-eyebrow">
            <Bell />
            {c('مركز الإشعارات التشغيلية', 'Operational notification center')}
          </span>
          <h1>{c('الإشعارات', 'Notifications')}</h1>
          <p>
            {c(
              'سجل واضح، قوالب ثابتة، ومتابعة دقيقة للتسليم.',
              'A clear log, immutable templates and accurate delivery tracking.',
            )}
          </p>
        </div>
        <div className="notification-actions">
          {root && (
            <button type="button" onClick={() => setRevision((value) => value + 1)}>
              <RefreshCw />
              {c('تحديث البيانات', 'Refresh data')}
            </button>
          )}
          {create && path !== '/notifications/new' && (
            <AdminLink to="/notifications/new">
              <Plus />
              {c('إشعار جديد', 'New notification')}
            </AdminLink>
          )}
        </div>
      </header>
      <nav
        className="notification-tabs admin-section-navigation"
        aria-label={c('مساحات الإشعارات', 'Notification areas')}
      >
        {[
          ['log', c('سجل الإشعارات', 'Notification log'), Bell],
          ['templates', c('قوالب الإشعارات', 'Templates'), FileText],
          ['delivery', c('مراقبة التسليم', 'Delivery monitoring'), Activity],
        ].map(([key, label, Icon]) => {
          const Symbol = Icon as typeof Bell;
          return (
            <AdminLink
              key={String(key)}
              to={key === 'log' ? '/notifications' : '/notifications?tab=' + key}
              aria-current={tab === key ? 'page' : undefined}
            >
              <Symbol />
              {String(label)}
            </AdminLink>
          );
        })}
      </nav>
      <main className="notification-content">{content}</main>
    </div>
  );
}
