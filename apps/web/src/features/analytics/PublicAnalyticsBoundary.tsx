import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ANALYTICS_POLICY_VERSION } from '@manaratak/shared';
import { useTranslation } from '../../i18n/I18nProvider';
import {
  analyticsRequest,
  privacySignal,
  publicPageKey,
  readAnalyticsChoice,
  recordPublicEvent,
  saveAnalyticsChoice,
} from './publicAnalytics';
export function PublicAnalyticsBoundary({ routeKey }: { routeKey: string }) {
  const { language } = useTranslation(),
    tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [enabled, setEnabled] = useState(false),
    [choice, setChoice] = useState(readAnalyticsChoice),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const pageKey = publicPageKey(routeKey);
  useEffect(() => {
    let active = true;
    void analyticsRequest('configuration')
      .then((config) => {
        if (active)
          setEnabled(config.enabled === true && config.policyVersion === ANALYTICS_POLICY_VERSION);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!enabled || !pageKey || choice?.decision !== 'accepted' || privacySignal()) return;
    const timer = setTimeout(() => {
      void recordPublicEvent('page_view', pageKey, undefined, routeKey);
    }, 450);
    return () => clearTimeout(timer);
  }, [enabled, pageKey, routeKey, choice]);
  const withdraw = async () => {
    const saved = readAnalyticsChoice(),
      pending = {
        decision: 'withdraw_pending' as const,
        token: saved?.token,
        policyVersion: ANALYTICS_POLICY_VERSION,
      };
    saveAnalyticsChoice(pending);
    setChoice(pending);
    setBusy(true);
    setError(false);
    try {
      if (saved?.token) await analyticsRequest('withdraw', { token: saved.token });
      const next = { decision: 'declined' as const, policyVersion: ANALYTICS_POLICY_VERSION };
      saveAnalyticsChoice(next);
      setChoice(next);
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  if (!pageKey || (!enabled && choice?.decision !== 'withdraw_pending') || privacySignal())
    return null;
  const expired =
    choice?.decision === 'accepted' &&
    (!choice.expiresAt ||
      Date.parse(choice.expiresAt) <= Date.now() ||
      choice.policyVersion !== ANALYTICS_POLICY_VERSION);
  if (choice && !editing && !expired && choice.decision !== 'withdraw_pending')
    return (
      <button
        type="button"
        className="fixed bottom-24 start-3 z-40 rounded-xl border border-[#DDEFF2] bg-white px-3 py-2 text-xs font-['Cairo'] text-[#142B5F]"
        onClick={() => setEditing(true)}
      >
        {tr('خصوصية القياس', 'Analytics privacy')}
      </button>
    );
  return (
    <aside
      aria-label={tr('اختيار خصوصية القياس', 'Analytics privacy choice')}
      className="fixed bottom-24 inset-x-3 z-50 mx-auto max-w-xl rounded-2xl border border-[#DDEFF2] bg-white p-4 text-[13px] font-['Cairo'] text-[#142B5F] shadow-lg"
    >
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <ShieldCheck className="h-5 w-5 text-[#0E7C86]" />
        {tr('قياس اختياري يحترم خصوصيتك', 'Optional privacy-conscious measurement')}
      </h2>
      <p className="my-2">
        {tr(
          'بموافقتك نقيس فئات الصفحات ونقرات التقديم الخارجي بمعرّف متصفح عشوائي لمدة 30 يومًا. تُحفظ الأحداث حتى 90 يومًا دون بريد أو IP أو كلمات بحث. الرفض لا يؤثر على الخدمة؛ يمكنك السحب وحذف أحداث هذا المعرّف من هذا الزر.',
          'With your consent we measure page categories and outbound application clicks using a random browser identifier for 30 days. Events are retained up to 90 days without email, IP or search terms. Declining does not affect service. You can withdraw and delete this identifier’s events here.',
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-[#0E7C86] px-4 py-2 font-bold text-white disabled:opacity-60"
          onClick={() => {
            setBusy(true);
            setError(false);
            void analyticsRequest('consent', {
              consent: true,
              policyVersion: ANALYTICS_POLICY_VERSION,
            })
              .then((grant) => {
                const next = { ...grant, decision: 'accepted' as const };
                saveAnalyticsChoice(next);
                setChoice(next);
                setEditing(false);
              })
              .catch(() => setError(true))
              .finally(() => setBusy(false));
          }}
        >
          {tr('أوافق على القياس', 'Allow analytics')}
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg border border-[#DDEFF2] px-4 py-2 font-bold"
          onClick={() => void withdraw()}
        >
          {choice?.token
            ? tr('سحب الموافقة وحذف أحداثي', 'Withdraw and delete my events')
            : tr('لا أوافق', 'Decline')}
        </button>
      </div>
      {choice?.decision === 'withdraw_pending' && (
        <p role="status">
          {tr(
            'أوقفنا القياس محليًا؛ أعد محاولة الحذف حتى يؤكد الخادم إتمامه.',
            'Collection is stopped locally; retry deletion until the server confirms it.',
          )}
        </p>
      )}
      {error && (
        <p role="alert">
          {tr(
            'تعذّر الاتصال بخدمة الخصوصية. لم نبدأ قياسًا جديدًا.',
            'Privacy service unavailable. No new measurement started.',
          )}
        </p>
      )}
    </aside>
  );
}
