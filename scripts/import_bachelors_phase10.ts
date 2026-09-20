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
  requireDatabaseMutationGate('import-bachelors-phase10', { allowedPurposes: ['import'] });
  console.log('Initializing dependency container and registering dependencies...');
  registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');

  const sourceDir = path.join(process.cwd(), 'workspace/phase-10-major-detail-dossiers/bachelor');
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory ${sourceDir} does not exist!`);
    process.exit(1);
  }

  // Find all markdown files in the folder without exclusion
  const files = fs.readdirSync(sourceDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  console.log(`Found ${files.length} total markdown files in ${sourceDir}`);

  let totalParsed = 0;
  let totalSaved = 0;
  const seenCodes = new Set<string>();

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    // Preprocess to handle files where header lines or table records have leading indentation
    const preprocessedContent = content.split(/\r?\n/).map(line => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('#') || trimmed.startsWith('|')) {
        return trimmed;
      }
      return line;
    }).join('\n');

    console.log(`Parsing file: ${file}...`);
    let parsedResult: any;
    try {
      parsedResult = MajorDetailDossierMarkdownParser.parse(preprocessedContent, 'BACHELOR');
    } catch (e) {
      console.error(`CRITICAL: Parser failed for file ${file}:`, e);
      throw e;
    }

    const rows = parsedResult.rows;
    console.log(`- File ${file} yielded ${rows.length} rows.`);

    for (const record of rows) {
      const code = record.classificationCode;
      if (!code) {
        throw new Error(`CRITICAL: Record without classification code found in file ${file}!`);
      }

      // Extract numeric part from MJR-XXXX
      const match = code.match(/MJR-(\d+)/);
      if (!match) {
        continue;
      }
      const num = parseInt(match[1], 10);

      // Import within range 11 to 843
      if (num < 11 || num > 843) {
        continue;
      }

      totalParsed++;

      if (seenCodes.has(code)) {
        console.warn(`WARNING: Duplicate code ${code} detected in file ${file}. Skipping duplicate.`);
        continue;
      }
      seenCodes.add(code);

      const canonicalName = record.canonicalMajorName;
      const dedupKey = generateDedupKey(canonicalName);

      // Find existing profile by code and BACHELOR level
      let profile = await prisma.majorLevelProfile.findFirst({
        where: {
          level: 'BACHELOR',
          code: code
        }
      });

      let majorId: string;
      if (profile) {
        majorId = profile.majorId;
      } else {
        // Find existing Major by dedupKey or create
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
                  catalogKind: 'BACHELOR',
                  sourceTitle: canonicalName,
                  detailStatus: 'DRAFT_NEEDS_REVIEW'
                },
                degreeLevel: 'Bachelor',
                localizedNames: record.localizedNames,
                classificationCode: code,
                sourceImportRecordId: 'import-bch-' + code.toLowerCase(),
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
            level: 'BACHELOR',
            code: code,
            displayName: canonicalName,
            localizedNameAr: record.localizedNames.ar,
            localizedNameEn: record.localizedNames.en,
            status: 'READY_TO_REVIEW',
            completenessStatus: 'NEEDS_REVIEW',
            metadata: {
              profileKey: dedupKey + '|bachelor|unknown',
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

      // Store content sections under that version.
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

  // Identify missing codes
  const missingCodes: string[] = [];
  for (let i = 11; i <= 843; i++) {
    const code = `MJR-${i.toString().padStart(4, '0')}`;
    if (!seenCodes.has(code)) {
      missingCodes.push(code);
    }
  }

  console.log(`\n========================================`);
  if (missingCodes.length > 0) {
    console.error(`FAILED: Bachelor phase 10 import finished with missing codes!`);
  } else {
    console.log(`🎉 SUCCESS: Bachelor phase 10 full range (11-843) import complete!`);
  }
  console.log(`Total records parsed: ${totalParsed}`);
  console.log(`Total records successfully saved/updated: ${totalSaved}`);
  console.log(`Total distinct codes found: ${seenCodes.size}`);
  console.log(`Total missing codes: ${missingCodes.length}`);
  console.log(`========================================`);
  
  if (missingCodes.length > 0) {
    console.log(`MISSING_CODES_LIST: ${missingCodes.join(',')}`);
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main().catch(error => {
  console.error('CRITICAL IMPORT ERROR:', error);
  process.exitCode = 1;
}).finally(() => {
  
});
