import { describe, it, expect } from 'vitest';
import { ReferenceLifecycleState } from '@manaratak/domain';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('Reference governance terminal safety (source contract)', () => {
  it('requires the owner retirement policy and observed impact before a non-region mutation', () => {
    const source = readFileSync(fileURLToPath(new URL('../../../infrastructure/src/reference-data/PrismaReferenceDataRepository.ts', import.meta.url)), 'utf8');
    const transition = source.split('public async transitionReferenceLifecycle(command:')[1]?.split('public async reassignProviderMapping(')[0] ?? '';
    expect(transition).toContain('assertReferenceRetirementPolicy(command.toState, await this.getReferenceDependencyImpact(command.entityType,command.referenceId), command.acknowledgeHistoricalReferences)');
    expect(transition).toContain('REFERENCE_LIFECYCLE_TARGET_NOT_ACTIVE');
    expect(transition).toContain('REFERENCE_LIFECYCLE_TARGET_REGION_MISMATCH');
    expect(transition).toContain('assertNoReplacementCycle');
    expect(ReferenceLifecycleState.DEPRECATED).toBe('DEPRECATED');
  });

  it('does not treat a Region FK count of zero as proof of terminal safety', () => {
    const source = readFileSync(fileURLToPath(new URL('../../../infrastructure/src/reference-data/PrismaReferenceDataRepository.ts', import.meta.url)), 'utf8');
    const regionOwner = source.split('private async transitionRegion(')[1]?.split('private countryWhere(')[0] ?? '';
    expect(regionOwner).toContain("assertReferenceRetirementPolicy(command.toState, await this.getReferenceDependencyImpact('REGION',command.referenceId), command.acknowledgeHistoricalReferences)");
    expect(regionOwner).toContain('ReferenceLifecycleState.MERGED');
    expect(regionOwner).toContain('assertNoReplacementCycle');
  });
});