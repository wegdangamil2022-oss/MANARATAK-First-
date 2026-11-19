import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';
import type { Major } from '../types';
import { DetailSectionHeader } from './DetailUi';

/** Keep the source hierarchy and every block of the selected published version. */
export function PublishedMajorSections({ sections, level }: { sections: NonNullable<Major['contentSections']>; level?: string }) {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  if (!sections.length) return <p dir={publicDir} className="p-4 text-center text-sm text-[var(--mn-text-muted)]">{publicT('public_detailed_content_is_currently_unavailable_in_this_release')}</p>;
  const groups: Array<{ title: string; blocks: typeof sections }> = [];
  const norm = (text: string) => text.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[\u064B-\u065F]/g, '').trim();
  const isDoctorate = level?.toUpperCase() === 'DOCTORATE';
  const isMaster = level?.toUpperCase() === 'MASTER';
  const parentFor = (title: string): string | undefined => {
    const value = norm(title);
    if (!isMaster && !isDoctorate) {
      if (/المواد|الجانب العملي/.test(value)) return 'ماذا يدرس الطالب؟';
      if (/تخصصات الماجستير المرتبطة/.test(value)) return 'فرص الدراسات العليا';
    } else if (isMaster) {
      if (/تخصصات بكالوريوس|تخصصات قريبة|تخصصات قد تحتاج/.test(value)) return 'الخلفيات الأكاديمية المناسبة للقبول';
      if (/المقررات|مناهج البحث|الجانب العملي/.test(value)) return 'ماذا يدرس الطالب؟';
      if (/الدكتوراه المرتبطة|الزمالات او الاعتمادات/.test(value)) return 'المسارات الأكاديمية والمهنية اللاحقة';
    } else {
      if (/تخصصات الماجستير|تخصصات قريبة|الدخول المباشر|الخبرة او الترخيص/.test(value)) return 'الخلفيات الأكاديمية المناسبة ومسارات الدخول';
      if (/المعرفة النظرية|مناهج البحث|الاخلاقيات والنزاهة/.test(value)) return 'المعرفة والمقررات المتقدمة';
    }
    return undefined;
  };
  for (const section of sections) {
    const sourceLevel = section.metadata?.sourceLevel;
    const parent = typeof section.metadata?.sourceMainTitle === 'string'
      ? section.metadata.sourceMainTitle : sourceLevel === 3 || sourceLevel === 4 ? parentFor(section.title || '') : undefined;
    const isMain = sourceLevel === 2 || (sourceLevel === undefined && /^\s*[0-9٠-٩]+[.)،-]\s/.test(section.title || ''));
    const title = parent || section.title || 'تفاصيل التخصص';
    if (!groups.length || isMain || (parent && norm(groups[groups.length - 1].title) !== norm(parent))) groups.push({ title, blocks: [] });
    groups[groups.length - 1].blocks.push(section);
  }
  return <div dir={publicDir} className="px-0 md:px-4 space-y-2.5 md:space-y-4 z-20 relative -mt-2.5 sm:-mt-3 md:mt-2">
    {groups.map((group, index) => {
      const cleanTitle = group.title.replace(/^\s*[0-9٠-٩]+[.)،-]\s*/, '');
      return (
        <section key={`${index}-${group.title}`} className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl p-3.5 sm:p-4 md:p-6 border-y md:border border-[var(--mn-border)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel">
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
          <DetailSectionHeader
            id={`major-source-${index}`}
            title={cleanTitle}
            level={3}
            iconClassName="mn-icon-mix02"
            iconNode={
              <>
                <span className="pointer-events-none absolute top-0 right-0 w-2.5 h-2.5 bg-[#D6A43B] rounded-bl-md" />
                <BookOpen className="h-4 w-4 relative z-10 text-[#F2CD78]" />
              </>
            }
          />
          <div className={`${group.blocks.length > 1 ? 'space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-3.5 items-stretch' : 'space-y-2.5'} text-[11px] sm:text-[11.5px] font-bold leading-[1.9] text-[var(--mn-heading)]`}>
            {group.blocks.map((block, blockIndex) => (
              <div key={block.sectionKey || blockIndex} className="relative overflow-hidden rounded-2xl bg-[var(--mn-page)] border border-[var(--mn-border)] pl-3.5 pr-4 py-3 md:p-4 h-full">
                <div className="absolute top-2.5 right-0 bottom-2.5 w-[3.5px] rounded-l-full bg-gradient-to-b from-[#142B5F] to-[#0E7C86] dark:from-[#D6A43B] dark:to-[#E5B54F]" />
                {(blockIndex > 0 || norm(block.title || '') !== norm(group.title)) && block.title && (
                  <h3 className="mb-1.5 text-[11.5px] font-bold text-[#142B5F] dark:text-[#F2CD78] pr-1">{block.title}</h3>
                )}
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  table: ({ children }) => <div className="overflow-x-auto rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)]"><table className="w-full text-start">{children}</table></div>,
                  th: ({ children }) => <th className="p-2 md:p-3 bg-[#142B5F]/5 text-[#142B5F] dark:text-[#F2CD78] border-b border-[var(--mn-border)] text-[10.5px]">{children}</th>,
                  td: ({ children }) => <td className="p-2 md:p-3 border-b border-[var(--mn-border)] align-top text-[10.5px]">{children}</td>,
                  ul: ({ children }) => <ul className="list-disc pr-5 space-y-1.5 my-1.5 text-[10.5px]">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pr-5 space-y-1.5 my-1.5 text-[10.5px]">{children}</ol>,
                  p: ({ children }) => <p className="mb-1.5 last:mb-0 pr-1 text-[var(--mn-text)]">{children}</p>,
                  h3: ({ children }) => <h3 className="mt-2.5 mb-1.5 text-[#142B5F] dark:text-[#F2CD78]">{children}</h3>,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#0E7C86] underline break-words">{children}</a>,
                }}>{block.content || ''}</ReactMarkdown>
              </div>
            ))}
          </div>
        </section>
      );
    })}
  </div>;
}
