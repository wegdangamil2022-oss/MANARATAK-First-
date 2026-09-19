import React from 'react';
import { BookOpenText, ChevronLeft } from 'lucide-react';
import { RelatedArticleRef } from '../types';

interface RelatedArticlesStripProps {
  articles?: RelatedArticleRef[];
  onOpenArticle?: (articleId: string) => void;
  compact?: boolean;
}

export const RelatedArticlesStrip: React.FC<RelatedArticlesStripProps> = ({ articles, onOpenArticle, compact = false }) => {
  if (!articles || articles.length === 0) return null;
  return (
    <section className={`rounded-2xl border border-[var(--mn-border-brand)]/25 bg-[var(--mn-surface)] shadow-sm  mn-panel ${compact ? 'p-3' : 'p-3.5'}`}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--mn-primary)]/8 text-[var(--mn-heading)]">
          <BookOpenText className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-[11px] font-bold text-[var(--mn-heading)]">مقالات وأدلة مرتبطة</h3>
          <p className="text-[8.5px] font-semibold text-[var(--mn-text-muted)]">محتوى تحريري يساعدك على فهم المتطلبات والسياق</p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {articles.map((article) => (
          <button
            key={article.id}
            type="button"
            onClick={() => onOpenArticle?.(article.id)}
            disabled={!onOpenArticle}
            className="min-w-[220px] max-w-[260px] rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-right transition enabled:hover:border-[var(--mn-accent)] enabled:active:scale-[0.99] mn-panel "
          >
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-[var(--mn-accent-text)]">
              <span>{article.typeLabel || 'مقال'}</span>
              {article.category && <span className="text-[var(--mn-text-muted)]">• {article.category}</span>}
            </div>
            <p className="mt-1 text-[10px] font-bold leading-5 text-[var(--mn-heading)] line-clamp-2">{article.title}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              {article.meta ? <p className="line-clamp-1 text-[8.5px] font-semibold text-[var(--mn-text-muted)]">{article.meta}</p> : <span />}
              <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

