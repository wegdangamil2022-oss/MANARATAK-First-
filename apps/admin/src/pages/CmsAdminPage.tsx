import { NavLink, useLocation } from 'react-router-dom';
import { Files, PanelTop, FolderTree } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import { CmsContentWorkspace } from '../features/cms/CmsContentWorkspace';
import { CmsSiteWorkspace } from '../features/cms/CmsSiteWorkspace';
import '../features/cms/cmsWorkspace.css';
export function CmsAdminPage() {
  const { language } = useTranslation(),
    { pathname, search } = useLocation();
  const ar = language === 'ar';
  const legacySite =
    pathname === '/cms' &&
    ['navigation', 'blocks', 'announcements', 'redirects', 'publishing'].includes(
      new URLSearchParams(search).get('section') ?? '',
    );
  const site = pathname.startsWith('/cms/site') || legacySite;
  return (
    <main className="cms-workspace" dir={ar ? 'rtl' : 'ltr'}>
      <header className="cms-hero">
        <div>
          <p>
            <Files size={18} />
            {ar ? 'منارتك · إدارة المحتوى' : 'MANARATAK · Content management'}
          </p>
          <h1>{ar ? 'إدارة المحتوى والنشر' : 'Content and publication management'}</h1>
          <span>
            {ar
              ? 'مساحة واضحة للتأليف وتشغيل محتوى الموقع.'
              : 'Editorial authoring and governed site publishing.'}
          </span>
        </div>
      </header>
      <nav className="cms-main-tabs" aria-label={ar ? 'مساحات إدارة المحتوى' : 'CMS workspaces'}>
        <NavLink
          to="/cms/content"
          aria-current={!site ? 'page' : undefined}
          className={!site ? 'selected' : ''}
        >
          <Files size={19} />
          {ar ? 'المحتوى التحريري' : 'Editorial content'}
        </NavLink>
        <NavLink
          to="/cms/site"
          aria-current={site ? 'page' : undefined}
          className={site ? 'selected' : ''}
        >
          <PanelTop size={19} />
          {ar ? 'عمليات الموقع والنشر' : 'Site operations and publishing'}
        </NavLink>
      </nav>
      {site ? (
        <CmsSiteWorkspace />
      ) : (
        <>
          <nav className="cms-sub-tabs" aria-label={ar ? 'مكتبة المحتوى' : 'Content library'}>
            <NavLink to="/cms/content" end>
              <Files size={17} />
              {ar ? 'جميع المواد' : 'All content'}
            </NavLink>
            <NavLink to="/cms/taxonomy">
              <FolderTree size={17} />
              {ar ? 'التصنيفات والوسوم' : 'Categories and tags'}
            </NavLink>
          </nav>
          <CmsContentWorkspace />
        </>
      )}
    </main>
  );
}
