import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { InternationalTestMarkdownParser } from '../packages/application/src/tests-platform/utils/InternationalTestMarkdownParser.js';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

// Setup database URL safely
const url = process.env.DATABASE_URL;
let dbReachable = false;
let prisma: PrismaClient | null = null;

if (url && !url.includes('postgres-host') && !url.includes('placeholder')) {
  try {
    prisma = new PrismaClient({ datasources: { db: { url } } });
  } catch (e) {
    // Graceful fallback to offline mode if initialization fails
    prisma = null;
  }
}

// 16 Standard Categories for reference mapping
const STANDARD_CATEGORIES = [
  { id: '1', title: 'المقدمة والتعريف بالجهة المانحة' },
  { id: '2', title: 'الأهداف والاستخدامات والاعتراف' },
  { id: '3', title: 'الفئات المستهدفة وشروط القبول' },
  { id: '4', title: 'المستويات المتاحة وصلاحية الشهادة' },
  { id: '5', title: 'أنواع الاختبار والنسخ المختلفة' },
  { id: '6', title: 'هيكل الاختبار والمكونات الأساسية' },
  { id: '7', title: 'توزيع مهارات الاختبار وتوقيتاتها' },
  { id: '8', title: 'محتوى الاختبار وتفاصيل الأقسام' },
  { id: '9', title: 'المقارنات مع الاختبارات والأنظمة الأخرى' },
  { id: '10', title: 'لوجستيات التقديم وطرق الاختبار' },
  { id: '11', title: 'قواعد السلوك والممنوعات والتعليمات' },
  { id: '12', title: 'نظام الدرجات والتقييم وحساب النجاح' },
  { id: '13', title: 'الاستعداد والتحضير والمواد التدريبية' },
  { id: '14', title: 'التسجيل والمراكز وتفاصيل الرسوم' },
  { id: '15', title: 'النتائج والشهادات والمراجعة والشكاوى' },
  { id: '16', title: 'الأسئلة الشائعة والمصادر والملاحظات الفنية' },
];

// Helper to resolve canonical ID and slug deterministically for any test
function getCanonicalIdAndSlug(
  filename: string,
  classification: string,
  oldId: string,
  oldSlug: string
): { id: string; slug: string } {
  if (classification === 'REPLACE_EXISTING' && oldId !== '-' && oldSlug !== '-') {
    return { id: oldId, slug: oldSlug };
  }

  // Hardcoded mappings for the 10 brand-new / review-required tests to ensure perfect, locked consistency
  const newTestsMap: Record<string, { id: string; slug: string }> = {
    'Cambridge_English_Qualifications_2026_Complete_Data_AR.md': {
      id: 'cambridge-english-qualifications',
      slug: 'cambridge-english-qualifications',
    },
    'OET_2026_Complete_Data_AR.md': {
      id: 'oet-english',
      slug: 'oet-english',
    },
    'Gaokao_China_2026_Unified_AR.md': {
      id: 'test-gaokao-china',
      slug: 'gaokao-china',
    },
    'IB_Diploma_Programme_2026_Unified_AR.md': {
      id: 'test-ib-diploma',
      slug: 'ib-diploma',
    },
    'JEE_Advanced_India_2026_Unified_AR.md': {
      id: 'test-jee-advanced',
      slug: 'jee-advanced',
    },
    'JEE_Main_India_2026_Unified_AR.md': {
      id: 'test-jee-main',
      slug: 'jee-main',
    },
    'LNAT_2026_2027_Unified_AR.md': {
      id: 'test-lnat-law',
      slug: 'lnat-law',
    },
    'LSAT_2026_2027_Unified_AR.md': {
      id: 'test-lsat-law',
      slug: 'lsat-law',
    },
    'NEET_UG_India_2026_Unified_AR.md': {
      id: 'test-neet-ug',
      slug: 'neet-ug',
    },
    'CSCA_China_2026_Unified_AR.md': {
      id: 'test-csca-china',
      slug: 'csca-china',
    },
  };

  const mapped = newTestsMap[filename];
  if (mapped) {
    return mapped;
  }

  // Fallback slug/ID generator
  const cleanBase = filename
    .replace(/_\d{4}(_\d{4})?_Complete_Data_AR\.md/i, '')
    .replace(/_\d{4}(_\d{4})?_Unified_AR(_REVISED)?\.md/i, '')
    .replace(/_\d{4}(_\d{4})?\.md/i, '')
    .replace(/\.md$/i, '')
    .replace(/_/g, '-')
    .toLowerCase();

  return { id: cleanBase, slug: cleanBase };
}

// Helper to extract correct version/cycle from filename
function extractVersion(filename: string): string {
  const matchRange = /(\d{4})_(\d{4})/.exec(filename);
  if (matchRange) {
    return `${matchRange[1]}-${matchRange[2]}`;
  }
  const matchSingle = /(\d{4})/.exec(filename);
  if (matchSingle) {
    return matchSingle[1];
  }
  return '2026';
}

interface TestReport {
  idx: number;
  filename: string;
  classification: string;
  id: string;
  slug: string;
  version: string;
  parsedSectionCount: number;
  blockKeys: string[];
  dbStatus: string;
  status: 'VALID' | 'INVALID';
  errors: string[];
  warnings: string[];
}

async function main() {
  requireDatabaseMutationGate('import-unified-tests-v2', { allowedPurposes: ['import'] });
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--execute');

  console.log('======================================================================');
  console.log(`      MANARATAK INTERNATIONAL TESTS UNIFIED IMPORTER (${isDryRun ? 'DRY-RUN' : 'EXECUTE'} MODE)`);
  console.log('======================================================================');

  if (isDryRun) {
    console.log('ℹ DRY-RUN mode is active. Under this mode, exactly ZERO database writes will be executed.');
  } else {
    console.log('⚠ EXECUTE mode is active. Actual database writes would be processed if fully implemented.');
  }

  // Check database connectivity
  if (prisma) {
    try {
      await prisma.$connect();
      dbReachable = true;
      console.log('✔ DB Connection: REACHABLE. Real DB checks enabled.');
    } catch (e: any) {
      dbReachable = false;
      console.log('⚠ DB Connection: UNREACHABLE. Running in Offline Simulator Mode.');
    }
  } else {
    console.log('ℹ DB Connection: Skipped (placeholder URL detected). Offline Simulator Mode enabled.');
  }

  // Load matching configuration
  const finalMatchingPath = path.join(process.cwd(), 'workspace', 'import-sources', 'international-tests', 'reconciliation', 'final_matching_data.json');
  if (!fs.existsSync(finalMatchingPath)) {
    console.error(`CRITICAL: final_matching_data.json is missing at ${finalMatchingPath}`);
    process.exit(1);
  }

  const finalMatchingData = JSON.parse(fs.readFileSync(finalMatchingPath, 'utf-8'));
  const rows = finalMatchingData.matching_rows;

  console.log(`Loaded ${rows.length} test records from locked manifest.`);

  const reports: TestReport[] = [];
  const processedIds = new Set<string>();
  const processedSlugs = new Set<string>();

  const categoryBreakdown: Record<string, number> = {};

  for (const row of rows) {
    const filename = row.filename;
    const folder = row.folder;
    const classification = row.classification === 'REVIEW_REQUIRED' ? 'NEW_TEST' : row.classification;
    const oldId = row.old_id;
    const oldSlug = row.old_slug;

    const { id, slug } = getCanonicalIdAndSlug(filename, classification, oldId, oldSlug);
    const version = extractVersion(filename);

    const report: TestReport = {
      idx: row.idx,
      filename,
      classification,
      id,
      slug,
      version,
      parsedSectionCount: 0,
      blockKeys: [],
      dbStatus: 'NEW',
      status: 'VALID',
      errors: [],
      warnings: [],
    };

    // Keep track of folder counts
    categoryBreakdown[folder] = (categoryBreakdown[folder] || 0) + 1;

    // Detect duplicate IDs or slugs (collision detection)
    if (processedIds.has(id)) {
      report.errors.push(`ID Collision: ID '${id}' is already assigned to another manifest item.`);
      report.status = 'INVALID';
    }
    if (processedSlugs.has(slug)) {
      report.errors.push(`Slug Collision: Slug '${slug}' is already assigned to another manifest item.`);
      report.status = 'INVALID';
    }
    processedIds.add(id);
    processedSlugs.add(slug);

    // Read and parse file
    const filePath = path.join(process.cwd(), 'workspace', 'import-sources', 'international-tests', 'unified-56', folder, filename);
    if (!fs.existsSync(filePath)) {
      report.errors.push(`File not found: Expected path ${filePath} does not exist.`);
      report.status = 'INVALID';
    } else {
      try {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const sections = InternationalTestMarkdownParser.parse(rawContent);
        report.parsedSectionCount = sections.length;
        report.blockKeys = sections.map(s => s.blockKey);

        if (sections.length === 0) {
          report.warnings.push('No sections parsed. Check if file contains valid ## N. headings.');
        } else {
          // Verify continuous section numbers
          const numbers = sections.map(s => s.sectionNumber).sort((a, b) => a - b);
          for (let i = 0; i < numbers.length; i++) {
            if (numbers[i] !== i + 1) {
              report.warnings.push(`Non-sequential section number detected: expected ${i + 1}, found ${numbers[i]}.`);
            }
          }
        }
      } catch (err: any) {
        report.errors.push(`Parsing error: ${err.message}`);
        report.status = 'INVALID';
      }
    }

    // Determine DB / Simulator status
    if (dbReachable && prisma) {
      try {
        const existingInDb = await prisma.internationalTest.findUnique({
          where: { id },
          include: { versions: true },
        });

        if (existingInDb) {
          const hasVersion = existingInDb.versions.some(v => String(v.versionNumber) === version || v.id.includes(version));
          if (classification === 'REPLACE_EXISTING') {
            report.dbStatus = `FOUND in DB (REPLACE_EXISTING) | ${hasVersion ? `Will replace version ${version}` : `Will create new version ${version}`}`;
          } else {
            report.errors.push(`ID Collision with active DB: ID '${id}' exists in DB but is classified as NEW_TEST.`);
            report.status = 'INVALID';
            report.dbStatus = 'COLLISION_WITH_DB_EXISTING';
          }
        } else {
          report.dbStatus = `NOT FOUND in DB | Will create as NEW (${classification})`;
        }
      } catch (dbErr: any) {
        report.dbStatus = `DB_QUERY_ERROR (${dbErr.message})`;
      }
    } else {
      // Simulator Mode
      if (classification === 'REPLACE_EXISTING') {
        report.dbStatus = `[SIMULATED] REPLACE_EXISTING (Will overwrite existing ID '${id}', replacing version '${version}')`;
      } else {
        report.dbStatus = `[SIMULATED] NEW_TEST (Will create brand new record with ID '${id}', version '${version}')`;
      }
    }

    reports.push(report);

    // Print individual test report to console
    console.log(`\n======================================================================`);
    console.log(`[${row.idx}/56] File: ${filename}`);
    console.log(`----------------------------------------------------------------------`);
    console.log(`- Folder         : ${folder}`);
    console.log(`- Action         : ${classification}`);
    console.log(`- Resolved ID    : ${id}`);
    console.log(`- Resolved Slug  : ${slug}`);
    console.log(`- Version/Cycle  : ${version}`);
    console.log(`- DB Status      : ${report.dbStatus}`);
    console.log(`- Sections Count : ${report.parsedSectionCount}`);
    console.log(`- Content Blocks : ${report.blockKeys.join(', ') || 'None'}`);
    console.log(`- Status         : ${report.status}`);
    if (report.errors.length > 0) {
      console.log(`- Errors         : \x1b[31m${report.errors.join('\n                 ')}\x1b[0m`);
    }
    if (report.warnings.length > 0) {
      console.log(`- Warnings       : \x1b[33m${report.warnings.join('\n                 ')}\x1b[0m`);
    }
    console.log(`======================================================================`);
  }

  // Calculate totals
  const totalProcessed = reports.length;
  const totalValid = reports.filter(r => r.status === 'VALID').length;
  const totalInvalid = reports.filter(r => r.status === 'INVALID').length;
  const totalReplace = reports.filter(r => r.classification === 'REPLACE_EXISTING').length;
  const totalNew = reports.filter(r => r.classification === 'NEW_TEST').length;

  console.log('\n\n======================================================================');
  console.log('                      DRY-RUN IMPORT SUMMARY TOTALS');
  console.log('======================================================================');
  console.log(`- Total Files Processed       : ${totalProcessed}`);
  console.log(`- Total Passed Validation     : \x1b[32m${totalValid}\x1b[0m`);
  console.log(`- Total Failed Validation     : ${totalInvalid > 0 ? `\x1b[31m${totalInvalid}\x1b[0m` : `0`}`);
  console.log(`- Action REPLACE_EXISTING     : ${totalReplace}`);
  console.log(`- Action NEW_TEST             : ${totalNew}`);
  console.log('----------------------------------------------------------------------');
  console.log('Breakdown by Unified Category Folders:');
  Object.entries(categoryBreakdown).forEach(([f, count]) => {
    console.log(`- ${f.padEnd(60)}: ${count} files`);
  });
  console.log('======================================================================\n');

  if (prisma) {
    await prisma.$disconnect();
  }

  if (totalInvalid > 0) {
    process.exitCode = 1;
  }
}

main().catch(e => {
  console.error('CRITICAL IMPORTER EXCEPTION:', e);
  process.exitCode = 1;
});
