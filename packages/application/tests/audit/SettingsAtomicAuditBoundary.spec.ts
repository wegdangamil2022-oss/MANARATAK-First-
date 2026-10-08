import { describe, expect, it, vi } from 'vitest';
import { ValueType, SettingDefinition } from '@manaratak/domain';
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
});
