import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Menu, User, Globe, Moon, Sun, Search, Sparkles, X, Bell, GraduationCap, BookOpen } from 'lucide-react';
import { Language } from '../types';
import { AbsheerLogo } from './AbsheerLogo';

interface HeaderProps {
  language: Language;
  onToggleLanguage: () => void;
  onOpenMenu: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile: () => void;
  unreadCount?: number;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: any) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  globalSearchQuery?: string;
  onGlobalSearchChange?: (query: string) => void;
  onGlobalSearchSubmit?: (query: string) => void;
  onOpenSmartSearch?: (query: string) => void;
  isSearchVisible?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onToggleLanguage,
  onOpenMenu,
  onOpenNotifications,
  onOpenProfile,
  activeTab,
  onTabChange,
  onSelectCategory,
  isDarkMode = false,
  onToggleDarkMode,
  globalSearchQuery = '',
  onGlobalSearchChange,
  onGlobalSearchSubmit,
  onOpenSmartSearch,
  unreadCount = 0,
  isSearchVisible = false,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  const isRtl = language === 'ar';

  return (
    <>
      <header
        id="absheer-header"
        className="w-full bg-[var(--ab-surface)] dark:bg-[var(--ab-surface)] border-b border-[var(--ab-border)] dark:border-[var(--ab-border)] shadow-2xs sticky top-0 z-40 transition-colors ab-panel dark:ab-panel "
      >
        {/* Main Top Bar */}
        <div className="w-full min-h-[68px] sm:h-20 py-1 sm:py-0 px-3 sm:px-6 flex items-center">
          <div className="ab-header-row flex items-center justify-between gap-2 max-w-5xl mx-auto w-full">
            {/* Brand Identity & Official Logo */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onTabChange?.('home');
                  onSelectCategory?.('all');
                }
              }}
              onClick={() => {
                onTabChange?.('home');
                onSelectCategory?.('all');
              }}
              className="ab-header-brand flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none group"
              aria-label={publicT('public_absheer_home')}
            >
              {/* Circular Logo Container */}
              <div
                className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-full shrink-0 flex items-center justify-center transition-transform group-active:scale-95 p-0 bg-transparent border-0 overflow-hidden"
              >
                <AbsheerLogo size={68} className="w-full h-full rounded-full object-contain" />
              </div>

              {/* Brand Typography */}
              <div className="flex flex-col justify-center text-center sm:text-start transition-opacity group-hover:opacity-90">
                {/* Platform Name: ABSHEER */}
                <span className="text-[15px] sm:text-lg font-bold leading-tight tracking-wider text-[var(--ab-heading)] dark:text-[var(--ab-accent-text)] uppercase font-sans text-center sm:text-start">
                  ABSHEER
                </span>
                {/* Subtitle: أبشر للفرص التعليمية */}
                <span className="text-[9px] sm:text-[11px] font-bold sm:font-medium text-[var(--ab-heading)] dark:text-[var(--ab-text-muted)] leading-tight mt-0.5 whitespace-nowrap font-sans text-center sm:text-start">
                  {isRtl ? publicT('public_absheer_educational_opportunities') : 'Educational Opportunities'}
                </span>
              </div>
            </div>

            {/* Actions Controls */}
            <div className="ab-header-actions flex items-center gap-1.5 sm:gap-2">
              {/* Dark Mode Switcher */}
              {onToggleDarkMode && (
                <button
                  id="btn-dark-mode-toggle"
                  onClick={onToggleDarkMode}
                  className="h-8 sm:h-9 px-2 sm:px-2.5 bg-[#142B5F] text-[#D6A43B] border border-[#D6A43B]/60 hover:bg-[#0E7C86] hover:text-white dark:bg-[#D6A43B] dark:text-[#142B5F] dark:border-[#D6A43B] dark:hover:bg-[#F2CD78] dark:hover:text-[#142B5F] rounded-lg font-bold text-[11px] sm:text-xs flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title={isDarkMode ? publicT('public_switch_to_light_mode_2') : publicT('public_switch_to_dark_mode')}
                  aria-label={publicT('public_toggle_dark_mode')}
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5" />
                      <span className="font-bold text-[10px] sm:text-xs hidden xs:inline">{publicT('public_light')}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5" />
                      <span className="font-bold text-[10px] sm:text-xs hidden xs:inline">{publicT('public_dark')}</span>
                    </>
                  )}
                </button>
              )}

              {/* Student account */}
              <button
                id="btn-student-account"
                onClick={onOpenProfile}
                className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-[#142B5F] text-[#D6A43B] border border-[#D6A43B]/60 hover:bg-[#0E7C86] hover:text-white dark:bg-[#D6A43B] dark:text-[#142B5F] dark:border-[#D6A43B] dark:hover:bg-[#F2CD78] dark:hover:text-[#142B5F] font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
                aria-label={publicT('public_student_account')}
                title={publicT('public_my_account_and_student_workspace')}
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline font-bold">
                  {isRtl ? publicT('public_student_account') : 'Student Account'}
                </span>
              </button>

              {/* Mobile Menu Hamburger Button */}
              <button
                id="btn-header-menu"
                onClick={onOpenMenu}
                className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] rounded-xl bg-[#142B5F] text-[#D6A43B] border border-[#D6A43B]/60 hover:bg-[#0E7C86] hover:text-white dark:bg-[#D6A43B] dark:text-[#142B5F] dark:border-[#D6A43B] dark:hover:bg-[#F2CD78] dark:hover:text-[#142B5F] flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
                aria-label={publicT('public_main_menu')}
                title={publicT('public_menu')}
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Non-sticky search bar that scrolls away normally */}
      {(activeTab === 'home' || (activeTab === 'search' && isSearchVisible)) && (onGlobalSearchChange || onGlobalSearchSubmit || onOpenSmartSearch) && (
        <div className="w-full px-3 sm:px-6 py-2 bg-[var(--ab-surface-muted)] dark:bg-[var(--ab-surface-muted)] border-b border-[var(--ab-border)] dark:border-[var(--ab-border)] shadow-sm">
          <div className="max-w-5xl mx-auto flex items-center gap-1.5 sm:gap-2">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onGlobalSearchSubmit?.(globalSearchQuery.trim());
              }}
              className="ab-search-control min-w-0 flex-1 h-10 flex items-center border border-[var(--ab-border)] dark:border-[var(--ab-border)] bg-[var(--ab-surface-muted)] dark:bg-[var(--ab-surface-elevated)] shadow-2xs overflow-hidden focus-within:border-[var(--ab-accent)]/70 focus-within:ring-2 focus-within:ring-[var(--ab-primary)]/10 transition-all rounded-[13px]"
            >
              <input
                id="header-global-search"
                value={globalSearchQuery}
                onChange={(event) => onGlobalSearchChange?.(event.target.value)}
                placeholder={isRtl ? publicT('public_search_absheer') : 'Search ABSHEER...'}
                className="min-w-0 flex-1 bg-transparent py-2 px-3 sm:px-4 !text-[12px] font-bold text-[var(--ab-text)] placeholder:text-[var(--ab-text-muted)] outline-none font-['Cairo',sans-serif]"
                dir={isRtl ? 'rtl' : 'ltr'}
              />
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={() => onGlobalSearchChange?.('')}
                  className="w-7 h-full flex items-center justify-center text-[var(--ab-text-muted)] hover:text-[var(--ab-text-muted)] cursor-pointer"
                  aria-label={publicT('public_clear_global_search')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 h-full px-3 bg-[#142B5F] text-white hover:bg-[#1c3a7a] active:opacity-90 transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <Search className="w-3 h-3 text-white/90 shrink-0" />
                <span className="!text-[11px] font-bold font-['Cairo',sans-serif] leading-none whitespace-nowrap">{isRtl ? publicT('public_search') : 'Search'}</span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => onOpenSmartSearch?.(globalSearchQuery.trim())}
              className="shrink-0 rounded-[12px] bg-[var(--ab-primary)] border border-transparent px-3 text-white flex flex-row items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform cursor-pointer ab-inverse !h-[38px] !min-h-0 !max-h-[38px]"
              data-ab-design="56ab29fe6d"
              title={isRtl ? publicT('public_open_smart_search') : 'Open smart search'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--ab-accent)] shrink-0" />
              <span className="!text-[10px] font-bold font-['Cairo',sans-serif] leading-none whitespace-nowrap">{isRtl ? publicT('public_smart_search') : 'Smart'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
