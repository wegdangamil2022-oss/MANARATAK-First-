import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {
  CANONICAL_DEGREE_LEVEL_CODES,
  CanonicalDegreeLevelCode,
  DegreeLevelDto,
  DegreeLevelStatus,
  AcademicLifecycleDecision,
  assertAcademicLifecycleDecision,
  ICanonicalAcademicUsageGateway,
  IDegreeLevelRepository
} from '@manaratak/domain';

export interface UpdateDegreeLevelCommand {
  expectedUpdatedAt: string;
  lifecycle?: AcademicLifecycleDecision;
  nameEn: string;
  nameAr: string;
  displayRank?: number;
  status?: DegreeLevelStatus;
}

export class DegreeLevelUseCases {
  constructor(private readonly repository: IDegreeLevelRepository, private readonly atomic?: AtomicDomainMutationCoordinator, private readonly usage?: ICanonicalAcademicUsageGateway) {}

  public list(): Promise<DegreeLevelDto[]> {
    return this.repository.listDegreeLevels();
  }

  public getById(id: string): Promise<DegreeLevelDto | null> {
    return this.repository.getDegreeLevelById(id);
  }

  public getByCanonicalCode(code: string): Promise<DegreeLevelDto | null> {
    return this.repository.getDegreeLevelByCode(this.assertCanonicalCode(code));
  }

  public async update(id: string, command: UpdateDegreeLevelCommand, context?: AtomicMutationRequestContext): Promise<DegreeLevelDto | null> {
    if (this.atomic) {
      if (!context?.actorId || !this.repository.withTransaction) throw new Error('DEGREE_LEVEL_ATOMIC_CONTEXT_REQUIRED');
      return this.atomic.execute({ domain: 'ACADEMIC_TAXONOMY', aggregateType: 'DEGREE_LEVEL', aggregateId: id,
        action: 'DEGREE_LEVEL_CHANGED', context, outbox: { eventType: 'DegreeLevelChanged', payload: { degreeLevelId: id, requiresOwnerReload: true } }, auditMetadata: command.lifecycle ? { lifecycleReason: command.lifecycle.reason.trim(), historicalReferencesPreserved: true, requestedStatus: command.status } : undefined }, async tx => {
        const updated = await new DegreeLevelUseCases(this.repository.withTransaction!(tx), undefined, this.usage?.withTransaction(tx)).update(id, command);
        if (!updated) throw new Error('DEGREE_LEVEL_NOT_FOUND');
        return updated;
      });
    }
    const existing = await this.repository.getDegreeLevelById(id);
    if (!existing) return null;
    if (!command.expectedUpdatedAt || existing.updatedAt.toISOString() !== command.expectedUpdatedAt) throw new Error('DEGREE_LEVEL_VERSION_CONFLICT');
    if (command.status && !Object.values(DegreeLevelStatus).includes(command.status)) throw new Error('DEGREE_LEVEL_STATUS_INVALID');
    if (command.status && command.status !== existing.status) {
      if (command.status === DegreeLevelStatus.SUPERSEDED || command.status === DegreeLevelStatus.MERGED) throw new Error('DEGREE_LEVEL_REPLACEMENT_UNSUPPORTED');
      assertAcademicLifecycleDecision(command.lifecycle);
      await this.getUsage(id);
    }
    if (!this.repository.updateDegreeLevel) throw new Error('DEGREE_LEVEL_GOVERNED_EDIT_UNAVAILABLE');
    return this.repository.updateDegreeLevel(id, {
      canonicalCode: this.assertCanonicalCode(existing.canonicalCode),
      nameEn: command.nameEn,
      nameAr: command.nameAr,
      displayRank: command.displayRank ?? existing.displayRank,
      status: command.status ?? existing.status,
      aliases: existing.aliases,
      metadata: existing.metadata
    }, command.expectedUpdatedAt);
  }

  public async getUsage(id: string) {
    if (!this.usage) throw new Error('ACADEMIC_USAGE_UNAVAILABLE');
    return this.usage.summarize('DEGREE_LEVEL', id);
  }

  private assertCanonicalCode(code: string): CanonicalDegreeLevelCode {
    if (!(CANONICAL_DEGREE_LEVEL_CODES as readonly string[]).includes(code)) {
      throw new Error(`Unsupported canonical DegreeLevel code: ${code}`);
    }
    return code as CanonicalDegreeLevelCode;
  }
}
