import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const exists = (p) => fs.existsSync(path.join(root,p));
const checks=[];
const check=(id, ok, note)=>checks.push({id,ok:Boolean(ok),note});
const contains=(p,s)=>read(p).includes(s);
const notContains=(p,s)=>!contains(p,s);
const css='apps/web/src/features/public-template/template.css';
const app='apps/web/src/features/public-template/PublicTemplateApp.tsx';
const search='apps/web/src/features/public-template/globalSearchIndex.ts';
const searchPage='apps/web/src/features/public-template/components/GlobalSearchPage.tsx';
const auth='apps/web/src/features/students/authRouting.ts';
const authPage='apps/web/src/features/students/StudentAuthPage.tsx';
const authFlow='apps/web/src/features/students/authenticateAccount.ts';
const api='apps/web/src/api/client.ts';
const authRouter='apps/api/src/presentation/api/router/AuthRouter.ts';
const logo='apps/web/public/brand/manaratak-logo-official.png';
const logoComponent='apps/web/src/features/public-template/components/ManaratakLogo.tsx';
const publicDirs=[
 'apps/web/src/features/public-template','apps/web/src/features/students',
 'apps/web/src/features/student-tools','apps/web/src/features/certificates'
];
function walk(d,out=[]){if(!exists(d))return out; for(const e of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const rel=path.join(d,e.name); if(e.isDirectory())walk(rel,out); else if(/\.(tsx?|css)$/.test(e.name))out.push(rel);} return out;}
const publicFiles=publicDirs.flatMap(d=>walk(d));
const allPublic=publicFiles.map(read).join('\n');
const webSrcFiles=walk('apps/web/src');
const allWebSrc=webSrcFiles.map(read).join('\n');
const router='apps/web/src/router/index.tsx';
const studentWorkspace='apps/web/src/features/students/StudentWorkspacePage.tsx';

function relativeLuminance(hex) {
  const raw = hex.replace('#','');
  const channels = [0,2,4].map((offset) => parseInt(raw.slice(offset, offset+2),16)/255)
    .map((value) => value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
  return 0.2126*channels[0] + 0.7152*channels[1] + 0.0722*channels[2];
}
function contrastRatio(a,b){ const x=relativeLuminance(a), y=relativeLuminance(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }

// Theme / typography / responsive system
for (const [id,val] of [
 ['LIGHT_PAGE','--mn-page: #f7f7f5'],['LIGHT_SURFACE','--mn-surface: #ffffff'],['LIGHT_MUTED','--mn-surface-muted: #f1f3f4'],
 ['LIGHT_HEADING','--mn-theme-heading: #213746'],['LIGHT_TEXT','--mn-theme-text: #334b57'],['PRIMARY','--mn-primary: #142b5f'],
 ['SECONDARY','--mn-secondary: #0e7c86'],['GOLD','--mn-accent: #d6a43b'],['DARK_PAGE','--mn-page: #09152f'],
 ['DARK_SURFACE','--mn-surface: #10264a'],['DARK_ELEVATED','--mn-surface-elevated: #153258'],['DARK_MUTED','--mn-surface-muted: #193b61']
]) check(`THEME_${id}`,contains(css,val),val);
check('TYPO_CAIRO',contains(css,"font-family: 'Cairo'"),'Cairo root font');
check('TYPO_NO_BLACK_WEIGHT',!/(font-black|font-extrabold)/.test(allPublic),'no black/extrabold in live public surfaces');
check('STYLE_NO_OLD_GREEN',!/(#044A37|#235D4E|#087A55|#E3B04B|#FBFCFB)/i.test(allPublic),'old identity removed from live public surfaces');
check('STYLE_NO_IMPORTANT',!read(css).includes('!important'),'no new !important strategy');
check('STYLE_NO_NONSEMANTIC_PALETTE',!/(?:blue|indigo|emerald|violet)-(?:50|100|200|300|400|500|600|700|800|900|950)/.test(allWebSrc),'no non-semantic Tailwind identity colors in apps/web/src');
check('STYLE_NO_TEXT_SYMBOL_ICONS',!/[❯▶►➜➡→←✓✕★◇]/u.test(allWebSrc),'Lucide/icons instead of text symbols');
check('STYLE_NO_RANDOM_NEGATIVE_X',!/-mx-4\b/.test(allWebSrc),'no random -mx-4 public layout hacks');
check('MOBILE_CONTAINER_9PX',contains(css,'--mn-container-mobile: 9px'),'mobile page gutter');
check('MOBILE_GRID_TWO',contains(css,'.mn-detail-small-grid') && contains(css,'repeat(2, minmax(0, 1fr))'),'small cards 2-column mobile');
check('MOBILE_FULL_BLEED_SEMANTIC',contains(css,'.mn-detail-full-bleed') && !/-mx-4\b/.test(allPublic),'semantic detail full-bleed gutters');
check('DARK_CARD_GOLD',contains(css,'--mn-card-border-dark') && contains(css,'.dark .manaratak-public .mn-card'),'gold card boundary');
check('DARK_POPOVERS',contains(css,"[data-popover-content]") && contains(css,'background-color: var(--mn-surface-elevated)'),'dark select/menu/popover');
check('FILTER_SELECTED_GOLD',contains(css,".mn-filter-chip[aria-pressed='true']") && contains(css,'var(--mn-accent)'),'semantic selected chips');
check('FOCUS_TOKEN',contains(css,'--mn-focus:'),'focus token');
check('REDUCED_MOTION',contains(css,'@media (prefers-reduced-motion: reduce)'),'motion accessibility');
check('SEARCH_HEIGHT_40',contains(css,'.mn-search-control') && contains(css,'height: 40px'),'mobile search target');
check('DETAIL_CLOSE_40',contains(css,'.mn-detail-close') && contains(css,'width: 40px') && contains(css,'height: 40px'),'detail control touch size');
check('OVERFLOW_PROTECTED',contains(css,'overflow-x: clip'),'horizontal overflow guard');
check('WCAG_LIGHT_BODY',contrastRatio('#334B57','#F7F7F5') >= 4.5,`ratio=${contrastRatio('#334B57','#F7F7F5').toFixed(2)}`);
check('WCAG_LIGHT_MUTED',contrastRatio('#667985','#FFFFFF') >= 4.5,`ratio=${contrastRatio('#667985','#FFFFFF').toFixed(2)}`);
check('WCAG_DARK_BODY',contrastRatio('#EDF5F5','#09152F') >= 4.5,`ratio=${contrastRatio('#EDF5F5','#09152F').toFixed(2)}`);
check('WCAG_DARK_MUTED',contrastRatio('#C7D9DD','#09152F') >= 4.5,`ratio=${contrastRatio('#C7D9DD','#09152F').toFixed(2)}`);
check('WCAG_GOLD_ON_DARK',contrastRatio('#F2CD78','#10264A') >= 4.5,`ratio=${contrastRatio('#F2CD78','#10264A').toFixed(2)}`);
check('WCAG_NAVY_ON_GOLD',contrastRatio('#142B5F','#D6A43B') >= 4.5,`ratio=${contrastRatio('#142B5F','#D6A43B').toFixed(2)}`);

// Official logo
check('LOGO_ASSET_EXISTS',exists(logo),logo);
if(exists(logo)){
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,logo))).digest('hex');
 check('LOGO_OFFICIAL_HASH',hash==='10bc5fd51307913795990c95e87c758bdd653a07583286fe1ade6b8239b7321c',hash);
}
// September 2026 public-design import supplies a new circular logo; keep the legacy asset intact too.
const templateLogo='apps/web/public/brand/manaratak-logo.png';
check('LOGO_TEMPLATE_ASSET_EXISTS',exists(templateLogo),templateLogo);
if(exists(templateLogo)){
 const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,templateLogo))).digest('hex');
 check('LOGO_TEMPLATE_HASH',hash==='a1ad2bedd8cacbdb05a3c6b883edd0f4460112f658f69d9595c8324af1b6aef2',hash);
}
check('LOGO_IMAGE_NOT_SVG',contains(logoComponent,'/brand/manaratak-logo.png') && notContains(logoComponent,'<svg'),'user-supplied template image asset only');
check('LOGO_OBJECT_CONTAIN',contains(logoComponent,'object-contain'),'preserve aspect ratio');

// Shared detail patterns
const detailFiles=[
 'ScholarshipDetailModal.tsx','UniversityDetailModal.tsx','MajorDetailModal.tsx','CountryDetailModal.tsx','ExamDetailModal.tsx',
 'ImportedCourseDetail.tsx','ArticleDetail.tsx','ServiceDetail.tsx','modal/FellowshipDetailView.tsx'
].map(f=>`apps/web/src/features/public-template/components/${f}`);
for(const p of detailFiles) check(`DETAIL_HEADER_${path.basename(p).replace(/\W/g,'_')}`,contains(p,'DetailSectionHeader'),p);
check('DETAIL_NO_TEXT_BACK',!/>\s*العودة\s*</.test(allPublic),'no standalone return text buttons');
check('DETAIL_BACK_ARIA',contains('apps/web/src/features/public-template/components/DetailUi.tsx',"aria-label={mode === 'close' ? 'إغلاق' : 'العودة'}"),'accessible close/back control');
for(const p of ['ScholarshipDetailModal.tsx','UniversityDetailModal.tsx','MajorDetailModal.tsx','CountryDetailModal.tsx','ExamDetailModal.tsx'].map(f=>`apps/web/src/features/public-template/components/${f}`)) check(`DETAIL_CLOSE_MODE_${path.basename(p).replace(/\W/g,'_')}`,contains(p,'mode="close"'),p);
check('DETAIL_SCROLL_TARGET',contains('apps/web/src/features/public-template/components/DetailUi.tsx','scrollIntoView'),'search anchor scroll');
check('DETAIL_TEMP_HIGHLIGHT',contains('apps/web/src/features/public-template/components/DetailUi.tsx','mn-search-term-mark'),'temporary matched phrase highlight');

// Roadmap + notifications
const roadmap='apps/web/src/features/public-template/components/RoadmapPreview.tsx';
for(const text of ['حدّد هدفك الأكاديمي','اكتشف وقارن الفرص','تحقق من الأهلية والمتطلبات','جهّز طلبك','احفظ وتابع تقدمك']) check(`ROADMAP_${checks.length}`,contains(roadmap,text),text);
const notifications='apps/web/src/features/public-template/components/PushNotificationCenter.tsx';
check('NOTIFY_LUCIDE',/from 'lucide-react'/.test(read(notifications)),'Lucide notifications');
check('NOTIFY_NO_EMOJI',!/[🔥🎓⏰📚❯]/u.test(allPublic),'legacy notification emoji removed');
check('NOTIFY_UNREAD_GOLD',contains(notifications,'mn-accent') || contains(notifications,'mn-border-gold'),'gold unread state');
check('NOTIFY_TOUCH_TARGETS',!/(?:h-9 w-9|w-9 h-9)[^\n]*(?:button|aria-label)/.test(read(notifications)) && contains(notifications,'h-10 w-10'),'notification actions >=40px');

// Typed global search
check('SEARCH_NO_RAW_STRINGIFY',notContains(search,'JSON.stringify(item.raw)') && !allPublic.includes('JSON.stringify(item.raw)'),'no raw JSON index');
for(const token of ['kind: GlobalResultKind','title: string','category: string','aliases: string[]','targetId: string','anchor?: string','score: number']) check(`SEARCH_TYPED_${checks.length}`,contains(search,token),token);
for(const rank of ['title-exact','title-prefix','alias','section-title','section-content','partial']) check(`SEARCH_RANK_${rank}`,contains(search,`'${rank}'`),rank);
for(const norm of ['[أإآٱ]','/ى/g','/ؤ/g','/ئ/g','/ة/g','ARABIC_DIACRITICS']) check(`SEARCH_NORMALIZE_${checks.length}`,contains(search,norm),norm);
check('SEARCH_HIDE_ZERO_FILTERS',contains(searchPage,'count > 0') || contains(searchPage,'counts['),'query filter count behavior');
const searchSpec='apps/web/src/features/public-template/globalSearchIndex.spec.ts';
for(const q of ['جامعة أكسفورد','Oxford','منحة الحكومة الصينية','هندسة البرمجيات','متطلبات اللغة','التمويل الكامل','result.category','result.score','matchedSection','anchor']) check(`SEARCH_TEST_${checks.length}`,contains(searchSpec,q),q);
check('SEARCH_HISTORY_URL',contains('apps/web/src/features/public-template/usePublicNavigation.ts','publicUrlForState') && contains('apps/web/src/features/public-template/usePublicNavigation.ts','history.pushState'),'browser history canonical URL');
check('SEARCH_HASH_MATCH',contains('apps/web/src/features/public-template/usePublicNavigation.ts',"params.set('match'") && contains('apps/web/src/features/public-template/usePublicNavigation.ts','detailSearchAnchor'),'match query + section hash');

// Secure auth routing
check('AUTH_UNIFIED_LOGIN',contains(authPage,'authenticateAccount(') && contains(authFlow,'client.login(') && contains(api,'/auth/login'),'single auth endpoint');
check('AUTH_ME_AFTER_LOGIN',contains(authFlow,'getCurrentSessionIdentity()'),'trusted session after login');
check('AUTH_SERVER_ROLES',contains(authRouter,'roleNames') && contains(authRouter,'effectivePermissions'),'server role/permission payload');
check('AUTH_STUDENT_ROUTE',contains(auth,"path: '/student'"),'student route');
check('AUTH_ADMIN_ROUTE',contains(auth,"kind: 'admin'") && contains(auth,"'/admin/dashboard'"),'admin route');
check('AUTH_MANAGER_ROLE',contains(auth,"'manager'"),'manager role');
check('AUTH_NO_EMAIL_GUESS',!/(primaryEmail|email).*includes\(|includes\(.*@/i.test(read(auth)),'no email classification');
check('AUTH_NO_LOCAL_ROLE',!/(localStorage|sessionStorage).*role/i.test(read(authPage)+read(auth)),'no local role authority');
check('AUTH_FAILURE_GENERIC',contains(authPage,'تعذر تسجيل الدخول بهذه البيانات أو انتهت الجلسة'),'generic auth/session failure state');
check('AUTH_NO_CREDENTIAL_LOGGING',!/(console\.(?:log|debug|info|warn|error)[^\n]*(?:password|token|credential)|(?:password|token|credential)[^\n]*console\.(?:log|debug|info|warn|error))/i.test(allWebSrc),'no credentials/tokens in console logging');
check('AUTH_NO_CLIENT_AUTH_STORAGE',!/(localStorage|sessionStorage)[^\n]*(?:role|permission|admin_access|user_email|token)/i.test(allWebSrc),'no client storage authority/routing');
const authSpec='apps/web/src/features/students/authRouting.spec.ts';
const authFlowSpec='apps/web/src/features/students/authenticateAccount.spec.ts';
for(const q of ['student','super_admin','manager','admin:*','NO_ALLOWED_ROLE']) check(`AUTH_TEST_${checks.length}`,contains(authSpec,q) || contains(authFlowSpec,q),q);
for(const q of ['expired','authentication failure','loginCalls','meCalls']) check(`AUTH_FLOW_TEST_${checks.length}`,contains(authFlowSpec,q),q);

// Direct detail URLs must hydrate from owner APIs, not list position only.
for(const fn of ['getScholarshipBySlug','getUniversityBySlug','getMajorBySlug','getCourseBySlug','getCmsContentBySlug','getServiceBySlug','getInternationalTestBySlug','getStudyDestinationBySlug','getCareerJobBySlug']) check(`DIRECT_${fn}`,contains(app,`ApiClient.${fn}`),fn);
check('DIRECT_COUNTRY_INJECT',contains(app,'countriesForView') && contains(app,'setDirectCountry'),'country direct record');
check('DIRECT_CAREER_INJECT',contains(app,'careersForView') && contains(app,'setDirectCareer'),'career direct record');

// Router / single-admin architecture
check('ROUTER_USES_OUTLET',contains(router,'<Outlet />'),'matched public child routes render');
check('ROUTER_TOOL_EXECUTION',contains(router,"path: 'tools/:toolKey'") && contains(router,'element: <StudentToolPage />'),'tool execution route active');
check('NO_SHADOW_ADMIN_DIR',!exists('apps/web/src/features/admin-preview'),'apps/admin remains the only admin UI');
check('NO_LOCAL_ADMIN_SWITCH',notContains(router,'VITE_LOCAL_ADMIN_READ_ONLY'),'no local shadow-admin switch');
check('CANONICAL_ADMIN_REDIRECT',contains(router,"path: 'admin/*'") && contains(router,'CanonicalAdminRedirect'),'legacy /admin routes redirect to canonical admin');
for(const legacy of ['apps/web/src/features/auth','apps/web/src/features/discovery','apps/web/src/features/services','apps/web/src/features/scholarships','apps/web/src/features/majors','apps/web/src/features/international-tests','apps/web/src/features/courses','apps/web/src/features/universities','apps/web/src/features/cms']) check(`DEAD_LEGACY_REMOVED_${path.basename(legacy).replace(/\W/g,'_')}`,!exists(legacy),legacy);

// Header / public live surfaces
const header='apps/web/src/features/public-template/components/Header.tsx';
check('HEADER_MIN_WIDTH',contains(header,'min-w-0'),'header flex shrink safety');
check('HEADER_LOGO_HOME',contains(header,'ManaratakLogo') && /onClick=\{[^}]*on/.test(read(header)),'logo interactive');
check('HEADER_BRAND_VISIBLE_TINY',contains(css,'max-width: 359px') && !/max-width:\s*359px[^}]*span:first-child[^}]*display:\s*none/s.test(read(css)),'MANARATAK remains visible');
check('STUDENT_WORKSPACE_SEMANTIC',contains('apps/web/src/features/students/StudentWorkspacePage.tsx','var(--mn-') && !/(#044A37|#087A55|font-black)/i.test(read('apps/web/src/features/students/StudentWorkspacePage.tsx')),'live student workspace theme');
check('STUDENT_WORKSPACE_HERO_INVERSE',contains(studentWorkspace,'mn-inverse relative overflow-hidden bg-gradient-to-br'),'semantic inverse hero context');
check('STUDENT_WORKSPACE_MOBILE_STATS',contains(studentWorkspace,'grid grid-cols-2 gap-3'),'two compact stats per row on mobile');
check('STUDENT_WORKSPACE_ICON_UI',contains(studentWorkspace,'<Folder') && contains(studentWorkspace,'<ArrowLeft') && contains(studentWorkspace,'<X'),'Lucide workspace affordances');
check('TOOL_ROUTE_SEMANTIC',contains('apps/web/src/features/student-tools/StudentToolPage.tsx','mn-page-shell'),'student tool live route themed');
check('CERT_ROUTE_SEMANTIC',contains('apps/web/src/features/certificates/CertificateVerificationPage.tsx','mn-page-shell'),'certificate live route themed');

const failed=checks.filter(c=>!c.ok);
for(const c of checks) console.log(`${c.ok?'PASS':'FAIL'} ${c.id} ${c.note||''}`);
console.log(`PUBLIC_UI_SOURCE_CLOSURE = ${failed.length===0?'PASS':'FAIL'} ${checks.length-failed.length}/${checks.length}`);
if(failed.length){console.log('FAILED_IDS='+failed.map(f=>f.id).join(','));process.exit(1);}
