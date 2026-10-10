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
    expect(ReferenceLifecycleState.DEPRECATED).toBe('DEPRECATED');
  });
});