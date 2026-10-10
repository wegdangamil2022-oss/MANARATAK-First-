import { describe, it, expect } from 'vitest';
import { ReferenceLifecycleState } from '@manaratak/domain';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('Reference governance terminal safety (source contract)', () => {
  it('requires a certified impact protocol before any non-region terminal mutation', () => {
    const source = readFileSync(fileURLToPath(new URL('../../../infrastructure/src/reference-data/PrismaReferenceDataRepository.ts', import.meta.url)), 'utf8');
    const transition = source.split('public async transitionReferenceLifecycle(command:')[1]?.split('public async reassignProviderMapping(')[0] ?? '';
    expect(transition).toContain('REFERENCE_TERMINAL_IMPACT_CERTIFICATION_REQUIRED');
    expect(transition).toContain('ReferenceLifecycleState.ARCHIVED');
    expect(transition).toContain('ReferenceLifecycleState.MERGED');
    expect(transition).toContain('ReferenceLifecycleState.SUPERSEDED');
    expect(transition).toContain('REFERENCE_TERMINAL_IMPACT_CERTIFICATION_REQUIRED');
    expect(ReferenceLifecycleState.DEPRECATED).toBe('DEPRECATED');
  });

  it('does not treat a Region FK count of zero as proof of terminal safety', () => {
    const source = readFileSync(fileURLToPath(new URL('../../../infrastructure/src/reference-data/PrismaReferenceDataRepository.ts', import.meta.url)), 'utf8');
    const regionOwner = source.split('private async transitionRegion(')[1]?.split('private countryWhere(')[0] ?? '';
    expect(regionOwner).toContain('REGION_IMPACT_CERTIFICATION_REQUIRED');
    expect(regionOwner).toContain('ReferenceLifecycleState.MERGED');
    expect(regionOwner).toContain('ReferenceLifecycleState.ARCHIVED');
  });
});