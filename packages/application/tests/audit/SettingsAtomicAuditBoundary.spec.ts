import { describe, expect, it, vi } from 'vitest';
import { ValueType, SettingDefinition, NamespacedKey, ScopeIdentifier, SettingAssignment, SettingVersion, BooleanValue } from '@manaratak/domain';
import { ManageSettingsUseCase } from '../../src/settings/use-cases/ManageSettingsUseCase';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

describe('Settings owner atomic audit boundary', () => {
  it.each(['none', 'audit', 'outbox'])('commits only if business/audit/outbox all succeed: failure=%s', async failure => {
    const records = new Map<string, SettingDefinition>();
    let staged = new Map<string, SettingDefinition>();
    const context = { boundaryId: 'settings-test-transaction' };
    const unitOfWork = { execute: async (work: (input: typeof context) => Promise<unknown>) => {
      staged = new Map(records);
      const result = await work(context);
      for (const [id, value] of staged) records.set(id, value);
      return result;
    } };
    const auditRepository = { saveInTransaction: vi.fn(async () => {
      if (failure === 'audit') throw new Error('audit persistence failed');
    }) };
    const outbox = { appendInTransaction: vi.fn(async () => {
      if (failure === 'outbox') throw new Error('outbox persistence failed');
    }) };
    const definitions = {
      findByKey: async () => null,
      save: vi.fn(async () => { throw new Error('unscoped business write'); }),
      withTransaction: vi.fn((received: typeof context) => {
        expect(received).toBe(context);
        return { save: async (item: SettingDefinition) => { staged.set(item.id, item); } };
      }),
    };
    const executor = new AtomicAuditedOutboxMutationExecutor(unitOfWork as never, auditRepository as never, outbox as never);
    const operation = new ManageSettingsUseCase(definitions as never, {} as never, {} as never,
      new AtomicDomainMutationCoordinator(executor));
    const promise = operation.createDefinition({ id: 'definition-1', key: 'system.timeout', valueType: ValueType.Number },
      { actorId: 'operator', actorType: 'IDENTITY', correlationId: 'operation-1', source: 'admin-settings-api' });
    if (failure === 'none') {
      await promise;
      expect(records.size).toBe(1);
    } else {
      await expect(promise).rejects.toThrow(`${failure} persistence failed`);
      expect(records.size).toBe(0);
    }
    expect(definitions.save).not.toHaveBeenCalled();
    expect(auditRepository.saveInTransaction).toHaveBeenCalledWith(expect.anything(), context);
    if (failure !== 'audit') expect(outbox.appendInTransaction).toHaveBeenCalledWith(expect.objectContaining({ correlationId: 'operation-1' }), context);
    else expect(outbox.appendInTransaction).not.toHaveBeenCalled();
  });
  it.each(['none', 'audit', 'outbox'])('clear override commits history only with business/audit/outbox: %s', async failure => {
    const definition = new SettingDefinition({ id: 'flag', key: new NamespacedKey('feature.safe'), valueType: ValueType.Boolean,
      isFeatureFlag: true, defaultValue: false });
    const original = new SettingAssignment({ id: 'assignment', key: definition.key, scope: new ScopeIdentifier('GLOBAL'),
      versions: [new SettingVersion('v1', new BooleanValue(true), new Date(), 'admin')] });
    let committed = original;
    let staged = original;
    const tx = { boundaryId: 'settings-clear-test' };
    const audit = { saveInTransaction: vi.fn(async () => { if (failure === 'audit') throw new Error('audit failed'); }) };
    const outbox = { appendInTransaction: vi.fn(async () => { if (failure === 'outbox') throw new Error('outbox failed'); }) };
    const unitOfWork = { execute: async (work: (context: typeof tx) => Promise<unknown>) => {
      const result = await work(tx); committed = staged; return result;
    } };
    const save = vi.fn(async (item: SettingAssignment, metadata: { correlationId: string }) => {
      expect(metadata.correlationId).toBe('request-clear'); staged = item;
    });
    const assignments = { findById: async () => new SettingAssignment({ id: original.id, key: original.key, scope: original.scope,
      versions: [...original.getVersions()] }), withTransaction: (received: typeof tx) => { expect(received).toBe(tx); return { save }; } };
    const executor = new AtomicAuditedOutboxMutationExecutor(unitOfWork as never, audit as never, outbox as never);
    const useCase = new ManageSettingsUseCase({ findByKey: async () => definition } as never, assignments as never, {} as never,
      new AtomicDomainMutationCoordinator(executor));
    const promise = useCase.clearOverride({ assignmentId: 'assignment', expectedCurrentVersionId: 'v1', newVersionId: 'clear',
      authorId: 'admin', changeReason: 'Use approved default' }, { actorId: 'admin', correlationId: 'request-clear' });
    if (failure === 'none') { await promise; expect(committed.isOverrideCleared).toBe(true); expect(committed.getVersions()).toHaveLength(2); }
    else { await expect(promise).rejects.toThrow(`${failure} failed`); expect(committed.isOverrideCleared).toBe(false); expect(committed.getVersions()).toHaveLength(1); }
    const [record, received] = (audit.saveInTransaction.mock.calls[0] as unknown as [any, typeof tx]);
    expect(received).toBe(tx);
    expect(record.action.getValue()).toBe('CLEAR_SETTING_OVERRIDE');
    expect(record.correlationReference.getValue()).toBe('request-clear');
    expect(record.contextMetadata.getData()).toMatchObject({ changeReason: 'Use approved default', previousVersionId: 'v1', newVersionId: 'clear' });
    if (failure !== 'audit') expect(outbox.appendInTransaction).toHaveBeenCalledWith(expect.objectContaining({ correlationId: 'request-clear' }), tx);
  });

});
