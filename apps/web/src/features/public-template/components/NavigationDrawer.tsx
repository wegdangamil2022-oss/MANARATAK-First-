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
  useOverlayDialog(isOpen, onClose, 'mn-navigation-dialog');
  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'account',
      label: 'حسابي ومساحة الطالب',
      icon: <User className="w-4 h-4 text-[var(--mn-accent-text)]" />,
    },
    {
      id: 'home',
      label: 'الرئيسية',
      icon: (
        <GraduationCap className="w-4 h-4 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]" />
      ),
    },
    {
      id: 'tracker',
      label: 'نظام متابعة تقدم المتعلمين',
      icon: <ListChecks className="w-4 h-4 text-[var(--mn-accent-text)]" />,
    },
    {
      id: 'ai-tools',
      label: 'أدوات منارتك',
      icon: <Sparkles className="w-4 h-4 text-[var(--mn-accent-text)]" />,
    },
    {
      id: 'favorites',
      label: 'المفضلة والمحفوظات',
      icon: <Heart className="w-4 h-4 text-[var(--mn-accent-text)]" />,
    },
    {
      id: 'countries',
      label: 'الدول والوجهات الدراسية',
      icon: <Globe className="w-4 h-4 text-[var(--mn-accent-text)]" />,
    },
    {
      id: 'universities',
      label: 'دليل الجامعات العالمية',
      icon: (
        <Building2 className="w-4 h-4 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]" />
      ),
    },
    {
      id: 'courses',
      label: 'الدورات التدريبية',
      icon: (
        <BookOpen className="w-4 h-4 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]" />
      ),
    },
    {
      id: 'majors',
      label: 'دليل التخصصات',
      icon: (
        <Layers className="w-4 h-4 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]" />
      ),
    },
    {id: 'scholarships', label: 'المنح الدراسية', icon: <GraduationCap className="w-4 h-4" />},
    {id: 'exams', label: 'الاختبارات الدولية', icon: <ListChecks className="w-4 h-4" />},
    {id: 'articles', label: 'المقالات والأدلة', icon: <BookOpen className="w-4 h-4" />},
    {id: 'services', label: 'الخدمات الطلابية والعامة', icon: <User className="w-4 h-4" />},
    {id: 'jobs', label: 'الوظائف والتدريب', icon: <Building2 className="w-4 h-4" />},
  ];

  return (
    <div role="presentation" tabIndex={-1} onKeyDown={function (event) { if (event.key === 'Escape') onClose(); }} onClick={event => {if (event.target === event.currentTarget) onClose();}} className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[80] flex justify-end">
      <div id="mn-navigation-dialog" role="dialog" aria-modal="true" aria-label="القائمة الرئيسية" tabIndex={-1} className="bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] max-w-xs w-full h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-right border-l border-[var(--mn-border)] dark:border-[var(--mn-border)] mn-panel dark:mn-panel ">
        {/* Drawer Header */}
        <div className="bg-[var(--mn-primary)] dark:bg-[var(--mn-surface)] p-5 text-white border-b border-[var(--mn-accent)]/30 relative mn-inverse dark:mn-panel ">
          <button
            aria-label="إغلاق القائمة"
            onClick={onClose}
            className="absolute top-3 left-3 h-10 w-10 rounded-xl bg-[var(--mn-primary)] dark:bg-[var(--mn-surface-elevated)] hover:bg-black/30 text-[var(--mn-text-muted)] hover:text-white flex items-center justify-center transition-colors cursor-pointer mn-inverse dark:mn-panel "
          >
            <X className="w-4 h-4" />
          </button>

          {/* User Profile Avatar & Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-surface-elevated)] border-2 border-[var(--mn-accent)] flex items-center justify-center text-[var(--mn-accent-text)] shadow-md mn-inverse dark:mn-panel ">
              <User className="w-6 h-6" />
            </div>
            {userProfile ? (
              <div>
                <h3 className="text-sm font-bold text-white">{userProfile.name}</h3>
                <p className="text-[11px] text-[var(--mn-accent-text)] font-bold">
                  {userProfile.email}
                </p>
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--mn-primary)] dark:bg-[var(--mn-surface-elevated)] text-[10px] text-[var(--mn-on-dark-muted)] border border-[var(--mn-accent)]/40 mn-inverse dark:mn-panel ">
                  <span>المعدل: {userProfile.gpa}</span>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-white mb-1">زائر جديد</h3>
                <button
                  onClick={() => {
                    onNavigate('auth');
                    onClose();
                  }}
                  className="min-h-10 px-3 py-2 bg-[var(--mn-accent)] hover:bg-[var(--mn-accent)] text-[var(--mn-on-accent)] text-[11px] font-bold rounded-lg transition-colors cursor-pointer mn-gold hover:mn-gold "
                >
                  تسجيل الدخول / حساب جديد
                </button>
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
              className="w-full text-right p-3 rounded-2xl text-xs font-bold text-[var(--mn-text)] dark:text-[var(--mn-text)] hover:bg-[var(--mn-primary)]/10 dark:hover:bg-[var(--mn-surface-muted)] hover:text-[var(--mn-heading)] dark:hover:text-[var(--mn-accent-text)] flex items-center justify-between transition-colors active:scale-98 cursor-pointer dark:hover:mn-panel "
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {language === 'ar' ? <ChevronLeft className="h-3.5 w-3.5 text-[var(--mn-text-muted)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--mn-text-muted)]" />}
            </button>
          ))}

          <div className="pt-2 border-t border-[var(--mn-border)] dark:border-[var(--mn-border)] my-2" />

          {/* Dark Mode Toggle in Drawer */}
          {onToggleDarkMode && (
            <div className="p-3 rounded-2xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] text-xs flex items-center justify-between mn-panel dark:mn-panel ">
              <div className="flex items-center gap-2 text-[var(--mn-text)] dark:text-[var(--mn-text)] font-bold">
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-[var(--mn-accent-text)]" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--mn-heading)]" />
                )}
                <span>المظهر / Theme</span>
              </div>
              <button
                onClick={onToggleDarkMode}
                aria-label={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
                className="min-h-10 px-3 py-2 bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-xl text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] cursor-pointer flex items-center gap-1 mn-panel dark:mn-panel "
              >
                {isDarkMode ? 'ليلي' : 'نهاري'}
              </button>
            </div>
          )}

          {/* Language Toggle in Drawer */}
          <div className="p-3 rounded-2xl bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] text-xs flex items-center justify-between mt-2 mn-panel dark:mn-panel ">
            <div className="flex items-center gap-2 text-[var(--mn-text)] dark:text-[var(--mn-text)] font-bold">
              <Globe className="w-4 h-4 text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)]" />
              <span>اللغة / Language</span>
            </div>
            <button
              onClick={onToggleLanguage}
              aria-label="تبديل لغة الواجهة"
              className="min-h-10 px-3 py-2 bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border border-[var(--mn-border)] dark:border-[var(--mn-border)] rounded-xl text-xs font-bold text-[var(--mn-heading)] dark:text-[var(--mn-text)] cursor-pointer mn-panel dark:mn-panel "
            >
              {language === 'ar' ? 'العربية' : 'English'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--mn-page)] dark:bg-[var(--mn-surface)] border-t border-[var(--mn-border)] dark:border-[var(--mn-border)] text-center text-[10px] text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)] mn-panel dark:mn-panel ">
          منصة منارتك للفرص التعليمية • تصميم الهاتف المحمول
        </div>
      </div>
    </div>
  );
};
