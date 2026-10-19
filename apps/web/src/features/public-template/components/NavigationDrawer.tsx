import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { useOverlayDialog } from '../useOverlayDialog';
import {
  X,
  User,
  GraduationCap,
  Building2,
  BookOpen,
  Layers,
  Sparkles,
  Heart,
  ListChecks,
  Globe,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Language, UserProfile } from '../types';

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

  useOverlayDialog(isOpen, onClose, 'ab-navigation-dialog');
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'account',
      label: publicT('public_my_account_and_student_workspace'),
      icon: <User className="w-4 h-4 text-[var(--ab-accent-text)]" />,
    },
    {
      id: 'home',
      label: publicT('public_home'),
      icon: (
        <GraduationCap className="w-4 h-4 text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)]" />
      ),
    },
    {
      id: 'tracker',
      label: publicT('public_learner_progress_tracker'),
      icon: <ListChecks className="w-4 h-4 text-[var(--ab-accent-text)]" />,
    },
    {
      id: 'reports',
      label: publicT('public_academic_reports_and_audits'),
      icon: <Layers className="w-4 h-4 text-[var(--ab-accent-text)]" />,
    },
    {
      id: 'ai-tools',
      label: publicT('public_absheer_tools'),
      icon: <Sparkles className="w-4 h-4 text-[var(--ab-accent-text)]" />,
    },
    {
      id: 'favorites',
      label: publicT('public_favorites_and_saved_items'),
      icon: <Heart className="w-4 h-4 text-[var(--ab-accent-text)]" />,
    },
    {
      id: 'countries',
      label: publicT('public_countries_and_study_destinations'),
      icon: <Globe className="w-4 h-4 text-[var(--ab-accent-text)]" />,
    },
    {
      id: 'universities',
      label: publicT('public_international_university_directory'),
      icon: (
        <Building2 className="w-4 h-4 text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)]" />
      ),
    },
    {
      id: 'courses',
      label: publicT('public_training_courses'),
      icon: (
        <BookOpen className="w-4 h-4 text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)]" />
      ),
    },
    {
      id: 'majors',
      label: publicT('public_majors_directory'),
      icon: (
        <Layers className="w-4 h-4 text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)]" />
      ),
    },
    {id: 'scholarships', label: publicT('public_scholarships_3'), icon: <GraduationCap className="w-4 h-4" />},
    {id: 'exams', label: publicT('public_international_exams'), icon: <ListChecks className="w-4 h-4" />},
    {id: 'articles', label: publicT('public_articles_and_guides'), icon: <BookOpen className="w-4 h-4" />},
    {id: 'services', label: publicT('public_student_and_general_services'), icon: <User className="w-4 h-4" />},
    {id: 'jobs', label: publicT('public_jobs_and_internships'), icon: <Building2 className="w-4 h-4" />},
  ];

  return (
    <div role="presentation" tabIndex={-1} onKeyDown={function (event) { if (event.key === 'Escape') onClose(); }} onClick={event => {if (event.target === event.currentTarget) onClose();}} className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[80] flex justify-end">
      <div id="ab-navigation-dialog" role="dialog" aria-modal="true" aria-label={publicT('public_main_menu')} tabIndex={-1} className="bg-[var(--ab-surface)] dark:bg-[var(--ab-surface)] max-w-xs w-full h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-start border-l border-[var(--ab-border)] dark:border-[var(--ab-border)] ab-panel dark:ab-panel ">
        {/* Drawer Header */}
        <div className="bg-[var(--ab-primary)] dark:bg-[var(--ab-surface)] p-5 text-white border-b border-[var(--ab-accent)]/30 relative ab-inverse dark:ab-panel ">
          <button
            aria-label={publicT('public_close_menu')}
            onClick={onClose}
            className="absolute top-3 left-3 h-10 w-10 rounded-xl bg-[var(--ab-primary)] dark:bg-[var(--ab-surface-elevated)] hover:bg-black/30 text-[var(--ab-text-muted)] hover:text-white flex items-center justify-center transition-colors cursor-pointer ab-inverse dark:ab-panel "
          >
            <X className="w-4 h-4" />
          </button>

          {/* User Profile Avatar & Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--ab-primary)] dark:bg-[var(--ab-surface-elevated)] border-2 border-[var(--ab-accent)] flex items-center justify-center text-[var(--ab-accent-text)] shadow-md ab-inverse dark:ab-panel ">
              <User className="w-6 h-6" />
            </div>
            {userProfile ? (
              <div>
                <h3 className="text-sm font-bold text-white">{userProfile.name}</h3>
                <p className="text-[11px] text-[var(--ab-accent-text)] font-bold">
                  {userProfile.email}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ab-primary)] dark:bg-[var(--ab-surface-elevated)] text-[10px] text-[var(--ab-on-dark-muted)] border border-[var(--ab-accent)]/40 ab-inverse dark:ab-panel ">
                  <span>{publicT('public_gpa')}{' '}{userProfile.gpa}</span>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-white mb-1">{publicT('public_new_visitor')}</h3>
                <button
                  onClick={() => {
                    onNavigate('auth');
                    onClose();
                  }}
                  className="min-h-10 px-3 py-2 bg-[var(--ab-accent)] hover:bg-[var(--ab-accent)] text-[var(--ab-on-accent)] text-[11px] font-bold rounded-lg transition-colors cursor-pointer ab-gold hover:ab-gold "
                >{publicT('public_sign_in_create_account')}</button>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
              className="w-full text-start p-3 rounded-2xl text-xs font-bold text-[var(--ab-text)] dark:text-[var(--ab-text)] hover:bg-[var(--ab-primary)]/10 dark:hover:bg-[var(--ab-surface-muted)] hover:text-[var(--ab-heading)] dark:hover:text-[var(--ab-accent-text)] flex items-center justify-between transition-colors active:scale-98 cursor-pointer dark:hover:ab-panel "
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {language === 'ar' ? <ChevronLeft className="h-3.5 w-3.5 text-[var(--ab-text-muted)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--ab-text-muted)]" />}
            </button>
          ))}

          <div className="pt-2 border-t border-[var(--ab-border)] dark:border-[var(--ab-border)] my-2" />

          {/* Dark Mode Toggle in Drawer */}
          {onToggleDarkMode && (
            <div className="p-3 rounded-2xl bg-[var(--ab-page)] dark:bg-[var(--ab-surface-elevated)] border border-[var(--ab-border)] dark:border-[var(--ab-border)] text-xs flex items-center justify-between ab-panel dark:ab-panel ">
              <div className="flex items-center gap-2 text-[var(--ab-text)] dark:text-[var(--ab-text)] font-bold">
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-[var(--ab-accent-text)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--ab-heading)]" />
                )}
                <span>{publicT('public_appearance_theme')}</span>
              </div>
              <button
                onClick={onToggleDarkMode}
                aria-label={isDarkMode ? publicT('public_switch_to_light_mode') : publicT('public_switch_to_dark_mode')}
                className="min-h-10 px-3 py-2 bg-[var(--ab-surface)] dark:bg-[var(--ab-surface)] border border-[var(--ab-border)] dark:border-[var(--ab-border)] rounded-xl text-xs font-bold text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)] cursor-pointer flex items-center gap-1 ab-panel dark:ab-panel "
              >
                {isDarkMode ? publicT('public_dark') : publicT('public_light')}
              </button>
            </div>
          )}

          {/* Language Toggle in Drawer */}
          <div className="p-3 rounded-2xl bg-[var(--ab-page)] dark:bg-[var(--ab-surface-elevated)] border border-[var(--ab-border)] dark:border-[var(--ab-border)] text-xs flex items-center justify-between mt-2 ab-panel dark:ab-panel ">
            <div className="flex items-center gap-2 text-[var(--ab-text)] dark:text-[var(--ab-text)] font-bold">
              <Globe className="w-4 h-4 text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)]" />
              <span>{publicT('public_language_2')}</span>
            </div>
            <button
              onClick={onToggleLanguage}
              aria-label={publicT('public_change_interface_language')}
              className="min-h-10 px-3 py-2 bg-[var(--ab-surface)] dark:bg-[var(--ab-surface)] border border-[var(--ab-border)] dark:border-[var(--ab-border)] rounded-xl text-xs font-bold text-[var(--ab-heading)] dark:text-[var(--ab-text)] cursor-pointer ab-panel dark:ab-panel "
            >
              {language === 'ar' ? publicT('public_arabic') : 'English'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--ab-page)] dark:bg-[var(--ab-surface)] border-t border-[var(--ab-border)] dark:border-[var(--ab-border)] text-center text-[10px] text-[var(--ab-text-muted)] dark:text-[var(--ab-text-muted)] ab-panel dark:ab-panel ">{publicT('public_absheer_educational_opportunities_platform_mobile_design')}</div>
      </div>
    </div>
  );
};
