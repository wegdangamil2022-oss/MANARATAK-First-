import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/database/greenfield-seed.manifest.json'), 'utf8'));
const blocked = manifest.steps.filter((step: { required: boolean; state: string }) => step.required && step.state !== 'READY');
if (blocked.length) throw new Error(`SEED_RECONCILIATION_PREREQUISITES_BLOCKED:${blocked.map((s: { id: string; state: string }) => `${s.id}:${s.state}`).join(',')}`);

const prisma = new PrismaClient();
try {
  const results: Record<string, { count: string; rule: unknown }> = {};
  for (const step of manifest.steps) {
    if (!step.required) continue;
    for (const [model, rule] of Object.entries(step.expected ?? {})) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(model)) throw new Error(`UNSAFE_SEED_RECONCILIATION_MODEL:${model}`);
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(`SELECT COUNT(*) AS count FROM "${model}"`);
      const count = BigInt(rows[0]?.count ?? -1);
      const expected = rule as { exact?: number; minimum?: number };
      if (expected.exact !== undefined && count !== BigInt(expected.exact)) throw new Error(`SEED_RECONCILIATION_EXACT_MISMATCH:${model}:${count}:${expected.exact}`);
      if (expected.minimum !== undefined && count < BigInt(expected.minimum)) throw new Error(`SEED_RECONCILIATION_MINIMUM_MISMATCH:${model}:${count}:${expected.minimum}`);
      results[model] = { count: String(count), rule: expected };
    }
  }
  console.log(JSON.stringify({ mode: 'SEED_RECONCILIATION', status: 'PASS', seedSetVersion: manifest.seedSetVersion, results, databaseWrites: 0 }, null, 2));
} finally {
  await prisma.$disconnect();
}
