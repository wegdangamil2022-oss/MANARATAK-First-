import { useEffect, useState, type FormEvent } from 'react';
import type { SupportTeam, SupportPolicy, SupportMacro } from '@manaratak/domain';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { OperationsNotice } from '../../features/operations/OperationsWorkspace';
import { supportError } from './SupportModel';
type Team = SupportTeam & { memberIds: string[] };
type Configuration = { teams: Team[]; policies: SupportPolicy[]; macros: SupportMacro[] };
type Metrics = {
  total: number;
  needsReply: number;
  unassigned: number;
  overdue: number;
  waiting: number;
  resolved: number;
  reopened: number;
  checkedAt: string;
  csat: null;
};
export function SupportQualityWorkspace() {
  const { language } = useTranslation(),
    { hasPermission } = useAdminAuthorization(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [config, setConfig] = useState<Configuration>({ teams: [], policies: [], macros: [] }),
    [metrics, setMetrics] = useState<Metrics | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState<boolean | null>(null),
    [part, setPart] = useState('teams'),
    [team, setTeam] = useState<Team | null>(null),
    [policy, setPolicy] = useState<SupportPolicy | null>(null),
    [macro, setMacro] = useState<SupportMacro | null>(null),
    [agents, setAgents] = useState<Array<{ id: string; label: string }>>([]);
  const settings = hasPermission('admin:students:support:settings'),
    canMetrics = hasPermission('admin:students:support:metrics');
  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await adminApiClient.request<{ ready: boolean }>('/admin/support/readiness');
      setReady(r.ready);
      if (!r.ready) return;
      if (settings)
        setConfig(await adminApiClient.request<Configuration>('/admin/support/configuration'));
      if (canMetrics) setMetrics(await adminApiClient.request<Metrics>('/admin/support/metrics'));
    } catch (e) {
      setError(supportError(e, language));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
  }, [language, settings, canMetrics]);
  const save = async (
    event: FormEvent,
    kind: 'team' | 'policy' | 'macro',
    input: Team | SupportPolicy | SupportMacro,
  ) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request('/admin/support/configuration/' + kind, {
        method: 'PUT',
        body: JSON.stringify(
          kind === 'policy'
            ? {
                ...input,
                data: {
                  ...(input as SupportPolicy).data,
                  calendar: {
                    ...(input as SupportPolicy).data.calendar,
                    holidays: (input as SupportPolicy).data.calendar.holidays
                      .map((day) => day.trim())
                      .filter(Boolean),
                  },
                },
              }
            : input,
        ),
        idempotencyKey: createAdminIdempotencyKey(),
      });
      setTeam(null);
      setPolicy(null);
      setMacro(null);
      setNotice(
        c(
          'حُفظ الإعداد. لا يغير ذلك السياسات المثبتة للتذاكر السابقة.',
          'Setting saved. Existing case policy snapshots are unchanged.',
        ),
      );
      await load();
    } catch (e) {
      setError(supportError(e, language));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="operations-actions">
        <button className="operations-button" disabled={busy} onClick={() => void load()}>
          {c('تحديث', 'Refresh')}
        </button>
      </div>
      {ready === false && (
        <OperationsNotice>
          {c(
            'إعدادات التذاكر تحتاج مخطط الدعم الجديد؛ لم تُطبّق أي جداول على القاعدة الأصلية.',
            'Support settings need the new schema; no original database tables were applied.',
          )}
        </OperationsNotice>
      )}
      {error && <OperationsNotice error>{error}</OperationsNotice>}
      {notice && <OperationsNotice>{notice}</OperationsNotice>}
      {canMetrics && (
        <section className="operations-panel">
          <h2>{c('مؤشرات ضمن نطاق صلاحيتك', 'Metrics within your access scope')}</h2>
          {metrics ? (
            <>
              <div className="operations-filters">
                {(
                  [
                    'total',
                    'needsReply',
                    'unassigned',
                    'overdue',
                    'waiting',
                    'resolved',
                    'reopened',
                  ] as const
                ).map((key, index) => (
                  <p key={key}>
                    {c(
                      [
                        'كل التذاكر',
                        'تحتاج ردًا',
                        'غير مسندة',
                        'متأخرة',
                        'بانتظار الطالب',
                        'محلولة أو مغلقة',
                        'معاد فتحها',
                      ][index],
                      key,
                    )}
                    : <strong>{metrics[key]}</strong>
                  </p>
                ))}
              </div>
              <p>
                {c('وقت القراءة', 'Read at')}:{' '}
                {new Date(metrics.checkedAt).toLocaleString(language)}
              </p>
            </>
          ) : (
            <p className="operations-empty">
              {c('المؤشرات غير متاحة حاليًا', 'Metrics currently unavailable')}
            </p>
          )}
          <p>
            {c(
              'رضا الطلاب: غير متاح لعدم وجود قياسات. عامل التذكيرات الآلي والمرفقات الخاصة غير مفعّلين.',
              'Student satisfaction: unavailable without measurements. Automated SLA reminders and private attachments are not enabled.',
            )}
          </p>
        </section>
      )}
      {settings && ready && (
        <section className="operations-panel">
          <div className="operations-actions">
            {[
              ['teams', 'الفرق', 'Teams'],
              ['policy', 'سياسة الخدمة', 'Service policy'],
              ['macros', 'الردود المحفوظة', 'Saved replies'],
            ].map(([id, ar, en]) => (
              <button
                key={id}
                className={'operations-button ' + (part === id ? 'selected' : '')}
                onClick={() => {
                  setPart(id);
                  setTeam(null);
                  setPolicy(null);
                  setMacro(null);
                }}
              >
                {c(ar, en)}
              </button>
            ))}
          </div>
          {part === 'teams' && (
            <>
              <div className="operations-actions">
                <button
                  className="operations-button primary"
                  onClick={() =>
                    setTeam({
                      id: crypto.randomUUID(),
                      name: '',
                      active: true,
                      version: 0,
                      memberIds: [],
                    })
                  }
                >
                  {c('فريق جديد', 'New team')}
                </button>
                {hasPermission('admin:students:support:cases:assign') && (
                  <button
                    className="operations-button"
                    onClick={async () => {
                      try {
                        const r = await adminApiClient.request<{ items: typeof agents }>(
                          '/admin/support/agents',
                        );
                        setAgents(r.items);
                      } catch (e) {
                        setError(supportError(e, language));
                      }
                    }}
                  >
                    {c('تحميل الموظفين المؤهلين', 'Load eligible agents')}
                  </button>
                )}
              </div>
              {config.teams.map((t) => (
                <button className="operations-button" key={t.id} onClick={() => setTeam(t)}>
                  {t.name} · {t.active ? c('نشط', 'Active') : c('موقوف', 'Inactive')} (
                  {t.memberIds.length})
                </button>
              ))}
              {team && (
                <form className="grid gap-3" onSubmit={(e) => void save(e, 'team', team)}>
                  <label>
                    {c('اسم الفريق', 'Team name')}
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={team.name}
                      onChange={(e) => setTeam({ ...team, name: e.target.value })}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={team.active}
                      onChange={(e) => setTeam({ ...team, active: e.target.checked })}
                    />
                    {c('نشط', 'Active')}
                  </label>
                  <fieldset>
                    <legend>
                      {c(
                        'الموظفون المؤهلون — لا يمنح اختيارهم صلاحيات جديدة',
                        'Eligible agents — membership does not grant permissions',
                      )}
                    </legend>
                    {agents.map((a) => (
                      <label key={a.id} className="block">
                        <input
                          type="checkbox"
                          checked={team.memberIds.includes(a.id)}
                          onChange={(e) =>
                            setTeam({
                              ...team,
                              memberIds: e.target.checked
                                ? [...team.memberIds, a.id]
                                : team.memberIds.filter((id) => id !== a.id),
                            })
                          }
                        />
                        {a.label}
                      </label>
                    ))}
                    {!agents.length && (
                      <p>
                        {c(
                          'حمّل الموظفين المؤهلين بصلاحية الإسناد. الأعضاء الحاليون محفوظون حتى تعديل القائمة.',
                          'Load eligible agents with assignment permission. Existing members are preserved.',
                        )}
                      </p>
                    )}
                  </fieldset>
                  <button disabled={busy} className="operations-button primary">
                    {c('حفظ الفريق', 'Save team')}
                  </button>
                </form>
              )}
            </>
          )}
          {part === 'policy' && (
            <>
              <OperationsNotice>
                {c(
                  'سياسة واحدة نشطة. حدد أوقات العمل والمدة الفعلية قبل التفعيل؛ لن تُنشأ أهداف افتراضية تلقائيًا.',
                  'Only one active policy. Set actual business hours and targets before activation; no automatic target defaults.',
                )}
              </OperationsNotice>
              <button
                className="operations-button"
                onClick={() =>
                  setPolicy({
                    id: crypto.randomUUID(),
                    name: '',
                    active: false,
                    version: 0,
                    data: {
                      firstReplyMinutes: 0,
                      resolutionMinutes: 0,
                      reopenDays: 7,
                      pauseWaitingForStudent: true,
                      calendar: {
                        timeZone: 'Asia/Aden',
                        weekdays: [0, 1, 2, 3, 4],
                        opensAtMinute: 540,
                        closesAtMinute: 1020,
                        holidays: [],
                      },
                    },
                  })
                }
              >
                {c('سياسة جديدة', 'New policy')}
              </button>
              {config.policies.map((p) => (
                <button className="operations-button" key={p.id} onClick={() => setPolicy(p)}>
                  {p.name} · {p.active ? c('نشطة', 'Active') : c('غير نشطة', 'Inactive')}
                </button>
              ))}
              {policy && (
                <form className="grid gap-3" onSubmit={(e) => void save(e, 'policy', policy)}>
                  <div className="operations-filters">
                    <label>
                      {c('اسم السياسة', 'Policy name')}
                      <input
                        required
                        minLength={2}
                        maxLength={100}
                        value={policy.name}
                        onChange={(e) => setPolicy({ ...policy, name: e.target.value })}
                      />
                    </label>
                    {(
                      [
                        [
                          'firstReplyMinutes',
                          'دقائق العمل لأول رد',
                          'First reply business minutes',
                        ],
                        ['resolutionMinutes', 'دقائق العمل للحل', 'Resolution business minutes'],
                        ['reopenDays', 'أيام إعادة الفتح', 'Reopen days'],
                      ] as const
                    ).map(([key, ar, en]) => (
                      <label key={key}>
                        {c(ar, en)}
                        <input
                          type="number"
                          required
                          min={1}
                          max={key === 'reopenDays' ? 365 : 525600}
                          value={policy.data[key] || ''}
                          onChange={(e) =>
                            setPolicy({
                              ...policy,
                              data: { ...policy.data, [key]: Number(e.target.value) },
                            })
                          }
                        />
                      </label>
                    ))}
                    <label>
                      {c('المنطقة الزمنية', 'Time zone')}
                      <input
                        required
                        value={policy.data.calendar.timeZone}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            data: {
                              ...policy.data,
                              calendar: { ...policy.data.calendar, timeZone: e.target.value },
                            },
                          })
                        }
                      />
                    </label>
                    {(
                      [
                        ['opensAtMinute', 'بداية الدوام', 'Opening time'],
                        ['closesAtMinute', 'نهاية الدوام', 'Closing time'],
                      ] as const
                    ).map(([key, ar, en]) => (
                      <label key={key}>
                        {c(ar, en)}
                        <input
                          type="time"
                          required
                          value={
                            Math.floor(policy.data.calendar[key] / 60)
                              .toString()
                              .padStart(2, '0') +
                            ':' +
                            (policy.data.calendar[key] % 60).toString().padStart(2, '0')
                          }
                          onChange={(e) => {
                            const [hour, minute] = e.target.value.split(':').map(Number);
                            setPolicy({
                              ...policy,
                              data: {
                                ...policy.data,
                                calendar: { ...policy.data.calendar, [key]: hour * 60 + minute },
                              },
                            });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <fieldset>
                    <legend>{c('أيام العمل', 'Business days')}</legend>
                    <div className="operations-actions">
                      {[
                        'الأحد|Sun',
                        'الاثنين|Mon',
                        'الثلاثاء|Tue',
                        'الأربعاء|Wed',
                        'الخميس|Thu',
                        'الجمعة|Fri',
                        'السبت|Sat',
                      ].map((day, index) => (
                        <label key={day}>
                          <input
                            type="checkbox"
                            checked={policy.data.calendar.weekdays.includes(index)}
                            onChange={(e) =>
                              setPolicy({
                                ...policy,
                                data: {
                                  ...policy.data,
                                  calendar: {
                                    ...policy.data.calendar,
                                    weekdays: e.target.checked
                                      ? [...policy.data.calendar.weekdays, index]
                                      : policy.data.calendar.weekdays.filter((d) => d !== index),
                                  },
                                },
                              })
                            }
                          />
                          {day.split('|')[language === 'ar' ? 0 : 1]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label>
                    {c('العطلات: تاريخ YYYY-MM-DD في كل سطر', 'Holidays: YYYY-MM-DD, one per line')}
                    <textarea
                      rows={3}
                      value={policy.data.calendar.holidays.join('\n')}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          data: {
                            ...policy.data,
                            calendar: {
                              ...policy.data.calendar,
                              holidays: e.target.value.split('\n'),
                            },
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={policy.data.pauseWaitingForStudent}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          data: { ...policy.data, pauseWaitingForStudent: e.target.checked },
                        })
                      }
                    />
                    {c(
                      'إيقاف عداد الحل أثناء انتظار الطالب',
                      'Pause resolution clock while waiting for student',
                    )}
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={policy.active}
                      onChange={(e) => setPolicy({ ...policy, active: e.target.checked })}
                    />
                    {c('تفعيل السياسة للطلبات الجديدة', 'Activate for new cases')}
                  </label>
                  <button disabled={busy} className="operations-button primary">
                    {c('حفظ السياسة', 'Save policy')}
                  </button>
                </form>
              )}
            </>
          )}
          {part === 'macros' && (
            <>
              <button
                className="operations-button"
                onClick={() =>
                  setMacro({
                    id: crypto.randomUUID(),
                    title: '',
                    body: '',
                    locale: language === 'ar' ? 'ar' : 'en',
                    status: 'DRAFT',
                    version: 0,
                  })
                }
              >
                {c('رد محفوظ جديد', 'New saved reply')}
              </button>
              {config.macros.map((m) => (
                <button className="operations-button" key={m.id} onClick={() => setMacro(m)}>
                  {m.title} · {m.status}
                </button>
              ))}
              {macro && (
                <form className="grid gap-3" onSubmit={(e) => void save(e, 'macro', macro)}>
                  <label>
                    {c('العنوان', 'Title')}
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={macro.title}
                      onChange={(e) => setMacro({ ...macro, title: e.target.value })}
                    />
                  </label>
                  <label>
                    {c('اللغة', 'Language')}
                    <select
                      value={macro.locale}
                      onChange={(e) =>
                        setMacro({ ...macro, locale: e.target.value as 'ar' | 'en' })
                      }
                    >
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label>
                    {c(
                      'الرسالة — نص عادي دون بيانات طلاب',
                      'Message — plain text, no student data',
                    )}
                    <textarea
                      required
                      maxLength={4000}
                      rows={5}
                      value={macro.body}
                      onChange={(e) => setMacro({ ...macro, body: e.target.value })}
                    />
                  </label>
                  <label>
                    {c('حالة الإتاحة للموظف', 'Agent availability')}
                    <select
                      value={macro.status}
                      onChange={(e) =>
                        setMacro({ ...macro, status: e.target.value as SupportMacro['status'] })
                      }
                    >
                      <option value="DRAFT">{c('مسودة', 'Draft')}</option>
                      <option value="APPROVED">
                        {c('متاح بعد المراجعة', 'Reviewed and available')}
                      </option>
                      <option value="RETIRED">{c('متقاعد', 'Retired')}</option>
                    </select>
                  </label>
                  <button disabled={busy} className="operations-button primary">
                    {c('حفظ الرد', 'Save reply')}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
