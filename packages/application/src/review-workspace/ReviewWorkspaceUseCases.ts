import type { AuthorizationEvaluatorService } from '@manaratak/domain';
import {
  reviewDomains,
  type ReviewOwner,
  type ReviewQuery,
  type ReviewPage,
  type ReviewCommand,
  type ReviewHistory,
  type ReviewAnalytics,
  type ReviewSavedView,
  type ReviewSlaPolicy,
} from '@manaratak/shared';

export const reviewOwnerPermissions: Record<ReviewOwner, string> = {
  scholarships: 'admin:scholarships:manage',
  universities: 'admin:universities:manage',
  majors: 'admin:majors:manage',
  courses: 'admin:courses:manage',
  tests: 'admin:international-tests:manage',
  services: 'admin:services:manage',
  cms: 'admin:cms:view',
  careers: 'admin:careers:manage',
  'study-destinations': 'admin:study-destinations:read',
};
export type ReviewAccess = {
  actorId: string;
  domains: ReviewOwner[];
  coordinate: boolean;
  imports?: boolean;
};
export interface ReviewWorkspaceGateway {
  list(access: ReviewAccess, query: ReviewQuery): Promise<ReviewPage>;
  synchronize(access: ReviewAccess, domain?: ReviewOwner): Promise<unknown>;
  command(
    access: ReviewAccess,
    command: ReviewCommand,
    authorize: (id: string, domain: ReviewOwner, ownerId: string) => Promise<boolean>,
  ): Promise<unknown>;
  history(access: ReviewAccess, key: string): Promise<ReviewHistory[]>;
  analytics(access: ReviewAccess, days: number): Promise<ReviewAnalytics>;
  reviewers(
    access: ReviewAccess,
    domain: ReviewOwner | undefined,
  ): Promise<Array<{ id: string; label: string; kind: 'person' | 'team' }>>;
  views(access: ReviewAccess): Promise<ReviewSavedView[]>;
  saveView(
    access: ReviewAccess,
    input: { name: string; shared: boolean; filters: ReviewQuery },
  ): Promise<ReviewSavedView>;
  policies(access: ReviewAccess): Promise<ReviewSlaPolicy[]>;
  approvePolicy(
    access: ReviewAccess,
    input: {
      domain: ReviewOwner;
      version: number;
      hours: number;
      warningHours: number;
      reason: string;
    },
  ): Promise<ReviewSlaPolicy>;
}
export class ReviewWorkspaceUseCases {
  constructor(
    private readonly gateway: ReviewWorkspaceGateway,
    private readonly authorization: Pick<AuthorizationEvaluatorService, 'evaluatePermission'> &
      Partial<Pick<AuthorizationEvaluatorService, 'evaluatePermissions'>>,
  ) {}
  private async granted(actorId: string, permission: string, resourceId?: string) {
    return (
      await this.authorization.evaluatePermission(actorId, permission, {
        requestTime: new Date(),
        resourceId,
        targetId: resourceId,
      })
    ).isGranted;
  }
  async access(actorId: string): Promise<ReviewAccess> {
    if (!actorId) throw new Error('REVIEW_AUTH_REQUIRED');
    if (this.authorization.evaluatePermissions) {
      const decisions = await this.authorization.evaluatePermissions(
        actorId,
        [
          'admin:platform:manage',
          ...reviewDomains.map((domain) => reviewOwnerPermissions[domain]),
          'admin:imports:manage',
        ],
        { requestTime: new Date() },
      );
      if (!decisions[0]?.isGranted) throw new Error('REVIEW_FORBIDDEN');
      return {
        actorId,
        coordinate: true,
        domains: reviewDomains.filter((_domain, index) => decisions[index + 1]?.isGranted),
        imports: decisions[reviewDomains.length + 1]?.isGranted === true,
      };
    }
    // Platform access admits the workbench, never grants access to its owners.
    if (!(await this.granted(actorId, 'admin:platform:manage')))
      throw new Error('REVIEW_FORBIDDEN');
    const allowed = await Promise.all(
      reviewDomains.map(async (domain) =>
        (await this.granted(actorId, reviewOwnerPermissions[domain])) ? domain : null,
      ),
    );
    return {
      actorId,
      domains: allowed.filter((domain): domain is ReviewOwner => domain !== null),
      coordinate: true,
      imports: await this.granted(actorId, 'admin:imports:manage'),
    };
  }
  async list(actor: string, query: ReviewQuery) {
    return this.gateway.list(await this.access(actor), query);
  }
  async synchronize(actor: string, domain?: ReviewOwner) {
    return this.gateway.synchronize(await this.access(actor), domain);
  }
  async history(actor: string, key: string) {
    return this.gateway.history(await this.access(actor), key);
  }
  async analytics(actor: string, days: number) {
    return this.gateway.analytics(await this.access(actor), days);
  }
  async reviewers(actor: string, domain?: ReviewOwner) {
    const access = await this.access(actor);
    if (domain && !access.domains.includes(domain)) throw new Error('REVIEW_FORBIDDEN');
    const candidates = await this.gateway.reviewers(access, domain);
    const eligible = await Promise.all(
      candidates.map(async (candidate) => {
        if (candidate.kind === 'team') return candidate;
        if (this.authorization.evaluatePermissions) {
          const decisions = await this.authorization.evaluatePermissions(
            candidate.id,
            [
              'admin:platform:manage',
              ...(domain ? [domain] : access.domains).map((owner) => reviewOwnerPermissions[owner]),
            ],
            { requestTime: new Date() },
          );
          return decisions[0]?.isGranted && decisions.slice(1).some((row) => row.isGranted)
            ? candidate
            : null;
        }
        return (await this.granted(candidate.id, 'admin:platform:manage')) &&
          (
            await Promise.all(
              (domain ? [domain] : access.domains).map((owner) =>
                this.granted(candidate.id, reviewOwnerPermissions[owner]),
              ),
            )
          ).some(Boolean)
          ? candidate
          : null;
      }),
    );
    return eligible.filter(
      (candidate): candidate is NonNullable<typeof candidate> => candidate !== null,
    );
  }
  async command(actor: string, command: ReviewCommand) {
    const access = await this.access(actor);
    return this.gateway.command(access, command, async (id, domain, ownerId) => {
      const permission =
        domain === 'cms'
          ? 'admin:cms:review'
          : domain === 'study-destinations'
            ? 'admin:study-destinations:edit'
            : reviewOwnerPermissions[domain];
      return (
        (await this.granted(id, 'admin:platform:manage', ownerId)) &&
        (await this.granted(id, permission, ownerId))
      );
    });
  }
  async bulk(actor: string, commands: ReviewCommand[]) {
    if (
      !commands.length ||
      commands.length > 25 ||
      new Set(commands.map((item) => item.key)).size !== commands.length ||
      commands.some((item) => !['assign', 'priority'].includes(item.action))
    )
      throw new Error('REVIEW_INPUT_INVALID');
    const results = [];
    for (const command of commands) {
      try {
        results.push({ key: command.key, ok: true, result: await this.command(actor, command) });
      } catch (error) {
        const code =
          error instanceof Error && /^REVIEW_[A-Z_]+$/.test(error.message)
            ? error.message
            : 'REVIEW_UNAVAILABLE';
        results.push({ key: command.key, ok: false, code });
      }
    }
    return { results };
  }
  async views(actor: string) {
    return this.gateway.views(await this.access(actor));
  }
  async saveView(actor: string, input: { name: string; shared: boolean; filters: ReviewQuery }) {
    return this.gateway.saveView(await this.access(actor), input);
  }
  async policies(actor: string) {
    return this.gateway.policies(await this.access(actor));
  }
  async approvePolicy(
    actor: string,
    input: {
      domain: ReviewOwner;
      version: number;
      hours: number;
      warningHours: number;
      reason: string;
    },
  ) {
    const access = await this.access(actor);
    if (
      !access.domains.includes(input.domain) ||
      !(await this.granted(
        actor,
        input.domain === 'cms'
          ? 'admin:cms:review'
          : input.domain === 'study-destinations'
            ? 'admin:study-destinations:edit'
            : reviewOwnerPermissions[input.domain],
      ))
    )
      throw new Error('REVIEW_FORBIDDEN');
    return this.gateway.approvePolicy(access, input);
  }
}
