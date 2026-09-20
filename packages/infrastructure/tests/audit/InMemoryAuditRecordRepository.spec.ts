import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuditRecord,
  AuditId,
  AuditReference,
  AuditAction,
  AuditCategory,
  AuditSeverity,
  ActorReference,
  TargetReference,
  SourceReference,
  AuditTimestamp,
  ContextMetadata,
  AuditRecordQuerySpecification
} from '@manaratak/domain';
import { InMemoryAuditRecordRepository } from '../../src/audit/InMemoryAuditRecordRepository';

describe('InMemoryAuditRecordRepository', () => {
  let repository: InMemoryAuditRecordRepository;

  beforeEach(() => {
    repository = new InMemoryAuditRecordRepository();
  });

  it('saves audit records and redacts secrets on save', async () => {
    const record = AuditRecord.create(
      AuditId.create('audit-inmem-1'),
      AuditReference.create('AUD-2026-0002'),
      AuditAction.create('CREATE_SETTINGS'),
      AuditCategory.create('SYSTEM_CONFIG'),
      AuditSeverity.create('WARN'),
      ActorReference.create('admin-55', 'IDENTITY'),
      TargetReference.create('setting-10', 'SETTING'),
      SourceReference.create('admin-ui'),
      AuditTimestamp.create(new Date()),
      ContextMetadata.create({
        apiKey: 'secret-api-key',
        settingKey: 'THEME',
        settingValue: 'DARK'
      })
    );

    await repository.save(record);

    const spec = new AuditRecordQuerySpecification({
      actorId: 'admin-55'
    });

    const results = await repository.findBy(spec);
    expect(results).toHaveLength(1);

    const saved = results[0];
    expect(saved.getId().getValue()).toBe('audit-inmem-1');
    expect(saved.getContextMetadata().getData().settingKey).toBe('THEME');
    expect(saved.getContextMetadata().getData().apiKey).toBe('[REDACTED]');
  });

  it('filters records by specification criteria', async () => {
    const record1 = AuditRecord.create(
      AuditId.create('rec-1'),
      AuditReference.create('AUD-2026-0003'),
      AuditAction.create('LOGIN'),
      AuditCategory.create('AUTH'),
      AuditSeverity.create('INFO'),
      ActorReference.create('user-1', 'IDENTITY'),
      TargetReference.create('app', 'SYSTEM'),
      SourceReference.create('web'),
      AuditTimestamp.create(new Date()),
      ContextMetadata.create({})
    );

    const record2 = AuditRecord.create(
      AuditId.create('rec-2'),
      AuditReference.create('AUD-2026-0004'),
      AuditAction.create('DELETE_ITEM'),
      AuditCategory.create('DATA'),
      AuditSeverity.create('HIGH'),
      ActorReference.create('user-2', 'IDENTITY'),
      TargetReference.create('item-99', 'DATA'),
      SourceReference.create('web'),
      AuditTimestamp.create(new Date()),
      ContextMetadata.create({})
    );

    await repository.save(record1);
    await repository.save(record2);

    const specUser1 = new AuditRecordQuerySpecification({ actorId: 'user-1' });
    const user1Results = await repository.findBy(specUser1);
    expect(user1Results).toHaveLength(1);
    expect(user1Results[0].getId().getValue()).toBe('rec-1');

    const specActionDelete = new AuditRecordQuerySpecification({ action: 'DELETE_ITEM' });
    const deleteResults = await repository.findBy(specActionDelete);
    expect(deleteResults).toHaveLength(1);
    expect(deleteResults[0].getId().getValue()).toBe('rec-2');
  });
});
