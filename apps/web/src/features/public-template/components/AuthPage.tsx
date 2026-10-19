import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { Mail, Lock, User, LogIn, Chrome } from 'lucide-react';

interface AuthPageProps {
  onBackToWorkspace?: () => void;
  onRestrictedAction?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBackToWorkspace, onRestrictedAction }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const [isLogin, setIsLogin] = useState(true);
  const [notice, setNotice] = useState('');
  const explainPreview = () => {
    if (onRestrictedAction) {
      onRestrictedAction();
      return;
    }
    setNotice('هذه معاينة فقط؛ لم تُرسل بياناتك. تسجيل الدخول واستعادة كلمة المرور سيعملان بعد ربط المصادقة.');
  };

  return (
    <div className="w-full max-w-sm mx-auto py-8 ab-inline-gutter">
      <div className="bg-[var(--ab-surface)] dark:bg-[var(--ab-surface)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--ab-border)] dark:border-[var(--ab-border)] transition-all duration-300 ab-panel dark:ab-panel ">
        {/* Header Section */}
        <div className="bg-[var(--ab-primary)] dark:bg-[var(--ab-surface)] p-6 text-center relative overflow-hidden ab-inverse dark:ab-panel ">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--ab-primary)] to-[var(--ab-primary)] dark:from-[var(--ab-surface-elevated)] dark:to-[var(--ab-surface-elevated)] opacity-90 ab-inverse dark:ab-panel "></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[var(--ab-accent-soft)]/20 via-transparent to-transparent"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-[var(--ab-surface)] dark:bg-[var(--ab-surface-elevated)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-[var(--ab-accent)] ab-panel dark:ab-panel ">
              <LogIn className="w-7 h-7 text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)]" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {isLogin ? publicT('public_welcome_back') : publicT('public_create_a_new_account')}
            </h2>
            <p className="text-[var(--ab-accent-text)] text-xs font-bold">
              {isLogin
                ? publicT('public_sign_in_to_continue_your_learning_journey')
                : publicT('public_join_absheer_and_start_your_learning_journey')}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-6">
          <div className="mb-4 rounded-xl border border-[var(--ab-accent)]/25 bg-[var(--ab-accent)]/5 p-2.5 text-center text-[10px] leading-5 text-[var(--ab-text-muted)] font-bold">{publicT('public_registration_preview_only_real_authentication_and_account_linking')}</div>
          <div className="mb-6">
            <button
              type="button"
              onClick={explainPreview}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[var(--ab-surface)] dark:bg-[var(--ab-surface-elevated)] border-2 border-[var(--ab-border)] dark:border-[var(--ab-border)] hover:bg-[var(--ab-page)] dark:hover:bg-[var(--ab-surface-muted)] text-[var(--ab-text)] dark:text-[var(--ab-text)] font-bold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer ab-panel dark:ab-panel hover:ab-panel dark:hover:ab-panel "
            >
              <Chrome className="w-5 h-5 text-[var(--ab-danger-text)]" />
              <span>{publicT('public_continue_with_google')}</span>
            </button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--ab-border)] dark:border-[var(--ab-border)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[var(--ab-surface)] dark:bg-[var(--ab-surface)] text-[var(--ab-text-muted)] text-xs font-bold ab-panel dark:ab-panel ">{publicT('public_or_use_email')}</span>
              </div>
            </div>
          </div>

          {notice && <p role="status" className="mb-4 text-sm leading-6 text-[var(--ab-text-muted)]">{notice}</p>}
          <form className="space-y-4" onSubmit={(e) => {e.preventDefault(); explainPreview();}}>
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-[var(--ab-text)] dark:text-[var(--ab-text)] mb-1.5">{publicT('public_full_name')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[var(--ab-text-muted)]" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-3 pr-9 py-2.5 text-sm border border-[var(--ab-border)] dark:border-[var(--ab-border)] rounded-xl bg-[var(--ab-page)] dark:bg-[var(--ab-surface-elevated)] text-[var(--ab-heading)] dark:text-white placeholder-[var(--ab-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ab-primary)] dark:focus:ring-[var(--ab-focus)] focus:border-transparent transition-all ab-panel dark:ab-panel "
                    placeholder={publicT('public_enter_your_full_name')}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--ab-text)] dark:text-[var(--ab-text)] mb-1.5">{publicT('public_email')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[var(--ab-text-muted)]" />
                </div>
                <input
                  type="email"
                  className="block w-full pl-3 pr-9 py-2.5 text-sm border border-[var(--ab-border)] dark:border-[var(--ab-border)] rounded-xl bg-[var(--ab-page)] dark:bg-[var(--ab-surface-elevated)] text-[var(--ab-heading)] dark:text-white placeholder-[var(--ab-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ab-primary)] dark:focus:ring-[var(--ab-focus)] focus:border-transparent transition-all ab-panel dark:ab-panel "
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--ab-text)] dark:text-[var(--ab-text)] mb-1.5">{publicT('public_password')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[var(--ab-text-muted)]" />
                </div>
                <input
                  type="password"
                  className="block w-full pl-3 pr-9 py-2.5 text-sm border border-[var(--ab-border)] dark:border-[var(--ab-border)] rounded-xl bg-[var(--ab-page)] dark:bg-[var(--ab-surface-elevated)] text-[var(--ab-heading)] dark:text-white placeholder-[var(--ab-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ab-primary)] dark:focus:ring-[var(--ab-focus)] focus:border-transparent transition-all ab-panel dark:ab-panel "
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-end">
                <button
                  type="button" onClick={explainPreview}
                  className="text-xs font-bold text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)] hover:underline"
                >{publicT('public_forgot_password')}</button>
              </div>
            )}

            <button
              type="button"
              onClick={explainPreview}
              className="w-full py-3 px-4 bg-[var(--ab-primary)] dark:bg-[var(--ab-accent)] hover:bg-[var(--ab-primary-hover)] dark:hover:bg-[var(--ab-accent-soft)] text-white dark:text-[var(--ab-on-accent)] text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] ab-inverse dark:ab-gold hover:ab-inverse dark:hover:ab-gold "
            >
              {isLogin ? publicT('public_sign_in') : publicT('public_create_a_new_account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-[var(--ab-text-muted)] dark:text-[var(--ab-text-muted)] font-bold">
              {isLogin ? publicT('public_do_not_have_an_account') : publicT('public_already_have_an_account')}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-bold text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)] hover:underline cursor-pointer"
              >
                {isLogin ? publicT('public_create_account') : publicT('public_sign_in')}
              </button>
            </p>
            {onBackToWorkspace && (
              <button
                type="button"
                onClick={onBackToWorkspace}
                className="mt-3 text-[10px] font-bold text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)] hover:underline"
              >{publicT('public_back_to_the_student_workspace_preview')}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
