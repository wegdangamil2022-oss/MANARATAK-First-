import React, { FormEvent, useState } from 'react';
import { LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react';
import type { AuthDestination } from './authRouting';
import { authenticateAccount } from './authenticateAccount';

export function StudentAuthPage({ onAuthenticated }: { onAuthenticated: (destination: AuthDestination) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const destination = await authenticateAccount(email, password, import.meta.env.VITE_ADMIN_URL);
      if (destination.kind === 'denied') {
        setError('تم التحقق من الحساب، لكن لا توجد مساحة مفعّلة لهذا الدور.');
        return;
      }
      onAuthenticated(destination);
    } catch {
      // Intentionally generic: do not reveal whether an email belongs to a student or administrator.
      setError('تعذر تسجيل الدخول بهذه البيانات أو انتهت الجلسة. حاول مرة أخرى.');
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
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-[var(--mn-accent-text)]">بوابة حساب موحّدة وآمنة</p>
              <h1 className="text-[22px] font-bold leading-8 text-[var(--mn-heading)]">تسجيل الدخول إلى منارتك</h1>
            </div>
          </div>
          <p className="mt-3 text-xs leading-6 text-[var(--mn-text-muted)] sm:text-sm">
            يحدد الخادم مساحة الحساب وصلاحياته بعد المصادقة؛ لا تعتمد الواجهة على البريد أو التخزين المحلي لتحديد الدور.
          </p>

          <label htmlFor="account-email" className="mt-6 block text-sm font-semibold text-[var(--mn-heading)]">البريد الإلكتروني</label>
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-text-muted)]" />
            <input
              id="account-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="mn-search-control w-full pr-10 pl-3 text-sm outline-none"
            />
          </div>

          <label htmlFor="account-password" className="mt-4 block text-sm font-semibold text-[var(--mn-heading)]">كلمة المرور</label>
          <div className="relative mt-2">
            <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-text-muted)]" />
            <input
              id="account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="mn-search-control w-full pr-10 pl-3 text-sm outline-none"
            />
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] p-3 text-xs font-semibold leading-5 text-[var(--mn-danger-text)]">{error}</p>}

          <button type="submit" disabled={loading} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mn-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--mn-primary-hover)] disabled:opacity-60 mn-inverse">
            <LogIn className="h-4 w-4" />
            {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
          </button>
          <p className="mt-3 text-center text-[10px] leading-5 text-[var(--mn-text-muted)]">طلاب ومديرو المنصة يستخدمون نفس المصادقة؛ التوجيه النهائي يعتمد على جلسة موثوقة من الخادم.</p>
        </form>
      </div>
    </main>
  );
}
