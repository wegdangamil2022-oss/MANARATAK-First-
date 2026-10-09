import { AtomicDomainMutationCoordinator, type AtomicMutationRequestContext } from '../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {
  CANONICAL_DEGREE_LEVEL_CODES,
  CanonicalDegreeLevelCode,
  DegreeLevelDto,
  DegreeLevelStatus,
  IDegreeLevelRepository
} from '@manaratak/domain';

export interface UpdateDegreeLevelCommand {
  expectedUpdatedAt: string;
  nameEn: string;
  nameAr: string;
  displayRank?: number;
  status?: DegreeLevelStatus;
}

export class DegreeLevelUseCases {
  constructor(private readonly repository: IDegreeLevelRepository, private readonly atomic?: AtomicDomainMutationCoordinator) {}

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
        action: 'DEGREE_LEVEL_CHANGED', context }, async tx => {
        const updated = await new DegreeLevelUseCases(this.repository.withTransaction!(tx)).update(id, command);
        if (!updated) throw new Error('DEGREE_LEVEL_NOT_FOUND');
        return updated;
      });
    }
    const existing = await this.repository.getDegreeLevelById(id);
    if (!existing) return null;
    if (!command.expectedUpdatedAt || existing.updatedAt.toISOString() !== command.expectedUpdatedAt) throw new Error('DEGREE_LEVEL_VERSION_CONFLICT');
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

  private assertCanonicalCode(code: string): CanonicalDegreeLevelCode {
    if (!(CANONICAL_DEGREE_LEVEL_CODES as readonly string[]).includes(code)) {
      throw new Error(`Unsupported canonical DegreeLevel code: ${code}`);
    }
    return code as CanonicalDegreeLevelCode;
  }
}
