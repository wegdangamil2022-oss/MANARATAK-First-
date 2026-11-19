import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { ArrowUpLeft, Clock, Newspaper } from 'lucide-react';
import { RelatedArticleRef } from '../types';
import { DetailSectionHeader } from './DetailUi';

interface RelatedArticlesStripProps {
  articles?: RelatedArticleRef[];
  onOpenArticle?: (articleId: string) => void;
  compact?: boolean;
}

const RelatedArticleCover: React.FC<{ category: string; title: string }> = ({
  category,
  title,
}) => {
  const normTitle = title.toLowerCase();
  const normCat = category.toLowerCase();

  if (normTitle.includes('تركي') || normCat.includes('منح')) {
    return (
      <svg viewBox="0 0 400 240" className="w-full h-full object-cover" fill="none">
        <rect width="400" height="240" fill="url(#rel_turk_grad)" />
        <defs>
          <linearGradient id="rel_turk_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
            <stop stopColor="#142B5F" />
            <stop offset="1" stopColor="#0A1633" />
          </linearGradient>
        </defs>
        <circle cx="340" cy="40" r="85" fill="#D6A43B" fillOpacity="0.08" />
        <circle cx="60" cy="200" r="65" fill="white" fillOpacity="0.05" />
        <path d="M 200 52 L 260 77 L 200 102 L 140 77 Z" fill="#D6A43B" />
        <rect x="175" y="88" width="50" height="18" rx="4" fill="#F2CD78" />
        <path d="M 250 80 L 250 112" stroke="#F2CD78" strokeWidth="3" strokeLinecap="round" />
        <circle cx="250" cy="115" r="4" fill="#F2CD78" />
      </svg>
    );
  }

  if (normTitle.includes('ielts') || normCat.includes('اختبار')) {
    return (
      <svg viewBox="0 0 400 240" className="w-full h-full object-cover" fill="none">
        <rect width="400" height="240" fill="url(#rel_ielts_grad)" />
        <defs>
          <linearGradient id="rel_ielts_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
            <stop stopColor="#142B5F" />
            <stop offset="1" stopColor="#0E7C86" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="95" r="44" fill="#D6A43B" fillOpacity="0.18" stroke="#F2CD78" strokeWidth="2.5" />
        <text x="200" y="104" textAnchor="middle" fill="#F2CD78" fontSize="24" fontWeight="900" fontFamily="sans-serif">
          IELTS
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 400 240" className="w-full h-full object-cover" fill="none">
      <rect width="400" height="240" fill="url(#rel_gen_grad)" />
      <defs>
        <linearGradient id="rel_gen_grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#142B5F" />
          <stop offset="0.55" stopColor="#153B75" />
          <stop offset="1" stopColor="#0E7C86" />
        </linearGradient>
      </defs>
      <circle cx="330" cy="45" r="70" fill="#D6A43B" fillOpacity="0.1" />
      <circle cx="200" cy="95" r="38" fill="#D6A43B" fillOpacity="0.18" stroke="#D6A43B" strokeWidth="2.5" />
      <path d="M 200 72 L 234 86 L 200 100 L 166 86 Z" fill="#F2CD78" />
      <rect x="182" y="96" width="36" height="12" rx="3" fill="#D6A43B" />
    </svg>
  );
};

export const RelatedArticlesStrip: React.FC<RelatedArticlesStripProps> = ({
  articles,
  onOpenArticle,
}) => {
  const { t: publicT } = usePublicTemplateTranslation();

  if (!articles || articles.length === 0) return null;

  return (
    <section className="relative w-full bg-[var(--mn-surface)] rounded-none px-3 sm:px-3.5 py-3.5 border-y border-[var(--mn-border-brand)]/40 shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
      {/* Top Distinctive Accent Line */}
      <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

      <DetailSectionHeader
        icon={Newspaper}
        title={publicT('public_related_articles_and_guides')}
        className="mb-3"
      />

      <div className="flex overflow-x-auto pb-1.5 pt-0.5 -mx-1 px-1 gap-2.5 snap-x snap-mandatory scroll-smooth touch-pan-x no-scrollbar">
        {articles.map((article) => {
          const categoryLabel = article.category || article.typeLabel || publicT('public_article');
          const metaLabel = article.meta || '4 دقائق قراءة';

          return (
            <button
              key={article.id}
              type="button"
              onClick={() => onOpenArticle?.(article.id)}
              disabled={!onOpenArticle}
              className="snap-start shrink-0 w-[160px] sm:w-[184px] relative group flex flex-col rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#142B5F]/45 dark:hover:border-[#D6A43B]/55 shadow-2xs hover:shadow-xs transition-all duration-300 cursor-pointer overflow-hidden text-start enabled:active:scale-[0.99] disabled:cursor-default"
            >
              {/* Partial Box Header Line matching FeaturedArticles */}
              <div className="absolute top-0 left-0 right-0 h-1/2 border-t-[3px] border-r-[3px] border-l-[3px] border-[#142B5F] dark:border-[#D6A43B] rounded-t-xl pointer-events-none z-20" />

              {/* Thumbnail Header */}
              <div className="w-full h-20 sm:h-24 relative overflow-hidden bg-[var(--mn-surface-muted)]">
                <RelatedArticleCover category={categoryLabel} title={article.title} />

                {/* Category Badge */}
                <div className="absolute top-1.5 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] sm:text-[8.5px] font-bold px-2 py-0.5 rounded-full shadow-xs border border-white/20 max-w-[85%] truncate">
                  {categoryLabel}
                </div>

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
              </div>

              {/* Content Body */}
              <div className="flex flex-col p-2 sm:p-2.5 flex-1 w-full">
                <h4 className="font-bold text-[10.5px] sm:text-[11.5px] text-[var(--mn-heading)] leading-snug line-clamp-2 group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors mb-1.5 font-['Cairo',sans-serif]">
                  {article.title}
                </h4>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between pt-1.5 border-t border-[var(--mn-border)]/60 w-full">
                  <span className="flex items-center gap-1 text-[var(--mn-text-muted)] text-[8.5px] sm:text-[9px] font-semibold truncate">
                    <Clock className="w-3 h-3 text-[#D6A43B] shrink-0" />
                    <span className="truncate">{metaLabel}</span>
                  </span>
                  <div className="w-5 h-5 rounded-full bg-[#142B5F] border border-[#D6A43B]/70 text-[#F2CD78] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 shadow-2xs">
                    <ArrowUpLeft className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
