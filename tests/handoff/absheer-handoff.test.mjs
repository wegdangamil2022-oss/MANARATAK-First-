import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(name, 'utf8');
test('ABSHEER homepage is a neutral route, not Manaratak front page', () => {
  assert.match(read('apps/web/src/router/index.tsx'), /index:\s*true,\s*element:\s*<EmptyStudentHomepage\s*\/>/);
  assert.doesNotMatch(read('apps/web/src/features/public-template/PublicTemplateApp.tsx'), /<HeroBanner\b|<HomeShowcaseFrame\b/);
  assert.match(read('apps/web/src/features/handoff/EmptyStudentHomepage.tsx'), /data-absheer-home-slot="empty"/);
});
test('Admin, API and DB model remain available', () => {
  assert.match(read('apps/admin/src/App.tsx'), /export default|export function App|function App\(/);
  assert.match(read('apps/api/src/app.ts'), /createApiApp/);
  assert.match(read('packages/infrastructure/prisma/schema.prisma'), /model\s+University\b/);
});
test('No inherited admin bootstrap identity, or legacy FAQ entries', () => {
  assert.doesNotMatch(read('scripts/bootstrap-admin.ts'), /admin@manaratak\.org/);
  assert.match(read('apps/web/src/features/public-template/components/scholarshipFaqData.ts'), /SCHOLARSHIP_FAQS:\s*FAQItem\[\]\s*=\s*\[\s*\]/);
});
test('No owner preview records or private key material in env examples', () => {
  assert.doesNotMatch(read('apps/web/src/features/public-template/homeDesignPreviewData.ts'), /=\s*\[\s*\{/);
  assert.doesNotMatch(read('.env.example'), /-----BEGIN (?:RSA )?PRIVATE KEY-----/);
});
