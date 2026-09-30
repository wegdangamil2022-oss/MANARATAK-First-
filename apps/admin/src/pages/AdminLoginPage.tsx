import { type FormEvent, useState } from 'react';
import { adminApiClient } from '../api/client';
import { canAccessAdminPath, firstAllowedAdminPath } from '@manaratak/shared';

type Session = { kind: 'authorized'; permissions: string[] } | { kind: 'student' | 'noAdmin' | 'unauthorized' | 'error' };
type DisplaySession = Session | { kind: 'loading' };

export function loginDestination(permissions: string[]): string {
  const requested = new URLSearchParams(window.location.search).get('returnTo');
  if (requested && canAccessAdminPath(requested, permissions)) return requested;
  return `/admin${firstAllowedAdminPath(permissions) || '/dashboard'}`;
}

export function AdminLoginPage({ session, verifySession }: { session: DisplaySession; verifySession: () => Promise<Session> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [studentSession, setStudentSession] = useState(session.kind === 'student');
  const publicBase = (import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setStudentSession(false);
    try {
      const response = await adminApiClient.request<{ data?: { authenticated?: boolean } }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });
      if (!response.data?.authenticated) throw new Error('تعذر تأكيد جلسة الدخول.');
      setPassword('');
      const result = await verifySession();
      if (result.kind === 'authorized') {
        window.location.replace(loginDestination(result.permissions));
      } else if (result.kind === 'student') {
        setStudentSession(true);
        setMessage('هذا حساب طالب. يمكنك الانتقال إلى مساحة الطالب، ولا يملك هذا الحساب صلاحية إدارية.');
      } else if (result.kind === 'noAdmin') {
        setMessage('تم تسجيل الدخول، لكن لا توجد صلاحية إدارية مفعّلة لهذا الحساب.');
      } else {
        setMessage('تم الدخول، لكن تعذّر التحقق من صلاحيات الإدارة. حاول مجددًا.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-[#142B5F]">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-black">دخول الإدارة</h1>
        <p className="mt-2 text-sm text-slate-600">للمالك والموظفين المخوّلين. استخدم حسابك الموجود.</p>
        {(message || studentSession || session.kind === 'student' || session.kind === 'noAdmin') && (
          <div role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {message || (studentSession || session.kind === 'student' ? 'الجلسة الحالية تخص طالبًا ولا تملك صلاحية إدارية.' : 'لا توجد صلاحية إدارية مفعّلة لهذه الجلسة.')}
            {(studentSession || session.kind === 'student') && <a className="mt-2 block font-bold underline" href={`${publicBase}/student`}>الذهاب إلى مساحة الطالب</a>}
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-bold" htmlFor="admin-email">البريد الإلكتروني</label>
          <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 p-3" />
          <label className="block text-sm font-bold" htmlFor="admin-password">كلمة المرور</label>
          <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 p-3" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} /> تذكرني</label>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#0E7C86] p-3 font-bold text-white disabled:opacity-60">{busy ? 'جارٍ التحقق...' : 'دخول الإدارة'}</button>
        </form>
        <div className="mt-5 flex justify-between text-sm">
          <a href={`${publicBase}/login`} className="underline">حساب الطالب واستعادة الدخول</a>
          <a href={publicBase || '/'} className="underline">العودة للموقع الرئيسي</a>
        </div>
      </div>
    </main>
  );
}
