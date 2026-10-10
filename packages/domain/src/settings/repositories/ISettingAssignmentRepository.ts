import type { AtomicPersistenceContext } from '../../event-foundation/outbox/TransactionalOutbox';
import { NamespacedKey } from '../value-objects/NamespacedKey';
import { ScopeIdentifier } from '../value-objects/ScopeIdentifier';
import { SettingVersion } from '../value-objects/SettingVersion';
import { SettingAssignment } from '../entities/SettingAssignment';

export interface SettingAssignmentSummary {
  id: string;
  key: string;
  scope: ScopeIdentifier;
  currentVersion: SettingVersion;
  versionCount: number;
}

export interface SettingAssignmentPageQuery {
  key?: string; level?: string; scopeId?: string; q?: string; limit: number; cursor?: string;
}
export interface ISettingAssignmentRepository {
  readSummaryPage?(query: SettingAssignmentPageQuery): Promise<{ items: SettingAssignmentSummary[]; nextCursor?: string }>;
  readSummaries?(filters: { key?: string; level?: string; scopeId?: string }): Promise<SettingAssignmentSummary[]>;
  readHistory?(id: string, expectedCurrentVersionId: string, limit: number, cursor?: string): Promise<{
    key: string; versions: SettingVersion[]; nextCursor?: string;
  }>;
  withTransaction?(context: AtomicPersistenceContext): ISettingAssignmentRepository;
  findByScopeAndKey(scope: ScopeIdentifier, key: NamespacedKey): Promise<SettingAssignment | null>;
  findById?(id: string): Promise<SettingAssignment | null>;
  countByKey?(key: NamespacedKey): Promise<number>;
  findBy(spec: {
    isSatisfiedBy: (assignment: SettingAssignment) => boolean;
  }): Promise<SettingAssignment[]>;
  save(assignment: SettingAssignment, metadata?: { correlationId: string }): Promise<void>;
}
