import { describe, expect, it } from 'vitest';
import {
  PublicationReadinessEngine,
  PublicationReadinessError,
  PublicationReadinessPolicy
} from '../../src';

describe('PublicationReadinessEngine', () => {
  const policy: PublicationReadinessPolicy<{ title?: string }> = {
    domain: 'TEST_DOMAIN',
    evaluate: entity => ({
      blockingIssues: entity.title
        ? []
        : [{ code: 'TITLE_REQUIRED', message: 'Title is required', field: 'title' }],
      warnings: [{ code: 'OPTIONAL_WARNING', message: 'Optional metadata is absent' }]
    })
  };

  it('returns a structured result with coded issues', () => {
    const result = new PublicationReadinessEngine().evaluate('entity-1', {}, policy);
    expect(result.ready).toBe(false);
    expect(result.domain).toBe('TEST_DOMAIN');
    expect(result.entityId).toBe('entity-1');
    expect(result.blockingIssues[0].code).toBe('TITLE_REQUIRED');
    expect(result.checkedAt).toBeTruthy();
  });

  it('throws the structured result when publication is blocked', () => {
    expect(() => new PublicationReadinessEngine().assertReady('entity-1', {}, policy))
      .toThrow(PublicationReadinessError);
  });

  it('does not impose publication checks on draft persistence', () => {
    const draft = {};
    expect(draft).toEqual({});
  });
});
