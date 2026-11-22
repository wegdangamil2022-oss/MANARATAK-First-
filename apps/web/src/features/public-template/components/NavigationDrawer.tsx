import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React, { useState } from 'react';
import { useOverlayDialog } from '../useOverlayDialog';
import {
  X,
  User,
  Home,
  GraduationCap,
  Landmark,
  BookOpen,
  Layers,
  Sparkles,
  Heart,
  Route,
  ClipboardCheck,
  Globe,
  Award,
  FileText,
  ShieldCheck,
  BriefcaseBusiness,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import {
  isPreviewStudentAuthenticated,
  loginPreviewStudent,
  logoutPreviewStudent,
} from '../../students/studentWorkspacePreviewApi';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: UserProfile | null;
  language: Language;
  onToggleLanguage: () => void;
  onNavigate: (tab: any) => void;
  isPhoneFrame?: boolean;
  onTogglePhoneFrame?: () => void;
  unreadCount: number;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  userProfile,
  language,
  onToggleLanguage,
  onNavigate,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();
  const [previewVisitorMode, setPreviewVisitorMode] = useState(
    () => !isPreviewStudentAuthenticated(),
  );

  React.useEffect(() => {
    const syncAuthState = () => {
      setPreviewVisitorMode(!isPreviewStudentAuthenticated());
    };
    window.addEventListener('mn-preview-auth-change', syncAuthState);
    return () => window.removeEventListener('mn-preview-auth-change', syncAuthState);
  }, []);

  useOverlayDialog(isOpen, onClose, 'mn-navigation-dialog');
  if (!isOpen) return null;

  const activeProfile = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' && previewVisitorMode
    ? null : userProfile ?? null;

  const studentName = (activeProfile?.name || '').trim();
  const isLatinName =
    /[A-Za-z]/.test(studentName) && !/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(studentName);

  const menuGroups = [
    {
      groupKey: 'personal',
      groupLabel: language === 'ar' ? 'البوابة الشخصية والأدوات' : 'Personal Workspace & Tools',
      items: [
        {
          id: 'account',
          label: publicT('public_my_account_and_student_workspace'),
          icon: User,
        },
        {
          id: 'home',
          label: publicT('public_home'),
          icon: Home,
        },
        {
          id: 'ai-tools',
          label: publicT('public_manaratak_tools'),
          icon: Sparkles,
        },
        {
          id: 'tracker',
          label: publicT('public_learner_progress_tracker'),
          icon: Route,
        },
        {
          id: 'reports',
          label: publicT('public_academic_reports_and_audits'),
          icon: ClipboardCheck,
        },
        {
          id: 'favorites',
          label: publicT('public_favorites_and_saved_items'),
          icon: Heart,
        },
      ],
    },
    {
      groupKey: 'directories',
      groupLabel: language === 'ar' ? 'الأدلة الأكاديمية والفرص' : 'Academic Directories',
      items: [
        {
          id: 'scholarships',
          label: publicT('public_scholarships_3'),
          icon: GraduationCap,
        },
        {
          id: 'universities',
          label: publicT('public_international_university_directory'),
          icon: Landmark,
        },
        {
          id: 'majors',
          label: publicT('public_majors_directory'),
          icon: Layers,
        },
        {
          id: 'countries',
          label: publicT('public_countries_and_study_destinations'),
          icon: Globe,
        },
        {
          id: 'courses',
          label: publicT('public_training_courses'),
          icon: Award,
        },
        {
          id: 'exams',
          label: publicT('public_international_exams'),
          icon: FileText,
        },
      ],
    },
    {
      groupKey: 'knowledge',
      groupLabel: language === 'ar' ? 'المعرفة والخدمات والمهن' : 'Guides, Services & Careers',
      items: [
        {
          id: 'articles',
          label: publicT('public_articles_and_guides'),
          icon: BookOpen,
        },
        {
          id: 'services',
          label: publicT('public_student_and_general_services'),
          icon: ShieldCheck,
        },
        {
          id: 'jobs',
          label: publicT('public_jobs_and_internships'),
          icon: BriefcaseBusiness,
        },
      ],
    },
  ];

  return (
    <div
      role="presentation"
      tabIndex={-1}
      onKeyDown={function (event) {
        if (event.key === 'Escape') onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[80] flex justify-end font-['Cairo',sans-serif]"
    >
      <div
        id="mn-navigation-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={publicT('public_main_menu')}
        tabIndex={-1}
        className="bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] max-w-xs w-full h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-start border-l border-[var(--mn-border)] dark:border-[var(--mn-border)] mn-panel dark:mn-panel font-['Cairo',sans-serif]"
      >
        {/* Top Student Identity Header */}
        <div className="relative overflow-hidden bg-gradient-to-bl from-[#142B5F] via-[#17376E] to-[#1A4B75] px-4 pt-3.5 pb-4 text-white mn-inverse">
          {/* Decorative Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#D6A43B]/15 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#43CDC3]/15 blur-2xl"
          />

          {/* Top Bar inside Drawer Header: Brand Label + Visitor/Student Switch + Close Button */}
          <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0E224D]/80 border border-[#D6A43B]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F2CD78]" />
              <span className="text-[10px] font-bold text-[#F2CD78] tracking-wide">
                {language === 'ar' ? 'القائمة الرئيسية • منارتك' : 'MANARATAK MENU'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (previewVisitorMode) {
                    loginPreviewStudent();
                  } else {
                    logoutPreviewStudent();
                  }
                }}
                className="h-8 px-2.5 rounded-xl bg-[#203F6A] hover:bg-[#284E82] border border-[#76ADBE]/60 text-[10px] font-bold text-[#C9F2EB] transition-colors cursor-pointer"
                title={
                  previewVisitorMode
                    ? language === 'ar'
                      ? 'التبديل إلى حساب الطالب'
                      : 'Switch to Student Account'
                    : language === 'ar'
                      ? 'معاينة وضع الزائر'
                      : 'Preview Visitor Mode'
                }
              >
                {previewVisitorMode
                  ? language === 'ar'
                    ? 'عرض حسابي'
                    : 'Student View'
                  : language === 'ar'
                    ? 'وضع الزائر'
                    : 'Visitor View'}
              </button>

              <button
                aria-label={publicT('public_close_menu')}
                onClick={onClose}
                className="h-8 w-8 rounded-xl bg-[#203F6A] hover:bg-[#D6A43B] text-white hover:text-[#142B5F] border border-[#76ADBE]/60 hover:border-[#D6A43B] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Student Profile Card (Matches StudentWorkspaceShell Identity) */}
          {activeProfile ? (
            <div className="relative z-10 rounded-2xl bg-[#102552]/90 border border-[#76ADBE]/45 p-3 shadow-md">
              <div
                dir={isLatinName ? 'ltr' : 'rtl'}
                className="flex items-center justify-between gap-2.5 min-w-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('account');
                    onClose();
                  }}
                  className="flex flex-1 items-center gap-2.5 min-w-0 text-start cursor-pointer group/profile"
                >
                  {/* Signature Circular Student Avatar from حسابي */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full border-[3px] border-[#43CDC3] bg-[#142B5F] flex items-center justify-center shadow-sm group-hover/profile:scale-[1.03] transition-transform">
                      <User className="w-7 h-7 text-[#65E0D4]" strokeWidth={1.8} />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-[#142B5F]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[10px] font-bold text-[#C9F2EB] mb-0.5">
                      {language === 'ar' ? 'حساب الطالب المعتمد' : 'Verified Student Account'}
                    </span>
                    <h3
                      dir={isLatinName ? 'ltr' : 'rtl'}
                      className="text-sm sm:text-[15px] font-bold text-[#F0C872] leading-tight truncate group-hover/profile:text-[#FFDE96] transition-colors"
                    >
                      {activeProfile.name}
                    </h3>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigate('account');
                    onClose();
                  }}
                  title={publicT('public_my_account_and_student_workspace')}
                  aria-label={publicT('public_my_account_and_student_workspace')}
                  className="shrink-0 w-9 h-9 rounded-xl bg-[#24466B] border border-[#75C5C4]/70 text-white flex items-center justify-center shadow-xs hover:bg-[#2B5676] transition-colors cursor-pointer"
                >
                  <Settings2 className="h-4 w-4 text-[#F0C872]" />
                </button>
              </div>

              {/* Quick Entry Bar to Student Account */}
              <div className="mt-2.5 pt-2 border-t border-[#D9ECF0]/25 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('account');
                    onClose();
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-[#D6A43B] hover:bg-[#F2CD78] text-[#142B5F] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs mn-gold"
                >
                  <span>
                    {language === 'ar' ? 'فتح حسابي ومساحة الطالب' : 'Open My Student Account'}
                  </span>
                  {language === 'ar' ? (
                    <ChevronLeft className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 rounded-2xl bg-[#102552]/90 border border-[#76ADBE]/45 p-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border-[3px] border-[#43CDC3] bg-[#142B5F] shrink-0 flex items-center justify-center shadow-sm">
                  <User className="w-7 h-7 text-[#65E0D4]" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#F0C872] mb-1">
                    {publicT('public_new_visitor')}
                  </h3>
                  <button
                    onClick={() => {
                      onNavigate('auth');
                      onClose();
                    }}
                    className="w-full py-1.5 px-3 bg-[#D6A43B] hover:bg-[#F2CD78] text-[#142B5F] text-[11px] font-bold rounded-xl transition-colors cursor-pointer mn-gold"
                  >
                    {publicT('public_sign_in_create_account')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Signature Gold Baseline matching StudentWorkspaceShell */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-gradient-to-r from-[#B38018] via-[#F2CE75] to-[#B38018]"
          />
        </div>

        {/* Organized Menu Items List with Distinct Navy/Gold Icon Badges */}
        <div className="p-3 overflow-y-auto flex-1 space-y-3 bg-[var(--mn-page)] dark:bg-[var(--mn-surface)]">
          {menuGroups.map((group) => (
            <div key={group.groupKey} className="space-y-1.5">
              <div className="px-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D6A43B]" />
                <span className="text-[11px] font-bold text-[var(--mn-text-muted)]">
                  {group.groupLabel}
                </span>
              </div>

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      className="w-full text-start p-2 rounded-2xl bg-[var(--mn-surface)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] hover:border-[#D6A43B]/60 text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] flex items-center justify-between transition-all active:scale-98 cursor-pointer group shadow-2xs mn-panel"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-[#142B5F] dark:bg-[#10264A] border border-[#D6A43B]/50 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#D6A43B] transition-colors">
                          <ItemIcon className="w-4 h-4 text-[#F2CD78] group-hover:text-[#142B5F] transition-colors" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="w-6 h-6 rounded-lg bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] flex items-center justify-center shrink-0 text-[var(--mn-text-muted)] group-hover:border-[#D6A43B]/50 group-hover:text-[var(--mn-heading)] transition-colors">
                        {language === 'ar' ? (
                          <ChevronLeft className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-1 border-t border-[var(--mn-border)] dark:border-[var(--mn-border)]" />

          {/* Dark Mode & Language Settings */}
          <div className="space-y-1.5">
            {onToggleDarkMode && (
              <div className="p-2 rounded-2xl bg-[var(--mn-surface)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] text-xs flex items-center justify-between shadow-2xs mn-panel dark:mn-panel">
                <div className="flex items-center gap-2.5 text-[var(--mn-heading)] dark:text-[var(--mn-text)] font-bold">
                  <span className="w-8 h-8 rounded-xl bg-[#142B5F] dark:bg-[#10264A] border border-[#D6A43B]/50 flex items-center justify-center shrink-0">
                    {isDarkMode ? (
                      <Sun className="w-4 h-4 text-[#F2CD78]" />
                    ) : (
                      <Moon className="w-4 h-4 text-[#F2CD78]" />
                    )}
                  </span>
                  <span>{publicT('public_appearance_theme')}</span>
                </div>
                <button
                  onClick={onToggleDarkMode}
                  aria-label={
                    isDarkMode
                      ? publicT('public_switch_to_light_mode')
                      : publicT('public_switch_to_dark_mode')
                  }
                  className="min-h-8 px-3 py-1.5 bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[#D6A43B]/40 rounded-xl text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] cursor-pointer flex items-center gap-1 mn-panel dark:mn-panel"
                >
                  {isDarkMode ? publicT('public_dark') : publicT('public_light')}
                </button>
              </div>
            )}

            <div className="p-2 rounded-2xl bg-[var(--mn-surface)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] text-xs flex items-center justify-between shadow-2xs mn-panel dark:mn-panel">
              <div className="flex items-center gap-2.5 text-[var(--mn-heading)] dark:text-[var(--mn-text)] font-bold">
                <span className="w-8 h-8 rounded-xl bg-[#142B5F] dark:bg-[#10264A] border border-[#D6A43B]/50 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-[#F2CD78]" />
                </span>
                <span>{publicT('public_language_2')}</span>
              </div>
              <button
                onClick={onToggleLanguage}
                aria-label={publicT('public_change_interface_language')}
                className="min-h-8 px-3 py-1.5 bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border border-[#D6A43B]/40 rounded-xl text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] cursor-pointer mn-panel dark:mn-panel"
              >
                {language === 'ar' ? publicT('public_arabic') : 'English'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-t border-[var(--mn-border)] dark:border-[var(--mn-border)] text-center text-[10px] font-bold text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)] mn-panel dark:mn-panel">
          {publicT('public_manaratak_educational_opportunities_platform_mobile_design')}
        </div>
      </div>
    </div>
  );
};
