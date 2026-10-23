import { useState } from 'react';
import { Send, ShieldCheck, MousePointerClick, Users, ClipboardCheck } from 'lucide-react';
import type { ApplicationDashboard, TrafficDashboard } from '@manaratak/shared';
import { ExecutiveKpi } from './ExecutiveKpi';
export function ExecutiveApplications({
  applications,
  traffic,
  language,
  canManaged,
  canTraffic,
  managedState,
  trafficState,
}: {
  applications: ApplicationDashboard | null;
  traffic: TrafficDashboard | null;
  language: string;
  canManaged: boolean;
  canTraffic: boolean;
  managedState: string;
  trafficState: string;
}) {
  const [channel, setChannel] = useState(canManaged ? 'managed' : 'direct');
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const number = (value: number) => new Intl.NumberFormat(language).format(value);
  const rows = applications
    ? ([
        [
          tr('طلبات استلمتها منارتك', 'Requests received by MANARATAK'),
          applications.managedServiceRequests,
        ],
        [tr('قيد المعالجة', 'Processing'), applications.processing],
        [tr('تحتاج استكمالًا', 'Needs information'), applications.needsInformation],
        [
          tr('أُرسلت للجامعة بإثبات', 'Evidenced university submissions'),
          applications.managedUniversitySubmissions,
        ],
        [tr('قبول رسمي موثّق', 'Verified official acceptance'), applications.officialAccepted],
        [tr('رفض رسمي موثّق', 'Verified official rejection'), applications.officialRejected],
      ] as const)
    : [];
  const maximum = Math.max(1, ...rows.map((row) => row[1]));
  return (
    <section
      className="executive-panel executive-applications"
      aria-labelledby="executive-channel-title"
    >
      <h2 id="executive-channel-title">
        <Send aria-hidden="true" />
        {tr('أداء قناتَي التقديم', 'Application channel performance')}
      </h2>
      <div
        className="executive-channel-tabs"
        role="tablist"
        aria-label={tr('قنوات التقديم', 'Application channels')}
      >
        {(['managed', 'direct'] as const).map((key, index) => (
          <button
            id={key + '-tab'}
            key={key}
            type="button"
            role="tab"
            aria-selected={channel === key}
            aria-controls={key + '-panel'}
            tabIndex={channel === key ? 0 : -1}
            onClick={() => setChannel(key)}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                event.preventDefault();
                setChannel(key === 'managed' ? 'direct' : 'managed');
                (event.currentTarget.parentElement?.children[1 - index] as HTMLElement)?.focus();
              }
            }}
          >
            {key === 'managed' ? (
              <ShieldCheck aria-hidden="true" />
            ) : (
              <MousePointerClick aria-hidden="true" />
            )}
            {key === 'managed'
              ? tr('التقديم عبر منارتك', 'Through MANARATAK')
              : tr('التقديم المباشر للجامعة', 'Direct to university')}
          </button>
        ))}
      </div>
      {channel === 'managed' ? (
        <div id="managed-panel" role="tabpanel" aria-labelledby="managed-tab" tabIndex={0}>
          {!canManaged ? (
            <p className="executive-empty">{tr('مقيّد بالصلاحيات', 'Restricted by permissions')}</p>
          ) : (
            <>
              <p className="executive-state">{managedState}</p>
              <div className="executive-bar-chart">
                {rows.map(([title, value]) => (
                  <div className="executive-bar-row" key={title}>
                    <span>{title}</span>
                    <div className="executive-bar-track">
                      <i style={{ width: `${(value / maximum) * 100}%` }} />
                    </div>
                    <b>{number(value)}</b>
                  </div>
                ))}
              </div>
              {!applications && <p className="executive-empty">{managedState}</p>}
              {applications && (
                <p className="executive-caption">
                  {tr('تغطية الإثباتات والإقرارات منذ', 'Evidence and self-report coverage since')}:{' '}
                  {new Intl.DateTimeFormat(language, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'UTC',
                  }).format(new Date(applications.coverageFrom))}{' '}
                  UTC
                </p>
              )}
              <p className="executive-caption">
                {tr(
                  'استلام طلب الخدمة ≠ إرساله للجامعة. الإرسال والنتائج لا تُحتسب إلا بإثبات مخوّل. المعالجة والاستكمال حالتان راهنتان لطلبات الفترة؛ الأحداث حسب وقت تسجيلها.',
                  'Service receipt ≠ university submission. Submissions and outcomes require authorized evidence. Processing/information are current states for requests in the period; events use recording time.',
                )}
              </p>
            </>
          )}
        </div>
      ) : (
        <div id="direct-panel" role="tabpanel" aria-labelledby="direct-tab" tabIndex={0}>
          <div className="executive-direct-grid">
            {canTraffic && (
              <>
                <ExecutiveKpi
                  title={tr('نقرات خروج مؤهلة', 'Eligible outbound clicks')}
                  value={traffic?.outboundClicks ?? null}
                  icon={MousePointerClick}
                  tone="teal"
                  language={language}
                  status={trafficState}
                />
                <ExecutiveKpi
                  title={tr('معرّفات متصفحات خرجت', 'Outbound browser identifiers')}
                  value={traffic?.outboundVisitors ?? null}
                  icon={Users}
                  tone="cyan"
                  language={language}
                  status={trafficState}
                />
              </>
            )}
            {canManaged && (
              <ExecutiveKpi
                title={tr(
                  'تقديم أبلغ به الطلاب — غير موثّق',
                  'Student-reported applications — unverified',
                )}
                value={applications?.directSelfReportedApplications ?? null}
                icon={ClipboardCheck}
                tone="gold"
                language={language}
                status={managedState}
              />
            )}
          </div>
          <p className="executive-caption">
            {tr(
              'النقرة إحالة خارجية فقط، ولا تثبت إرسال طلب أو قبولًا جامعيًا. متابعة الطالب الشخصية منفصلة عن القناتين.',
              'A click is only an outbound referral, not proof of application or admission. Personal trackers remain separate.',
            )}
          </p>
          {traffic && traffic.destinations.length > 0 && (
            <ul className="executive-destinations">
              {traffic.destinations.map((row) => (
                <li key={row.host}>
                  <bdi>{row.host}</bdi>
                  <b>{number(row.clicks)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
