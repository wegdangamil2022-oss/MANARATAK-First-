import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  Clock3,
  FileCheck2,
  FileText,
  Newspaper,
  Search,
  Tag,
  UserRound,
  X,
  Sparkles,
} from 'lucide-react';
import { PublicArticle } from '../types';
import { FavoriteButton } from './FavoriteButton';

type ArticleType = PublicArticle['contentType'];

const TYPE_STYLE: Record<ArticleType, { icon: React.ReactNode; label: string; className: string }> = {
  STUDY_GUIDE: {
    icon: <BookOpenText className="h-4 w-4" />,
    label: 'دليل دراسي',
    className: 'bg-[var(--mn-surface-muted)] text-[var(--mn-link)] border-[var(--mn-border-brand)] mn-panel ',
  },
  ARTICLE: {
    icon: <Newspaper className="h-4 w-4" />,
    label: 'مقال',
    className: 'bg-[var(--mn-page)] text-[var(--mn-text)] border-[var(--mn-border)] mn-panel ',
  },
  NEWS: {
    icon: <Clock3 className="h-4 w-4" />,
    label: 'خبر',
    className: 'bg-[var(--mn-gold-surface)] text-[var(--mn-accent-text)] border-[var(--mn-border-gold)] mn-panel ',
  },
  CHECKLIST: {
    icon: <FileCheck2 className="h-4 w-4" />,
    label: 'قائمة تحقق',
    className: 'bg-[var(--mn-success-soft)] text-[var(--mn-success-text)] border-[var(--mn-success-border)]',
  },
  FAQ: {
    icon: <FileText className="h-4 w-4" />,
    label: 'أسئلة شائعة',
    className: 'bg-[var(--mn-page)] text-[var(--mn-text)] border-[var(--mn-border)] mn-panel',
  },
  STATIC_PAGE: {
    icon: <FileText className="h-4 w-4" />,
    label: 'صفحة ثابتة',
    className: 'bg-[var(--mn-surface-muted)] text-[var(--mn-text)] border-[var(--mn-border)] mn-panel',
  },
};

interface ArticlesSearchPageProps {
  articles: PublicArticle[];
  onBack?: () => void;
  onSelectArticle?: (article: PublicArticle) => void;
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
}

export const ArticlesSearchPage: React.FC<ArticlesSearchPageProps> = ({ articles, onBack, onSelectArticle, favoriteIds = [], onToggleFavorite }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | ArticleType>('ALL');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((article) => {
      if (selectedType !== 'ALL' && article.contentType !== selectedType) return false;
      if (!q) return true;
      return [article.titleAr, article.titleEn, article.categoryAr, article.author]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [articles, searchQuery, selectedType]);

  return (
    <main dir="rtl" className="min-h-screen bg-[var(--mn-page)] pb-16 font-['Cairo',sans-serif] mn-panel ">
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--mn-primary)] via-[var(--mn-primary)] to-[var(--mn-primary)] px-4 pb-12 pt-5 text-white shadow-sm mn-inverse ">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[var(--mn-border-gold)]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full border border-white/10" />

        <div className="relative mx-auto max-w-xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-[var(--mn-on-dark-muted)] backdrop-blur-sm transition hover:bg-white/10"
              aria-label="العودة"
              title="العودة"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="rounded-full border border-[var(--mn-border-gold)] bg-[var(--mn-accent)]/10 px-3 py-1 text-[10px] font-bold text-[var(--mn-accent-text)]">
              منصة المعرفة
            </span>
          </div>

          <div className="text-center">
            <Sparkles className="mb-1 h-4 w-4 text-[var(--mn-accent-text)]" aria-hidden="true" />
            <h1 className="text-[22px] font-bold leading-9 sm:text-[26px]">المقالات والأدلة الدراسية</h1>
            <p className="mx-auto mt-1.5 max-w-sm text-[11px] font-medium leading-6 text-[var(--mn-on-dark-muted)] sm:text-xs">
              أدلة عملية ومقالات تحريرية تساعدك على فهم المنح والقبول والدراسة والاختبارات واتخاذ قرار أوضح.
            </p>
          </div>

          <div className="mx-auto mt-4 max-w-md">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mn-accent-text)]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ابحث بعنوان المقال أو الموضوع..."
                className="w-full rounded-full border border-[var(--mn-border-gold)] bg-[var(--mn-primary)]/80 py-2.5 pl-10 pr-10 text-center text-xs font-bold text-white outline-none placeholder:text-[var(--mn-on-dark-muted)] focus:border-[var(--mn-border-gold)] focus:bg-[var(--mn-primary)] mn-inverse focus:mn-inverse "
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--mn-on-dark-muted)] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-7 max-w-xl space-y-3 mn-inline-gutter">
        <div className="rounded-3xl border border-[var(--mn-border-gold)] bg-[var(--mn-surface)] p-2 shadow-md mn-panel ">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { value: 'ALL', label: 'الكل' },
              { value: 'STUDY_GUIDE', label: 'أدلة' },
              { value: 'ARTICLE', label: 'مقالات' },
              { value: 'NEWS', label: 'أخبار' },
              { value: 'CHECKLIST', label: 'قوائم تحقق' },
            ].map((item) => {
              const active = selectedType === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedType(item.value as 'ALL' | ArticleType)}
                  className={`min-h-9 shrink-0 rounded-2xl px-3 text-[10px] font-bold transition sm:text-[11px] ${
                    active
                      ? 'bg-[var(--mn-primary)] text-white shadow-sm mn-inverse '
                      : 'border border-[var(--mn-border)] bg-[var(--mn-page)] text-[var(--mn-text-muted)] hover:bg-[var(--mn-surface-muted)] mn-panel hover:mn-panel '
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-1 pt-1 text-[10px] font-bold text-[var(--mn-text-muted)] sm:text-[11px]">
          <span>{filtered.length} مواد معرفية</span>
          <span>الأحدث أولًا</span>
        </div>

        <section className="space-y-3">
          {filtered.map((article, index) => {
            const typeStyle = TYPE_STYLE[article.contentType];
            return (
              <article
                key={article.id}
                className="relative group overflow-hidden rounded-3xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] bg-[var(--mn-surface)] shadow-sm transition hover:shadow-md mn-panel "
              >
                {onToggleFavorite && (
                  <FavoriteButton
                    active={favoriteIds.includes(article.id)}
                    onToggle={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(article.id);
                    }}
                    className="absolute left-3 top-3 z-20"
                  />
                )}
                <div className="grid grid-cols-[88px_1fr] gap-0 sm:grid-cols-[116px_1fr]">
                  <div className="relative min-h-[156px] overflow-hidden bg-gradient-to-br from-[var(--mn-primary)] via-[var(--mn-primary)] to-[var(--mn-primary)] p-3 text-white sm:min-h-[172px] mn-inverse ">
                    <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full border border-[var(--mn-border-gold)]" />
                    <div className="absolute -bottom-10 -right-8 h-24 w-24 rounded-full bg-[var(--mn-accent)]/10" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[var(--mn-accent-text)]">
                        {typeStyle.icon}
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-[var(--mn-accent-text)]">MANARATAK</span>
                        <span className="mt-0.5 block text-[9px] font-bold leading-4 text-[var(--mn-on-dark-muted)]">المعرفة والإرشاد</span>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 p-3 sm:p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold ${typeStyle.className}`}>
                        {typeStyle.icon}
                        {article.contentTypeLabelAr}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--mn-surface)] px-2 py-1 text-[9px] font-bold text-[var(--mn-accent-text)] mn-panel ">
                        <Tag className="h-2.5 w-2.5" />
                        {article.categoryAr}
                      </span>
                      {index === 0 && (
                        <span className="rounded-full bg-[var(--mn-primary)]/7 px-2 py-1 text-[9px] font-bold text-[var(--mn-heading)]">مميز</span>
                      )}
                    </div>

                    <h2 className="line-clamp-2 text-[13px] font-bold leading-6 text-[var(--mn-heading)] sm:text-[14px]">
                      {article.titleAr}
                    </h2>
                    <p className="mt-0.5 line-clamp-1 text-left text-[9px] font-semibold text-[var(--mn-text-muted)]" dir="ltr">
                      {article.titleEn}
                    </p>

                    {article.excerptAr && (
                      <p className="mt-2 line-clamp-2 text-[10px] font-medium leading-5 text-[var(--mn-text-muted)] sm:text-[11px]">
                        {article.excerptAr}
                      </p>
                    )}

                    {article.linkedEntities && article.linkedEntities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {article.linkedEntities.slice(0, 3).map((entity) => (
                          <span
                            key={`${entity.type}-${entity.name}`}
                            className="rounded-lg border border-[var(--mn-border-brand)] bg-[var(--mn-surface-muted)]/60 px-1.5 py-1 text-[8px] font-semibold text-[var(--mn-heading)]"
                          >
                            {entity.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-[var(--mn-border)] pt-2.5">
                      <div className="min-w-0 space-y-0.5 text-[8px] font-bold text-[var(--mn-text-muted)] sm:text-[9px]">
                        <span className="flex items-center gap-1 truncate">
                          <UserRound className="h-2.5 w-2.5" />
                          {article.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {article.updatedAt}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectArticle?.(article)}
                        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl bg-[var(--mn-primary)] px-3 text-[10px] font-bold text-white shadow-sm transition hover:bg-[var(--mn-primary-hover)] active:scale-[0.99] mn-inverse hover:mn-inverse"
                      >
                        اقرأ المقال
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
};
