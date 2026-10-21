import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const source = (relativePath: string) => readFileSync(`${repoRoot}${relativePath}`, 'utf8');

describe('TR-WP11 public localized entity pages source contract', () => {
  it('passes the presentation locale to canonical university, major, test, and CMS APIs', () => {
    const liveData = source('apps/web/src/features/public-template/publicLiveDataSource.ts');
    expect(liveData).toMatch(/ApiClient\.getUniversities\(\{\s*locale/);
    expect(liveData).toContain('ApiClient.getMajors({ locale');
    expect(liveData).toMatch(/ApiClient\.getInternationalTests\(\{\s*locale/);
    expect(liveData).toContain('ApiClient.getCmsContent({ locale');
  });

  it('uses the selected presentation language for live data and document semantics', () => {
    const app = source('apps/web/src/features/public-template/PublicTemplateApp.tsx');
    expect(app).toMatch(/const \{[^}]*language[^}]*\} = useTranslation\(\)/);
    expect(app).toContain('usePublicLiveData(import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE, language)');
    expect(app).toContain("document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'");
    expect(app).toContain('document.documentElement.lang = language');
  });

  it('keeps canonical slugs while mapping localized public records', () => {
    const liveData = source('apps/web/src/features/public-template/publicLiveDataSource.ts');
    const app = source('apps/web/src/features/public-template/PublicTemplateApp.tsx');
    expect(liveData).toContain('id: dto.slug');
    expect(liveData).toContain('slug: dto.slug');
    expect(app).toContain('ApiClient.getUniversityBySlug(graphIdentity.slug)');
    expect(app).toContain('ApiClient.getMajorBySlug(graphIdentity.slug)');
  });

  it('does not leak alternate-language names as canonical display identity', () => {
    const liveData = source('apps/web/src/features/public-template/publicLiveDataSource.ts');
    const mapper = source('packages/ui/src/public-tests/presentation.ts');
    expect(liveData).toContain('mapInternationalTestToExam(dto)');
    expect(mapper).toContain('dto.displayName');
    expect(mapper).toContain('dto.canonicalName');
    expect(liveData).not.toContain('name: dto.localizedNames?.en');
  });

  it('keeps account, saved items and trackers on the canonical student workspace after the redesign', () => {
    const app = source('apps/web/src/features/public-template/PublicTemplateApp.tsx');
    expect(app).toContain("from '../students/StudentWorkspacePage'");
    expect(app).toContain('activeTab === \'account\' && <LiveStudentWorkspacePage initialTab="SUMMARY"');
    expect(app).toContain('activeTab === \'favorites\' && <LiveStudentWorkspacePage initialTab="VAULT"');
    expect(app).toContain('activeTab === \'tracker\' && <LiveStudentWorkspacePage initialTab="JOURNEY"');
    expect(app).not.toContain("from './components/StudentWorkspacePage'");
  });
});
