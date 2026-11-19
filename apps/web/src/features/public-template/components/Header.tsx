import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Menu, User, Globe, Moon, Sun, Search, Sparkles, X, Bell, GraduationCap, BookOpen } from 'lucide-react';
import { Language } from '../types';
import { ManaratakLogo } from './ManaratakLogo';

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
        id="manaratak-header"
        className="w-full bg-[#FFFFFF] dark:bg-[#142B51] border-b border-[#E3E7E7] dark:border-[#E5BF65]/22 shadow-[0_2px_10px_rgba(20,43,81,0.04)] sticky top-0 z-40 transition-colors mn-panel dark:mn-panel "
      >
        {/* Main Top Bar */}
        <div className="w-full min-h-[58px] sm:h-20 md:h-22 py-1 sm:py-0 px-3 sm:px-6 flex items-center">
          <div className="mn-header-row flex items-center justify-between gap-2 max-w-5xl md:max-w-[1160px] lg:max-w-[1200px] mx-auto w-full">
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
              className="mn-header-brand flex items-center gap-2 sm:gap-2.5 md:gap-3 cursor-pointer select-none group"
              aria-label={publicT('public_manaratak_home')}
            >
              {/* Circular Logo Container */}
              <div
                className="w-[52px] h-[52px] sm:w-[68px] sm:h-[68px] md:w-[72px] md:h-[72px] rounded-full shrink-0 flex items-center justify-center transition-transform group-active:scale-95 p-0 bg-transparent border-0 overflow-hidden"
              >
                <ManaratakLogo size={68} className="w-full h-full rounded-full object-contain" />
              </div>

              {/* Brand Typography */}
              <div className="flex flex-col justify-center text-center sm:text-start transition-opacity group-hover:opacity-90">
                {/* Platform Name: MANARATAK */}
                <span className="text-[15px] sm:text-lg md:text-xl font-bold leading-tight tracking-wider text-[#142B51] dark:text-[#E5BF65] uppercase font-sans text-center sm:text-start">
                  MANARATAK
                </span>
                {/* Subtitle: منارتك للفرص التعليمية */}
                <span className="text-[9px] sm:text-[11px] md:text-xs font-bold sm:font-medium text-[#233744] dark:text-[#cad8e0] leading-tight mt-0.5 whitespace-nowrap font-sans text-center sm:text-start">
                  {isRtl ? publicT('public_manaratak_educational_opportunities') : 'Educational Opportunities'}
                </span>
              </div>
            </div>

            {/* Actions Controls */}
            <div className="mn-header-actions flex items-center gap-1.5 sm:gap-2 md:gap-2.5">
              {/* Dark Mode Switcher */}
              {onToggleDarkMode && (
                <button
                  id="btn-dark-mode-toggle"
                  onClick={onToggleDarkMode}
                  className="h-8 sm:h-9 md:h-10 px-2 sm:px-2.5 md:px-3.5 bg-[#142B51] text-[#D4A846] border border-[#D4A846]/55 hover:bg-[#147F87] hover:text-white dark:bg-[#E5BF65] dark:text-[#142B51] dark:border-[#E5BF65] dark:hover:bg-[#f0d184] dark:hover:text-[#142B51] rounded-lg md:rounded-xl font-bold text-[11px] sm:text-xs md:text-sm flex items-center gap-1 md:gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title={isDarkMode ? publicT('public_switch_to_light_mode_2') : publicT('public_switch_to_dark_mode')}
                  aria-label={publicT('public_toggle_dark_mode')}
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="font-bold text-[10px] sm:text-xs md:text-[13px] hidden xs:inline">{publicT('public_light')}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="font-bold text-[10px] sm:text-xs md:text-[13px] hidden xs:inline">{publicT('public_dark')}</span>
                    </>
                  )}
                </button>
              )}

              {/* Student account */}
              <button
                id="btn-student-account"
                onClick={onOpenProfile}
                className="min-h-[34px] sm:min-h-[40px] md:min-h-[42px] px-2.5 sm:px-3.5 md:px-4 rounded-xl bg-[#142B51] text-[#D4A846] border border-[#D4A846]/55 hover:bg-[#147F87] hover:text-white dark:bg-[#E5BF65] dark:text-[#142B51] dark:border-[#E5BF65] dark:hover:bg-[#f0d184] dark:hover:text-[#142B51] font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
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
                className="min-h-[34px] min-w-[34px] sm:min-h-[40px] sm:min-w-[40px] md:min-h-[42px] md:min-w-[42px] rounded-xl bg-[#142B51] text-[#D4A846] border border-[#D4A846]/55 hover:bg-[#147F87] hover:text-white dark:bg-[#E5BF65] dark:text-[#142B51] dark:border-[#E5BF65] dark:hover:bg-[#f0d184] dark:hover:text-[#142B51] flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
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
        <div className="w-full px-3 sm:px-6 py-1.5 md:py-2.5 bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-muted)] border-b border-[var(--mn-border)] dark:border-[var(--mn-border)] shadow-sm">
          <div className="max-w-5xl md:max-w-[1160px] lg:max-w-[1200px] mx-auto flex items-center gap-1.5 sm:gap-2 md:gap-2.5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onGlobalSearchSubmit?.(globalSearchQuery.trim());
              }}
              className="mn-search-control min-w-0 flex-1 h-9 md:h-11 flex items-center border border-[var(--mn-border)] dark:border-[var(--mn-border)] bg-[var(--mn-surface-muted)] dark:bg-[var(--mn-surface-elevated)] shadow-2xs overflow-hidden focus-within:border-[var(--mn-accent)]/70 focus-within:ring-2 focus-within:ring-[var(--mn-primary)]/10 transition-all rounded-[12px]"
            >
              <input
                id="header-global-search"
                value={globalSearchQuery}
                onChange={(event) => onGlobalSearchChange?.(event.target.value)}
                placeholder={isRtl ? publicT('public_search_manaratak') : 'Search MANARATAK...'}
                className="min-w-0 flex-1 bg-transparent py-1.5 px-3 sm:px-4 !text-[12px] md:!text-[14px] font-bold text-[var(--mn-text)] placeholder:text-[var(--mn-text-muted)] outline-none font-['Cairo',sans-serif]"
                dir={isRtl ? 'rtl' : 'ltr'}
              />
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={() => onGlobalSearchChange?.('')}
                  className="w-7 md:w-9 h-full flex items-center justify-center text-[var(--mn-text-muted)] hover:text-[var(--mn-text-muted)] cursor-pointer"
                  aria-label={publicT('public_clear_global_search')}
                >
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 h-full px-3 md:px-4 bg-[#142B5F] text-white hover:bg-[#1c3a7a] active:opacity-90 transition-colors cursor-pointer flex items-center justify-center gap-1 md:gap-1.5"
              >
                <Search className="w-3 h-3 md:w-4 md:h-4 text-white/90 shrink-0" />
                <span className="!text-[11px] md:!text-[13px] font-bold font-['Cairo',sans-serif] leading-none whitespace-nowrap">{isRtl ? publicT('public_search') : 'Search'}</span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => onOpenSmartSearch?.(globalSearchQuery.trim())}
              className="shrink-0 rounded-[11px] bg-[var(--mn-primary)] border border-transparent px-2.5 md:px-4 text-white flex flex-row items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform cursor-pointer mn-inverse !h-[35px] md:!h-[44px] !min-h-0 !max-h-[35px] md:!max-h-[44px]"
              data-mn-design="56ab29fe6d"
              title={isRtl ? publicT('public_open_smart_search') : 'Open smart search'}
            >
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--mn-accent)] shrink-0" />
              <span className="!text-[10px] md:!text-[13px] font-bold font-['Cairo',sans-serif] leading-none whitespace-nowrap">{isRtl ? publicT('public_smart_search') : 'Smart'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
