import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
const generator=read('scripts/prerender-public-seo.mjs');
const pkg=JSON.parse(read('apps/web/package.json'));
const checks=[
 ['build-production-prerenders', pkg.scripts?.['build:production']==='npm run build && npm run prerender'],
 ['initial-html-metadata', generator.includes('rel="canonical"') && generator.includes('hreflang="x-default"') && generator.includes('og:locale')],
 ['jsonld', generator.includes('application/ld+json') && generator.includes('https://schema.org')],
 ['dynamic-owner-discovery', generator.includes('DYNAMIC_CATALOGS') && generator.includes('PUBLIC_PRERENDER_API_URL') && generator.includes('nextCursor')],
 ['fail-closed-detail-build', generator.includes("if (!apiBase && !staticOnly) throw new Error")],
 ['robots-governance', generator.includes("Disallow: /student") && generator.includes('Sitemap:')],
 ['localized-artifacts', generator.includes("for (const locale of ['ar', 'en'])") && generator.includes('dir="${meta.locale === \'ar\' ? \'rtl\' : \'ltr\'}"')],
 ['manifest-evidence', generator.includes('prerender-manifest.json')],
];
let pass=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(ok) pass++;}
console.log(`W4_SEO_PRERENDER=${pass===checks.length?'PASS':'FAIL'} ${pass}/${checks.length}`); process.exitCode=pass===checks.length?0:1;
