import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, RefreshCw } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { ListResponse, labelOf, messageOf } from './cmsModels';
import { Action, Alert, Loading, Empty, Panel } from './CmsControls';

export function CmsPublishingWorkspace({ locale }: { locale: 'ar' | 'en' }) {
  const { language } = useTranslation(),
    ar = language === 'ar';
  const { hasPermission } = useAdminAuthorization();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState('SCHEDULED');
  const [data, setData] = useState<ListResponse | null>(null),
    [error, setError] = useState('');
  const [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    const requests = sequence;
    const current = ++requests.current;
    setBusy(true);
    setError('');
    setData(null);
    const params = new URLSearchParams({
      siteIdentifier: 'manaratak',
      locale,
      status,
      page: String(page),
      pageSize: '20',
    });
    adminApiClient
      .request<ListResponse>('/admin/cms/content?' + params)
      .then((result) => {
        if (current === sequence.current) setData(result);
      })
      .catch((reason) => {
        if (current === sequence.current) setError(messageOf(reason, language));
      })
      .finally(() => {
        if (current === sequence.current) setBusy(false);
      });
    return () => {
      requests.current++;
    };
  }, [page, status, locale, language, revision]);
  return (
    <Panel title={ar ? 'متابعة النشر' : 'Publishing status'} icon={<CalendarClock size={20} />}>
      <div className="cms-toolbar">
        <label>
          {ar ? 'حالة نسخة اللغة' : 'Locale publication state'}
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            {['SCHEDULED', 'PUBLISHED', 'READY_TO_PUBLISH', 'IN_REVIEW'].map((value) => (
              <option key={value} value={value}>
                {labelOf(value, language)}
              </option>
            ))}
          </select>
        </label>
        <Action disabled={busy} onClick={() => setRevision((value) => value + 1)}>
          <RefreshCw size={17} />
          {ar ? 'تحديث' : 'Refresh'}
        </Action>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {busy ? (
        <Loading />
      ) : (
        data && (
          <>
            <p className="cms-result-count">
              {ar ? 'إجمالي النتائج من المصدر' : 'Total matching records'}:{' '}
              <strong>{data.total}</strong>
            </p>
            {data.data.length ? (
              <ul className="cms-publishing-list">
                {data.data.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.localizedStates?.find((state) => state.locale === locale)?.scheduledAt
                        ? new Date(
                            item.localizedStates.find((state) => state.locale === locale)!
                              .scheduledAt!,
                          ).toLocaleString(language)
                        : '—'}
                    </span>
                    <Link
                      to={
                        '/cms/content/' +
                        encodeURIComponent(item.id) +
                        '?section=preview&locale=' +
                        locale
                      }
                    >
                      {ar ? 'تفاصيل النشر' : 'Publishing details'}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                text={
                  ar ? 'لا توجد مواد بهذه الحالة واللغة.' : 'No content in this state and locale.'
                }
              />
            )}
            <footer className="cms-pagination">
              <Action disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {ar ? 'السابق' : 'Previous'}
              </Action>
              <span>
                {page} / {Math.max(1, data.totalPages)}
              </span>
              <Action disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                {ar ? 'التالي' : 'Next'}
              </Action>
            </footer>
          </>
        )
      )}
      {hasPermission('admin:platform:manage') && (
        <Link to="/review-queue?domain=content">
          {ar ? 'فتح قائمة المراجعة العامة' : 'Open the global review queue'}
        </Link>
      )}
    </Panel>
  );
}
