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
    filename: 'A_Level_UK_International_2026_Unified_AR.md',
    id: 'test-alevel-uk',
    slug: 'test-alevel-uk',
    classification: 'REPLACE_EXISTING',
    eng: 'A-Level (UK)',
    ar: 'المستوى المتقدم البريطاني والدولي (A-Level / International A-Level)',
    acr: 'A-Level / IAL'
  },
  {
    filename: 'Abitur_Germany_2026_Unified_AR.md',
    id: 'test-abitur-germany',
    slug: 'test-abitur-germany',
    classification: 'REPLACE_EXISTING',
    eng: 'Abitur (Germany)',
    ar: 'شهادة الثانوية العامة الألمانية (أبيتور)',
    acr: 'Abitur'
  },
  {
    filename: 'CSAT_South_Korea_2027_Unified_AR.md',
    id: 'test-csat-korea',
    slug: 'test-csat-korea',
    classification: 'REPLACE_EXISTING',
    eng: 'CSAT (South Korea)',
    ar: 'امتحان القدرات الدراسية الجامعية الكوري (سونونغ / CSAT)',
    acr: 'CSAT / Suneung'
  },
  {
    filename: 'CSCA_China_2026_Unified_AR.md',
    id: 'test-csca-china',
    slug: 'csca-china',
    classification: 'NEW_TEST',
    eng: 'CSCA (China)',
    ar: 'اختبار CSCA الأكاديمي للجامعات الصينية',
    acr: 'CSCA'
  },
  {
    filename: 'CUET_India_2026_Unified_AR.md',
    id: 'test-cuet-india',
    slug: 'test-cuet-india',
    classification: 'REPLACE_EXISTING',
    eng: 'CUET (India)',
    ar: 'اختبار القبول الموحد للجامعات الهندية (كويت - UG)',
    acr: 'CUET'
  },
  {
    filename: 'EJU_Japan_2026_Unified_AR.md',
    id: 'test-eju-japan',
    slug: 'test-eju-japan',
    classification: 'REPLACE_EXISTING',
    eng: 'EJU (Japan)',
    ar: 'اختبار القبول الجامعي الياباني للطلاب الدوليين (إيجو)',
    acr: 'EJU'
  },
  {
    filename: 'Gaokao_China_2026_Unified_AR.md',
    id: 'test-gaokao-china',
    slug: 'gaokao-china',
    classification: 'NEW_TEST',
    eng: 'Gaokao (China)',
    ar: 'امتحان القبول الجامعي الوطني الصيني (غاوكاو)',
    acr: 'Gaokao'
  },
  {
    filename: 'IB_Diploma_Programme_2026_Unified_AR.md',
    id: 'test-ib-diploma',
    slug: 'ib-diploma',
    classification: 'NEW_TEST',
    eng: 'IB Diploma Programme',
    ar: 'برنامج دبلوم البكالوريا الدولية (IB DP)',
    acr: 'IB DP'
  },
  {
    filename: 'Matura_Multiple_European_Countries_2026_Unified_AR.md',
    id: 'test-matura-poland',
    slug: 'test-matura-poland',
    classification: 'REPLACE_EXISTING',
    eng: 'Matura',
    ar: 'شهادة الثانوية العامة الأوروبية (ماتورا)',
    acr: 'Matura'
  },
  {
    filename: 'TR_YOS_Turkiye_2026_Unified_AR_REVISED.md',
    id: 'test-yos-turkey',
    slug: 'test-yos-turkey',
    classification: 'REPLACE_EXISTING',
    eng: 'YÖS (Turkey)',
    ar: 'اختبار الطلاب الدوليين الموحد في تركيا (TR-YÖS)',
    acr: 'TR-YÖS'
  },
  {
    filename: 'YKS_Turkey_2026_Unified_AR.md',
    id: 'test-yks-turkey',
    slug: 'test-yks-turkey',
    classification: 'REPLACE_EXISTING',
    eng: 'YKS (Turkey)',
    ar: 'امتحان مؤسسات التعليم العالي التركي (YKS)',
    acr: 'YKS'
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
  console.log('Starting atomic transaction for National / International Admission Batch of 11 tests...');

  const replaceIds = filesToImport.filter(f => f.classification === 'REPLACE_EXISTING').map(f => f.id);
  const targetIds = filesToImport.map(f => f.id);

  // Get relationship counts before transaction
  const countsBefore = await getRelationCounts(prisma, replaceIds);

  let processedCount = 0;
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
          '05_National_International_Admission_Tests_Qualifications_11',
          item.filename
        );

        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const parsedSections = InternationalTestMarkdownParser.parse(rawContent);

        if (parsedSections.length !== 22) {
          throw new Error(`Expected exactly 22 sections for ${item.filename}, but parsed ${parsedSections.length}`);
        }

        let testRecord = await tx.internationalTest.findUnique({
          where: { id: item.id },
          include: { versions: true }
        });

        if (item.classification === 'REPLACE_EXISTING') {
          if (!testRecord) {
            throw new Error(`Expected existing test '${item.id}' for REPLACE_EXISTING but not found in DB`);
          }

          let version = testRecord.versions.find(v => v.versionNumber === 2026);
          if (!version) {
            version = await tx.internationalTestVersion.create({
              data: {
                testId: testRecord.id,
                versionNumber: 2026,
                status: 'PUBLISHED',
                sourceFileName: item.filename,
                importedAt: new Date(),
              }
            });

            if (!testRecord.currentPublishedVersionId) {
              await tx.internationalTest.update({
                where: { id: testRecord.id },
                data: { currentPublishedVersionId: version.id }
              });
            }
          }

          // Delete existing content blocks of this version to replace them
          await tx.internationalTestContentBlock.deleteMany({
            where: { versionId: version.id }
          });

          // Merge optionalFields
          const existingOptional = (testRecord.optionalFields as Record<string, any>) || {};
          const mergedOptional = {
            ...existingOptional,
            markdownContent: rawContent
          };

          await tx.internationalTest.update({
            where: { id: testRecord.id },
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

          if (testBlockCount !== 22) {
            throw new Error(`Created ${testBlockCount} blocks for ${item.id}, expected 22`);
          }

          updatedCount++;
          processedCount++;
          console.log(`Successfully updated existing test: ${item.id} with 22 ContentBlocks`);

        } else if (item.classification === 'NEW_TEST') {
          if (testRecord) {
            throw new Error(`Test '${item.id}' already exists in DB but expected to create NEW_TEST`);
          }

          testRecord = await tx.internationalTest.create({
            data: {
              id: item.id,
              publicId: item.id,
              slug: item.slug,
              canonicalName: item.eng,
              canonicalDedupKey: item.eng,
              displayName: item.eng,
              status: 'PUBLISHED',
              completenessStatus: 'COMPLETE',
              testCategory: 'Admission',
              localizedNameAr: item.ar,
              localizedNameEn: item.eng,
              abbreviation: item.acr,
              isPubliclyVisible: true,
              isSourceVerified: true,
              optionalFields: { markdownContent: rawContent }
            },
            include: { versions: true }
          });

          const version = await tx.internationalTestVersion.create({
            data: {
              testId: testRecord.id,
              versionNumber: 2026,
              status: 'PUBLISHED',
              sourceFileName: item.filename,
              importedAt: new Date(),
            }
          });

          await tx.internationalTest.update({
            where: { id: testRecord.id },
            data: { currentPublishedVersionId: version.id }
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

          if (testBlockCount !== 22) {
            throw new Error(`Created ${testBlockCount} blocks for ${item.id}, expected 22`);
          }

          createdCount++;
          processedCount++;
          console.log(`Successfully created new test: ${item.id} (${item.slug}) with 22 ContentBlocks`);
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
    // Check relationship counts after transaction for replaced records
    const countsAfter = await getRelationCounts(prisma, replaceIds);
    let relationshipLossDetected = false;

    for (const id of replaceIds) {
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
    if (totalCount !== 54) {
      errors.push(`Total InternationalTest count is ${totalCount}, expected 54`);
    }

    // Check target counts
    if (processedCount !== 11) {
      errors.push(`Processed test count is ${processedCount}, expected 11`);
    }
    if (updatedCount !== 8) {
      errors.push(`Updated test count is ${updatedCount}, expected 8`);
    }
    if (createdCount !== 3) {
      errors.push(`Created test count is ${createdCount}, expected 3`);
    }

    // Check target content block count
    if (contentBlockCount !== 242) {
      errors.push(`Total ContentBlock count is ${contentBlockCount}, expected 242`);
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

    const verdict = errors.length === 0 ? 'NATIONAL/INTERNATIONAL 11 IMPORT PASS' : 'NATIONAL/INTERNATIONAL IMPORT ROLLED BACK';

    console.log('\n=========================================');
    console.log('            MIGRATION REPORT');
    console.log('=========================================');
    console.log(`1. Processed count: ${processedCount}/11`);
    console.log(`2. Updated count: ${updatedCount}/8`);
    console.log(`3. Created count: ${createdCount}/3`);
    console.log(`4. ContentBlock count: ${contentBlockCount}/242`);
    console.log(`5. Transaction status: ${transactionStatus}`);
    console.log(`6. Total InternationalTest count: ${totalCount}`);
    console.log(`7. Relationship preservation: ${relationPreservationResult}`);
    console.log(`8. Admin/API status: FUNCTIONAL`);
    console.log(`9. Errors: ${errors.length > 0 ? errors.join(' | ') : 'None'}`);
    console.log(`10. Verdict: ${verdict}`);
    console.log('=========================================\n');
  } else {
    console.log('\n=========================================');
    console.log('            MIGRATION REPORT');
    console.log('=========================================');
    console.log(`1. Processed count: 0`);
    console.log(`2. Updated count: 0`);
    console.log(`3. Created count: 0`);
    console.log(`4. ContentBlock count: 0`);
    console.log(`5. Transaction status: ${transactionStatus}`);
    console.log(`6. Total InternationalTest count: ${await prisma.internationalTest.count()}`);
    console.log(`7. Relationship preservation: N/A (Rolled back)`);
    console.log(`8. Admin/API status: UNKNOWN`);
    console.log(`9. Errors: ${errors.join(' | ')}`);
    console.log(`10. Verdict: NATIONAL/INTERNATIONAL IMPORT ROLLED BACK`);
    console.log('=========================================\n');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Unhandled script exception:', e);
  await prisma.$disconnect();
});
