import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';
import type { Major } from '../types';
import { DetailSectionHeader } from './DetailUi';

/** Keep the source hierarchy and every block of the selected published version. */
export function PublishedMajorSections({ sections, level }: { sections: NonNullable<Major['contentSections']>; level?: string }) {
  if (!sections.length) return <p dir="rtl" className="p-4 text-center text-sm text-[var(--mn-text-muted)]">المحتوى التفصيلي غير متاح لهذا الإصدار حالياً.</p>;
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
  return <div dir="rtl" className="px-0 space-y-2.5 z-20 relative -mt-2.5 sm:-mt-3">
    {groups.map((group, index) => <section key={`${index}-${group.title}`} className="relative w-full bg-[var(--mn-surface)] border-y border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent" />
      <DetailSectionHeader id={`major-source-${index}`} icon={BookOpen} className="px-3.5 pt-3.5 pb-2.5" title={`${index + 1}. ${group.title.replace(/^\s*[0-9٠-٩]+[.)،-]\s*/, '')}`} />
      <div className="px-3.5 pb-4 space-y-3 text-[11px] sm:text-[11.5px] font-bold leading-[1.9] text-[var(--mn-heading)]">
        {group.blocks.map((block, blockIndex) => <div key={block.sectionKey || blockIndex}>
          {(blockIndex > 0 || norm(block.title || '') !== norm(group.title)) && block.title && <h3 className="mb-2 text-[var(--mn-primary)]">{block.title}</h3>}
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
            table: ({ children }) => <div className="overflow-x-auto rounded-xl border border-[var(--mn-border)]"><table className="w-full text-right">{children}</table></div>,
            th: ({ children }) => <th className="p-2 bg-[var(--mn-surface-muted)] border-b border-[var(--mn-border)]">{children}</th>,
            td: ({ children }) => <td className="p-2 border-b border-[var(--mn-border)] align-top">{children}</td>,
            ul: ({ children }) => <ul className="list-disc pr-5 space-y-1.5 my-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pr-5 space-y-1.5 my-2">{children}</ol>,
            p: ({ children }) => <p className="mb-2">{children}</p>,
            h3: ({ children }) => <h3 className="mt-3 mb-2 text-[var(--mn-primary)]">{children}</h3>,
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--mn-primary)] underline break-words">{children}</a>,
          }}>{block.content || ''}</ReactMarkdown>
        </div>)}
      </div>
    </section>)}
  </div>;
}
