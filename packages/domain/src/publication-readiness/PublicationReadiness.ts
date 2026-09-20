export interface PublicationReadinessIssue {
  code: string;
  message: string;
  field?: string;
}

export interface PublicationReadinessResult {
  ready: boolean;
  blockingIssues: PublicationReadinessIssue[];
  warnings: PublicationReadinessIssue[];
  checkedAt: string;
  domain: string;
  entityId: string;
}

export interface PublicationReadinessPolicy<TEntity> {
  readonly domain: string;
  evaluate(entity: TEntity): {
    blockingIssues: PublicationReadinessIssue[];
    warnings?: PublicationReadinessIssue[];
  };
}

export class PublicationReadinessError extends Error {
  public readonly code = 'PUBLICATION_NOT_READY';

  constructor(public readonly result: PublicationReadinessResult) {
    super(
      `Publication blocked for ${result.domain}/${result.entityId}: ` +
      result.blockingIssues.map(issue => issue.code).join(', ')
    );
    this.name = 'PublicationReadinessError';
  }
}

export class PublicationReadinessEngine {
  public evaluate<TEntity>(
    entityId: string,
    entity: TEntity,
    policy: PublicationReadinessPolicy<TEntity>
  ): PublicationReadinessResult {
    const evaluation = policy.evaluate(entity);
    const blockingIssues = evaluation.blockingIssues;
    return {
      ready: blockingIssues.length === 0,
      blockingIssues,
      warnings: evaluation.warnings || [],
      checkedAt: new Date().toISOString(),
      domain: policy.domain,
      entityId
    };
  }

  public assertReady<TEntity>(
    entityId: string,
    entity: TEntity,
    policy: PublicationReadinessPolicy<TEntity>
  ): PublicationReadinessResult {
    const result = this.evaluate(entityId, entity, policy);
    if (!result.ready) throw new PublicationReadinessError(result);
    return result;
  }
}
