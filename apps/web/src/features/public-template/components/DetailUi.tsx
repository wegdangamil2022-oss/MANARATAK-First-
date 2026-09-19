import React, { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, X } from 'lucide-react';

export function DetailSectionHeader({
  id,
  icon: Icon,
  iconNode,
  title,
  subtitle,
  level = 2,
  className = '',
  titleStyle,
  titleClassName = '',
  iconClassName = '',
  iconStyle,
}: {
  id?: string;
  icon?: LucideIcon;
  iconNode?: React.ReactNode;
  title: string;
  subtitle?: string;
  level?: 2 | 3 | 4;
  className?: string;
  titleStyle?: React.CSSProperties;
  titleClassName?: string;
  iconClassName?: string;
  iconStyle?: React.CSSProperties;
}) {
  const Heading = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
  return (
    <div id={id} className={`mn-detail-section-header scroll-mt-28 flex flex-col items-center text-center ${className}`}>
      <div className="flex items-center justify-center gap-2">
        <span style={iconStyle} className={`mn-detail-section-icon shrink-0 ${iconClassName}`} aria-hidden="true">{Icon ? <Icon className="h-4 w-4" /> : iconNode}</span>
        <Heading style={titleStyle} className={`mn-detail-section-title ${titleClassName}`}>{title}</Heading>
      </div>
      {subtitle ? <p className="mt-1 text-[11px] font-medium leading-5 text-[var(--mn-text-muted)] max-w-xl mx-auto text-center">{subtitle}</p> : null}
    </div>
  );
}

export function DetailBackButton({
  onBack,
  mode = 'back',
  className = '',
}: {
  onBack: () => void;
  mode?: 'back' | 'close';
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`mn-detail-close ${className}`}
      aria-label={mode === 'close' ? 'إغلاق' : 'العودة'}
      title={mode === 'close' ? 'إغلاق' : 'العودة'}
    >
      {mode === 'close' ? <X className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Scrolls to a stable section anchor after a detail view opens and highlights it briefly. */
export function useDetailSearchTarget(anchor?: string, searchTerm?: string) {
  useEffect(() => {
    if (!anchor) return;
    let timer: number | undefined;
    let target: HTMLElement | null = null;
    let marked: HTMLElement | null = null;
    const frame = requestAnimationFrame(() => {
      target = document.getElementById(anchor);
      if (!target) return;
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      target.classList.add('mn-search-highlight');
      target.setAttribute('data-search-match', searchTerm || 'true');

      const needle = searchTerm?.trim();
      if (needle) {
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent || parent.closest('script, style, [aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
            const value = node.nodeValue || '';
            return value.toLocaleLowerCase().includes(needle.toLocaleLowerCase()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
          },
        });
        const textNode = walker.nextNode() as Text | null;
        if (textNode?.nodeValue) {
          const at = textNode.nodeValue.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
          if (at >= 0) {
            const range = document.createRange();
            range.setStart(textNode, at);
            range.setEnd(textNode, at + needle.length);
            marked = document.createElement('mark');
            marked.className = 'mn-search-term-mark';
            range.surroundContents(marked);
          }
        }
      }

      timer = window.setTimeout(() => {
        target?.classList.remove('mn-search-highlight');
        target?.removeAttribute('data-search-match');
        if (marked?.parentNode) marked.replaceWith(document.createTextNode(marked.textContent || ''));
      }, 1900);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) window.clearTimeout(timer);
      target?.classList.remove('mn-search-highlight');
      target?.removeAttribute('data-search-match');
      if (marked?.parentNode) marked.replaceWith(document.createTextNode(marked.textContent || ''));
    };
  }, [anchor, searchTerm]);
}
