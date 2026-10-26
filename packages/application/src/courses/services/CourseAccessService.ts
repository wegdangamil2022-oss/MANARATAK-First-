import {
  AuthorizationEvaluatorService,
  parseCourseScope,
  type IRoleAssignmentRepository,
  type IRoleRepository,
  type IPolicyRepository,
  type ICourseRepository,
} from '@manaratak/domain';
export const courseActions = ['read', 'edit', 'review', 'publish', 'grade', 'learners'] as const;
export type CourseAction = (typeof courseActions)[number];
export type CourseCapabilities = Record<CourseAction | 'manage', boolean>;

/** IAM owns grants and policies. Courses never create a parallel teacher ACL. */
export class CourseAccessService {
  constructor(
    private readonly evaluator: AuthorizationEvaluatorService,
    private readonly courses: ICourseRepository,
    private readonly assignments: IRoleAssignmentRepository,
    private readonly roles: IRoleRepository,
    private readonly policies: IPolicyRepository,
  ) {}
  async globalManager(actorId: string, context: Record<string, unknown> = {}) {
    return (
      await this.evaluator.evaluatePermission(actorId, 'admin:courses:manage', {
        ...context,
        courseId: undefined,
      })
    ).isGranted;
  }
  async workspace(actorId: string, context: Record<string, unknown> = {}) {
    return (await this.evaluator.evaluatePermission(actorId, 'admin:courses:workspace', context))
      .isGranted;
  }
  async capabilities(
    actorId: string,
    courseId: string,
    context: Record<string, unknown> = {},
  ): Promise<CourseCapabilities> {
    if (await this.globalManager(actorId, context))
      return {
        manage: true,
        read: true,
        edit: true,
        review: true,
        publish: true,
        grade: true,
        learners: true,
      };
    const course = await this.courses.findById(courseId);
    if (!course || course.originType !== 'NATIVE_MANARATAK_COURSE')
      return {
        manage: false,
        read: false,
        edit: false,
        review: false,
        publish: false,
        grade: false,
        learners: false,
      };
    const values = await Promise.all(
      courseActions.map(
        async (action) =>
          [
            action,
            (
              await this.evaluator.evaluatePermission(actorId, 'admin:courses:' + action, {
                ...context,
                courseId,
              })
            ).isGranted,
          ] as const,
      ),
    );
    const result = Object.fromEntries(values) as Record<CourseAction, boolean>;
    return { ...result, manage: false };
  }
  async assert(
    actorId: string,
    courseId: string,
    action: CourseAction | 'manage',
    context: Record<string, unknown> = {},
  ) {
    const caps = await this.capabilities(actorId, courseId, context);
    if (!caps[action]) throw Error('COURSE_PERMISSION_DENIED');
    return caps;
  }
  async assigned(actorId: string, offset: number, context: Record<string, unknown> = {}) {
    if (!(await this.workspace(actorId, context))) throw Error('COURSE_PERMISSION_DENIED');
    const grants = await this.assignments.findByIdentityId(actorId);
    if (grants.length > 200) throw Error('COURSE_SCOPE_LIMIT');
    const ids = new Set<string>();
    for (const grant of grants) {
      const role = await this.roles.findById(grant.roleId);
      if (!role) continue;
      for (const policyId of role.policyIds) {
        const policy = await this.policies.findById(policyId);
        if (policy?.ruleType === 'COURSE_SCOPE')
          for (const id of parseCourseScope(policy.ruleConfiguration)) ids.add(id);
      }
    }
    if (ids.size > 1000) throw Error('COURSE_SCOPE_LIMIT');
    const candidates = [...ids].sort(),
      data = [];
    for (const id of candidates.slice(offset, offset + 20)) {
      if (
        !(
          await this.evaluator.evaluatePermission(actorId, 'admin:courses:read', {
            ...context,
            courseId: id,
          })
        ).isGranted
      )
        continue;
      const course = await this.courses.findById(id);
      if (course?.originType === 'NATIVE_MANARATAK_COURSE')
        data.push({ id: course.id, displayName: course.displayName, status: course.status });
    }
    return { data, nextOffset: offset + 20 < candidates.length ? offset + 20 : null };
  }
}
