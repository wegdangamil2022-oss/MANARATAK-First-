import { FinancePlatformUseCases } from '@manaratak/application';
import { ICourseFinancialClearanceGateway } from '@manaratak/domain';

/** Read-only course consumer of Finance-owned clearance truth through the Phase 19 boundary. */
export class Phase19CourseFinancialClearanceGateway implements ICourseFinancialClearanceGateway {
  public constructor(private readonly finance: FinancePlatformUseCases) {}

  public hasCourseFinancialClearance(courseId: string, studentReferenceId: string): Promise<boolean> {
    return this.finance.hasFinancialClearanceForOrigin({
      originDomain: 'COURSE_ENROLLMENT',
      originReferenceId: courseId,
      studentReferenceId,
    });
  }
}
