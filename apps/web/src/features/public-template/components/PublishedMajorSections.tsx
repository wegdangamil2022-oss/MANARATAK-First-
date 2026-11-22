import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';
import type { Major } from '../types';
import {
  MAJOR_CONTENT_WRAPPER_CLASS,
  MAJOR_INNER_BOX_CLASS,
  MAJOR_NAVY_PETROL_BAR_CLASS,
  MAJOR_SECTION_CARD_CLASS,
  MajorSectionHeader,
} from './modal/MajorDetailPrimitives';

/** Keep the source hierarchy and every block of the selected published version. */
export function PublishedMajorSections({
  sections,
  level,
}: {
  sections: NonNullable<Major['contentSections']>;
  level?: string;
}) {
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();

  if (!sections.length) {
    return (
      <p
        dir={publicDir}
        className="p-4 text-center text-sm text-[#5C707C] dark:text-[#9BB4C7] font-['Cairo',sans-serif]"
      >
        {publicT('public_detailed_content_is_currently_unavailable_in_this_release')}
      </p>
    );
  }

  const groups: Array<{ title: string; blocks: typeof sections }> = [];
  const norm = (text: string) =>
    text
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();
  const isDoctorate = level?.toUpperCase() === 'DOCTORATE';
  const isMaster = level?.toUpperCase() === 'MASTER';
  const parentFor = (title: string): string | undefined => {
    const value = norm(title);
    if (!isMaster && !isDoctorate) {
      if (/المواد|الجانب العملي/.test(value)) return 'ماذا يدرس الطالب؟';
      if (/تخصصات الماجستير المرتبطة/.test(value)) return 'فرص الدراسات العليا';
    } else if (isMaster) {
      if (/تخصصات بكالوريوس|تخصصات قريبة|تخصصات قد تحتاج/.test(value))
        return 'الخلفيات الأكاديمية المناسبة للقبول';
      if (/المقررات|مناهج البحث|الجانب العملي/.test(value)) return 'ماذا يدرس الطالب؟';
      if (/الدكتوراه المرتبطة|الزمالات او الاعتمادات/.test(value))
        return 'المسارات الأكاديمية والمهنية اللاحقة';
    } else {
      if (/تخصصات الماجستير|تخصصات قريبة|الدخول المباشر|الخبرة او الترخيص/.test(value))
        return 'الخلفيات الأكاديمية المناسبة ومسارات الدخول';
      if (/المعرفة النظرية|مناهج البحث|الاخلاقيات والنزاهة/.test(value))
        return 'المعرفة والمقررات المتقدمة';
    }
    return undefined;
  };

  for (const section of sections) {
    const sourceLevel = section.metadata?.sourceLevel;
    const parent =
      typeof section.metadata?.sourceMainTitle === 'string'
        ? section.metadata.sourceMainTitle
        : sourceLevel === 3 || sourceLevel === 4
          ? parentFor(section.title || '')
          : undefined;
    const isMain =
      sourceLevel === 2 ||
      (sourceLevel === undefined && /^\s*[0-9٠-٩]+[.)،-]\s/.test(section.title || ''));
    const title = parent || section.title || 'تفاصيل التخصص';
    if (
      !groups.length ||
      isMain ||
      (parent && norm(groups[groups.length - 1].title) !== norm(parent))
    ) {
      groups.push({ title, blocks: [] });
    }
    groups[groups.length - 1].blocks.push(section);
  }

  return (
    <div dir={publicDir} className={MAJOR_CONTENT_WRAPPER_CLASS}>
      {groups.map((group, index) => {
        const cleanTitle = group.title.replace(/^\s*[0-9٠-٩]+[.)،-]\s*/, '');
        return (
          <section key={`${index}-${group.title}`} className={MAJOR_SECTION_CARD_CLASS}>
            <MajorSectionHeader id={`major-source-${index}`} icon={BookOpen} title={cleanTitle} />
            <div
              className={`${
                group.blocks.length > 1
                  ? 'space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-3.5 items-stretch'
                  : 'space-y-2.5'
              } text-[11px] sm:text-[11.5px] md:text-xs font-bold leading-[1.9] text-[#142B5F]/90 dark:text-[#DCE8F2] font-['Cairo',sans-serif]`}
            >
              {group.blocks.map((block, blockIndex) => (
                <div
                  key={block.sectionKey || blockIndex}
                  className={`relative overflow-hidden rounded-xl ${MAJOR_INNER_BOX_CLASS} pl-3.5 pr-4 py-3 md:p-4 h-full font-['Cairo',sans-serif]`}
                >
                  <span aria-hidden="true" className={MAJOR_NAVY_PETROL_BAR_CLASS} />
                  {(blockIndex > 0 || norm(block.title || '') !== norm(group.title)) &&
                    block.title && (
                      <h3 className="mb-1.5 text-[11px] sm:text-xs md:text-[13px] font-extrabold text-[#142B5F] dark:text-[#F1F5F9] pr-1">
                        {block.title}
                      </h3>
                    )}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto rounded-xl border border-[#142B5F]/10 dark:border-white/10 bg-white dark:bg-[#0D1A30]">
                          <table className="w-full text-start border-collapse font-['Cairo',sans-serif]">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="p-2 md:p-3 bg-gradient-to-l from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white border-b border-[#142B5F]/15 text-[11px] sm:text-[11.5px] font-bold">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="p-2 md:p-3 border-b border-[#142B5F]/8 dark:border-white/10 align-top text-[11px] sm:text-[11.5px] font-bold text-[#142B5F] dark:text-[#DCE8F2]">
                          {children}
                        </td>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pr-5 space-y-1.5 my-1.5 text-[10.5px] sm:text-[11px]">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pr-5 space-y-1.5 my-1.5 text-[10.5px] sm:text-[11px]">
                          {children}
                        </ol>
                      ),
                      p: ({ children }) => (
                        <p className="mb-1.5 last:mb-0 pr-1 text-[#142B5F]/90 dark:text-[#DCE8F2]">
                          {children}
                        </p>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mt-2.5 mb-1.5 font-bold text-[#142B5F] dark:text-[#F1F5F9]">
                          {children}
                        </h3>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0E7C86] dark:text-[#34BFC9] underline break-words"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {block.content || ''}
                  </ReactMarkdown>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
