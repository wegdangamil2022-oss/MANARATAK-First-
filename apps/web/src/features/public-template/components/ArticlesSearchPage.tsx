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
import { ARTICLE_PREVIEWS, GOLDEN_ARTICLES, ArticlePreview } from '../data/articleData';
import { PublicArticle } from '../types';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import { PublicCardsPagination, PublicInlineFilterPanel, usePaginatedCatalog } from './DetailUi';

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
  const iconClass = 'w-4.5 h-4.5 text-white stroke-[2]';
  if (article.id === 'art_cultural_exchange') {
    return <GraduationCap className={iconClass} />;
  }
  if (String(article.contentType) === 'SCHOLARSHIP_GUIDE') {
    return <Award className={iconClass} />;
  }
  if (String(article.contentType) === 'UNIVERSITY_REVIEW') {
    return <Landmark className={iconClass} />;
  }
  if (String(article.contentType) === 'VISA_GUIDE') {
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
      articles?.find((a) => a.id === preview.id || a.slug === preview.slug) ||
      GOLDEN_ARTICLES.find((a) => a.id === preview.id || a.slug === preview.slug);
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
    if (!items || items.length === 0) return ARTICLE_PREVIEWS;
    const culturalExchange = ARTICLE_PREVIEWS[0];
    const hasCulturalExchange = items.some(
      (i) => i.id === culturalExchange.id || i.slug === culturalExchange.slug,
    );
    return hasCulturalExchange ? items : [culturalExchange, ...items];
  }, [items]);

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
      className="min-h-screen bg-[#F6F8FA] dark:bg-[#0A1326] text-[#203442] dark:text-[#EDF5F5] pb-24 font-['Cairo',sans-serif] select-none mn-panel dark:[--mn-border:rgba(255,255,255,0.12)]"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* HERO SECTION - COMPACT MANARATAK DESIGN (MATCHING SCHOLARSHIPS & MAJORS)  */}
      {/* ========================================================================= */}
      <div className="relative mn-search-hero text-white px-3 sm:px-4 pt-2.5 pb-2.5 sm:pt-4 sm:pb-3 overflow-hidden shadow-xs mn-inverse">
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

        {/* Background Decorative Silhouettes, Dot Grid & Gold Arcs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-3 left-5 grid grid-cols-5 gap-1.5 opacity-20">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#F2CD78]" />
            ))}
          </div>

          <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full border border-[#D6A43B]/20 pointer-events-none" />
          <div className="absolute -top-6 -left-6 w-72 h-72 rounded-full border border-[#34BFC9]/15 pointer-events-none" />

          <svg
            className="absolute -right-4 bottom-0 h-36 w-36 text-white/10 pointer-events-none"
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

          <svg
            className="absolute bottom-0 inset-x-0 w-full h-10 opacity-25"
            viewBox="0 0 500 80"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20,70 Q250,-20 520,70"
              stroke="#D6A43B"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto text-center relative z-10 space-y-1.5 sm:space-y-2 md:space-y-3 pt-0.5 md:pt-2">
          <div className="flex justify-center">
            <Sparkles
              className="h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-[#F2CD78] drop-shadow-[0_0_8px_rgba(214,164,59,0.75)]"
              aria-hidden="true"
            />
          </div>

          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-['Cairo',sans-serif] tracking-tight leading-tight">
              منصة المعرفة{' '}
              <span className="text-[#F2CD78]">
                {publicT('public_articles_and_study_guides')}
              </span>
            </h1>

            <div className="flex justify-center pt-0.5 pb-0.5 md:pt-1.5">
              <div className="w-10 md:w-14 h-0.5 bg-gradient-to-r from-[#D6A43B] via-[#F2CD78] to-[#D6A43B] rounded-full" />
            </div>

            <p className="text-[10px] sm:text-xs md:text-sm text-[#DDEFF2] font-medium font-['Cairo',sans-serif] leading-relaxed max-w-md md:max-w-2xl mx-auto px-2 line-clamp-2">
              {publicT('public_practical_guides_and_editorial_articles_to_help_you')}
            </p>
          </div>

          {/* Integrated Clean Search Bar in Hero */}
          <div className="pt-0.5 md:pt-2 max-w-sm sm:max-w-md md:max-w-xl mx-auto px-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={publicT('public_search_by_article_title_or_topic')}
                className="w-full py-2 sm:py-2.5 md:py-3 pl-4 pr-10 md:pr-11 bg-white dark:bg-[#111E38] text-[#203442] dark:text-[#EDF5F5] rounded-full text-[12px] md:text-sm font-bold placeholder:text-[#5C707C] dark:placeholder:text-[#9BB4C7] focus:outline-none shadow-md border border-[#142B5F]/12 dark:border-white/14 focus:border-[#0E7C86] dark:focus:border-[#34BFC9] transition-all text-center font-['Cairo',sans-serif] mn-panel"
                data-mn-design="cd18739893"
              />
              <Search className="w-4 h-4 md:w-4.5 md:h-4.5 text-[#0E7C86] dark:text-[#34BFC9] absolute right-3.5 md:right-4 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 text-[#5C707C] dark:text-[#9BB4C7] hover:text-[#142B5F] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex justify-center mt-1.5 md:mt-2.5 relative z-10">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] md:text-xs font-bold text-[#142B5F] dark:text-[#F2CD78] bg-white/95 dark:bg-[#111E38]/95 border border-[#142B5F]/15 dark:border-[#F2CD78]/30 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-full shadow-xs transition-colors flex items-center gap-1 cursor-pointer font-['Cairo',sans-serif] mn-panel"
            >
              <RotateCcw className="w-3 h-3 text-[#0E7C86] dark:text-[#34BFC9]" />
              <span>
                {publicT('public_reset_filters')}
                {activeFiltersCount})
              </span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2 BALANCED FILTER TILES (التصنيف • الدولة) INSIDE HERO                    */}
        {/* ========================================================================= */}
        <div className="max-w-[320px] sm:max-w-[380px] md:max-w-[460px] mx-auto mt-2 sm:mt-2.5 md:mt-3.5 relative z-20 pb-0 md:pb-1">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 md:gap-3">
            {/* Tile 1: تصنيف المقال */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal((prev) => (prev === 'category' ? null : 'category'));
                }
              }}
              onClick={() => setActiveFilterModal((prev) => (prev === 'category' ? null : 'category'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                activeFilterModal === 'category'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedCategory !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
              title="اختر تصنيف المقال"
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] font-['Cairo',sans-serif] w-full">
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedCategory === 'الكل' ? 'تصنيف المقال' : selectedCategory}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'category' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>

            {/* Tile 2: الدولة / الوجهة */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveFilterModal((prev) => (prev === 'country' ? null : 'country'));
                }
              }}
              onClick={() => setActiveFilterModal((prev) => (prev === 'country' ? null : 'country'))}
              className={`relative min-w-0 overflow-hidden bg-white dark:bg-[#111E38] hover:bg-[#F6F8FA] dark:hover:bg-[#162747] border-1.5 ${
                activeFilterModal === 'country'
                  ? 'border-[#0E7C86] dark:border-[#38C6D4] ring-1 ring-[#0E7C86]/25 dark:ring-[#38C6D4]/25'
                  : selectedCountry !== 'الكل'
                    ? 'border-[#D6A43B] dark:border-[#F2CD78]/75 ring-1 ring-[#D6A43B]/25 dark:ring-[#F2CD78]/20'
                    : 'border-[#142B5F]/18 dark:border-white/14 hover:border-[#0E7C86]/50 dark:hover:border-[#34BFC9]/45'
              } rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 md:p-3 flex flex-col items-center justify-center text-center shadow-[0_4px_14px_rgba(14,30,64,0.08)] transition-all h-[48px] sm:h-[62px] md:h-[70px] cursor-pointer mn-panel font-['Cairo',sans-serif]`}
              title="اختر الدولة أو النطاق"
            >
              <div className="min-w-0 flex items-center justify-center gap-1 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[10px] sm:text-xs md:text-[13px] font-['Cairo',sans-serif] w-full">
                <Globe2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                <span className="min-w-0 truncate font-['Cairo',sans-serif]">
                  {selectedCountry === 'الكل' ? 'الدولة / النطاق' : selectedCountry}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0 transition-transform duration-200 ${activeFilterModal === 'country' ? 'rotate-180 text-[#0E7C86] dark:text-[#38C6D4]' : 'text-[#5C707C] dark:text-[#9BB4C7]'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Ribbon Line */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-[#D6A43B]/45 via-[#F2CD78] to-[#D6A43B]/45 dark:from-[#D6A43B]/30 dark:via-[#F2CD78]/65 dark:to-[#D6A43B]/30 mb-3 md:mb-5" />

      {/* Inline Attached Filter Panels */}
      <PublicInlineFilterPanel
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

      <PublicInlineFilterPanel
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

      {/* ========================================================================= */}
      {/* ARTICLES COMPACT CARDS LIST (MATCHING SCHOLARSHIPS, MAJORS & UNIVERSITIES) */}
      {/* ========================================================================= */}
      <div ref={resultsRef} className="w-full max-w-4xl md:max-w-[1120px] lg:max-w-[1160px] mx-auto px-1 sm:px-2 md:px-4 pt-1 space-y-3 md:space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-[#142B5F] dark:text-[#EDF5F5] font-bold text-[11.5px] sm:text-[13px] md:text-sm font-['Cairo',sans-serif]">
            <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>المقالات والأدلة المتاحة ({filteredArticles.length})</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#34BFC9] bg-[#DDEFF2]/80 dark:bg-[#0E7C86]/20 px-2.5 py-0.5 rounded-full border border-[#0E7C86]/20 dark:border-[#34BFC9]/30 font-['Cairo',sans-serif]">
            <RotateCcw className="w-2.5 h-2.5 text-[#0E7C86] dark:text-[#34BFC9]" />
            <span>{publicT('public_updated_regularly')}</span>
          </div>
        </div>

        {/* Cards Stack */}
        <div className="flex flex-col gap-2.5 sm:gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 items-stretch w-full">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#111E38] border border-[#142B5F]/12 dark:border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-2xs mn-panel">
              <div className="w-12 h-12 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] flex items-center justify-center text-[#0E7C86] dark:text-[#34BFC9] mn-panel">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#142B5F] dark:text-[#EDF5F5] font-['Cairo',sans-serif]">
                لا توجد مقالات أو أدلة مطابقة للبحث
              </h3>
              <p className="text-xs text-[#5C707C] dark:text-[#9BB4C7] max-w-xs font-['Cairo',sans-serif]">
                جرب تغيير خيارات التصفية أو البحث بكلمات أخرى.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-xl text-xs font-bold cursor-pointer font-['Cairo',sans-serif] transition-colors mn-inverse"
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
                  className="bg-white dark:bg-[#111E38] rounded-r-[4px] rounded-l-2xl border border-[#142B5F]/12 dark:border-white/10 border-r-3 border-r-[#142B5F] dark:border-r-[#F2CD78]/85 hover:border-[#142B5F]/28 dark:hover:border-[#F2CD78]/45 shadow-[0_4px_16px_rgba(20,43,95,0.04)] hover:shadow-[0_8px_24px_rgba(20,43,95,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.28)] transition-all duration-150 active:scale-[0.985] p-2.5 sm:p-3 md:p-4 relative overflow-hidden group cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 h-full select-none mn-panel"
                >
                  {/* Top Row: Unified Navy-Petrol Icon Badge & Article Names | Favorite Button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-2.5 text-start min-w-0 flex-1">
                      <div className="w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-xl bg-gradient-to-br from-[#142B5F] via-[#133A6A] to-[#0E7C86] shadow-xs shrink-0 flex items-center justify-center mn-inverse">
                        {renderArticleCategoryIcon(article)}
                      </div>

                      <div className="flex flex-col items-start text-start min-w-0 flex-1">
                        <h3 className="text-[11.5px] sm:text-[13px] md:text-[13.5px] font-bold text-[#142B5F] dark:text-[#EDF5F5] group-hover:text-[#0E7C86] dark:group-hover:text-[#F2CD78] transition-colors font-['Cairo',sans-serif] leading-snug line-clamp-2 break-words w-full">
                          {article.titleAr}
                        </h3>
                        <span className="text-[9.5px] sm:text-[10.5px] font-medium text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif] truncate w-full">
                          {article.titleEn}
                        </span>
                      </div>
                    </div>

                    {/* Favorite Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmark(e, article.id)}
                      className="w-8 h-8 rounded-full bg-[#F6F8FA] dark:bg-[#0B1529] hover:bg-[#DDEFF2]/70 dark:hover:bg-[#162747] border border-[#142B5F]/12 dark:border-white/12 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs shrink-0 mn-panel"
                      title={publicT('public_add_to_favorites')}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isSaved
                            ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]'
                            : 'text-[#5C707C] dark:text-[#9BB4C7]'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Bottom Row: 4 Boxes in 2x2 Grid (3 Frost Info Boxes + View Details CTA) */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#142B5F]/8 dark:border-white/8">
                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                      <BookOpen className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{article.categoryAr}</span>
                    </div>

                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                      <Globe2 className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">{article.countryAr}</span>
                    </div>

                    <div className="min-w-0 overflow-hidden bg-[#F6F8FA] dark:bg-[#0B1529]/85 border border-[#142B5F]/8 dark:border-white/8 rounded-lg px-2 py-1.5 flex items-center justify-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-bold text-[#203442] dark:text-[#DCE7F0] font-['Cairo',sans-serif] mn-panel">
                      <Clock className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#34BFC9] shrink-0" />
                      <span className="min-w-0 leading-tight line-clamp-2 break-words">
                        قراءة {article.readingTime} • {article.updatedAt}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCard(article);
                      }}
                      className="min-w-0 overflow-hidden bg-[#142B5F] hover:bg-[#0E7C86] dark:bg-[#162A52] dark:hover:bg-[#1C3566] text-white dark:text-[#F2CD78] border border-transparent dark:border-[#F2CD78]/35 rounded-lg px-2 py-1.5 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs mn-inverse"
                      data-mn-design="26ecd1db9e"
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold text-center leading-tight text-white dark:text-[#F2CD78] truncate">
                        {publicT('public_view_details')}
                      </span>
                      <ChevronLeft className="w-3.5 h-3.5 rotate-180 text-[#F2CD78] shrink-0" />
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

    </div>
  );
};
