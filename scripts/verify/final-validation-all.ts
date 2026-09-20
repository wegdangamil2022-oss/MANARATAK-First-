import { container, registerDependencies } from '../../apps/api/src/infrastructure/di/container';
import crypto from 'crypto';
import fs from 'fs';

async function main() {
  registerDependencies();
  const prisma = container.resolve('prisma') as any;

  console.log('=== VERIFYING MAS-0501 to MAS-1116 ===');
  const profiles = await prisma.majorLevelProfile.findMany({
    where: { level: 'MASTER' },
    include: {
      contentSections: { orderBy: { sectionKey: 'asc' } },
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      major: true,
    },
    orderBy: { code: 'asc' }
  });

  const profileMap = new Map<string, any>();
  for (const p of profiles) {
    if (p.code) profileMap.set(p.code, p);
  }

  let totalExactMatched = 0;
  let missingInDb = 0;
  let invalidSections = 0;
  let hasErrors = false;

  for (let i = 501; i <= 1116; i++) {
    const code = `MAS-${String(i).padStart(4, '0')}`;
    const profile = profileMap.get(code);
    if (!profile) {
      missingInDb++;
      console.error(`MISSING IN DB: ${code}`);
      hasErrors = true;
    } else {
      totalExactMatched++;
      if (profile.contentSections.length !== 22) {
        invalidSections++;
        hasErrors = true;
      }
    }
  }

  console.log(`- Expected Codes: 616 (MAS-0501 to MAS-1116)`);
  console.log(`- Successfully matched in DB: ${totalExactMatched}`);
  console.log(`- Missing in DB: ${missingInDb}`);
  console.log(`- Specializations with section count !== 22: ${invalidSections}`);

  const sampleCodes = ['MAS-0501', 'MAS-0502', 'MAS-0510', 'MAS-0550', 'MAS-0600', 'MAS-0601', 'MAS-0700', 'MAS-0750', 'MAS-0800', 'MAS-0900', 'MAS-1000', 'MAS-1001', 'MAS-1050', 'MAS-1100', 'MAS-1101', 'MAS-1110', 'MAS-1116'];
  
  console.log('\n=== SAMPLE CODES ASSERTION MATRIX ===');
  for (const sCode of sampleCodes) {
    const p = profileMap.get(sCode);
    if (!p) {
      console.error(`FAILED SAMPLE CHECK: ${sCode} not found in DB`);
      hasErrors = true;
      continue;
    }
    const fullText = p.contentSections.map((s: any) => `${s.title}\n${s.content}`).join('\n');
    const hash = crypto.createHash('sha256').update(fullText).digest('hex').substring(0, 12);
    const ver = p.versions[0];

    console.log(`Code: ${sCode} | RetCode: ${p.code} | NameAr: ${p.displayName} | Sections: ${p.contentSections.length} | ProfileID: ${p.id} | VersionID: ${ver?.id ?? 'N/A'} | SourceFile: ${ver?.sourceFileName ?? 'N/A'} | Hash: ${hash}`);
  }

  console.log('\n=== CHECKING FIRST 500 PROTECTION ===');
  try {
    const snapshotStr = fs.readFileSync('workspace/reconciliation/majors/snapshot-500.json', 'utf-8');
    const snapshot = JSON.parse(snapshotStr);
    let modifications = 0;
    
    for (let i = 1; i <= 500; i++) {
        const code = `MAS-${String(i).padStart(4, '0')}`;
        const curr = profileMap.get(code);
        const orig = snapshot[code];
        
        if (!orig && !curr) continue;
        if (!orig && curr) {
            console.error(`Added code that wasn't there before: ${code}`);
            modifications++;
            continue;
        }
        if (orig && !curr) {
            console.error(`Deleted code that was there before: ${code}`);
            modifications++;
            continue;
        }

        const fullText = curr.contentSections.map((s: any) => `${s.title}\n${s.content}`).join('\n');
        const hash = crypto.createHash('sha256').update(fullText).digest('hex').substring(0, 12);

        if (orig.hash !== hash) {
            console.error(`Hash changed for ${code}: ${orig.hash} -> ${hash}`);
            modifications++;
        }
        if (orig.sectionsCount !== curr.contentSections.length) {
            console.error(`Sections count changed for ${code}: ${orig.sectionsCount} -> ${curr.contentSections.length}`);
            modifications++;
        }
    }
    console.log(`Modifications in first 500: ${modifications === 0 ? 'NONE (PRESERVED)' : modifications}`);
    if (modifications > 0) hasErrors = true;
  } catch (err) {
      console.error('Could not verify first 500', err);
      hasErrors = true;
  }

  if (hasErrors) {
    console.error('\nFINAL STATUS: FAILED (Validation errors found)');
    process.exitCode = 1;
  } else {
    console.log('\nFINAL STATUS: SUCCESS');
  }
}

main().catch(err => {
  console.error('Unhandled error during validation:', err);
  process.exitCode = 1;
}).finally(() => {
  
});
