import React, { useState } from 'react';
import { Mail, Lock, User, LogIn, Chrome } from 'lucide-react';

interface AuthPageProps {
  onBackToWorkspace?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBackToWorkspace }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [notice, setNotice] = useState('');
  const explainPreview = () => setNotice('هذه معاينة فقط؛ لم تُرسل بياناتك. تسجيل الدخول واستعادة كلمة المرور سيعملان بعد ربط المصادقة.');

  return (
    <div className="w-full max-w-sm mx-auto py-8 mn-inline-gutter">
      <div className="bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--mn-border)] dark:border-[var(--mn-border)] transition-all duration-300 mn-panel dark:mn-panel ">
        {/* Header Section */}
        <div className="bg-[var(--mn-primary)] dark:bg-[var(--mn-surface)] p-6 text-center relative overflow-hidden mn-inverse dark:mn-panel ">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--mn-primary)] to-[var(--mn-primary)] dark:from-[var(--mn-surface-elevated)] dark:to-[var(--mn-surface-elevated)] opacity-90 mn-inverse dark:mn-panel "></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[var(--mn-accent-soft)]/20 via-transparent to-transparent"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-[var(--mn-surface)] dark:bg-[var(--mn-surface-elevated)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-[var(--mn-accent)] mn-panel dark:mn-panel ">
              <LogIn className="w-7 h-7 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {isLogin ? 'مرحباً بعودتك!' : 'إنشاء حساب جديد'}
            </h2>
            <p className="text-[var(--mn-accent-text)] text-xs font-bold">
              {isLogin
                ? 'سجل دخولك لمتابعة رحلتك التعليمية'
                : 'انضم إلى منارتك وابدأ رحلتك التعليمية'}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-6">
          <div className="mb-4 rounded-xl border border-[var(--mn-accent)]/25 bg-[var(--mn-accent)]/5 p-2.5 text-center text-[10px] leading-5 text-[var(--mn-text-muted)] font-bold">
            واجهة تسجيل تجريبية فقط — المصادقة الحقيقية وربط الحساب سيتم عبر Identity Platform لاحقًا.
          </div>
          <div className="mb-6">
            <button
              type="button"
              onClick={explainPreview}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[var(--mn-surface)] dark:bg-[var(--mn-surface-elevated)] border-2 border-[var(--mn-border)] dark:border-[var(--mn-border)] hover:bg-[var(--mn-page)] dark:hover:bg-[var(--mn-surface-muted)] text-[var(--mn-text)] dark:text-[var(--mn-text)] font-bold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer mn-panel dark:mn-panel hover:mn-panel dark:hover:mn-panel "
            >
              <Chrome className="w-5 h-5 text-[var(--mn-danger-text)]" />
              <span>المتابعة باستخدام Google</span>
            </button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--mn-border)] dark:border-[var(--mn-border)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] text-[var(--mn-text-muted)] text-xs font-bold mn-panel dark:mn-panel ">
                  أو عبر البريد الإلكتروني
                </span>
              </div>
            </div>
          </div>

          {notice && <p role="status" className="mb-4 text-sm leading-6 text-[var(--mn-text-muted)]">{notice}</p>}
          <form className="space-y-4" onSubmit={(e) => {e.preventDefault(); explainPreview();}}>
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-[var(--mn-text)] dark:text-[var(--mn-text)] mb-1.5">
                  الاسم الكامل
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[var(--mn-text-muted)]" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-3 pr-9 py-2.5 text-sm border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] text-[var(--mn-heading)] dark:text-white placeholder-[var(--mn-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--mn-primary)] dark:focus:ring-[var(--mn-focus)] focus:border-transparent transition-all mn-panel dark:mn-panel "
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--mn-text)] dark:text-[var(--mn-text)] mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[var(--mn-text-muted)]" />
                </div>
                <input
                  type="email"
                  className="block w-full pl-3 pr-9 py-2.5 text-sm border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] text-[var(--mn-heading)] dark:text-white placeholder-[var(--mn-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--mn-primary)] dark:focus:ring-[var(--mn-focus)] focus:border-transparent transition-all mn-panel dark:mn-panel "
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--mn-text)] dark:text-[var(--mn-text)] mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[var(--mn-text-muted)]" />
                </div>
                <input
                  type="password"
                  className="block w-full pl-3 pr-9 py-2.5 text-sm border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] text-[var(--mn-heading)] dark:text-white placeholder-[var(--mn-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--mn-primary)] dark:focus:ring-[var(--mn-focus)] focus:border-transparent transition-all mn-panel dark:mn-panel "
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-end">
                <button
                  type="button" onClick={explainPreview}
                  className="text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={explainPreview}
              className="w-full py-3 px-4 bg-[var(--mn-primary)] dark:bg-[var(--mn-accent)] hover:bg-[var(--mn-primary-hover)] dark:hover:bg-[var(--mn-accent-soft)] text-white dark:text-[var(--mn-on-accent)] text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] mn-inverse dark:mn-gold hover:mn-inverse dark:hover:mn-gold "
            >
              {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)] font-bold">
              {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] hover:underline cursor-pointer"
              >
                {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
              </button>
            </p>
            {onBackToWorkspace && (
              <button
                type="button"
                onClick={onBackToWorkspace}
                className="mt-3 text-[10px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] hover:underline"
              >
                العودة إلى معاينة مساحة الطالب
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
