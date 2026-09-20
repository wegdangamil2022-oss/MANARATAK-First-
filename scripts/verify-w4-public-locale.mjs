import fs from 'node:fs';
const app=fs.readFileSync('apps/web/src/features/public-template/PublicTemplateApp.tsx','utf8');
const router=fs.readFileSync('apps/web/src/router/index.tsx','utf8');
const provider=fs.readFileSync('apps/web/src/i18n/I18nProvider.tsx','utf8');
const seo=fs.readFileSync('apps/web/src/components/Seo.tsx','utf8');
const checks=[];
checks.push(['no-forced-arabic', !/const language:\s*Language\s*=\s*['"]ar['"]/.test(app)]);
checks.push(['uses-route-i18n-locale', app.includes('const { language } = useTranslation()') && app.includes('usePublicLiveData(') && app.includes(', language)')]);
checks.push(['router-syncs-locale', router.includes('routeLocale !== language') && router.includes('setLanguage(routeLocale)')]);
checks.push(['ar-en-provider', provider.includes('ar,') && provider.includes('en,') && provider.includes('document.documentElement.lang = language')]);
checks.push(['seo-uses-current-language', seo.includes('const { language } = useTranslation()')]);
checks.push(['direct-detail-locale', app.includes('getCmsContentBySlug(key, language)')]);
let pass=0;for(const[n,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(ok)pass++;}
console.log(`W4_PUBLIC_LOCALE=${pass===checks.length?'PASS':'FAIL'} ${pass}/${checks.length}`);process.exitCode=pass===checks.length?0:1;
