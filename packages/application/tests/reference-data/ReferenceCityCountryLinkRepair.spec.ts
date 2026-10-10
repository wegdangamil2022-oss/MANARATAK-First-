import { describe, expect, it, vi } from 'vitest';
import { ReferenceDataUseCases } from '../../src';
import type { IReferenceDataRepository } from '@manaratak/domain';
import type { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

describe('P7 explicit legacy city country-link repair', () => {
  it('routes one reviewed canonical link repair through atomic mutation, audit and outbox', async () => {
    const commands: any[] = [];
    const repo = {
      repairCityCountryLinkInTransaction: vi.fn(async (command: any) => { commands.push(command); }),
    } as unknown as IReferenceDataRepository;
    const executor = { execute: vi.fn(async (_audit: unknown, _event: unknown,
      mutation: (context: any) => Promise<void>) => mutation({ tx: 'owner-1' })) } as unknown as AtomicAuditedOutboxMutationExecutor;
    const uc = new ReferenceDataUseCases(repo, undefined, undefined, executor);
    await uc.repairCityCountryLink({
      cityId: 'legacy-city', countryReferenceId: 'verified-country', expectedVersion: 2,
      reason: 'Manually reviewed pre-W3 country-link gap',
    }, { actorId: 'reviewer-1' });
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      cityId: 'legacy-city', countryReferenceId: 'verified-country',
      expectedVersion: 2, actorId: 'reviewer-1',
    });
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });
  it('refuses a repair without a review reason or version before owner mutation', async () => {
    const executor = { execute: vi.fn() } as unknown as AtomicAuditedOutboxMutationExecutor;
    const uc = new ReferenceDataUseCases({} as IReferenceDataRepository, undefined, undefined, executor);
    await expect(uc.repairCityCountryLink({
      cityId: 'legacy-city', countryReferenceId: 'country', expectedVersion: 0, reason: '',
    }, { actorId: 'reviewer-1' })).rejects.toThrow('requires an actor');
    expect(executor.execute).not.toHaveBeenCalled();
  });
});
