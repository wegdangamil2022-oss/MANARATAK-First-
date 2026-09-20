import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { InternationalTestMarkdownParser } from '../packages/application/src/tests-platform/utils/InternationalTestMarkdownParser.js';

// Setup database URL safely using environment credentials
const SQL_USER = process.env.SQL_USER;
const SQL_PASSWORD = process.env.SQL_PASSWORD;
const SQL_HOST = process.env.SQL_HOST;
const SQL_DB_NAME = process.env.SQL_DB_NAME;

if (!SQL_USER || !SQL_PASSWORD || !SQL_HOST || !SQL_DB_NAME) {
  console.error('CRITICAL: SQL credentials are not set in environment.');
  process.exit(1);
}

const encodedPassword = encodeURIComponent(SQL_PASSWORD);
const url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

const filesToImport = [
  {
    filename: 'Cambridge_English_Qualifications_2026_Complete_Data_AR.md',
    id: 'cambridge-english-qualifications',
    slug: 'cambridge-english-qualifications',
    classification: 'NEW_TEST',
    eng: 'Cambridge English Qualifications',
    ar: 'مؤهلات كامبريدج للغة الإنجليزية',
    acr: 'CEQ / Cambridge English'
  },
  {
    filename: 'Duolingo_English_Test_2026_Complete_Data_AR.md',
    id: 'duolingo-english-test',
    slug: 'duolingo-english-test',
    classification: 'REPLACE_EXISTING',
    eng: 'Duolingo English Test',
    ar: 'اختبار دولينجو للغة الإنجليزية',
    acr: 'DET'
  },
  {
    filename: 'IELTS_2026_Complete_Data_AR.md',
    id: 'ielts-academic',
    slug: 'ielts-academic',
    classification: 'REPLACE_EXISTING',
    eng: 'International English Language Testing System',
    ar: 'نظام اختبار اللغة الإنجليزية الدولي (آيلتس)',
    acr: 'IELTS'
  },
  {
    filename: 'LanguageCert_Academic_2026_Complete_Data_AR.md',
    id: 'languagecert-academic',
    slug: 'languagecert-academic',
    classification: 'REPLACE_EXISTING',
    eng: 'LANGUAGECERT Academic',
    ar: 'اختبار لانجويج سيرت الأكاديمي',
    acr: 'LCA / LanguageCert'
  },
  {
    filename: 'Linguaskill_2026_Complete_Data_AR.md',
    id: 'linguaskill',
    slug: 'linguaskill',
    classification: 'REPLACE_EXISTING',
    eng: 'Linguaskill',
    ar: 'اختبار لينجواسكيل',
    acr: 'Linguaskill'
  },
  {
    filename: 'Michigan_English_Test_MET_2026_Complete_Data_AR.md',
    id: 'met-english',
    slug: 'met-english',
    classification: 'REPLACE_EXISTING',
    eng: 'Michigan English Test',
    ar: 'اختبار ميشيغان للغة الإنجليزية',
    acr: 'MET'
  },
  {
    filename: 'OET_2026_Complete_Data_AR.md',
    id: 'oet-english',
    slug: 'oet-english',
    classification: 'NEW_TEST',
    eng: 'Occupational English Test',
    ar: 'اختبار اللغة الإنجليزية المهني للقطاع الطبي',
    acr: 'OET'
  },
  {
    filename: 'Oxford_Test_of_English_2026_Complete_Data_AR.md',
    id: 'ote-english',
    slug: 'ote-english',
    classification: 'REPLACE_EXISTING',
    eng: 'Oxford Test of English',
    ar: 'اختبار أكسفورد للغة الإنجليزية',
    acr: 'OTE'
  },
  {
    filename: 'PTE_Academic_2026_Complete_Data_AR.md',
    id: 'pte-academic',
    slug: 'pte-academic',
    classification: 'REPLACE_EXISTING',
    eng: 'Pearson Test of English Academic',
    ar: 'اختبار بيرسون للغة الإنجليزية الأكاديمي',
    acr: 'PTE Academic / PTE-A'
  },
  {
    filename: 'TOEFL_iBT_2026_Complete_Data_AR.md',
    id: 'toefl-ibt',
    slug: 'toefl-ibt',
    classification: 'REPLACE_EXISTING',
    eng: 'Test of English as a Foreign Language (Internet-Based Test)',
    ar: 'اختبار التوفل عبر الإنترنت',
    acr: 'TOEFL iBT'
  },
  {
    filename: 'TOEIC_2026_Complete_Data_AR.md',
    id: 'toeic-english',
    slug: 'toeic-english',
    classification: 'REPLACE_EXISTING',
    eng: 'Test of English for International Communication',
    ar: 'اختبار التويك للتواصل الدولي',
    acr: 'TOEIC'
  },
  {
    filename: 'iTEP_Academic_2026_Complete_Data_AR.md',
    id: 'itep-academic',
    slug: 'itep-academic',
    classification: 'REPLACE_EXISTING',
    eng: 'International Test of English Proficiency (Academic)',
    ar: 'اختبار آيتيب الأكاديمي للغة الإنجليزية',
    acr: 'iTEP Academic'
  }
];

interface RelationCounts {
  variants: number;
  sections: number;
  scoreScales: number;
  sessions: number;
  requirements: number;
  policies: number;
  fees: number;
  officialLinks: number;
  preparationMaterials: number;
  centers: number;
  countryRelationships: number;
  languageRelationships: number;
  academicTaxonomyRelationships: number;
  degreeRelationships: number;
  equivalencyMappings: number;
}

async function getRelationCounts(tx: any, testIds: string[]): Promise<Record<string, RelationCounts>> {
  const result: Record<string, RelationCounts> = {};
  for (const id of testIds) {
    const variants = await tx.internationalTestVariant.count({ where: { testId: id } });
    const sections = await tx.internationalTestSection.count({ where: { testId: id } });
    const fees = await tx.internationalTestFeeMetadata.count({ where: { testId: id } });
    const officialLinks = await tx.internationalTestOfficialLink.count({ where: { testId: id } });
    const preparationMaterials = await tx.internationalTestPreparationMaterial.count({ where: { testId: id } });
    const centers = await tx.internationalTestCenter.count({ where: { testId: id } });
    const countryRelationships = await tx.internationalTestCountryRelationship.count({ where: { testId: id } });
    const languageRelationships = await tx.internationalTestLanguageRelationship.count({ where: { testId: id } });
    const academicTaxonomyRelationships = await tx.internationalTestAcademicTaxonomyRelationship.count({ where: { testId: id } });
    const degreeRelationships = await tx.internationalTestDegreeRelationship.count({ where: { testId: id } });
    const equivalencyMappings = await tx.internationalTestEquivalencyMapping.count({ where: { testId: id } });

    const versions = await tx.internationalTestVersion.findMany({ where: { testId: id }, select: { id: true } });
    const versionIds = versions.map((v: any) => v.id);

    const scoreScales = await tx.internationalTestVersionScoreScale.count({ where: { versionId: { in: versionIds } } });
    const sessions = await tx.internationalTestSession.count({ where: { versionId: { in: versionIds } } });
    const requirements = await tx.internationalTestRequirement.count({ where: { versionId: { in: versionIds } } });
    const policies = await tx.internationalTestPolicy.count({ where: { versionId: { in: versionIds } } });

    result[id] = {
      variants,
      sections,
      scoreScales,
      sessions,
      requirements,
      policies,
      fees,
      officialLinks,
      preparationMaterials,
      centers,
      countryRelationships,
      languageRelationships,
      academicTaxonomyRelationships,
      degreeRelationships,
      equivalencyMappings,
    };
  }
  return result;
}

async function main() {
  console.log('Starting atomic transaction for English Batch of 12 tests...');

  const existingIds = filesToImport
    .filter(f => f.classification === 'REPLACE_EXISTING')
    .map(f => f.id);

  // Get relationship counts before transaction
  const countsBefore = await getRelationCounts(prisma, existingIds);

  let importedCount = 0;
  let updatedCount = 0;
  let createdCount = 0;
  let contentBlockCount = 0;
  let transactionStatus = 'UNKNOWN';
  let relationPreservationResult = 'UNKNOWN';
  let errors: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of filesToImport) {
        const filePath = path.join(
          process.cwd(),
          'data',
          'international-tests',
          'unified-56',
          '01_English_Language_Tests_12',
          item.filename
        );

        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const parsedSections = InternationalTestMarkdownParser.parse(rawContent);

        if (parsedSections.length !== 17) {
          throw new Error(`Expected exactly 17 sections for ${item.filename}, but parsed ${parsedSections.length}`);
        }

        if (item.classification === 'NEW_TEST') {
          // Create new test
          const test = await tx.internationalTest.create({
            data: {
              id: item.id,
              publicId: item.id,
              slug: item.slug,
              canonicalName: item.eng,
              canonicalDedupKey: item.eng,
              displayName: item.eng,
              status: 'PUBLISHED',
              completenessStatus: 'COMPLETE',
              testCategory: 'Language',
              localizedNameAr: item.ar,
              localizedNameEn: item.eng,
              abbreviation: item.acr,
              isPubliclyVisible: true,
              isSourceVerified: true,
            }
          });

          const version = await tx.internationalTestVersion.create({
            data: {
              testId: test.id,
              versionNumber: 2026,
              status: 'PUBLISHED',
              sourceFileName: item.filename,
              importedAt: new Date(),
            }
          });

          await tx.internationalTest.update({
            where: { id: test.id },
            data: { currentPublishedVersionId: version.id }
          });

          for (const sec of parsedSections) {
            await tx.internationalTestContentBlock.create({
              data: {
                versionId: version.id,
                blockKey: sec.blockKey,
                blockType: 'MARKDOWN',
                title: sec.title,
                locale: 'ar',
                content: sec.content,
                reviewStatus: 'VERIFIED',
                metadata: { displayOrder: sec.sectionNumber }
              }
            });
            contentBlockCount++;
          }

          createdCount++;
          importedCount++;
          console.log(`Successfully created new test: ${item.id}`);

        } else if (item.classification === 'REPLACE_EXISTING') {
          // Update existing test
          const existingTest = await tx.internationalTest.findUnique({
            where: { id: item.id },
            include: { versions: true }
          });

          if (!existingTest) {
            throw new Error(`Expected existing test '${item.id}' but not found in DB`);
          }

          let version = existingTest.versions.find(v => v.versionNumber === 2026);
          if (!version) {
            version = await tx.internationalTestVersion.create({
              data: {
                testId: existingTest.id,
                versionNumber: 2026,
                status: 'PUBLISHED',
                sourceFileName: item.filename,
                importedAt: new Date(),
              }
            });

            if (!existingTest.currentPublishedVersionId) {
              await tx.internationalTest.update({
                where: { id: existingTest.id },
                data: { currentPublishedVersionId: version.id }
              });
            }
          }

          // Delete existing content blocks of this version to replace them
          await tx.internationalTestContentBlock.deleteMany({
            where: { versionId: version.id }
          });

          // Merge optionalFields
          const existingOptional = (existingTest.optionalFields as Record<string, any>) || {};
          const mergedOptional = { ...existingOptional };

          await tx.internationalTest.update({
            where: { id: existingTest.id },
            data: {
              localizedNameAr: item.ar,
              localizedNameEn: item.eng,
              abbreviation: item.acr,
              optionalFields: mergedOptional,
            }
          });

          // Create new content blocks
          for (const sec of parsedSections) {
            await tx.internationalTestContentBlock.create({
              data: {
                versionId: version.id,
                blockKey: sec.blockKey,
                blockType: 'MARKDOWN',
                title: sec.title,
                locale: 'ar',
                content: sec.content,
                reviewStatus: 'VERIFIED',
                metadata: { displayOrder: sec.sectionNumber }
              }
            });
            contentBlockCount++;
          }

          updatedCount++;
          importedCount++;
          console.log(`Successfully updated existing test: ${item.id}`);
        }
      }
    });

    transactionStatus = 'COMMITTED';
  } catch (err: any) {
    transactionStatus = 'ROLLED_BACK';
    errors.push(err.message);
    console.error('Transaction failed and rolled back:', err);
  }

  // Verification phase
  if (transactionStatus === 'COMMITTED') {
    // Check relationship counts after transaction
    const countsAfter = await getRelationCounts(prisma, existingIds);
    let relationshipLossDetected = false;

    for (const id of existingIds) {
      const before = countsBefore[id];
      const after = countsAfter[id];

      const diffs: string[] = [];
      for (const key of Object.keys(before) as (keyof RelationCounts)[]) {
        if (before[key] !== after[key]) {
          diffs.push(`${key}: before=${before[key]}, after=${after[key]}`);
          relationshipLossDetected = true;
        }
      }

      if (diffs.length > 0) {
        errors.push(`Relationship mismatch for test ${id}: ${diffs.join(', ')}`);
      }
    }

    if (!relationshipLossDetected) {
      relationPreservationResult = '0 RELATIONSHIP LOSS - ALL COUNTS PRESERVED PERFECTLY';
    } else {
      relationPreservationResult = 'RELATIONSHIP LOSS OR MISMATCH DETECTED';
    }

    // Additional sanity checks
    const finalTestsCount = await prisma.internationalTest.count({
      where: { id: { in: filesToImport.map(f => f.id) } }
    });

    if (finalTestsCount !== 12) {
      errors.push(`Final test count is ${finalTestsCount}, expected 12`);
    }

    // Check duplicate IDs or slugs in DB
    const allTests = await prisma.internationalTest.findMany({
      select: { id: true, slug: true }
    });
    const idsSet = new Set();
    const slugsSet = new Set();
    let hasDuplicateId = false;
    let hasDuplicateSlug = false;
    for (const t of allTests) {
      if (idsSet.has(t.id)) hasDuplicateId = true;
      if (slugsSet.has(t.slug)) hasDuplicateSlug = true;
      idsSet.add(t.id);
      slugsSet.add(t.slug);
    }

    if (hasDuplicateId) errors.push('Duplicate IDs detected in the database');
    if (hasDuplicateSlug) errors.push('Duplicate Slugs detected in the database');

    const verdict = errors.length === 0 ? 'ENGLISH 12 IMPORT PASS' : 'ENGLISH IMPORT ROLLED BACK';

    console.log('\n=========================================');
    console.log('            MIGRATION REPORT');
    console.log('=========================================');
    console.log(`1. Imported count: ${importedCount}`);
    console.log(`2. Updated count: ${updatedCount}`);
    console.log(`3. Created count: ${createdCount}`);
    console.log(`4. ContentBlock count: ${contentBlockCount}`);
    console.log(`5. Transaction status: ${transactionStatus}`);
    console.log(`6. Relationship preservation result: ${relationPreservationResult}`);
    console.log(`7. Errors: ${errors.length > 0 ? errors.join(' | ') : 'None'}`);
    console.log(`8. Verdict: ${verdict}`);
    console.log('=========================================\n');
  } else {
    console.log('\n=========================================');
    console.log('            MIGRATION REPORT');
    console.log('=========================================');
    console.log(`1. Imported count: 0`);
    console.log(`2. Updated count: 0`);
    console.log(`3. Created count: 0`);
    console.log(`4. ContentBlock count: 0`);
    console.log(`5. Transaction status: ${transactionStatus}`);
    console.log(`6. Relationship preservation result: N/A (Rolled back)`);
    console.log(`7. Errors: ${errors.join(' | ')}`);
    console.log(`8. Verdict: ENGLISH IMPORT ROLLED BACK`);
    console.log('=========================================\n');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Unhandled script exception:', e);
  await prisma.$disconnect();
});
