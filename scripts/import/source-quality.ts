import { prepareSourceQuality, verifyOrWriteSourceQuality } from './SourceQualityPreparation';

const mode = process.argv[2];
if (!['prepare', 'check'].includes(mode) || process.argv.length !== 3) throw new Error('Usage: tsx scripts/import/source-quality.ts prepare|check');
const output = await prepareSourceQuality(process.cwd());
verifyOrWriteSourceQuality(process.cwd(), output, mode as 'prepare' | 'check');
console.log(JSON.stringify({ mode: `SOURCE_QC_${mode.toUpperCase()}`, outputs: Object.keys(output), databaseWrites: 0, runtime: 'RUNTIME_UNTESTED' }));
