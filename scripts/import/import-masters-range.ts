import * as fs from 'fs';
import * as path from 'path';
import { container, registerDependencies } from '../../apps/api/src/infrastructure/di/container';
import { MajorDetailDossierMarkdownParser } from '../../packages/application/src/majors/services/MajorDetailDossierMarkdownParser';

const ImportRecordStatus = {
  VALID: 'VALID',
} as const;

async function importRange(startCode: number, endCode: number) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('postgres-host') || databaseUrl.includes('placeholder')) {
    console.error('DATABASE IMPORT BLOCKED: configure an explicit development DATABASE_URL before running this script.');
    process.exitCode = 1;
    return;
  }
  registerDependencies();

  const promotionUseCase = container.resolve('majorImportPromotionUseCase') as any;

  let successCount = 0;
  let failureCount = 0;
  let missingFiles = 0;
  const dir = path.join('workspace', 'phase-10-major-detail-dossiers', 'master');

  for (let i = startCode; i <= endCode; i += 10) {
    const fileEnd = Math.min(i + 9, 1116);
    const fileName = `masters_MAS-${String(i).padStart(4, '0')}_to_MAS-${String(fileEnd).padStart(4, '0')}.md`;
    const filePath = path.join(dir, fileName);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      missingFiles++;
      continue;
    }

    const text = fs.readFileSync(filePath, 'utf-8');
    const result = MajorDetailDossierMarkdownParser.parse(text);

    for (const row of result.rows) {
      if (!row.code) continue;
      const codeNum = parseInt(row.code.replace('MAS-', ''), 10);
      if (codeNum < startCode || codeNum > endCode) continue;

      const record = {
        id: `import-mas-${row.code.toLowerCase()}`,
        batchId: `batch-masters-${startCode}-${endCode}`,
        status: ImportRecordStatus.VALID,
        targetDomain: 'MAJORS',
        sourceFileName: fileName,
        rawPayload: row,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        const promoResult = await promotionUseCase.promote(record);
        if (promoResult.type === 'CREATED' || promoResult.type === 'VERSION_CREATED' || promoResult.type === 'DUPLICATE') {
          successCount++;
        } else {
          console.error(`Failed to promote ${row.code}:`, promoResult);
          failureCount++;
        }
      } catch (err) {
        console.error(`Error promoting ${row.code}:`, err);
        failureCount++;
      }
    }
  }

  console.log(`[Batch MAS-${String(startCode).padStart(4, '0')} to MAS-${String(endCode).padStart(4, '0')}] Success: ${successCount}, Failed: ${failureCount}, Missing Files: ${missingFiles}`);
  if (failureCount > 0 || missingFiles > 0) {
    console.error('FINAL STATUS: FAILED (Some records failed to import or files were missing)');
    process.exitCode = 1;
  } else {
    console.log('FINAL STATUS: SUCCESS');
  }
}

const args = process.argv.slice(2);
const start = parseInt(args[0] || '11', 10);
const end = parseInt(args[1] || '100', 10);

importRange(start, end).catch(err => {
  console.error('Unhandled error during import:', err);
  process.exitCode = 1;
}).finally(() => {
  
});
