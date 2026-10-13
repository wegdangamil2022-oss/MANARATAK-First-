import type {
  CourseProviderBacklogStore,
  ExternalCourseProviderDto,
  IExternalCourseProviderRepository,
  IImportedCourseLinkChecker,
  IImportedCourseOperationsRepository,
  ImportedCourseLinkCheckResult,
} from '@manaratak/domain';
export class CourseProviderBacklogUseCases {
  constructor(
    private readonly providers: IExternalCourseProviderRepository,
    private readonly operations: IImportedCourseOperationsRepository,
    private readonly checker: IImportedCourseLinkChecker,
    private readonly wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}
  private store(): CourseProviderBacklogStore {
    if (!this.operations.providerBacklog) throw new Error('COURSE_PROVIDER_BACKLOG_NOT_CONFIGURED');
    return this.operations.providerBacklog;
  }
  async queue(provider: ExternalCourseProviderDto, limit: number, cursor?: string) {
    const [page, metrics] = await Promise.all([
      this.store().changedLinks(provider.id, cursor, limit),
      this.store().metrics(provider.id),
    ]);
    return {
      providerId: provider.id,
      providerPublicId: provider.publicId,
      importChanges: page.data,
      total: page.total,
      nextCursor: page.nextCursor,
      backlog: metrics,
    };
  }
  async run(
    provider: ExternalCourseProviderDto,
    input: { limit?: number; delayMs?: number; maxAttempts?: number } = {},
  ) {
    const store = this.store();
    const limit = Math.min(10, Math.max(1, Math.floor(input.limit ?? 10)));
    const delayMs = Math.min(10000, Math.max(750, Math.floor(input.delayMs ?? 1000)));
    const maxAttempts = Math.min(10, Math.max(1, Math.floor(input.maxAttempts ?? 3)));
    const claim = await store.claim(provider.id);
    const results: Array<{
      courseId: string;
      result: ImportedCourseLinkCheckResult;
      retry: boolean;
    }> = [];
    try {
      const retries = await store.retries(provider.id, Math.max(1, Math.floor(limit / 2)));
      const page = await store.page(provider.id, claim.cursor, limit - retries.length);
      const seen = new Set<string>();
      for (const item of [
        ...retries.map((row) => ({ id: row.courseId, directCourseUrl: row.url, retry: true })),
        ...page.map((row) => ({ ...row, retry: false })),
      ]) {
        const key = item.id + '\n' + item.directCourseUrl;
        if (seen.has(key)) {
          if (!item.retry) await store.checkpoint(provider.id, claim.token, item.id, false);
          continue;
        }
        seen.add(key);
        const current = await this.providers.findById(provider.id);
        if (!current || current.status !== 'APPROVED' || !current.allowedDomains.length)
          throw new Error('COURSE_PROVIDER_NOT_APPROVED');
        const context = await this.operations.getVerificationContext(item.id);
        if (
          !context ||
          context.providerId !== provider.id ||
          context.directCourseUrl !== item.directCourseUrl
        ) {
          await store.recordFailure(provider.id, item.id, item.directCourseUrl, false, maxAttempts);
          if (!item.retry) await store.checkpoint(provider.id, claim.token, item.id, false);
          continue;
        }
        let failed = false;
        let result: ImportedCourseLinkCheckResult;
        try {
          result = await this.checker.check({
            url: item.directCourseUrl,
            allowedDomains: current.allowedDomains,
          });
          failed = result.state === 'NEEDS_REVIEW' && result.responseCode == null;
        } catch {
          failed = true;
          result = {
            state: 'NEEDS_REVIEW',
            checkedAt: new Date(),
            detail: 'COURSE_LINK_CHECK_TRANSPORT_FAILURE',
          };
        }
        await this.operations.recordLinkCheck(item.id, result, item.directCourseUrl);
        await store.recordFailure(provider.id, item.id, item.directCourseUrl, failed, maxAttempts);
        if (!item.retry) await store.checkpoint(provider.id, claim.token, item.id, false);
        else await store.checkpoint(provider.id, claim.token, claim.cursor, false);
        results.push({ courseId: item.id, result, retry: item.retry });
        if (seen.size < retries.length + page.length) await this.wait(delayMs);
      }
      const last = page.at(-1)?.id ?? claim.cursor;
      const more = page.length > 0 && (await store.page(provider.id, last, 1)).length > 0;
      if (!more && limit - retries.length > 0)
        await store.checkpoint(provider.id, claim.token, null, true);
      return {
        providerId: provider.id,
        jobId: claim.token,
        attempted: results.length,
        hasMore: more,
        nextCursor: more ? last : null,
        delayMs,
        maxAttempts,
        results,
        backlog: await store.metrics(provider.id),
      };
    } finally {
      await store.release(provider.id, claim.token);
    }
  }
}
