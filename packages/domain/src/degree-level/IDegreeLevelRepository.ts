import type { AtomicPersistenceContext } from '../event-foundation/outbox/TransactionalOutbox';
import { DegreeLevelDto, UpsertDegreeLevelDto } from './DegreeLevel';

export interface IDegreeLevelRepository {
  withTransaction?(context: AtomicPersistenceContext): IDegreeLevelRepository;
  updateDegreeLevel?(id: string, data: UpsertDegreeLevelDto, expectedUpdatedAt: string): Promise<DegreeLevelDto>;
  listDegreeLevels(): Promise<DegreeLevelDto[]>;
  getDegreeLevelByCode(code: string): Promise<DegreeLevelDto | null>;
  getDegreeLevelById(id: string): Promise<DegreeLevelDto | null>;
  upsertDegreeLevel(data: UpsertDegreeLevelDto): Promise<DegreeLevelDto>;
}
