import {
  AtomicPersistenceContext,
  ITransactionalAuditRecordRepository,
  ITransactionalOutboxStore,
  TransactionalOutboxEntry,
} from '@manaratak/domain';
import { CreateAuditRecordDto } from '../../audit/dtos/AuditDtos';
import { createAuditRecordFromDto } from '../../audit/use-cases/AuditRecordFactory';
import { IAtomicPersistenceUnitOfWork } from '../gateways/IAtomicPersistenceUnitOfWork';

export class AtomicAuditedOutboxMutationExecutor {
  public constructor(
    private readonly unitOfWork: IAtomicPersistenceUnitOfWork,
    private readonly auditRepository: ITransactionalAuditRecordRepository,
    private readonly outboxStore: ITransactionalOutboxStore,
  ) {}

  public execute<T>(
    audit: CreateAuditRecordDto,
    outboxEntry: TransactionalOutboxEntry,
    mutation: (context: AtomicPersistenceContext) => Promise<T>,
  ): Promise<T> {
    return this.unitOfWork.execute(async context => {
      const result = await mutation(context);
      await this.auditRepository.saveInTransaction(createAuditRecordFromDto(audit), context);
      await this.outboxStore.appendInTransaction(outboxEntry, context);
      return result;
    });
  }
}
