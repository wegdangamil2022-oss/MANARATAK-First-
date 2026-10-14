import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ar } from '../../i18n/ar';
import { en } from '../../i18n/en';
import { formatTranslation } from '../../i18n/formatTranslation';
import { publicEnumLabel } from './publicEnumCopy';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { CategoryNav } from './components/CategoryNav';
import { FavoriteButton } from './components/FavoriteButton';
import { SmartSearchBar } from './components/SmartSearchBar';
import { StudentWorkspacePage } from './components/StudentWorkspacePage';
import { FeaturedUniversities } from './components/FeaturedUniversities';
import { PublishedUniversityDetails } from './components/PublishedUniversityDetails';
import type { University } from './types';

const locale = vi.hoisted(() => ({ value: 'en' as 'ar' | 'en' }));
vi.mock('../../i18n/I18nProvider', () => ({
  useTranslation: () => ({
    language: locale.value,
    dir: locale.value === 'ar' ? 'rtl' : 'ltr',
    isRTL: locale.value === 'ar',
    t: (key: string, values?: Record<string, string | number>) => {
      const dictionary: Record<string, string> = locale.value === 'ar' ? ar : en;
      if (!Object.prototype.hasOwnProperty.call(dictionary, key)) throw new Error(`MISSING_COPY:${key}`);
      return formatTranslation(dictionary[key], values);
    },
  }),
}));

const noop = () => {};
const markup = (element: React.ReactElement) => renderToStaticMarkup(element);
const assertEnglish = (html: string) => expect(html).not.toMatch(/\p{Script=Arabic}/u);

describe('public component copy with a synthetic enabled locale', () => {
  beforeEach(() => { locale.value = 'en'; });

  it('localizes header theme, search and accessible navigation labels', () => {
    const html = markup(<Header language="en" onToggleLanguage={noop} onOpenMenu={noop}
      onOpenProfile={noop} onToggleDarkMode={noop} activeTab="home"
      onGlobalSearchChange={noop} globalSearchQuery="degree" />);
    assertEnglish(html);
    expect(html).toContain('aria-label="Main menu"');
    expect(html).toContain('title="Switch to dark mode"');
    expect(html).toContain('dir="ltr"');
  });

  it('renders English category and bottom navigation captions', () => {
    const html = markup(<><CategoryNav selectedCategory="all" onSelectCategory={noop} />
      <BottomNavBar activeTab="home" onTabChange={noop} favoritesCount={3} unreadNotificationsCount={0} /></>);
    assertEnglish(html);
    expect(html).toContain('Browse by category');
    expect(html).toContain('Notifications');
  });

  it('localizes the default favorite label and search direction, retaining an explicit label', () => {
    const html = markup(<><FavoriteButton active={false} onToggle={noop} />
      <SmartSearchBar searchQuery="" onSearchChange={noop} /></>);
    assertEnglish(html);
    expect(html).toContain('aria-label="Save to favorites"');
    expect(html).toContain('dir="ltr"');
    expect(markup(<FavoriteButton active={false} onToggle={noop} label="Save this university" />))
      .toContain('aria-label="Save this university"');
  });

  it('renders the guest student hub and all academic profile empty states in English', () => {
    const html = markup(<StudentWorkspacePage profile={null} language="en" isDarkMode={false}
      favoriteTypeCounts={{}} favoritesCount={0} milestones={[]} notifications={[]}
      onOpenFavorites={noop} onOpenTracker={noop} onOpenNotifications={noop}
      onOpenGlobalSearch={noop} onOpenSmartSearch={noop} onOpenTools={noop}
      onOpenAuth={noop} onToggleLanguage={noop} onToggleDarkMode={noop} />);
    assertEnglish(html);
    expect(html).toContain('Target degree');
    expect(html).toContain('No linked certificates yet');
  });

  it('localizes count and rank prose while preserving canonical university data', () => {
    const university = { id: 'INS-1', name: 'Oxford', nameEn: 'University of Oxford',
      country: 'United Kingdom', countryFlag: '🇬🇧', imageUrl: '/campus.png',
      scholarshipCount: 3, globalRank: 2 } as University;
    const html = markup(<FeaturedUniversities universities={[university]} onSelectUniversity={noop} onViewAllClick={noop} />);
    assertEnglish(html);
    expect(html).toContain('3 scholarships');
    expect(html).toContain('Rank #2');
    expect(university.name).toBe('Oxford');
  });

  it('localizes published university field labels and booleans without translating source content', () => {
    const university = { publishedData: { description: 'Reviewed owner content',
      acceptsInternationalStudents: true, accommodation: { accommodationAvailable: true } } } as unknown as University;
    const html = markup(<PublishedUniversityDetails university={university} />);
    assertEnglish(html);
    expect(html).toContain('University overview');
    expect(html).toContain('Reviewed owner content');
  });

  it('retains Arabic interface labels and RTL search when Arabic is selected', () => {
    locale.value = 'ar';
    const html = markup(<><FavoriteButton active={false} onToggle={noop} />
      <SmartSearchBar searchQuery="" onSearchChange={noop} /></>);
    expect(html).toContain('حفظ في المفضلة');
    expect(html).toContain('dir="rtl"');
  });

  it('translates legacy enum labels while keeping machine values and unknown owner text intact', () => {
    const values = ['الكل', 'أداة ذكية', 'حسابية', 'بيانات ومقارنة', 'هجينة', 'متاحة الآن', 'قريبًا',
      'منح', 'جامعات', 'تخصصات', 'دول', 'دورات', 'اختبارات', 'مقالات', 'خدمات', 'أدوات', 'وظائف وتدريب',
      'طلب/متابعة', 'تنبيه', 'ماجستير', 'دكتوراه', 'بكالوريوس', 'زمالة أبحاث', 'غير محدد', 'غير مصنف', 'غير متاح'];
    const t = (key: string) => {
      expect(en).toHaveProperty(key);
      expect(ar).toHaveProperty(key);
      return (en as Record<string, string>)[key];
    };
    expect(values.map(value => publicEnumLabel(value, t))).not.toEqual(values);
    expect(values[1]).toBe('أداة ذكية');
    expect(publicEnumLabel('Owner supplied text', t)).toBe('Owner supplied text');
  });

  it('inserts literal named values without replacement expansion or inherited properties', () => {
    expect(formatTranslation('Open {title}', { title: '$& <script>' })).toBe('Open $& <script>');
    expect(formatTranslation('{missing} {count}', { count: 0 })).toBe('{missing} 0');
    expect(formatTranslation('{toString}', {})).toBe('{toString}');
  });
});
