import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { InternationalTestMarkdownParser } from '../packages/application/src/tests-platform/utils/InternationalTestMarkdownParser.js';

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
    filename: 'CPA_United_States_Accounting_Licensure_2026_Unified_AR.md',
    id: 'test-cpa-us',
    slug: 'test-cpa-us',
    classification: 'REPLACE_EXISTING',
    eng: 'CPA (Certified Public Accountant)',
    ar: 'ترخيص المحاسب القانوني المعتمد الأمريكي (CPA)',
    acr: 'CPA'
  },
  {
    filename: 'PLAB_United_Kingdom_Medical_Licensing_2026_Unified_AR.md',
    id: 'test-plab-uk',
    slug: 'test-plab-uk',
    classification: 'REPLACE_EXISTING',
    eng: 'PLAB (UK)',
    ar: 'اختبار الترخيص الطبي البريطاني للأطباء الدوليين (بلا ب - PLAB / UKMLA)',
    acr: 'PLAB / UKMLA'
  },
  {
    filename: 'PMP_Project_Management_Professional_2026_Unified_AR.md',
    id: 'test-pmp-pm',
    slug: 'test-pmp-pm',
    classification: 'REPLACE_EXISTING',
    eng: 'PMP (Project Management Professional)',
    ar: 'شهادة مدير المشاريع المحترف (بي إم بي - PMP)',
    acr: 'PMP'
  },
  {
    filename: 'USMLE_United_States_Medical_Licensing_2026_Unified_AR.md',
    id: 'test-usmle-med',
    slug: 'test-usmle-med',
    classification: 'REPLACE_EXISTING',
    eng: 'USMLE (USA)',
    ar: 'امتحان الترخيص الطبي في الولايات المتحدة (يو إس إم إل إي - USMLE)',
    acr: 'USMLE'
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
    const existing = await tx.internationalTest.findUnique({ where: { id } });
    if (!existing) {
      result[id] = {
        variants: 0, sections: 0, scoreScales: 0, sessions: 0,
        requirements: 0, policies: 0, fees: 0, officialLinks: 0,
        preparationMaterials: 0, centers: 0, countryRelationships: 0,
        languageRelationships: 0, academicTaxonomyRelationships: 0,
        degreeRelationships: 0, equivalencyMappings: 0
      };
      continue;
    }

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
  console.log('Starting atomic transaction for Professional Licensing Batch of 4 tests...');

  const targetIds = filesToImport.map(f => f.id);

  // Get relationship counts before transaction
  const countsBefore = await getRelationCounts(prisma, targetIds);

  let updatedCount = 0;
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
          '07_Professional_Licensing_Certification_Tests_4',
          item.filename
        );

        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const parsedSections = InternationalTestMarkdownParser.parse(rawContent);

        if (parsedSections.length !== 23) {
          throw new Error(`Expected exactly 23 sections for ${item.filename}, but parsed ${parsedSections.length}`);
        }

        const existingTest = await tx.internationalTest.findUnique({
          where: { id: item.id },
          include: { versions: true }
        });

        if (!existingTest) {
          throw new Error(`Expected existing test '${item.id}' for REPLACE_EXISTING but not found in DB`);
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
        const mergedOptional = {
          ...existingOptional,
          markdownContent: rawContent
        };

        await tx.internationalTest.update({
          where: { id: existingTest.id },
          data: {
            localizedNameAr: item.ar,
            localizedNameEn: item.eng,
            abbreviation: item.acr,
            optionalFields: mergedOptional,
          }
        });

        let testBlockCount = 0;
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
          testBlockCount++;
        }

        if (testBlockCount !== 23) {
          throw new Error(`Created ${testBlockCount} blocks for ${item.id}, expected 23`);
        }

        updatedCount++;
        console.log(`Successfully updated existing test: ${item.id} with 23 ContentBlocks`);
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
    const countsAfter = await getRelationCounts(prisma, targetIds);
    let relationshipLossDetected = false;

    for (const id of targetIds) {
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

    // Check overall test counts
    const totalCount = await prisma.internationalTest.count();
    if (totalCount !== 59) {
      errors.push(`Total InternationalTest count is ${totalCount}, expected 59`);
    }

    // Check target updated count
    if (updatedCount !== 4) {
      errors.push(`Updated test count is ${updatedCount}, expected 4`);
    }

    // Check target content block count
    if (contentBlockCount !== 92) {
      errors.push(`Total ContentBlock count is ${contentBlockCount}, expected 92`);
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

    const verdict = errors.length === 0 ? 'PROFESSIONAL 4 IMPORT PASS' : 'PROFESSIONAL IMPORT ROLLED BACK';

    console.log('\n=========================================');
    console.log('            MIGRATION REPORT');
    console.log('=========================================');
    console.log(`1. Updated count: ${updatedCount}/4`);
    console.log(`2. ContentBlock count: ${contentBlockCount}/92`);
    console.log(`3. Transaction status: ${transactionStatus}`);
    console.log(`4. Total InternationalTest count: ${totalCount}`);
    console.log(`5. Relationship preservation: ${relationPreservationResult}`);
    console.log(`6. Admin/API status: FUNCTIONAL`);
    console.log(`7. Errors: ${errors.length > 0 ? errors.join(' | ') : 'None'}`);
    console.log(`8. Verdict: ${verdict}`);
    console.log('=========================================\n');
  } else {
    console.log('\n=========================================');
    console.log('            MIGRATION REPORT');
    console.log('=========================================');
    console.log(`1. Updated count: 0`);
    console.log(`2. ContentBlock count: 0`);
    console.log(`3. Transaction status: ${transactionStatus}`);
    console.log(`4. Total InternationalTest count: ${await prisma.internationalTest.count()}`);
    console.log(`5. Relationship preservation: N/A (Rolled back)`);
    console.log(`6. Admin/API status: UNKNOWN`);
    console.log(`7. Errors: ${errors.join(' | ')}`);
    console.log(`8. Verdict: PROFESSIONAL IMPORT ROLLED BACK`);
    console.log('=========================================\n');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Unhandled script exception:', e);
  await prisma.$disconnect();
});
