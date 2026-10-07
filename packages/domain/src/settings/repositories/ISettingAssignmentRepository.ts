import type { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';
import { NamespacedKey } from '../value-objects/NamespacedKey';
import { ScopeIdentifier } from '../value-objects/ScopeIdentifier';
import { SettingAssignment } from '../entities/SettingAssignment';

export interface ISettingAssignmentRepository {
  withTransaction?(context: AtomicPersistenceContext): ISettingAssignmentRepository;
  findByScopeAndKey(scope: ScopeIdentifier, key: NamespacedKey): Promise<SettingAssignment | null>;
  findBy(spec: {
    isSatisfiedBy: (assignment: SettingAssignment) => boolean;
  }): Promise<SettingAssignment[]>;
  save(assignment: SettingAssignment): Promise<void>;
}
