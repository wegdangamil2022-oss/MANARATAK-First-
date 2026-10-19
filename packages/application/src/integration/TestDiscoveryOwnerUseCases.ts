import type {
  IInternationalTestRepository,
  ITestDiscoveryLinkRepository,
  ITestDiscoveryOwnerGateway,
  TestDiscoveryPage,
} from '@absheer/domain';
/** Commands belong to the producing owner. Public reads never mutate either catalog. */
export class TestDiscoveryOwnerUseCases {
  constructor(
    private readonly links: ITestDiscoveryLinkRepository,
    private readonly owner: ITestDiscoveryOwnerGateway,
    private readonly tests: IInternationalTestRepository,
  ) {}
  list(ownerKey: string, after?: string) {
    return this.links.listOwner(ownerKey, after);
  }
  private async testRevision(testId: string) {
    const test = await this.tests.findById(testId);
    if (!test || typeof test.slug !== 'string') throw new Error('TEST_DISCOVERY_TEST_NOT_PUBLIC');
    const published = await this.tests.findPublishedBySlug(test.slug);
    if (
      !published ||
      published.status !== 'PUBLISHED' ||
      published.id !== testId ||
      !published.currentPublishedVersionId
    )
      throw new Error('TEST_DISCOVERY_TEST_NOT_PUBLIC');
    return published.currentPublishedVersionId;
  }
  async propose(
    ownerKey: string,
    input: { testId: string; expectedVersion: number; reason: string },
    actorId: string,
  ) {
    this.validate(input.expectedVersion, input.reason, actorId, true);
    const owner =
      (await this.owner.resolve(ownerKey, 'ar')) ?? (await this.owner.resolve(ownerKey, 'en'));
    if (!owner) throw new Error('TEST_DISCOVERY_OWNER_NOT_AVAILABLE');
    const testRevision = await this.testRevision(input.testId);
    return this.links.propose({
      ...input,
      ownerKey,
      ownerRevision: owner.revision,
      testRevision,
      actorId,
    });
  }
  async review(
    ownerKey: string,
    testId: string,
    input: { expectedVersion: number; reason: string; status: 'APPROVED' | 'REVOKED' },
    actorId: string,
  ) {
    this.validate(input.expectedVersion, input.reason, actorId, false);
    if (input.status === 'APPROVED') {
      const link = await this.links.find(ownerKey, testId);
      if (!link || link.status !== 'PENDING' || link.proposedBy === actorId)
        throw new Error('TEST_DISCOVERY_INDEPENDENT_REVIEW_REQUIRED');
      const owner =
        (await this.owner.resolve(ownerKey, 'ar')) ?? (await this.owner.resolve(ownerKey, 'en'));
      if (
        !owner ||
        owner.revision !== link.ownerRevision ||
        (await this.testRevision(testId)) !== link.testRevision
      )
        throw new Error('TEST_DISCOVERY_REVIEW_STALE');
    }
    return this.links.review({ ...input, ownerKey, testId, actorId });
  }
  private validate(version: number, reason: string, actorId: string, allowNew: boolean) {
    if (
      !actorId.trim() ||
      !reason.trim() ||
      reason.length > 2000 ||
      !Number.isInteger(version) ||
      version < (allowNew ? 0 : 1)
    )
      throw new Error('TEST_DISCOVERY_COMMAND_INVALID');
  }
  async publicPage(
    testId: string,
    locale: 'ar' | 'en',
    after?: string,
    limit = 12,
  ): Promise<TestDiscoveryPage> {
    const revision = await this.testRevision(testId);
    const page = await this.links.listApproved(
      testId,
      after,
      Math.min(50, Math.max(1, Math.trunc(limit))),
    );
    const data = await Promise.all(
      page.data.map(async (link) => {
        if (
          link.testRevision !== revision ||
          !link.reviewedBy ||
          link.reviewedBy === link.proposedBy
        )
          return null;
        const owner = await this.owner.resolve(link.ownerKey, locale);
        return owner?.revision === link.ownerRevision ? owner : null;
      }),
    );
    const visible = data.filter((value): value is NonNullable<typeof value> => value !== null);
    return {
      ownerDomain: this.links.ownerDomain,
      state: visible.length || page.hasMore ? 'AVAILABLE' : 'EMPTY',
      data: visible,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
      scanned: page.data.length,
    };
  }
}
