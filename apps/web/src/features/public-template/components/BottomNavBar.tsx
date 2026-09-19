import React from 'react';
import { Home, Search, Heart, Sparkles, Bell } from 'lucide-react';

export type TabType = 'home' | 'search' | 'favorites' | 'ai-tools' | 'tracker' | 'auth' | 'account' | 'more' | 'notifications';

interface BottomNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  favoritesCount: number;
  unreadNotificationsCount: number;
  isNotificationsOpen?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  favoritesCount,
  unreadNotificationsCount,
  isNotificationsOpen = false,
}) => {
  const tabs = [
    {
      id: 'home' as TabType,
      label: 'الرئيسية',
      icon: (isActive: boolean) => (
        <Home
          className={`w-5 h-5 transition-transform duration-200 ${
            isActive
              ? 'stroke-[2.5] text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] scale-110'
              : 'stroke-[1.8] text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]'
          }`}
        />
      ),
    },
    {
      id: 'search' as TabType,
      label: 'بحث',
      icon: (isActive: boolean) => (
        <Search
          className={`w-5 h-5 transition-transform duration-200 ${
            isActive
              ? 'stroke-[2.5] text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] scale-110'
              : 'stroke-[1.8] text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]'
          }`}
        />
      ),
    },
    {
      id: 'favorites' as TabType,
      label: 'المفضلة',
      icon: (isActive: boolean) => (
        <div className="relative">
          <Heart
            className={`w-5 h-5 transition-transform duration-200 ${
              isActive
                ? 'stroke-[2.5] fill-[var(--mn-accent)] text-[var(--mn-accent-text)] scale-110'
                : 'stroke-[1.8] text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]'
            }`}
          />
          {favoritesCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 bg-[var(--mn-accent)] text-[var(--mn-on-accent)] font-bold text-[8px] rounded-full flex items-center justify-center shadow-xs animate-pulse mn-gold ">
              {favoritesCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'ai-tools' as TabType,
      label: 'أدوات',
      icon: (isActive: boolean) => (
        <div className="relative flex items-center justify-center">
          <Sparkles
            className={`w-5 h-5 transition-transform duration-200 ${
              isActive
                ? 'stroke-[2.5] text-[var(--mn-accent-text)] fill-[var(--mn-accent)] scale-115'
                : 'stroke-[1.8] text-[var(--mn-accent-text)] fill-[var(--mn-accent-text)]/20'
            }`}
          />
          {/* Glowing Blinking Light Effect */}
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--mn-accent)] opacity-80 mn-gold " />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--mn-accent)] shadow-xs mn-gold " />
          </span>
        </div>
      ),
    },
    {
      id: 'notifications' as TabType,
      label: 'الإشعارات',
      icon: (isActive: boolean) => (
        <div className="relative">
          <Bell
            className={`w-5 h-5 transition-transform duration-200 ${
              isActive
                ? 'stroke-[2.5] text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] scale-110'
                : 'stroke-[1.8] text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]'
            }`}
          />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 bg-[var(--mn-accent)] text-[var(--mn-on-accent)] font-bold text-[8px] rounded-full flex items-center justify-center shadow-xs mn-gold ">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <nav
      id="manaratak-bottom-nav"
      className="w-full select-none fixed bottom-0 left-0 right-0 z-30 bg-[var(--mn-surface)] dark:bg-[var(--mn-surface)] border-t-2 border-[var(--mn-border)] dark:border-[var(--mn-border)] shadow-[0_-6px_25px_rgba(0,0,0,0.15)] dark:shadow-[0_-6px_25px_rgba(0,0,0,0.5)] pt-1.5 pb-[max(8px,env(safe-area-inset-bottom,8px))] transition-colors mn-panel dark:mn-panel "
    >
      <div className="max-w-md mx-auto flex items-stretch justify-around w-full px-[var(--mn-container-mobile)]">
        {tabs.map((tab) => {
          const isActive = tab.id === 'notifications' ? isNotificationsOpen : activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center min-h-[52px] py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-90 relative cursor-pointer ${
                isActive
                  ? 'text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-bold'
                  : 'text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)] dark:hover:text-[var(--mn-text)]'
              }`}
            >
              {/* Icon */}
              <div className="relative mb-0.5 flex items-center justify-center">
                {tab.icon(isActive)}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] sm:text-[11px] leading-tight font-medium ${
                  isActive
                    ? 'text-[var(--mn-heading)] dark:text-[var(--mn-accent-text)] font-bold'
                    : 'text-[var(--mn-text-muted)] dark:text-[var(--mn-text-muted)]'
                }`}
              >
                {tab.label}
              </span>

              {/* Active Tab Dot Indicator */}
              {isActive && (
                <span className="w-1.5 h-1.5 bg-[var(--mn-accent)] rounded-full mt-0.5 mn-gold " />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
