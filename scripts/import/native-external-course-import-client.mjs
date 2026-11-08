import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { courseTransportStatement } from './course-import-transport.mjs';
import { NativeUniversityImportClient } from './native-university-import-client.mjs';
const tables = {
  courseVersion: 'CourseVersion',
  course: 'Course',
  courseSourceIdentity: 'CourseSourceIdentity',
  courseSourceUrlHistory: 'CourseSourceUrlHistory',
  courseImportAnalysis: 'CourseImportAnalysis',
  courseFieldProvenance: 'CourseFieldProvenance',
  importBatch: 'ImportBatch',
  importRecord: 'ImportRecord',
  importReviewAssignment: 'ImportReviewAssignment',
  importScreeningReceipt: 'ImportScreeningReceipt',
  externalCourseProvider: 'ExternalCourseProvider',
  externalCourseProviderDomain: 'ExternalCourseProviderDomain',
};
const identifier = (value) => {
  assert.match(value, /^[A-Za-z][A-Za-z0-9]*$/);
  return '"' + value + '"';
};
/** Allowlisted lossless transport for audited append-only course import batches. */
export class NativeExternalCourseImportClient extends NativeUniversityImportClient {
  constructor(options) {
    super(options);
    this.initializeCourseDelegates();
  }
  initializeCourseDelegates() {
    for (const [delegate, table] of Object.entries(tables)) {
      this[delegate] = {
        findUnique: async (args) => (await this.findCourse(table, args))[0] ?? null,
        findMany: (args) => this.findCourse(table, args ?? {}),
        count: async (args) => {
          const entries = Object.entries(args?.where ?? {});
          const rows = await this.$queryRawUnsafe(
            'SELECT count(*)::int AS count FROM ' +
              identifier(table) +
              (entries.length
                ? ' WHERE ' + entries.map(([k], i) => identifier(k) + '=$' + (i + 1)).join(' AND ')
                : ''),
            ...entries.map(([, v]) => v),
          );
          return rows[0].count;
        },
        createMany: async ({ data }) => ({ count: await this.copyCourseRows(table, data) }),
        create: async ({ data }) => {
          const row = {
            ...(table === 'ImportReviewAssignment' ? {} : { id: data.id ?? randomUUID() }),
            ...data,
          };
          await this.copyCourseRows(table, [row]);
          return (
            await this.findCourse(table, {
              where:
                table === 'ImportReviewAssignment' ? { recordId: row.recordId } : { id: row.id },
            })
          )[0];
        },
      };
    }
    this.importReviewAssignment.updateMany = async ({ where, data }) => {
      const entries = Object.entries(data),
        filters = Object.entries(where),
        params = [...entries.map(([, v]) => v), ...filters.map(([, v]) => v)];
      const count = await this.$executeRawUnsafe(
        'UPDATE "ImportReviewAssignment" SET ' +
          entries.map(([k], i) => identifier(k) + '=$' + (i + 1)).join(',') +
          ',"updatedAt"=now() WHERE ' +
          filters.map(([k], i) => identifier(k) + '=$' + (entries.length + i + 1)).join(' AND '),
        ...params,
      );
      return { count };
    };
  }
  // Disjoint batches use repeatable snapshots plus exact advisory/row locks and
  // database uniqueness. This avoids false predicate conflicts on receipt pages.
  async $transaction(work) {
    await this.send(
      "BEGIN ISOLATION LEVEL REPEATABLE READ; SET LOCAL standard_conforming_strings=on; SELECT 'true'::jsonb;",
    );
    try {
      const result = await work(this);
      await this.send("COMMIT; SELECT 'true'::jsonb;");
      return result;
    } catch (error) {
      if (!this.closed) await this.send("ROLLBACK; SELECT 'true'::jsonb;");
      throw error;
    }
  }
  async findCourse(table, args) {
    if (table === 'ImportScreeningReceipt' && args.where?.ownerDomain_handoffKey)
      args = { ...args, where: args.where.ownerDomain_handoffKey };
    const rows = await super.find(table, args);
    for (const row of rows)
      for (const key of [
        'learningLanguageResolvedAt',
        'firstSeenAt',
        'lastSeenAt',
        'analyzedAt',
        'importedAt',
        'dueAt',
        'claimUntil',
        'stagingCompletedAt',
        'availableAt',
        'lastVerifiedAt',
      ]) {
        const value = row[key];
        if (typeof value === 'string')
          row[key] = new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + 'Z');
      }
    if (table === 'ExternalCourseProvider' && args.include?.allowedDomains)
      for (const row of rows)
        row.allowedDomains = await super.find('ExternalCourseProviderDomain', {
          where: { providerId: row.id },
        });
    return rows;
  }
  async copyCourseRows(table, input) {
    assert.ok(Object.values(tables).includes(table));
    if (!input.length) return 0;
    assert.ok(input.length <= 1000);
    const rows = JSON.parse(JSON.stringify(input)).map((row) => ({
        ...row,
        ...(!['ImportScreeningReceipt', 'CourseVersion'].includes(table)
          ? { updatedAt: row.updatedAt ?? new Date().toISOString() }
          : {}),
        ...(table === 'ImportReviewAssignment' ? {} : { id: row.id ?? randomUUID() }),
      })),
      keys = [...new Set(rows.flatMap(Object.keys))];
    const values = rows.map((row) =>
      Object.fromEntries(keys.map((key) => [key, row[key] ?? null])),
    );
    const transport = courseTransportStatement(table, keys, values);
    (this.transportStatistics ??= []).push({
      table,
      rows: rows.length,
      sourceBytes: transport.sourceBytes,
      transportBytes: transport.transportBytes,
    });
    const result = await this.send(transport.sql);
    assert.equal(result.copied, rows.length);
    return rows.length;
  }
}
