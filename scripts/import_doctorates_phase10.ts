import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container';
import { PrismaClient } from '@prisma/client';
import { MajorDetailDossierMarkdownParser } from '../packages/application/src/majors/services/MajorDetailDossierMarkdownParser';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

// Replicate MajorNamingService logic for standalone stability
function normalizeArabic(value: string): string {
  return value
    .trim()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEnglish(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSearchText(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) {
    return 'unknown';
  }
  const normalized = /[\u0600-\u06FF]/.test(raw)
    ? normalizeArabic(raw)
    : normalizeEnglish(raw);
  return normalized || 'unknown';
}

function normalizeForKey(value: string | undefined): string {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'unknown';
}

function generateDedupKey(canonicalName: string, disciplineId?: string, classificationContext?: string): string {
  const concept = normalizeForKey(canonicalName);
  const primaryDiscipline = normalizeForKey(disciplineId);
  const context = normalizeForKey(classificationContext);
  return [concept, primaryDiscipline, context].join('|');
}

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-maj-';
}

async function main() {
  requireDatabaseMutationGate('import-doctorates-phase10', { allowedPurposes: ['import'] });
  console.log('Initializing dependency container and registering dependencies...');
  registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');

  const sourceDir = path.join(process.cwd(), 'workspace/phase-10-major-detail-dossiers/doctorate');
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory ${sourceDir} does not exist!`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceDir)
    .filter(f => f.startsWith('doctorate_specialties_DOC-') && f.endsWith('.md'))
    .sort();

  console.log(`Found ${files.length} candidate files in ${sourceDir}`);

  // Only process files up to DOC-0500
  const targetFiles = files.filter(f => {
    const match = f.match(/DOC-(\d+)_to_DOC-(\d+)/);
    if (!match) return false;
    const end = parseInt(match[2], 10);
    return end <= 500;
  });

  console.log(`Processing ${targetFiles.length} files for DOC-0001 through DOC-0500...`);

  if (targetFiles.length !== 50) {
    throw new Error(`Expected exactly 50 files for the first 500 doctorates, but found ${targetFiles.length}! Aborting.`);
  }

  let totalParsed = 0;
  let totalSaved = 0;
  const seenCodes = new Set<string>();

  for (const file of targetFiles) {
    const filePath = path.join(sourceDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    console.log(`Parsing file: ${file}...`);
    let parsedResult: any;
    try {
      parsedResult = MajorDetailDossierMarkdownParser.parse(content, 'DOCTORATE');
    } catch (e) {
      console.error(`CRITICAL: Parser failed for file ${file}:`, e);
      throw e;
    }

    const rows = parsedResult.rows;
    if (rows.length !== 10) {
      throw new Error(`CRITICAL: Every individual dossier file must yield exactly 10 distinct specialization records! File ${file} yielded ${rows.length} records. Aborting.`);
    }

    totalParsed += rows.length;

    for (const record of rows) {
      const docCode = record.classificationCode;
      if (!docCode) {
        throw new Error(`CRITICAL: Record without classification code found in file ${file}!`);
      }

      if (seenCodes.has(docCode)) {
        throw new Error(`CRITICAL: Duplicate DOC code detected: ${docCode} in file ${file}! Stop promotion for that code.`);
      }
      seenCodes.add(docCode);

      const canonicalName = record.canonicalMajorName;
      const dedupKey = generateDedupKey(canonicalName);

      // Find the exact profile by DOC code and Doctorate level.
      let profile = await prisma.majorLevelProfile.findFirst({
        where: {
          level: 'DOCTORATE',
          code: docCode
        }
      });

      let majorId: string;
      if (profile) {
        // Confirm parsedCode === profile.code
        if (profile.code !== docCode) {
          throw new Error(`Mismatched profile code! Expected ${docCode}, got ${profile.code}`);
        }
        majorId = profile.majorId;
      } else {
        // Find existing Major by dedupKey or name
        let major = await prisma.major.findUnique({
          where: { canonicalDedupKey: dedupKey }
        });

        if (!major) {
          // Generate a unique slug
          let baseSlug = slugify(canonicalName);
          let slug = baseSlug;
          let slugExists = await prisma.major.findUnique({ where: { slug } });
          let retries = 0;
          while (slugExists && retries < 10) {
            slug = baseSlug + crypto.randomBytes(3).toString('hex');
            slugExists = await prisma.major.findUnique({ where: { slug } });
            retries++;
          }

          // Create Major
          const publicId = 'maj-' + crypto.randomBytes(4).toString('hex');
          major = await prisma.major.create({
            data: {
              id: uuidv4(),
              publicId,
              slug,
              canonicalName,
              canonicalDedupKey: dedupKey,
              displayName: record.localizedNames.ar || canonicalName,
              status: 'READY_TO_REVIEW',
              completenessStatus: 'NEEDS_REVIEW',
              optionalFields: {
                metadata: {
                  catalogKind: 'DOCTORATE',
                  sourceTitle: canonicalName,
                  detailStatus: 'DRAFT_NEEDS_REVIEW'
                },
                degreeLevel: 'Doctorate',
                localizedNames: record.localizedNames,
                classificationCode: docCode,
                sourceImportRecordId: 'import-doc-' + docCode.toLowerCase(),
                sourceClassificationSystem: 'MANARATAK_PHASE_10_DETAIL_DOSSIER'
              }
            }
          });
        }

        majorId = major.id;

        // Create MajorLevelProfile
        profile = await prisma.majorLevelProfile.create({
          data: {
            id: uuidv4(),
            majorId,
            level: 'DOCTORATE',
            code: docCode,
            displayName: canonicalName,
            localizedNameAr: record.localizedNames.ar,
            localizedNameEn: record.localizedNames.en,
            status: 'READY_TO_REVIEW',
            completenessStatus: 'NEEDS_REVIEW',
            metadata: {
              profileKey: dedupKey + '|doctorate|unknown',
              sourceImportMode: 'DETAIL_DOSSIER',
              sourceClassificationSystem: 'MANARATAK_PHASE_10_DETAIL_DOSSIER'
            }
          }
        });
      }

      // Create or update a version belonging to that profile.
      let version = await prisma.majorVersion.findFirst({
        where: { profileId: profile.id }
      });

      if (version) {
        // Store only that specialization’s content sections under that version.
        // Delete previous content sections of this version to avoid duplicates.
        await prisma.majorContentSection.deleteMany({
          where: { versionId: version.id }
        });

        version = await prisma.majorVersion.update({
          where: { id: version.id },
          data: {
            sourceHash: hash,
            sourceFileName: file,
            importedAt: new Date()
          }
        });
      } else {
        version = await prisma.majorVersion.create({
          data: {
            id: uuidv4(),
            majorId,
            profileId: profile.id,
            versionNumber: 1,
            status: 'NEEDS_REVIEW',
            sourceFileName: file,
            sourceHash: hash,
            importedAt: new Date()
          }
        });
      }

      // Store only that specialization’s content sections under that version.
      for (const block of record.contentBlocks) {
        await prisma.majorContentSection.create({
          data: {
            id: uuidv4(),
            profileId: profile.id,
            versionId: version.id,
            sectionKey: block.blockKey,
            title: block.title,
            locale: 'ar',
            content: block.content,
            reviewStatus: 'NEEDS_REVIEW'
          }
        });
      }

      // Link version to currentPublishedVersionId of the profile
      await prisma.majorLevelProfile.update({
        where: { id: profile.id },
        data: {
          currentPublishedVersionId: version.id
        }
      });

      totalSaved++;
    }
  }

  // Double check that we processed exactly 500 records
  if (totalParsed !== 500 || totalSaved !== 500) {
    throw new Error(`CRITICAL Validation Error: Parsed ${totalParsed}/500 records and saved ${totalSaved}/500. Expected exactly 500 of both.`);
  }

  console.log(`\n========================================`);
  console.log(`🎉 SUCCESS: Doctorate phase 10 import complete!`);
  console.log(`Total files processed: ${targetFiles.length}`);
  console.log(`Total records parsed and saved: ${totalSaved}`);
  console.log(`========================================`);
}

main().catch(error => {
  console.error('CRITICAL IMPORT ERROR:', error);
  process.exitCode = 1;
}).finally(() => {
  
});
