import {vi} from 'vitest';

/** Receipt persistence only; does not claim PostgreSQL isolation or rollback. */
export function financeCommandFixture() {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    findUnique: vi.fn(async ({where}: {where: {id: string}}) => rows.get(where.id) ?? null),
    create: vi.fn(async ({data}: {data: {id: string} & Record<string, unknown>}) => {
      if (rows.has(data.id)) throw Object.assign(new Error('Duplicate command receipt'), {code: 'P2002'});
      const stored = structuredClone(data);
      rows.set(data.id, stored);
      return stored;
    }),
  };
}
