import React, { FormEvent, useEffect, useState } from 'react';
import { ExternalLink, KeyRound, LockKeyhole, LogIn, Mail, MailCheck, RefreshCw, ShieldCheck, UserPlus, User } from 'lucide-react';
import { resolveAuthenticatedDestination, type AuthDestination, type TrustedSessionIdentity } from './authRouting';
import { ApiClient } from '../../api/client';

export function StudentAuthPage({ onAuthenticated }: { onAuthenticated: (destination: AuthDestination, identity: TrustedSessionIdentity) => void }) {
  const getInitialMode = (): 'login' | 'signup' | 'verify' => {
    if (typeof window === 'undefined') return 'login';
    if (window.location.pathname.includes('verify-email') || new URLSearchParams(window.location.search).has('token')) {
      return 'verify';
    }
    return /signup|register/.test(window.location.pathname) ? 'signup' : 'login';
  };

  const [mode, setMode] = useState<'login' | 'signup' | 'verify'>(getInitialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // Auto-verify when token query parameter is present in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam && tokenParam.trim()) {
      const cleanToken = tokenParam.trim();
      setVerificationToken(cleanToken);
      setMode('verify');
      verifyToken(cleanToken);
    }
  }, []);

  async function verifyToken(tokenToVerify: string) {
    if (!tokenToVerify.trim()) {
      setError('يرجى إدخال رمز التحقق.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await ApiClient.verifyEmail(tokenToVerify);
      setSuccess('تم تأكيد بريدك الإلكتروني بنجاح! يمكنك الآن تسجيل الدخول إلى حسابك.');
      setVerificationToken('');
    } catch (err: any) {
      setError(err?.message || 'تعذر تأكيد البريد الإلكتروني. الرمز غير صالح أو قد يكون منتهي الصلاحية.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(event: React.MouseEvent) {
    event.preventDefault();
    const targetEmail = resendEmail.trim() || email.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setResendError('أدخل بريداً إلكترونياً صحيحاً لإعادة إرسال رمز التحقق.');
      return;
    }
    setResendLoading(true);
    setResendError(null);
    setResendMessage(null);
    try {
      await ApiClient.resendVerification(targetEmail);
      setResendMessage('إذا كان هذا الحساب مسجلاً ويحتاج لتأكيد، فقد تم إرسال رسالة تحقق جديدة إلى صندوق البريد الداخلي في Mailpit (علماً بأن Mailpit هو صندوق البريد لبيئة التطوير، وإذا كان الحساب مفعلاً بالفعل فلن يتم إرسال رسالة جديدة ويمكنك تسجيل الدخول مباشرة).');
    } catch (err: any) {
      setResendError(err?.message || 'تعذر إعادة إرسال رسالة التحقق.');
    } finally {
      setResendLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'verify') {
      await verifyToken(verificationToken);
      return;
    }

    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setError('أدخل الاسم الكامل.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('كلمة المرور يجب أن لا تقل عن 8 أحرف.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await ApiClient.register(displayName, email, password);
        setResendEmail(email);
        setPassword('');
        setSuccess('تم إنشاء الحساب بنجاح! يرجى تأكيد بريدك الإلكتروني لإكمال التفعيل قبل تسجيل الدخول. تم إرسال رسالة التأكيد إلى صندوق البريد في Mailpit.');
        return;
      }

      await ApiClient.login(email, password, rememberMe);
      const identity = await ApiClient.getCurrentSessionIdentity();
      const destination = resolveAuthenticatedDestination(identity, import.meta.env.VITE_ADMIN_URL);
      if (destination.kind === 'denied') {
        setError('تم التحقق من الحساب، لكن لا توجد مساحة مفعّلة لهذا الدور.');
        return;
      }
      onAuthenticated(destination, identity);
    } catch (err: any) {
      if (mode === 'signup') {
        if (err?.status === 409 || err?.code === 'EMAIL_ALREADY_EXISTS' || err?.message?.includes('already exists') || err?.message?.includes('409') || err?.message?.includes('مسجل')) {
          setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى الانتقال إلى تسجيل الدخول، أو تأكيد بريدك إذا لم تكن قد أكدته بعد.');
        } else {
          setError(err?.message || 'تعذر إنشاء الحساب. تحقق من صحة البيانات.');
        }
      } else {
        if (err?.status === 429 || err?.code === 'AUTH_RATE_LIMITED' || err?.message?.includes('429') || err?.message?.includes('Rate') || err?.message?.includes('محاولات')) {
          setError('تم تجاوز عدد محاولات الدخول المسموح بها مؤقتاً لحماية الحساب. يرجى الانتظار بضع دقائق قبل إعادة المحاولة.');
        } else if (err?.status === 500 || err?.code === 'INTERNAL_SERVER_ERROR') {
          setError('حدث خطأ في الخادم أثناء معالجة الطلب. يرجى المحاولة بعد لحظات.');
        } else {
          setError(err?.message || 'تعذر تسجيل الدخول بهذه البيانات أو لم يتم تأكيد البريد بعد. تحقق من صحة البريد وكلمة المرور.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="mn-page-shell flex min-h-[72vh] w-full items-center py-8">
      <div className="mn-public-container flex justify-center">
        <form onSubmit={submit} className="mn-card w-full max-w-md p-5 sm:p-7" noValidate>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] text-[var(--mn-accent-text)]">
              {mode === 'verify' ? <MailCheck className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-[11px] font-semibold text-[var(--mn-accent-text)]">بوابة حساب موحّدة وآمنة</p>
              <h1 className="text-[20px] font-bold leading-7 text-[var(--mn-heading)]">
                {mode === 'signup' ? 'إنشاء حساب جديد في منارتك' : mode === 'verify' ? 'تأكيد البريد الإلكتروني' : 'تسجيل الدخول إلى منارتك'}
              </h1>
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--mn-text-muted)] sm:text-sm">
            {mode === 'signup'
              ? 'أنشئ حسابك للوصول إلى أدوات الطالب والخدمات الأكاديمية.'
              : mode === 'verify'
              ? 'أدخل رمز التحقق المرسل إلى بريدك أو استخدم الرابط المباشر لتفعيل الحساب.'
              : 'يحدد الخادم مساحة الحساب وصلاحياته بعد المصادقة المعتمدة.'}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-4 flex rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-elevated)] p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${mode === 'login' ? 'bg-[var(--mn-surface)] text-[var(--mn-heading)] shadow-sm' : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'}`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${mode === 'signup' ? 'bg-[var(--mn-surface)] text-[var(--mn-heading)] shadow-sm' : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'}`}
            >
              إنشاء حساب
            </button>
            <button
              type="button"
              onClick={() => { setMode('verify'); setError(null); setSuccess(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${mode === 'verify' ? 'bg-[var(--mn-surface)] text-[var(--mn-heading)] shadow-sm' : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'}`}
            >
              تأكيد البريد
            </button>
          </div>

          {/* SIGNUP FIELDS */}
          {mode === 'signup' && (
            <>
              <label htmlFor="account-display-name" className="mt-4 block text-sm font-semibold text-[var(--mn-heading)]">الاسم الكامل</label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-text-muted)]" />
                <input
                  id="account-display-name"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  disabled={loading}
                  placeholder="مثال: وجدان جميل"
                  className="mn-search-control w-full pr-10 pl-3 text-sm outline-none"
                />
              </div>
            </>
          )}

          {/* LOGIN / SIGNUP EMAIL & PASSWORD */}
          {mode !== 'verify' && (
            <>
              <label htmlFor="account-email" className="mt-4 block text-sm font-semibold text-[var(--mn-heading)]">البريد الإلكتروني</label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-text-muted)]" />
                <input
                  id="account-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setResendEmail(event.target.value); }}
                  disabled={loading}
                  placeholder="name@example.com"
                  className="mn-search-control w-full pr-10 pl-3 text-sm outline-none"
                />
              </div>

              <label htmlFor="account-password" className="mt-4 block text-sm font-semibold text-[var(--mn-heading)]">كلمة المرور</label>
              <div className="relative mt-1.5">
                <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-text-muted)]" />
                <input
                  id="account-password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  placeholder={mode === 'signup' ? '8 أحرف على الأقل' : '••••••••'}
                  className="mn-search-control w-full pr-10 pl-3 text-sm outline-none"
                />
              </div>

              {mode === 'login' && (
                <div className="mt-4 flex items-center gap-2 select-none">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    disabled={loading}
                    className="h-4 w-4 rounded border-[var(--mn-border)] text-[var(--mn-accent-text)] focus:ring-[var(--mn-accent-text)] cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="text-xs font-semibold text-[var(--mn-text-muted)] cursor-pointer">
                    البقاء مسجّلًا على هذا الجهاز لمدة 30 يومًا
                  </label>
                </div>
              )}
            </>
          )}

          {/* VERIFY MODE FIELDS */}
          {mode === 'verify' && (
            <>
              <label htmlFor="verification-token" className="mt-4 block text-sm font-semibold text-[var(--mn-heading)]">رمز التحقق (Verification Token)</label>
              <div className="relative mt-1.5">
                <KeyRound className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-text-muted)]" />
                <input
                  id="verification-token"
                  type="text"
                  value={verificationToken}
                  onChange={(event) => setVerificationToken(event.target.value)}
                  disabled={loading}
                  placeholder="الصق رمز التحقق المكون من 64 رمزاً..."
                  className="mn-search-control w-full pr-10 pl-3 font-mono text-xs outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-4 text-[var(--mn-text-muted)]">
                يمكنك نسخ الرمز من رسالة البريد في Mailpit ولصقه هنا، أو النقر مباشرة على رابط التحقق في الرسالة.
              </p>
            </>
          )}

          {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] p-3 text-xs font-semibold leading-5 text-[var(--mn-danger-text)]">{error}</p>}
          {success && (
            <div role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-medium leading-5 text-emerald-700 dark:text-emerald-300">
              <p className="font-bold text-emerald-800 dark:text-emerald-200">{success}</p>
              {mode === 'signup' && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <a
                    href="/mailpit/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <span>فتح صندوق البريد (Mailpit)</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => { setMode('verify'); setError(null); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200"
                  >
                    <span>إدخال رمز التحقق</span>
                  </button>
                </div>
              )}
              {mode === 'verify' && (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>الانتقال لتسجيل الدخول</span>
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mn-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--mn-primary-hover)] disabled:opacity-60 mn-inverse"
          >
            {mode === 'signup' ? <UserPlus className="h-4 w-4" /> : mode === 'verify' ? <MailCheck className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {loading ? 'جارٍ المعالجة...' : mode === 'signup' ? 'إنشاء الحساب' : mode === 'verify' ? 'تأكيد الحساب' : 'تسجيل الدخول'}
          </button>

          {/* Quick link to Mailpit Inbox */}
          <div className="mt-3 text-center">
            <a
              href="/mailpit/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--mn-accent-text)] hover:underline"
            >
              <span>فتح صندوق البريد الداخلي (Mailpit)</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* RESEND VERIFICATION SECTION (Available in verify mode or login mode) */}
          <div className="mt-5 border-t border-[var(--mn-border)] pt-4">
            <p className="text-xs font-bold text-[var(--mn-heading)]">لم يصلك رابط أو رمز التحقق؟</p>
            <div className="mt-2 flex gap-2">
              <input
                id="resend-email-input"
                type="email"
                value={resendEmail}
                onChange={(event) => setResendEmail(event.target.value)}
                placeholder="أدخل بريدك المسجل لإعادة الإرسال"
                className="mn-search-control flex-1 text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="flex items-center gap-1 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface-elevated)] px-3 py-2 text-xs font-bold text-[var(--mn-heading)] transition hover:bg-[var(--mn-surface)] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                <span>إعادة الإرسال</span>
              </button>
            </div>
            {resendError && <p className="mt-2 text-[11px] font-semibold text-[var(--mn-danger-text)]">{resendError}</p>}
            {resendMessage && <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{resendMessage}</p>}
          </div>

          <div className="mt-4 text-center">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                className="text-xs font-semibold text-[var(--mn-primary)] hover:underline"
              >
                ليس لديك حساب؟ إنشاء حساب جديد
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                className="text-xs font-semibold text-[var(--mn-primary)] hover:underline"
              >
                لديك حساب بالفعل؟ تسجيل الدخول
              </button>
            )}
          </div>
          <p className="mt-3 text-center text-[10px] leading-4 text-[var(--mn-text-muted)]">
            طلاب ومديرو المنصة يستخدمون نفس المصادقة؛ يتم اعتماد الحساب بعد التحقق من ملكية البريد الإلكتروني.
          </p>
        </form>
      </div>
    </main>
  );
}
