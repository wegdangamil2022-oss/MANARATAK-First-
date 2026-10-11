import type { Plugin } from 'vite';

/** A stable entry lets current owner HTML keep the existing interactive web app. */
export function cmsAppEntrySource(html: string): string {
  const script = html.match(/<script\b[^>]*\btype="module"[^>]*\bsrc="(\/assets\/[a-zA-Z0-9._/-]+\.js)"[^>]*>/)?.[1];
  if (!script) throw new Error('CMS_APP_ENTRY_MISSING');
  const styles = [...html.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(\/assets\/[a-zA-Z0-9._/-]+\.css)"[^>]*>/g)].map(match => match[1]);
  return `for (const href of ${JSON.stringify(styles)}) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link); }\nimport(${JSON.stringify(script)});\n`;
}

export function cmsAppEntryPlugin(): Plugin {
  return {
    name: 'cms-live-page-app-entry',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') throw new Error('CMS_APP_HTML_MISSING');
      this.emitFile({ type: 'asset', fileName: 'cms-app-entry.js', source: cmsAppEntrySource(String(html.source)) });
    },
  };
}
