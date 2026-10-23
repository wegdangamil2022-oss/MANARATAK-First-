import { ChevronLeft, ChevronRight } from 'lucide-react';

export const REVIEW_RESULTS_PAGE_SIZE = 10;

export function ReviewResultsPagination({ page, total, language, position, onPage }: {
  page: number; total: number; language: string; position: 'top' | 'bottom'; onPage: (page: number) => void;
}) {
  const ar = language === 'ar';
  const pages = Math.max(1, Math.ceil(total / REVIEW_RESULTS_PAGE_SIZE));
  const number = (value: number) => new Intl.NumberFormat(language).format(value);
  const Previous = ar ? ChevronRight : ChevronLeft;
  const Next = ar ? ChevronLeft : ChevronRight;
  return <nav className="review-pagination" aria-label={ar ? `صفحات النتائج — ${position === 'top' ? 'أعلى' : 'أسفل'}` : `Result pages — ${position}`}>
    <span className="review-page-range"><bdi dir="ltr">{total ? `${number((page - 1) * REVIEW_RESULTS_PAGE_SIZE + 1)}–${number(Math.min(page * REVIEW_RESULTS_PAGE_SIZE, total))}` : number(0)}</bdi> {ar ? 'من' : 'of'} <bdi>{number(total)}</bdi> <small>{ar ? 'سجل محمّل' : 'loaded records'}</small></span>
    <div>
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}><Previous aria-hidden="true" />{ar ? 'السابق' : 'Previous'}</button>
      <span className="review-page-number" dir="ltr">{number(page)} / {number(pages)}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>{ar ? 'التالي' : 'Next'}<Next aria-hidden="true" /></button>
    </div>
  </nav>;
}
