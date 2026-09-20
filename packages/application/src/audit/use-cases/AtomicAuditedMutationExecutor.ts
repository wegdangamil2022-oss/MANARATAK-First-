import { AtomicPersistenceContext, ITransactionalAuditRecordRepository } from '@manaratak/domain';
import { IAtomicPersistenceUnitOfWork } from '../../event-foundation/gateways/IAtomicPersistenceUnitOfWork';
import { CreateAuditRecordDto } from '../dtos/AuditDtos';
import { createAuditRecordFromDto } from './AuditRecordFactory';

export class AtomicAuditedMutationExecutor {
  public constructor(
    private readonly unitOfWork: IAtomicPersistenceUnitOfWork,
    private readonly auditRepository: ITransactionalAuditRecordRepository,
  ) {}

  public execute<T>(
    audit: CreateAuditRecordDto,
    mutation: (context: AtomicPersistenceContext) => Promise<T>,
  ): Promise<T> {
    return this.unitOfWork.execute(async context => {
      const result = await mutation(context);
      await this.auditRepository.saveInTransaction(createAuditRecordFromDto(audit), context);
      return result;
    });
  }
}
