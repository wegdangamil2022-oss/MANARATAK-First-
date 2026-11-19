import React from 'react';
import { CmsRichText } from '@manaratak/ui';
import {
  BookOpen,
  Building2,
  Calendar,
  Clock,
  FileText,
  Globe,
  Heart,
} from 'lucide-react';
import type { PublicArticle } from '../types';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';
import { CulturalExchangeArticleContent } from './CulturalExchangeArticleContent';

interface ArticleDetailProps {
  article?: PublicArticle;
  relatedArticles?: PublicArticle[];
  articleId?: string;
  articleSlug?: string;
  searchAnchor?: string;
  searchTerm?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onBack: () => void;
  onSelectRelated?: (slug: string) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  onOpenScholarship?: (id: string) => void;
  onOpenUniversity?: (id: string) => void;
  onOpenCountry?: (id: string) => void;
  onOpenMajor?: (id: string) => void;
  onOpenExam?: (id: string) => void;
  onOpenCourse?: (id: string) => void;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({
  article: propArticle,
  articleId,
  articleSlug,
  isFavorite,
  onToggleFavorite,
  onBack,
  onSelectRelated,
  isSaved = false,
  relatedArticles: relatedArticleItems = [],
  onToggleSave, searchAnchor, searchTerm, onOpenScholarship, onOpenUniversity, onOpenCountry, onOpenMajor, onOpenExam, onOpenCourse,
}) => {
  useDetailSearchTarget(searchAnchor, searchTerm);
  const targetId = propArticle?.id || articleId;
  const targetSlug = propArticle?.slug || articleSlug;
  const preview = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype';
  const article = propArticle ? {
    ...propArticle, authorNameAr: propArticle.author, authorRoleAr: propArticle.reviewer || '', countryAr: '',
    sections: propArticle.sections.map((section, index) => ({ id: String(index), headingAr: section.title, paragraphsAr: section.paragraphs || [], bulletsAr: section.bullets, calloutAr: undefined as string | undefined })),
  } : undefined;
  if (!article) return <div role="status" className="p-6 text-center">المقال غير متاح<button type="button" onClick={onBack}>رجوع</button></div>;

  const savedState = isFavorite ?? isSaved;
  const handleToggleBookmark = onToggleFavorite || onToggleSave;

  const isCulturalExchange =
    preview && (article.id === 'art_cultural_exchange' ||
    article.slug === 'yemen-cultural-exchange-scholarships-guide');

  const relatedArticles = relatedArticleItems.filter(a => a.id !== article.id).slice(0, 3);

  const authorityAr = isCulturalExchange
    ? 'وزارة التعليم العالي والبحث العلمي — قطاع البعثات والعلاقات الثقافية'
    : `${article.authorNameAr} — ${article.authorRoleAr}`;

  return (
    <div
      className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-12 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--mn-surface-muted)] min-h-screen mn-panel mn-article-detail"
      dir="rtl"
    >
      {/* 1. EDITORIAL ARTICLE HEADER (ترويسة خاصة بالمقالات والأدلة المرجعية) */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border-b-2 border-[#D6A43B] shadow-md">
        <div className="relative z-10 px-3.5 sm:px-5 md:px-8 py-4 md:py-5 space-y-3">
          {/* الصف العلوي: عنوان المقال الرئيسي يميناً + أزرار المحفوظة والرجوع يساراً بمسافة آمنة بعيداً عن النص والخط الفاصل */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/15">
            <h1 className="flex-1 min-w-0 pl-2 text-[14.5px] sm:text-[16px] md:text-[22px] lg:text-[24px] font-extrabold text-white leading-[1.6] drop-shadow-xs">
              {article.titleAr}
            </h1>

            <div className="flex items-center gap-2 shrink-0 mn-panel">
              {handleToggleBookmark && (
                <button
                  type="button"
                  onClick={() => handleToggleBookmark(article.id)}
                  className="mn-detail-close transition-all active:scale-95 cursor-pointer"
                  aria-label={savedState ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  title={savedState ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                >
                  <Heart
                    className={`h-3.5 w-3.5 md:h-4 md:w-4 ${
                      savedState
                        ? 'fill-[#0E7C86] text-[#0E7C86] dark:fill-[#38C6D4] dark:text-[#38C6D4]'
                        : 'text-[#142B5F] dark:text-[#F2CD78]'
                    }`}
                  />
                </button>
              )}
              <DetailBackButton onBack={onBack} mode="back" />
            </div>
          </div>

          {/* جهة الاختصاص والمرجع التحريري داخل شريط المقال العلوي */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#142B5F]/90 border border-[#F2CD78]/60 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-[#F2CD78]" />
            </div>
            <p className="min-w-0 flex-1 text-[11px] sm:text-[12px] font-bold text-white leading-relaxed">
              {authorityAr}
            </p>
          </div>
        </div>
      </div>

      <div className="px-0 md:px-4 space-y-3 md:space-y-4 z-20 relative pt-2.5 md:pt-4">
        {/* 2. شريط بيانات المقال التحريري الموحد (جميع الأيقونات باللون النيلي) */}
        <div
          className="w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl border-y md:border border-[var(--mn-border)] shadow-sm overflow-hidden mn-panel"
          dir="rtl"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-[var(--mn-border)]">
            {/* 1. تصنيف الدليل */}
            <div className="p-2.5 sm:p-3 flex items-center gap-2 min-w-0 border-b md:border-b-0 border-[var(--mn-border)]">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] text-white flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-bold text-[var(--mn-text-muted)] leading-tight">
                  تصنيف الدليل
                </span>
                <span className="block text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] truncate mt-0.5">
                  {article.categoryAr}
                </span>
              </div>
            </div>

            {/* 2. الدولة / النطاق */}
            <div className="p-2.5 sm:p-3 flex items-center gap-2 min-w-0 border-b md:border-b-0 border-[var(--mn-border)]">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] text-white flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-bold text-[var(--mn-text-muted)] leading-tight">
                  الدولة / النطاق
                </span>
                <span className="block text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] truncate mt-0.5">
                  {article.countryAr}
                </span>
              </div>
            </div>

            {/* 3. وقت القراءة */}
            <div className="p-2.5 sm:p-3 flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] text-white flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-bold text-[var(--mn-text-muted)] leading-tight">
                  وقت القراءة
                </span>
                <span className="block text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] truncate mt-0.5">
                  {article.readingTime}
                </span>
              </div>
            </div>

            {/* 4. تاريخ التحديث */}
            <div className="p-2.5 sm:p-3 flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] text-white flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[9.5px] font-bold text-[var(--mn-text-muted)] leading-tight">
                  تاريخ التحديث
                </span>
                <span className="block text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] truncate mt-0.5">
                  {article.updatedAt}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MAIN CONTENT SECTIONS */}
        <div className="px-0 space-y-4 sm:space-y-5 md:space-y-6">
          {/* مربع موحد يوضح ماذا سيشرح هذا المقال (بدلاً من أبرز المحاور والنقاط الجوهرية) */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-2.5 mn-panel">
            <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
            <DetailSectionHeader
              icon={BookOpen}
              title="ماذا سيشرح لك هذا المقال؟"
              className="mb-1"
            />
            <div className="relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 md:p-4 pr-4 shadow-2xs w-full">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]"
              />
              <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <span
                  aria-hidden="true"
                  className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0"
                />
                {isCulturalExchange ? (
                  <>
                    يشرح هذا الدليل المرجعي خطوة بخطوة كل ما يحتاج الطالب اليمني معرفته حول{' '}
                    <strong className="text-[var(--mn-heading)]">منح التبادل الثقافي</strong> المقدمة عبر وزارة التعليم العالي؛ بدءًا من مفهوم التبادل الثقافي وشروط الأهلية لآخر دفعتين، والفرق الدقيق بينه وبين المنح الخارجية المستقلة، مرورًا بطريقة حساب معدل المفاضلة الموزون (30% للثانوية و70% للاختبار) والمواد والوحدات المقررة، وصولًا إلى ملاحق التقديم التفصيلية لكل دولة (المجر، الصين، جامعة الأمير محمد بن فهد، مصر، الجزائر، كوبا، وباكستان)، وطريقة توزيع المقاعد بين المحافظات، وإجراءات التظلمات وما بعد القبول حتى السفر.
                  </>
                ) : (
                  article.excerptAr
                )}
              </p>
            </div>
          </div>

          {/* Official Body Template: Full Cultural Exchange Guide OR Standard Unified Article Sections */}
          {isCulturalExchange ? (
            <CulturalExchangeArticleContent />
          ) : (
            <div className="space-y-4 sm:space-y-5 md:space-y-6">
              {'body' in article && article.body && <CmsRichText body={article.body} />}
              {article.sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3 md:space-y-4 mn-panel"
                >
                  <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
                  <DetailSectionHeader
                    icon={BookOpen}
                    title={`${idx + 1}. ${sec.headingAr}`}
                    className="mb-1"
                  />

                  <div className="space-y-2.5 md:space-y-3 w-full">
                    {sec.paragraphsAr.map((p, pIdx) => (
                      <div
                        key={pIdx}
                        className="rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 md:p-4 shadow-2xs w-full"
                      >
                        <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                          {p}
                        </p>
                      </div>
                    ))}
                  </div>

                  {sec.bulletsAr && sec.bulletsAr.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 pt-0.5 items-stretch w-full">
                      {sec.bulletsAr.map((b, bIdx) => (
                        <div
                          key={bIdx}
                          className="p-2.5 md:p-3.5 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] shadow-2xs w-full h-full flex items-center"
                        >
                          <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                            <span
                              aria-hidden="true"
                              className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-2 shrink-0"
                            />
                            {b}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {sec.calloutAr && (
                    <div className="relative p-3 md:p-4 rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] overflow-hidden w-full">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 right-0 w-4 h-7 rounded-tr-xl border-t-[2.5px] border-r-[2.5px] border-[#0E7C86]"
                      />
                      <p className="w-full text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-[1.85] text-justify">
                        <span
                          aria-hidden="true"
                          className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-2 shrink-0"
                        >
                          <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                        </span>
                        {sec.calloutAr}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {propArticle?.linkedEntities?.length ? <section className="space-y-2"><DetailSectionHeader icon={Building2} title="محتوى مرتبط" />{propArticle.linkedEntities.map((entity, index) => <button type="button" key={index} className="p-3 border rounded-xl" disabled={!entity.id} onClick={() => { const open = { SCHOLARSHIP: onOpenScholarship, UNIVERSITY: onOpenUniversity, COUNTRY: onOpenCountry, MAJOR: onOpenMajor, EXAM: onOpenExam, COURSE: onOpenCourse }[entity.type]; if (entity.id) open?.(entity.id); }}>{entity.name}</button>)}</section> : null}
          {/* Related Articles Section */}
          {relatedArticles.length > 0 && (
            <div className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden space-y-3.5 md:space-y-4 mn-panel">
              <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />
              <DetailSectionHeader
                icon={FileText}
                title="أدلة ومقالات ذات صلة"
                className="mb-1"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-4 items-stretch w-full">
                {relatedArticles.map((rel) => (
                  <div role="button" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.currentTarget.click(); } }}
                    key={rel.id}
                    onClick={() => onSelectRelated && onSelectRelated(rel.slug)}
                    className="group relative overflow-hidden rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86]/50 p-3 md:p-4 transition-all cursor-pointer flex flex-col justify-between h-full shadow-2xs"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0 right-0 w-3.5 h-7 rounded-tr-xl border-t-[2.5px] border-r-[2.5px] border-[#0E7C86]"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block text-[10.5px] font-bold text-[#0E7C86] dark:text-[#21A7B4]">
                          {rel.categoryAr}
                        </span>
                        <span className="text-[10px] font-bold text-[#0E7C86]">
                          {rel.readingTime}
                        </span>
                      </div>
                      <h4 className="text-[12px] font-bold text-[var(--mn-heading)] group-hover:text-[#0E7C86] transition-colors line-clamp-2 leading-[1.6]">
                        {rel.titleAr}
                      </h4>
                      <p className="text-[10.5px] font-bold text-[var(--mn-text-muted)] line-clamp-2 leading-[1.65]">
                        {rel.excerptAr}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
