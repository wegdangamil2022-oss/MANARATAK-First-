import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Home, Search, Heart, Megaphone, Bell } from 'lucide-react';

export type TabType = 'home' | 'search' | 'favorites' | 'ai-tools' | 'channels' | 'tracker' | 'auth' | 'account' | 'more' | 'notifications' | 'reports';

interface BottomNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  favoritesCount: number;
  unreadNotificationsCount: number;
  isNotificationsOpen?: boolean;
  isChannelsOpen?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  favoritesCount,
  unreadNotificationsCount,
  isNotificationsOpen = false,
  isChannelsOpen = false,
}) => {
  const { t: publicT, isRTL } = usePublicTemplateTranslation();

  const tabs = [
    {
      id: 'home' as TabType,
      label: publicT('public_home'),
      icon: (isActive: boolean) => (
        <Home
          className={`w-5 h-5 transition-transform duration-200 ${
            isActive
              ? 'stroke-[2.5] text-[#142B51] dark:text-[#E5BF65] scale-110'
              : 'stroke-[1.8] text-[#526672] dark:text-[#cad8e0]/80'
          }`}
        />
      ),
    },
    {
      id: 'search' as TabType,
      label: publicT('public_search'),
      icon: (isActive: boolean) => (
        <Search
          className={`w-5 h-5 transition-transform duration-200 ${
            isActive
              ? 'stroke-[2.5] text-[#142B51] dark:text-[#E5BF65] scale-110'
              : 'stroke-[1.8] text-[#526672] dark:text-[#cad8e0]/80'
          }`}
        />
      ),
    },
    {
      id: 'favorites' as TabType,
      label: publicT('public_favorites'),
      icon: (isActive: boolean) => (
        <div className="relative">
          <Heart
            className={`w-5 h-5 transition-transform duration-200 ${
              isActive
                ? 'stroke-[2.5] fill-[#D4A846] text-[#142B51] dark:fill-[#E5BF65] dark:text-[#E5BF65] scale-110'
                : 'stroke-[1.8] text-[#526672] dark:text-[#cad8e0]/80'
            }`}
          />
          {favoritesCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 bg-[#D4A846] dark:bg-[#E5BF65] text-[#142B51] font-bold text-[8px] rounded-full flex items-center justify-center shadow-xs mn-gold ">
              {favoritesCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'channels' as TabType,
      label: isRTL ? 'قنواتي' : 'My Channels',
      icon: (isActive: boolean) => (
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border transition-transform duration-200 ${
            isActive
              ? 'bg-[#142B5F] border-[#D6A43B] text-[#F2CD78] scale-110 shadow-2xs'
              : 'bg-[#142B5F] border-[#D6A43B]/75 text-[#F2CD78] shadow-2xs'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 text-[#F2CD78] stroke-[2.2]" />
        </span>
      ),
    },
    {
      id: 'notifications' as TabType,
      label: publicT('public_notifications'),
      icon: (isActive: boolean) => (
        <div className="relative">
          <Bell
            className={`w-5 h-5 transition-transform duration-200 ${
              isActive
                ? 'stroke-[2.5] text-[#142B51] dark:text-[#E5BF65] scale-110'
                : 'stroke-[1.8] text-[#526672] dark:text-[#cad8e0]/80'
            }`}
          />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 bg-[#D4A846] dark:bg-[#E5BF65] text-[#142B51] font-bold text-[8px] rounded-full flex items-center justify-center shadow-xs mn-gold ">
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
      className="w-full select-none fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF] dark:bg-[#142B51] border-t border-[#E3E7E7] dark:border-[#E5BF65]/22 shadow-[0_-4px_18px_rgba(20,43,81,0.06)] dark:shadow-[0_-6px_22px_rgba(0,0,0,0.35)] pt-1.5 pb-[max(8px,env(safe-area-inset-bottom,8px))] transition-colors mn-panel dark:mn-panel "
    >
      <div className="max-w-md mx-auto flex items-stretch justify-around w-full px-[var(--mn-container-mobile)]">
        {tabs.map((tab) => {
          const isActive =
            tab.id === 'notifications'
              ? isNotificationsOpen
              : tab.id === 'channels'
                ? isChannelsOpen
                : activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center min-h-[52px] py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-90 relative cursor-pointer ${
                isActive
                  ? 'text-[#142B51] dark:text-[#E5BF65] font-bold'
                  : 'text-[#526672] dark:text-[#cad8e0]/80 hover:text-[#142B51] dark:hover:text-[#F2F5F7]'
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
                    ? 'text-[#142B51] dark:text-[#E5BF65] font-bold'
                    : 'text-[#526672] dark:text-[#cad8e0]/80'
                }`}
              >
                {tab.label}
              </span>

              {/* Active Tab Dot Indicator */}
              {isActive && (
                <span className="w-1.5 h-1.5 bg-[#D4A846] dark:bg-[#E5BF65] rounded-full mt-0.5 mn-gold " />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
