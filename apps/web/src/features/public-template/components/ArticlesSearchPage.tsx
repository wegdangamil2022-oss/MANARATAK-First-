import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Heart,
  Clock,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  BookOpen,
  Globe2,
  Sparkles,
  FileText,
  GraduationCap,
  Award,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import type { ArticlePreview } from '../ArticlePresentation';
import { PublicArticle } from '../types';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { PublicCardsPagination, PublicFilterSelectModal, usePaginatedCatalog } from './DetailUi';

interface ArticlesSearchPageProps {
  articles?: PublicArticle[];
  onSelectArticle: (article: any) => void;
  onBack?: () => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  savedItems?: string[];
  onToggleSave?: (id: string) => void;
  items?: ArticlePreview[];
}

const renderArticleCategoryIcon = (article: ArticlePreview) => {
  const iconClass = 'w-5 h-5 text-[#D6A43B] dark:text-[var(--mn-accent)] stroke-[2]';
  if (article.id === 'art_cultural_exchange') {
    return <GraduationCap className={iconClass} />;
  }
  if (article.categoryAr.includes('منح')) {
    return <Award className={iconClass} />;
  }
  if (article.categoryAr.includes('جامع')) {
    return <Landmark className={iconClass} />;
  }
  if (article.categoryAr.includes('تأشير')) {
    return <ShieldCheck className={iconClass} />;
  }
  return <BookOpen className={iconClass} />;
};

export const ArticlesSearchPage: React.FC<ArticlesSearchPageProps> = ({
  articles,
  onSelectArticle,
  onBack,
  favoriteIds,
  onToggleFavorite,
  savedItems = [],
  onToggleSave,
  items,
}) => {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedCountry, setSelectedCountry] = useState<string>('الكل');
  const [activeFilterModal, setActiveFilterModal] = useState<'category' | 'country' | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const effectiveSavedIds = favoriteIds ?? savedItems;
  const handleToggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(id);
    else if (onToggleSave) onToggleSave(id);
  };

  const handleSelectCard = (preview: ArticlePreview) => {
    const found =
      articles?.find((a) => a.id === preview.id || a.slug === preview.slug);
    if (found) {
      onSelectArticle(found);
      return;
    }
    onSelectArticle({
      id: preview.id,
      slug: preview.slug,
      titleAr: preview.titleAr,
      titleEn: preview.titleEn,
      contentType: preview.contentType,
      contentTypeLabelAr: preview.contentTypeLabelAr,
      categoryAr: preview.categoryAr,
      author: preview.author || 'فريق منارتك الأكاديمي',
      updatedAt: preview.updatedAt,
      readingTime: preview.readingTime,
      excerptAr: preview.excerptAr,
      sections: [
        {
          title: preview.titleAr,
          paragraphs: [preview.excerptAr],
        },
      ],
    });
  };

  const sourceArticles = useMemo(() => {
    if (items) return items;
    if (articles) return articles.map((article): ArticlePreview => ({ ...article, excerptEn: '', contentTypeLabelEn: '', categoryEn: '', countryAr: '', countryEn: '', readingTime: article.readingTime || '', coverImage: '', featured: false }));
    return [];
  }, [items, articles]);

  const categories = useMemo(() => {
    const cats = new Set(sourceArticles.map((a) => a.categoryAr));
    return ['الكل', ...Array.from(cats)];
  }, [sourceArticles]);

  const countries = useMemo(() => {
    const counts = new Set(sourceArticles.map((a) => a.countryAr));
    return ['الكل', ...Array.from(counts)];
  }, [sourceArticles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sourceArticles.filter((article) => {
      const matchesSearch =
        !q ||
        article.titleAr.toLowerCase().includes(q) ||
        article.titleEn.toLowerCase().includes(q) ||
        article.excerptAr.toLowerCase().includes(q) ||
        article.categoryAr.toLowerCase().includes(q) ||
        article.countryAr.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === 'الكل' || article.categoryAr === selectedCategory;
      const matchesCountry =
        selectedCountry === 'الكل' || article.countryAr === selectedCountry;

      return matchesSearch && matchesCategory && matchesCountry;
    });
  }, [searchQuery, selectedCategory, selectedCountry, sourceArticles]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageItems: paginatedArticles,
  } = usePaginatedCatalog(
    filteredArticles,
    `${searchQuery}|${selectedCategory}|${selectedCountry}`,
    30,
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('الكل');
    setSelectedCountry('الكل');
  };

  const activeFiltersCount =
    (selectedCategory !== 'الكل' ? 1 : 0) +
    (selectedCountry !== 'الكل' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  return (
    <div
      className="min-h-screen bg-[var(--mn-page)] text-[var(--mn-heading)] pb-24 font-['Cairo',sans-serif] select-none mn-panel"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO EMERALD BANNER - MATCHING SCHOLARSHIPS, MAJORS & UNIVERSITIES        */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-4 pb-3 overflow-hidden shadow-xs mn-inverse">
        {/* Top-Right Circular Back Button */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-8 h-8 bg-black/25 hover:bg-black/40 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all z-30 cursor-pointer text-white shadow-xs active:scale-95"
            title={publicT('public_back')}
            aria-label={publicT('public_back')}
          >
            <ChevronLeft className="w-4 h-4 rotate-180 text-white" />
          </button>
        )}

        {/* Background Decorative Mosque Silhouettes, Dot Grid & Gold Arcs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top-left dot grid */}
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[var(--mn-accent)] mn-gold" />
            ))}
          </div>

          {/* Thin gold curved orbital line on left */}
          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[var(--mn-accent)]/25 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[var(--mn-accent)]/15 pointer-events-none" />

          {/* Architectural silhouette on right */}
          <svg
            className="absolute -right-4 bottom-0 h-40 w-40 text-white/10 pointer-events-none"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <rect x="140" y="50" width="16" height="150" />
            <polygon points="148,25 138,50 158,50" />
            <circle cx="148" cy="20" r="3" />
            <path d="M 80,130 Q 115,70 150,130 Z" />
            <circle cx="115" cy="65" r="4" />
            <rect x="70" y="80" width="12" height="120" />
            <polygon points="76,60 68,80 84,80" />
          </svg>

          {/* Lower Curved Gold Swirl */}
          <svg
            className="absolute bottom-0 inset-x-0 w-full h-12 opacity-30"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-20 520,70"
              stroke="var(--mn-accent)"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-2 md:space-y-3 pt-1 md:pt-2">
          {/* Top 4-pointed Gold Sparkle Star */}
          <div className="flex justify-center">
            <Sparkles
              className="h-5 w-5 text-[var(--mn-accent-text)] drop-shadow-[0_0_8px_rgba(214,164,59,0.8)]"
              aria-hidden="true"
            />
          </div>

          {/* Main Title */}
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[32px] font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              منصة المعرفة{' '}
              <span className="text-[var(--mn-accent-text)]">
                {publicT('public_articles_and_study_guides')}
              </span>
            </h1>

            {/* Small Gold Horizontal Divider */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-10 md:w-14 h-0.5 bg-[var(--mn-accent)] rounded-full mn-gold" />
            </div>

            {/* Subtitle */}
            <p className="text-[11px] sm:text-xs md:text-sm text-white font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto truncate">
              {publicT('public_practical_guides_and_editorial_articles_to_help_you')}
            </p>
          </div>

          {/* Integrated Clean White Search Bar in Hero */}
          <div className="pt-1 max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_article_title_or_topic')}
                className="w-full py-2.5 md:py-3 pl-4 pr-10 bg-[var(--mn-surface)] text-[var(--mn-heading)] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[var(--mn-text-muted)] placeholder:text-[12px] md:placeholder:text-sm placeholder:font-bold placeholder:font-['Cairo',sans-serif] focus:outline-none shadow-md border border-[var(--mn-border)] focus:border-[var(--mn-accent)] transition-all text-center font-['Cairo',sans-serif] mn-panel"
                data-mn-design="cd18739893"
              />
              <Search className="w-4 h-4 text-[var(--mn-accent-text)] absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--mn-text-muted)] hover:text-[var(--mn-text)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-2 relative z-10">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-[var(--mn-danger-text)] hover:text-[var(--mn-danger-text)] bg-[var(--mn-surface-elevated)]/95 px-2.5 py-0.5 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel"
            >
              <RotateCcw className="w-3 h-3" />
              <span>
                {publicT('public_reset_filters')}
                {activeFiltersCount})
              </span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2 SEPARATE FLOATING FILTER TILES (التصنيف • الدولة) INSIDE HERO           */}
        {/* ========================================================================= */}
        <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mn-inline-gutter mt-2.5 md:mt-3.5 relative z-20 pb-0">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3.5">
            {/* Tile 1: تصنيف المقال */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal('category');
                }
              }}
              onClick={() => setActiveFilterModal('category')}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title="اختر تصنيف المقال"
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <FileText className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedCategory === 'الكل' ? 'تصنيف المقال' : selectedCategory}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>

            {/* Tile 2: الدولة / الوجهة */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal('country');
                }
              }}
              onClick={() => setActiveFilterModal('country')}
              className="relative bg-[var(--mn-surface)] hover:bg-[var(--mn-surface-muted)] border-1.5 border-[#142B5F]/50 dark:border-[#D6A43B]/60 hover:border-[#142B5F] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all h-[58px] sm:h-[64px] cursor-pointer mn-panel font-['Cairo',sans-serif]"
              title="اختر الدولة أو النطاق"
            >
              <div className="flex items-center justify-center gap-1 text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-bold text-[11px] sm:text-xs font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] shrink-0" />
                <span className="truncate font-['Cairo',sans-serif]">
                  {selectedCountry === 'الكل' ? 'الدولة / النطاق' : selectedCountry}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--mn-text-muted)] dark:text-[var(--mn-accent-soft)] mt-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-0.5 bg-gradient-to-r from-[var(--mn-accent-text)] via-[var(--mn-accent-soft)] to-[var(--mn-accent-text)] shadow-xs mb-3" />

      {/* ========================================================================= */}
      {/* ARTICLES COMPACT CARDS LIST (MATCHING SCHOLARSHIPS, MAJORS & UNIVERSITIES) */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-2xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 md:pt-3 space-y-3 md:space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[var(--mn-heading)] font-semibold text-xs sm:text-sm md:text-base font-['Cairo',sans-serif]">
            <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--mn-accent-text)]" />
            <span>المقالات والأدلة المتاحة ({filteredArticles.length})</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-accent-text)] bg-[var(--mn-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--mn-accent)]/30 font-['Cairo',sans-serif]">
            <RotateCcw className="w-2.5 h-2.5 text-[var(--mn-accent-text)]" />
            <span>{publicT('public_updated_regularly')}</span>
          </div>
        </div>

        {/* Cards Stack */}
        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch w-full">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full bg-[var(--mn-surface)] border border-[var(--mn-border)] rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel">
              <div className="w-12 h-12 rounded-full bg-[var(--mn-surface-muted)] flex items-center justify-center text-[var(--mn-text-muted)] mn-panel">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[var(--mn-heading)] font-['Cairo',sans-serif]">
                لا توجد مقالات أو أدلة مطابقة للبحث
              </h3>
              <p className="text-xs text-[var(--mn-text-muted)] max-w-xs font-['Cairo',sans-serif]">
                جرب تغيير خيارات التصفية أو البحث بكلمات أخرى.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-[var(--mn-primary)] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] mn-inverse"
              >
                {publicT('public_clear_all_filters')}
              </button>
            </div>
          ) : (
            paginatedArticles.map((article) => {
              const isSaved = effectiveSavedIds.includes(article.id);
              return (
                <div
                  key={article.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelectCard(article);
                    }
                  }}
                  onClick={() => handleSelectCard(article)}
                  className="bg-[var(--mn-surface)] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/30 dark:border-[var(--mn-border)] border-r-3 border-r-[#142B5F] dark:border-r-[var(--mn-accent)] hover:border-[#142B5F]/50 dark:hover:border-[var(--mn-accent)]/40 shadow-xs transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 md:p-4 relative overflow-hidden group cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 h-full select-none mn-panel"
                >
                  {/* Top Row: Right Circular Badge & Article Names | Left Favorite Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
                      {/* Circular Icon Badge with Petrol Outer Ring & Navy Inner Circle */}
                      <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-full p-0.5 bg-[#0E7C86] shadow-xs shrink-0 flex items-center justify-center mn-inverse">
                        <div className="w-full h-full rounded-full overflow-hidden bg-[#142B5F] dark:bg-[var(--mn-surface)] border border-white flex items-center justify-center shadow-inner">
                          {renderArticleCategoryIcon(article)}
                        </div>
                      </div>

                      <div className="flex flex-col items-start text-start min-w-0 flex-1">
                        <h3 className="text-[13px] sm:text-[14px] font-bold text-[var(--mn-heading)] dark:text-[var(--mn-accent-soft)] font-['Cairo',sans-serif] leading-tight truncate w-full">
                          {article.titleAr}
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-medium text-[var(--mn-text-muted)] font-['Cairo',sans-serif] truncate w-full">
                          {article.titleEn}
                        </span>
                      </div>
                    </div>

                    {/* Favorite Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmark(e, article.id)}
                      className="w-8 h-8 rounded-full bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)] border border-[var(--mn-border)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 mn-panel hover:mn-panel"
                      title={publicT('public_add_to_favorites')}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isSaved
                            ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]'
                            : 'text-[var(--mn-text-muted)]'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: 4 Boxes in 2x2 Grid (3 Info Boxes + View Details Button) */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--mn-border)]/50">
                    {/* 1. المربع الأول: التصنيف */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                      <BookOpen className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                      <span className="truncate">{article.categoryAr}</span>
                    </div>

                    {/* 2. المربع الثاني: الدولة / النطاق */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                      <Globe2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                      <span className="truncate">{article.countryAr}</span>
                    </div>

                    {/* 3. المربع الثالث: وقت القراءة والتحديث */}
                    <div className="bg-[var(--mn-page)] border border-[var(--mn-border)] rounded-lg pr-3 pl-2 py-1.5 flex items-center justify-start gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] font-['Cairo',sans-serif] mn-panel">
                      <Clock className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#239BA6] shrink-0" />
                      <span className="truncate">
                        قراءة {article.readingTime} • {article.updatedAt}
                      </span>
                    </div>

                    {/* 4. زر عرض التفاصيل */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCard(article);
                      }}
                      className="bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-white rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse hover:mn-inverse"
                      data-mn-design="26ecd1db9e"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-[var(--mn-accent-soft)]">
                        {publicT('public_view_details')}
                      </span>
                      <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[var(--mn-accent-soft)]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredArticles.length > 0 && (
          <PublicCardsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            dir={publicDir}
          />
        )}
      </div>

      {/* Filter Modal: تصنيف المقال */}
      <PublicFilterSelectModal
        isOpen={activeFilterModal === 'category'}
        title="اختر تصنيف المقال"
        icon={FileText}
        selectedValue={selectedCategory}
        onSelect={(val) => setSelectedCategory(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={categories.map((cat) => ({
          value: cat,
          label: cat === 'الكل' ? 'جميع التصنيفات' : cat,
        }))}
      />

      {/* Filter Modal: الدولة / النطاق */}
      <PublicFilterSelectModal
        isOpen={activeFilterModal === 'country'}
        title="اختر الدولة أو النطاق"
        icon={Globe2}
        selectedValue={selectedCountry}
        onSelect={(val) => setSelectedCountry(val)}
        onClose={() => setActiveFilterModal(null)}
        dir={publicDir}
        options={countries.map((cnt) => ({
          value: cnt,
          label: cnt === 'الكل' ? 'جميع الدول والنطاقات' : cnt,
        }))}
      />
    </div>
  );
};
