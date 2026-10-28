import { useEffect, useState } from 'react';
import { ApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { StudentAuthPage } from './StudentAuthPage';

export function StaffInvitationPage() {
  const { language } = useTranslation(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [invitation] = useState(() => {
    const q = new URLSearchParams(window.location.hash.slice(1));
    return { id: q.get('id') ?? '', token: q.get('token') ?? '' };
  });
  const [user, setUser] = useState<{ displayName: string; primaryEmail?: string } | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState('');
  const session = async () => {
    setLoading(true);
    try {
      setUser(await ApiClient.getCurrentSessionIdentity());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    );
    void session();
  }, []);
  const valid =
    /^[a-f0-9-]{36}$/i.test(invitation.id) && /^[a-zA-Z0-9_-]{43}$/.test(invitation.token);
  return (
    <main
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="mx-auto my-8 grid max-w-xl gap-4 rounded-xl border bg-white p-5 text-sm font-['Cairo',sans-serif]"
    >
      <h1 className="text-xl font-bold text-[#142B5F]">
        {c('قبول دعوة الانضمام', 'Accept staff invitation')}
      </h1>
      <p>
        {c(
          'الدعوة تربط علاقة العمل بحسابك بعد موافقتك. لا تفعّل حسابًا ولا تمنح أدوارًا؛ تفعيل العمل والصلاحيات يخضعان لاعتماد منفصل.',
          'This invitation links a staff relationship to your account with your consent. Staff activation and role grants require separate approval.',
        )}
      </p>
      {!valid ? (
        <p role="alert">
          {c(
            'الرابط غير صالح. اطلب دعوة جديدة من مسؤول المنصة.',
            'Invalid link. Ask your platform administrator for a new invitation.',
          )}
        </p>
      ) : accepted ? (
        <p role="status" className="text-[#0E7C86]">
          {c(
            'تم قبول الدعوة. ينتظر التفعيل مراجعة المسؤول ولا يعني هذا منح وصول إداري.',
            'Invitation accepted. Activation awaits administrator review; no administrative access was granted.',
          )}
        </p>
      ) : loading ? (
        <p role="status">{c('جارٍ التحقق من جلسة حسابك…', 'Checking your session…')}</p>
      ) : !user ? (
        <>
          <p>
            {c(
              'سجل الدخول بالحساب صاحب البريد الموثق المذكور في الدعوة. إذا كان حسابك يتطلب المصادقة الثنائية، أكملها بالطريقة المعتادة.',
              'Sign in with the verified email account that received the invitation, including your usual MFA when required.',
            )}
          </p>
          <StudentAuthPage onAuthenticated={() => void session()} />
        </>
      ) : (
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await ApiClient.acceptStaffInvitation({ ...invitation, confirm: true });
              setAccepted(true);
            } catch {
              setError(
                c(
                  'لم تُقبل الدعوة. تحقق من صاحب الحساب، توثيق البريد، صلاحية الرابط وجلسة المصادقة. لا يتغير حسابك عند الرفض.',
                  'Acceptance failed. Check account ownership, verified email, invitation expiry and authentication session.',
                ),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            {user.displayName} · {user.primaryEmail}
          </p>
          <label>
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              required
            />{' '}
            {c(
              'أوافق صراحة على ربط عضوية العمل بهذا الحساب.',
              'I explicitly accept linking this staff membership to my account.',
            )}
          </label>
          <button
            disabled={busy || !confirm}
            className="rounded-lg bg-[#0E7C86] p-2 text-white font-['Cairo',sans-serif]"
          >
            {c('قبول الدعوة من حسابي', 'Accept from my account')}
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </main>
  );
}
