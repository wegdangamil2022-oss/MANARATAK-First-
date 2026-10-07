import { createElement, type ReactNode } from 'react';

const allowed = new Set([
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h2',
  'h3',
  'h4',
  'a',
]);
const blocked = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'template',
]);

/** Render text and the CMS HTML allowlist as React nodes, never injected HTML. */
export function CmsRichText({ body, className }: { body: string; className?: string }) {
  const render = (node: Node, key: string): ReactNode => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return null;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (blocked.has(tag)) return null;
    const children = Array.from(node.childNodes).map((child, index) =>
      render(child, `${key}-${index}`),
    );
    if (!allowed.has(tag)) return children;
    const props: Record<string, unknown> = { key };
    if (tag === 'a') {
      const href = element.getAttribute('href') ?? '';
      try {
        const url = new URL(href);
        if (url.protocol !== 'https:' || url.username || url.password) return children;
        props.href = url.href;
        props.target = '_blank';
        props.rel = 'noopener noreferrer';
      } catch {
        return children;
      }
    }
    return createElement(tag, props, ...(tag === 'br' ? [] : children));
  };
  const nodes =
    typeof DOMParser !== 'undefined' && /<\/?[a-z][^>]*>/i.test(body)
      ? Array.from(new DOMParser().parseFromString(body, 'text/html').body.childNodes).map(
          (node, index) => render(node, String(index)),
        )
      : body;
  return (
    <div className={className} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {nodes}
    </div>
  );
}
