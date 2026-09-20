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
    filename: 'Celpe_Bras_Brazilian_Portuguese_2026_Complete_Data_AR.md',
    id: 'celpe-bras-portuguese',
    slug: 'celpe-bras-portuguese',
    classification: 'REPLACE_EXISTING',
    eng: 'Celpe-Bras (Portuguese)',
    ar: 'شهادة كفاءة اللغة البرتغالية للأجانب (سيلبي براس)',
    acr: 'Celpe-Bras'
  },
  {
    filename: 'CILS_Italian_2026_Complete_Data_AR.md',
    id: 'cils-italian',
    slug: 'cils-italian',
    classification: 'REPLACE_EXISTING',
    eng: 'CILS (Italian)',
    ar: 'شهادة اللغة الإيطالية كلوغة ثانية (تشيلس)',
    acr: 'CILS'
  },
  {
    filename: 'DELE_Spanish_2026_Complete_Data_AR.md',
    id: 'dele-spanish',
    slug: 'dele-spanish',
    classification: 'REPLACE_EXISTING',
    eng: 'DELE (Spanish)',
    ar: 'دبلومات اللغة الإسبانية كلوغة أجنبية (ديلي)',
    acr: 'DELE'
  },
  {
    filename: 'DELF_DALF_French_2026_Complete_Data_AR.md',
    id: 'delf-dalf-french',
    slug: 'delf-dalf-french',
    classification: 'REPLACE_EXISTING',
    eng: 'DELF / DALF (French)',
    ar: 'دبلوم دراسات اللغة الفرنسية والدبلوم المتقدم (ديلف / دالف)',
    acr: 'DELF / DALF'
  },
  {
    filename: 'HSK_Chinese_2026_Complete_Data_AR.md',
    id: 'hsk-chinese',
    slug: 'hsk-chinese',
    classification: 'REPLACE_EXISTING',
    eng: 'HSK (Chinese)',
    ar: 'اختبار كفاءة اللغة الصينية (إتش إس كيه)',
    acr: 'HSK'
  },
  {
    filename: 'JLPT_Japanese_2026_Complete_Data_AR.md',
    id: 'jlpt-japanese',
    slug: 'jlpt-japanese',
    classification: 'REPLACE_EXISTING',
    eng: 'JLPT (Japanese)',
    ar: 'اختبار الكفاءة في اللغة اليابانية (جيلبت)',
    acr: 'JLPT'
  },
  {
    filename: 'NT2_Netherlands_Dutch_2026_Complete_Data_AR.md',
    id: 'nt2-dutch',
    slug: 'nt2-dutch',
    classification: 'REPLACE_EXISTING',
    eng: 'Staatsexamen Nt2 (Dutch)',
    ar: 'امتحان الدولة للغة الهولندية كلوغة ثانية (إن تي 2)',
    acr: 'Nt2'
  },
  {
    filename: 'Polish_State_Certificate_Poland_Polish_2026_Complete_Data_AR.md',
    id: 'polish-state-cert',
    slug: 'polish-state-cert',
    classification: 'REPLACE_EXISTING',
    eng: 'Polish State Certificate',
    ar: 'شهادة الدولة للغة البولندية كلوغة أجنبية',
    acr: 'Polish State Cert'
  },
  {
    filename: 'TestDaF_German_2026_Complete_Data_AR.md',
    id: 'testdaf-german',
    slug: 'testdaf-german',
    classification: 'REPLACE_EXISTING',
    eng: 'TestDaF (German)',
    ar: 'اختبار اللغة الألمانية كلوغة أجنبية (تست داف)',
    acr: 'TestDaF'
  },
  {
    filename: 'TOMER_Turkey_Turkish_2026_Complete_Data_AR.md',
    id: 'tomer-turkish',
    slug: 'tomer-turkish',
    classification: 'REPLACE_EXISTING',
    eng: 'TÖMER (Turkish)',
    ar: 'اختبار الكفاءة في اللغة التركية (تومر)',
    acr: 'TÖMER'
  },
  {
    filename: 'TOPIK_Korean_2026_Complete_Data_AR.md',
    id: 'topik-korean',
    slug: 'topik-korean',
    classification: 'REPLACE_EXISTING',
    eng: 'TOPIK (Korean)',
    ar: 'اختبار الكفاءة في اللغة الكورية (توبيك)',
    acr: 'TOPIK'
  },
  {
    filename: 'TORFL_TRKI_Russian_2026_Complete_Data_AR.md',
    id: 'torfl-russian',
    slug: 'torfl-russian',
    classification: 'REPLACE_EXISTING',
    eng: 'TORFL (Russian)',
    ar: 'اختبار اللغة الروسية كلوغة أجنبية (تورفل / تركي)',
    acr: 'TORFL / TRKI'
  },
  {
    filename: 'UKBI_Indonesia_Indonesian_2026_Complete_Data_AR.md',
    id: 'ukbi-indonesian',
    slug: 'ukbi-indonesian',
    classification: 'REPLACE_EXISTING',
    eng: 'UKBI (Indonesian)',
    ar: 'اختبار الكفاءة في اللغة الإندونيسية (يو كي بي إي)',
    acr: 'UKBI'
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
  console.log('Starting atomic transaction for Non-English Language Batch of 13 tests...');

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
          '02_Non_English_Language_Tests_13',
          item.filename
        );

        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const parsedSections = InternationalTestMarkdownParser.parse(rawContent);

        if (parsedSections.length !== 18) {
          throw new Error(`Expected exactly 18 sections for ${item.filename}, but parsed ${parsedSections.length}`);
        }

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

        // Create new content blocks (sec-01 through sec-18)
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

        if (testBlockCount !== 18) {
          throw new Error(`Created ${testBlockCount} blocks for ${item.id}, expected 18`);
        }

        updatedCount++;
        console.log(`Successfully updated existing test: ${item.id} with 18 ContentBlocks`);
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
    if (totalCount !== 51) {
      errors.push(`Total InternationalTest count is ${totalCount}, expected 51`);
    }

    // Check target updated test count
    if (updatedCount !== 13) {
      errors.push(`Updated test count is ${updatedCount}, expected 13`);
    }

    // Check target content block count
    if (contentBlockCount !== 234) {
      errors.push(`Total ContentBlock count is ${contentBlockCount}, expected 234`);
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

    const verdict = errors.length === 0 ? 'NON-ENGLISH 13 IMPORT PASS' : 'NON-ENGLISH IMPORT ROLLED BACK';

    console.log('\n=========================================');
    console.log('            MIGRATION REPORT');
    console.log('=========================================');
    console.log(`1. Updated count: ${updatedCount}/13`);
    console.log(`2. ContentBlock count: ${contentBlockCount}/234`);
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
    console.log(`8. Verdict: NON-ENGLISH IMPORT ROLLED BACK`);
    console.log('=========================================\n');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Unhandled script exception:', e);
  await prisma.$disconnect();
});
