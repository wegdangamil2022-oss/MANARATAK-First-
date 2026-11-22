import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useEffect, useState } from 'react';
import { Mail, Lock, User, LogIn, UserPlus, ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { loginPreviewStudent } from '../../students/studentWorkspacePreviewApi';

interface AuthPageProps {
  onBackToWorkspace?: () => void;
  onRestrictedAction?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBackToWorkspace }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const detectIsLoginFromUrl = () => {
    if (typeof window === 'undefined') return true;
    return !/signup|register/i.test(window.location.pathname);
  };

  const [isLogin, setIsLogin] = useState<boolean>(detectIsLoginFromUrl);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    const syncFromUrl = () => {
      setIsLogin(detectIsLoginFromUrl());
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const switchMode = (nextIsLogin: boolean) => {
    setIsLogin(nextIsLogin);
    setErrorMessage('');
    setInfoMessage('');
    if (typeof window !== 'undefined') {
      const targetPath = nextIsLogin ? '/login' : '/signup';
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({}, '', targetPath);
      }
    }
  };

  const completeStudentAccess = (customName?: string, customEmail?: string) => {
    const resolvedName = (customName ?? fullName).trim() || 'WEGDAN GAMIL';
    const resolvedEmail = (customEmail ?? email).trim() || 'student@manaratak.edu';
    loginPreviewStudent({
      displayName: resolvedName,
      email: resolvedEmail,
    });
    if (onBackToWorkspace) {
      onBackToWorkspace();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/student');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleGoogleAuth = () => {
    setErrorMessage('');
    completeStudentAccess(fullName.trim() || 'WEGDAN GAMIL', email.trim() || 'student@manaratak.edu');
  };

  const handleSendVerificationCode = () => {
    setErrorMessage('');
    if (!email.trim()) {
      setErrorMessage('أدخل البريد الإلكتروني أولاً لإرسال رمز التحقق.');
      return;
    }
    setCodeSent(true);
    setInfoMessage('تم إرسال رمز التحقق إلى بريدك الإلكتروني.');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!isLogin) {
      if (!fullName.trim()) {
        setErrorMessage('يرجى إدخال الاسم الكامل.');
        return;
      }
      if (!email.trim()) {
        setErrorMessage('يرجى إدخال البريد الإلكتروني.');
        return;
      }
      if (!password.trim()) {
        setErrorMessage('يرجى إدخال كلمة المرور.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('كلمتا المرور غير متطابقتين.');
        return;
      }
      if (!verificationCode.trim()) {
        setErrorMessage('يرجى إدخال رمز التحقق.');
        return;
      }
    } else {
      if (!email.trim()) {
        setErrorMessage('يرجى إدخال البريد الإلكتروني.');
        return;
      }
      if (!password.trim()) {
        setErrorMessage('يرجى إدخال كلمة المرور.');
        return;
      }
    }

    completeStudentAccess(fullName, email);
  };

  return (
    <div dir="rtl" className="w-full max-w-[440px] mx-auto py-2.5 sm:py-6 px-2 sm:px-4 font-['Cairo',sans-serif]">
      <div className="bg-white dark:bg-[#111E38] rounded-2xl shadow-[0_6px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.35)] overflow-hidden border border-[#142B5F]/12 dark:border-white/10 transition-all duration-300">
        {/* Top Header matching Manaratak Official Navy-to-Petrol Gradient */}
        <div className="relative mn-search-hero bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] text-white px-4 pt-3.5 pb-3.5 overflow-hidden mn-inverse">
          {/* Background Decorative Gold Waves & Dot Patterns */}
          <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
            <svg
              className="w-full h-full"
              viewBox="0 0 400 200"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M-50,50 Q100,-20 250,60 T550,40"
                stroke="#F2CD78"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M-20,120 Q150,40 300,140 T600,100"
                stroke="#D6A43B"
                strokeWidth="1"
                fill="none"
              />
              <circle cx="30" cy="28" r="1.2" fill="#F2CD78" />
              <circle cx="44" cy="28" r="1.2" fill="#F2CD78" />
              <circle cx="58" cy="28" r="1.2" fill="#F2CD78" />
              <circle cx="30" cy="42" r="1.2" fill="#F2CD78" />
              <circle cx="44" cy="42" r="1.2" fill="#F2CD78" />
              <circle cx="58" cy="42" r="1.2" fill="#F2CD78" />
            </svg>
          </div>

          <div className="relative z-10 text-center space-y-1">
            <div className="flex justify-center">
              <Sparkles
                className="h-4 w-4 text-[#F2CD78] drop-shadow-[0_0_6px_rgba(214,164,59,0.7)]"
                aria-hidden="true"
              />
            </div>

            <h2 className="!text-[15px] sm:!text-[17px] font-bold text-white leading-tight font-['Cairo',sans-serif] outline-none">
              {isLogin ? (
                <>
                  تسجيل الدخول <span className="text-[#F2CD78]">إلى حسابك</span>
                </>
              ) : (
                <>
                  إنشاء <span className="text-[#F2CD78]">حساب جديد</span>
                </>
              )}
            </h2>

            <div className="flex justify-center pt-0.5">
              <div className="w-8 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#DDEFF2] font-medium leading-snug">
              {isLogin
                ? 'تابع فرصك وطلباتك ومسارك التعليمي في منارتك'
                : 'احفظ فرصك وأدر طلباتك وتابع مسارك التعليمي'}
            </p>
          </div>

          {/* Compact Mode Switcher Tabs */}
          <div className="relative z-10 mt-3 grid grid-cols-2 gap-1 rounded-xl bg-[#0B1529]/50 p-1 border border-white/15">
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`!min-h-[32px] h-[32px] rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                !isLogin
                  ? 'bg-white text-[#142B5F] shadow-xs'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              <UserPlus className="w-3 h-3" />
              <span>إنشاء حساب</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`!min-h-[32px] h-[32px] rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isLogin
                  ? 'bg-white text-[#142B5F] shadow-xs'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              <LogIn className="w-3 h-3" />
              <span>تسجيل الدخول</span>
            </button>
          </div>

          {/* Thin Official Gold Divider Ribbon */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-[#D6A43B]/50 via-[#F2CD78] to-[#D6A43B]/50"
          />
        </div>

        {/* Compact Form Body */}
        <div className="p-3.5 sm:p-5">
          {/* Google Sign-In / Sign-Up Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full !min-h-[38px] h-[38px] flex items-center justify-center gap-2 px-3 bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#142342] border border-[#142B5F]/14 dark:border-white/12 hover:border-[#0E7C86]/45 text-[#142B5F] dark:text-[#F1F5F9] text-[11.5px] font-bold rounded-xl shadow-2xs transition-all duration-150 active:scale-[0.99] cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.5-.2-2.3H12z"
              />
              <path
                fill="#34A853"
                d="M6.5 14.3l-.7.5-2.5 1.9C4.9 19.8 8.2 22 12 22c2.7 0 5-.9 6.6-2.5l-3.1-2.4c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3z"
              />
              <path
                fill="#4A90E2"
                d="M3.3 7.3C2.5 8.7 2 10.3 2 12s.5 3.3 1.3 4.7l3.2-2.4c-.2-.7-.3-1.5-.3-2.3s.1-1.6.3-2.3L3.3 7.3z"
              />
              <path
                fill="#FBBC05"
                d="M12 5.8c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17 2.8 14.7 2 12 2 8.2 2 4.9 4.2 3.3 7.3l3.2 2.4C7 7.6 9.3 5.8 12 5.8z"
              />
            </svg>
            <span>{isLogin ? 'المتابعة عن طريق جوجل' : 'سجّل عن طريق جوجل'}</span>
          </button>

          {/* Centered Compact Divider */}
          <div className="my-3 relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-[#142B5F]/12 dark:border-white/10" />
            <span className="relative px-2.5 bg-white dark:bg-[#111E38] text-[10px] font-bold text-[#5C707C] dark:text-[#9BB4C7] whitespace-nowrap">
              {publicT('public_or_use_email')}
            </span>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mb-2.5 rounded-xl border border-[#D6A43B]/45 bg-[#D6A43B]/10 px-3 py-2 text-[10.5px] font-bold text-[#142B5F] dark:text-[#F2CD78]"
            >
              {errorMessage}
            </p>
          )}
          {infoMessage && (
            <p
              role="status"
              className="mb-2.5 rounded-xl border border-[#0E7C86]/35 bg-[#0E7C86]/8 dark:bg-[#38C6D4]/12 px-3 py-2 text-[10.5px] font-bold text-[#0E7C86] dark:text-[#38C6D4]"
            >
              {infoMessage}
            </p>
          )}

          <form className="space-y-2.5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-[10.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] mb-1">
                  الاسم الكامل
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <User className="h-3.5 w-3.5 text-[#0E7C86] dark:text-[#38C6D4]" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full !min-h-[36px] h-[36px] pl-3 pr-9 py-1 !text-[11.5px] placeholder:!text-[11.5px] border border-[#142B5F]/14 dark:border-white/12 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/80 text-[#142B5F] dark:text-[#F1F5F9] placeholder-[#5C707C]/70 dark:placeholder-[#9BB4C7]/65 focus:bg-white dark:focus:bg-[#0B1529] focus:outline-none focus-visible:!outline-none focus-visible:!shadow-none focus:ring-2 focus:ring-[#0E7C86]/25 dark:focus:ring-[#38C6D4]/28 focus:border-[#0E7C86] dark:focus:border-[#38C6D4] transition-all"
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-3.5 w-3.5 text-[#0E7C86] dark:text-[#38C6D4]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full !min-h-[36px] h-[36px] pl-3 pr-9 py-1 !text-[11.5px] placeholder:!text-[11.5px] border border-[#142B5F]/14 dark:border-white/12 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/80 text-[#142B5F] dark:text-[#F1F5F9] placeholder-[#5C707C]/70 dark:placeholder-[#9BB4C7]/65 focus:bg-white dark:focus:bg-[#0B1529] focus:outline-none focus-visible:!outline-none focus-visible:!shadow-none focus:ring-2 focus:ring-[#0E7C86]/25 dark:focus:ring-[#38C6D4]/28 focus:border-[#0E7C86] dark:focus:border-[#38C6D4] transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5]">
                  كلمة المرور
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() =>
                      setInfoMessage('أدخل بريدك الإلكتروني وسنرسل لك رابط استعادة كلمة المرور.')
                    }
                    className="!min-h-0 text-[10px] font-bold text-[#0E7C86] dark:text-[#38C6D4] hover:underline cursor-pointer"
                  >
                    {publicT('public_forgot_password')}
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-3.5 w-3.5 text-[#0E7C86] dark:text-[#38C6D4]" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full !min-h-[36px] h-[36px] pl-3 pr-9 py-1 !text-[11.5px] placeholder:!text-[11.5px] border border-[#142B5F]/14 dark:border-white/12 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/80 text-[#142B5F] dark:text-[#F1F5F9] placeholder-[#5C707C]/70 dark:placeholder-[#9BB4C7]/65 focus:bg-white dark:focus:bg-[#0B1529] focus:outline-none focus-visible:!outline-none focus-visible:!shadow-none focus:ring-2 focus:ring-[#0E7C86]/25 dark:focus:ring-[#38C6D4]/28 focus:border-[#0E7C86] dark:focus:border-[#38C6D4] transition-all"
                  placeholder={isLogin ? '••••••••' : '8 أحرف على الأقل'}
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-[10.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] mb-1">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Lock className="h-3.5 w-3.5 text-[#0E7C86] dark:text-[#38C6D4]" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full !min-h-[36px] h-[36px] pl-3 pr-9 py-1 !text-[11.5px] placeholder:!text-[11.5px] border border-[#142B5F]/14 dark:border-white/12 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/80 text-[#142B5F] dark:text-[#F1F5F9] placeholder-[#5C707C]/70 dark:placeholder-[#9BB4C7]/65 focus:bg-white dark:focus:bg-[#0B1529] focus:outline-none focus-visible:!outline-none focus-visible:!shadow-none focus:ring-2 focus:ring-[#0E7C86]/25 dark:focus:ring-[#38C6D4]/28 focus:border-[#0E7C86] dark:focus:border-[#38C6D4] transition-all"
                      placeholder="أعد كتابة كلمة المرور"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] mb-1">
                    رمز التحقق
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1 min-w-0">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <KeyRound className="h-3.5 w-3.5 text-[#0E7C86] dark:text-[#38C6D4]" />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="block w-full !min-h-[36px] h-[36px] pl-3 pr-9 py-1 !text-[11.5px] placeholder:!text-[11.5px] border border-[#142B5F]/14 dark:border-white/12 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/80 text-[#142B5F] dark:text-[#F1F5F9] placeholder-[#5C707C]/70 dark:placeholder-[#9BB4C7]/65 focus:bg-white dark:focus:bg-[#0B1529] focus:outline-none focus-visible:!outline-none focus-visible:!shadow-none focus:ring-2 focus:ring-[#0E7C86]/25 dark:focus:ring-[#38C6D4]/28 focus:border-[#0E7C86] dark:focus:border-[#38C6D4] transition-all"
                        placeholder="أدخل رمز التحقق"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendVerificationCode}
                      className="shrink-0 !min-h-[36px] h-[36px] px-3 rounded-xl bg-[#F6F8FA] dark:bg-[#0B1529]/80 hover:bg-white dark:hover:bg-[#142342] border border-[#0E7C86]/30 dark:border-[#38C6D4]/35 text-[10.5px] font-bold text-[#142B5F] dark:text-[#38C6D4] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {codeSent ? 'إعادة الإرسال' : 'إرسال الرمز'}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="pt-1.5">
              <button
                type="submit"
                className="w-full !min-h-[38px] h-[38px] px-4 text-[12px] font-bold rounded-xl shadow-[0_4px_14px_rgba(20,43,95,0.2)] transition-all duration-150 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5 bg-gradient-to-l from-[#142B5F] via-[#133A6A] to-[#0E7C86] hover:opacity-95 text-white border border-white/10 mn-inverse"
              >
                {isLogin ? (
                  <>
                    <LogIn className="w-3.5 h-3.5 text-[#F2CD78]" />
                    <span>{publicT('public_sign_in')}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 text-[#F2CD78]" />
                    <span>إنشاء حساب</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Toggle & Back to Student Workspace */}
          <div className="mt-3.5 pt-3 border-t border-[#142B5F]/10 dark:border-white/10 text-center space-y-1.5">
            <p className="text-[11px] text-[#5C707C] dark:text-[#9BB4C7] font-bold">
              {isLogin
                ? publicT('public_do_not_have_an_account')
                : publicT('public_already_have_an_account')}{' '}
              <button
                type="button"
                onClick={() => switchMode(!isLogin)}
                className="!min-h-0 font-bold text-[#0E7C86] dark:text-[#38C6D4] hover:underline cursor-pointer"
              >
                {isLogin ? publicT('public_create_account') : publicT('public_sign_in')}
              </button>
            </p>

            {onBackToWorkspace && (
              <button
                type="button"
                onClick={onBackToWorkspace}
                className="!min-h-0 inline-flex items-center justify-center gap-1 text-[10.5px] font-bold text-[#5C707C] dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-[#F1F5F9] transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3 h-3" />
                <span>العودة إلى حساب الطالب</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
