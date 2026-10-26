import { createHash } from 'node:crypto';
import type { CourseBulkSelection, CourseBulkState, ICourseBulkPublicationRepository } from '@manaratak/domain';
import type { AdminCourseUseCases } from './AdminCourseUseCases';
import type { ImportedCourseAdminUseCases } from './ImportedCourseAdminUseCases';
import { AtomicDomainMutationCoordinator } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';

export class CourseBulkPublicationUseCases {
  constructor(private readonly jobs: ICourseBulkPublicationRepository, private readonly admin: AdminCourseUseCases,
    private readonly imported: ImportedCourseAdminUseCases, private readonly atomic: AtomicDomainMutationCoordinator) {}
  private context(actorId: string, reason: string) {
    if (!actorId || reason.trim().length < 3) throw new Error('COURSE_BULK_ACTOR_REASON_REQUIRED');
    return { actorId, actorType: 'IDENTITY', source: 'course-bulk-publication', reason };
  }
  async preview(selection: CourseBulkSelection, actorId: string, reason: string, key: string) {
    const context = this.context(actorId, reason);
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(key)) throw new Error('COURSE_BULK_IDEMPOTENCY_REQUIRED');
    const normalized = selection.ids ? { ids: [...new Set(selection.ids)].sort() } : { filters: Object.fromEntries(Object.entries(selection.filters ?? {}).sort(([a], [b]) => a.localeCompare(b))) };
    const requestDigest = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const reference = 'course-bulk:' + createHash('sha256').update(actorId + '|' + key).digest('hex');
    const receipt = await this.atomic.execute({ domain: 'COURSES', aggregateType: 'COURSE_PUBLICATION_BATCH', aggregateId: reference,
      action: 'COURSE_BULK_SNAPSHOT_CREATED', context, auditMetadata: { reason, requestDigest } },
    persistence => this.jobs.createSnapshot(persistence, { reference, actorId, requestDigest, reason, selection: normalized }), result => !result.replayed);
    return this.jobs.read(receipt.id, actorId);
  }
  read(id: string, actorId: string, page = 1, state?: CourseBulkState) { return this.jobs.read(id, actorId, page, state); }
  list(actorId: string, page = 1) { return this.jobs.list(actorId, page); }
  async retry(id: string, actorId: string, reason: string, key: string) {
    this.context(actorId, reason);
    const ids = await this.jobs.retrySelection(id, actorId);
    if (!ids.length) throw new Error('COURSE_BULK_NO_FAILED_RECORDS');
    return this.preview({ ids }, actorId, reason, key);
  }
  async confirm(id: string, actorId: string, digest: string, eligibleOnly: boolean, reason: string) {
    const context = this.context(actorId, reason);
    await this.atomic.execute({ domain: 'COURSES', aggregateType: 'COURSE_PUBLICATION_BATCH', aggregateId: id,
      action: 'COURSE_BULK_CONFIRMED', context, auditMetadata: { reason, digest, eligibleOnly } },
    persistence => this.jobs.confirm(persistence, id, actorId, digest, eligibleOnly, reason), result => !result.replayed);
    return this.jobs.read(id, actorId);
  }
  async cancel(id: string, actorId: string, reason: string) {
    const context = this.context(actorId, reason);
    await this.atomic.execute({ domain: 'COURSES', aggregateType: 'COURSE_PUBLICATION_BATCH', aggregateId: id,
      action: 'COURSE_BULK_CANCELLED', context, auditMetadata: { reason } },
    persistence => this.jobs.cancel(persistence, id, actorId), result => !result.replayed);
    return this.jobs.read(id, actorId);
  }
  async step(id: string, actorId: string) {
    const claim = await this.jobs.claim(id, actorId);
    if (!claim) return this.jobs.read(id, actorId);
    const results = [];
    try {
      for (const item of claim.items) {
        try {
          const course = await this.admin.getCourse(item.id);
          if (claim.summary.phase === 'EXECUTING' && course.status === 'PUBLISHED' && course.version === item.version + 1 &&
              await this.jobs.publicationReceipt(item.id, course.version, id, actorId)) {
            results.push({ ...item, state: 'SUCCESS' as const, reasons: [] }); continue;
          }
          if (course.version !== item.version) throw new Error('COURSE_STALE_VERSION');
          const readiness = await this.admin.getExternalReadiness(item.id);
          if (claim.summary.phase === 'PREVIEWING') {
            results.push({ ...item, state: readiness.eligible ? 'ELIGIBLE' as const : 'BLOCKED' as const, reasons: readiness.blockers });
          } else if (!readiness.eligible) results.push({ ...item, state: 'BLOCKED' as const, reasons: readiness.blockers });
          else {
            await this.imported.publish(item.id, { actorId, actorType: 'IDENTITY', source: 'course-bulk-publication', correlationId: id,
              expectedVersion: item.version, reason: claim.summary.reason } as Parameters<ImportedCourseAdminUseCases['publish']>[1]);
            results.push({ ...item, state: 'SUCCESS' as const, reasons: [] });
          }
        } catch (error) {
          // Publication commits before the imported detail is reread. A failed
          // response read must not turn a durable publication into a false failure.
          // If receipt storage is itself unavailable, leave the step uncheckpointed
          // so a later resume can reconcile it safely instead of guessing.
          if (claim.summary.phase === 'EXECUTING' && await this.jobs.publicationReceipt(item.id, item.version + 1, id, actorId)) {
            results.push({ ...item, state: 'SUCCESS' as const, reasons: [] }); continue;
          }
          const raw = error instanceof Error ? error.message.split(':')[0] : '';
          const reason = /^(COURSE_|IMPORTED_COURSE_|OWNER_)[A-Z0-9_]+$/.test(raw) ? raw : 'COURSE_BULK_SERVICE_UNAVAILABLE';
          results.push({ ...item, state: claim.summary.phase === 'PREVIEWING' && reason === 'COURSE_STALE_VERSION' ? 'BLOCKED' as const : 'FAILED' as const, reasons: [reason] });
        }
      }
      await this.jobs.checkpoint(id, actorId, claim.lease, results);
    } finally { await this.jobs.release(id, actorId, claim.lease); }
    return this.jobs.read(id, actorId);
  }
}
