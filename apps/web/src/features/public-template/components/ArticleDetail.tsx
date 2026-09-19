import React from 'react';
import {
  ArrowRight,
  BookOpenText,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  Languages,
  MapPin,
  Newspaper,
  ShieldCheck,
  Tag,
  UserRound,
} from 'lucide-react';
import { ArticleEntityRef, PublicArticle } from '../types';
import { FavoriteButton } from './FavoriteButton';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';

interface ArticleDetailProps {
  article: PublicArticle;
  onBack: () => void;
  onOpenScholarship?: (id: string) => void;
  onOpenUniversity?: (id: string) => void;
  onOpenCountry?: (id: string) => void;
  onOpenMajor?: (id: string) => void;
  onOpenExam?: (id: string) => void;
  onOpenCourse?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}

const entityIcon = (type: ArticleEntityRef['type']) => {
  switch (type) {
    case 'SCHOLARSHIP':
      return <GraduationCap className="h-4 w-4" />;
    case 'UNIVERSITY':
      return <Building2 className="h-4 w-4" />;
    case 'COUNTRY':
      return <MapPin className="h-4 w-4" />;
    case 'MAJOR':
      return <BookOpenText className="h-4 w-4" />;
    case 'EXAM':
      return <Languages className="h-4 w-4" />;
    case 'COURSE':
      return <FileText className="h-4 w-4" />;
  }
};

const entityLabel = (type: ArticleEntityRef['type']) => {
  switch (type) {
    case 'SCHOLARSHIP': return 'منحة مرتبطة';
    case 'UNIVERSITY': return 'جامعة مرتبطة';
    case 'COUNTRY': return 'دولة مرتبطة';
    case 'MAJOR': return 'تخصص مرتبط';
    case 'EXAM': return 'اختبار مرتبط';
    case 'COURSE': return 'دورة مرتبطة';
  }
};

export const ArticleDetail: React.FC<ArticleDetailProps> = ({
  article,
  onBack,
  onOpenScholarship,
  onOpenUniversity,
  onOpenCountry,
  onOpenMajor,
  onOpenExam,
  onOpenCourse,
  isFavorite = false,
  onToggleFavorite,
  searchAnchor,
  searchTerm,
}) => {
  useDetailSearchTarget(searchAnchor, searchTerm);
  const openEntity = (entity: ArticleEntityRef) => {
    if (!entity.id) return;
    if (entity.type === 'SCHOLARSHIP' && entity.id) onOpenScholarship?.(entity.id);
    if (entity.type === 'UNIVERSITY' && entity.id) onOpenUniversity?.(entity.id);
    if (entity.type === 'COUNTRY') onOpenCountry?.(entity.id);
    if (entity.type === 'MAJOR' && entity.id) onOpenMajor?.(entity.id);
    if (entity.type === 'EXAM' && entity.id) onOpenExam?.(entity.id);
    if (entity.type === 'COURSE' && entity.id) onOpenCourse?.(entity.id);
  };

  return (
    <div className="min-h-screen bg-[var(--mn-page)] pb-20 font-['Cairo',sans-serif] mn-panel " dir="rtl">
      <header className="relative overflow-hidden border-b-[3px] border-[var(--mn-accent)]/70 bg-gradient-to-b from-[var(--mn-primary)] via-[var(--mn-hero-secondary)] to-[var(--mn-primary)] px-4 pb-6 pt-3 text-white shadow-md mn-inverse ">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[var(--mn-accent)]/20" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-[var(--mn-accent)]/10 blur-2xl" />
        <div className="relative mx-auto max-w-3xl">
          {onToggleFavorite && (
            <FavoriteButton
              active={isFavorite}
              onToggle={(event) => {
                event.stopPropagation();
                onToggleFavorite(article.id);
              }}
              className="absolute left-0 top-0 z-20 bg-[var(--mn-surface)]/95 mn-panel "
            />
          )}
          <div className="mb-4"><DetailBackButton onBack={onBack} /></div>

          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--mn-accent)]/35 bg-[var(--mn-accent)]/10 px-2.5 py-1 text-[9px] font-bold text-[var(--mn-accent-text)]">
              <Newspaper className="h-3 w-3" />
              {article.contentTypeLabelAr}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-bold text-white">
              {article.categoryAr}
            </span>
          </div>

          <h1 className="text-[22px] font-bold leading-9 sm:text-[28px]">{article.titleAr}</h1>
          <p className="mt-1 text-left text-[10px] font-semibold leading-5 text-[var(--mn-on-dark-muted)]" dir="ltr">{article.titleEn}</p>
          <p className="mt-3 text-[11px] font-semibold leading-6 text-[var(--mn-on-dark-muted)]">{article.excerptAr}</p>

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            <MetaTile icon={<UserRound className="h-3.5 w-3.5" />} label="الكاتب" value={article.author} />
            <MetaTile icon={<Clock3 className="h-3.5 w-3.5" />} label="القراءة" value={article.readingTime || '—'} />
            <MetaTile icon={<CalendarDays className="h-3.5 w-3.5" />} label="آخر تحديث" value={article.updatedAt} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 mn-inline-gutter pt-4">
        {article.tags && article.tags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {article.tags.map((tag) => (
              <span key={tag} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2.5 py-1.5 text-[9px] font-bold text-[var(--mn-text-muted)] shadow-sm mn-panel ">
                <Tag className="h-3 w-3 text-[var(--mn-accent-text)]" />
                {tag}
              </span>
            ))}
          </div>
        )}

        <article className="space-y-3">
          {article.sections.map((section, index) => (
            <section key={`${article.id}-${index}`} className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 shadow-sm sm:p-4 mn-panel ">
              <DetailSectionHeader
                id={`article-section-${index + 1}`}
                iconNode={<span className="text-[10px] font-bold">{index + 1}</span>}
                title={section.title}
              />
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mb-2 last:mb-0 text-[10.5px] font-semibold leading-6 text-[var(--mn-text-muted)]">{paragraph}</p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-1.5 text-[10px] font-semibold leading-5 text-[var(--mn-text-muted)]">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        {article.linkedEntities && article.linkedEntities.length > 0 && (
          <section className="rounded-2xl border border-[var(--mn-border-brand)]/30 bg-[var(--mn-surface)] p-3.5 shadow-sm mn-panel ">
            <DetailSectionHeader id="article-related" icon={Globe2} title="مرتبط في منارتك" subtitle="انتقل مباشرة إلى الكيان المرتبط بالمقال" />
            <div className="grid grid-cols-2 gap-2">
              {article.linkedEntities.map((entity) => (
                <button
                  key={`${entity.type}-${entity.id || entity.name}`}
                  type="button"
                  onClick={() => openEntity(entity)}
                  className="min-h-[84px] rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2.5 text-right transition hover:border-[var(--mn-accent)] active:scale-[0.99] mn-panel "
                >
                  <div className="flex items-center gap-1.5 text-[var(--mn-heading)]">
                    {entityIcon(entity.type)}
                    <span className="text-[8px] font-bold text-[var(--mn-text-muted)]">{entityLabel(entity.type)}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold leading-4 text-[var(--mn-heading)]">{entity.name}</p>
                  {entity.meta && <p className="mt-1 line-clamp-2 text-[8.5px] font-semibold leading-4 text-[var(--mn-text-muted)]">{entity.meta}</p>}
                </button>
              ))}
            </div>
          </section>
        )}

        {article.officialLinks && article.officialLinks.length > 0 && (
          <section className="rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 shadow-sm mn-panel ">
            <DetailSectionHeader id="article-official-links" icon={ExternalLink} title="مصادر رسمية مرتبطة بالمقال" />
            <div className="space-y-2">
              {article.officialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mn-external-link inline-flex min-h-10 items-center justify-between gap-3 rounded-xl px-3 py-2 mn-panel "
                >
                  <div>
                    <p className="text-[10px] font-bold text-[var(--mn-heading)]">{link.label}</p>
                    {link.note && <p className="mt-0.5 text-[8.5px] font-semibold text-[var(--mn-text-muted)]">{link.note}</p>}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--mn-accent-text)]" />
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

function MetaTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-2 py-2 text-center backdrop-blur-sm">
      <div className="mx-auto flex w-fit items-center gap-1 text-[8px] font-bold text-[var(--mn-on-dark-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[8.5px] font-bold leading-4 text-white">{value}</p>
    </div>
  );
}

