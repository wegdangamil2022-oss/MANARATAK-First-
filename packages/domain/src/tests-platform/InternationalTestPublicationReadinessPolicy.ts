import {
  PublicationReadinessIssue,
  PublicationReadinessPolicy
} from '../publication-readiness/PublicationReadiness';
import { InternationalTestDto } from './contracts';
import { InternationalTestStatus, InternationalTestValidationSeverity } from './enums';
import { IInternationalTestValidationService, InternationalTestValidationService } from './validation';

export class InternationalTestPublicationReadinessPolicy implements PublicationReadinessPolicy<InternationalTestDto> {
  public readonly domain = 'INTERNATIONAL_TESTS';

  constructor(
    private readonly validationService: IInternationalTestValidationService = new InternationalTestValidationService()
  ) {}

  public evaluate(entity: InternationalTestDto) {
    const report = this.validationService.validate(entity);
    const blockingIssues: PublicationReadinessIssue[] = report.issues
      .filter(issue => issue.severity === InternationalTestValidationSeverity.ERROR)
      .map(issue => ({
        code: `INTERNATIONAL_TEST_${issue.field.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}_INVALID`,
        message: issue.message,
        field: issue.field
      }));
    const warnings: PublicationReadinessIssue[] = report.warnings.map(issue => ({
      code: `INTERNATIONAL_TEST_${issue.field.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}_WARNING`,
      message: issue.message,
      field: issue.field
    }));

    if (entity.status !== InternationalTestStatus.READY_TO_PUBLISH) {
      blockingIssues.push({ code: 'INTERNATIONAL_TEST_INVALID_PUBLICATION_STATUS', message: 'Test must be READY_TO_PUBLISH', field: 'status' });
    }
    if (!entity.localizedNameAr?.trim()) {
      blockingIssues.push({ code: 'INTERNATIONAL_TEST_ARABIC_NAME_MISSING', message: 'Arabic localized name is required for publication', field: 'localizedNameAr' });
    }
    if (!entity.localizedNameEn?.trim()) {
      blockingIssues.push({ code: 'INTERNATIONAL_TEST_ENGLISH_NAME_MISSING', message: 'English localized name is required for publication', field: 'localizedNameEn' });
    }
    if (!entity.providerId?.trim()) {
      blockingIssues.push({ code: 'INTERNATIONAL_TEST_CANONICAL_PROVIDER_MISSING', message: 'Canonical provider reference is required', field: 'providerId' });
    }
    if (!entity.isSourceVerified) {
      blockingIssues.push({ code: 'INTERNATIONAL_TEST_SOURCE_NOT_VERIFIED', message: 'Source identity must be verified before publication', field: 'isSourceVerified' });
    }
    const scoreScale = entity.scoreScale;
    if (!scoreScale || !Number.isFinite(scoreScale.overallMinimum) || !Number.isFinite(scoreScale.overallMaximum) || scoreScale.overallMinimum > scoreScale.overallMaximum) {
      blockingIssues.push({
        code: 'INTERNATIONAL_TEST_NORMALIZED_SCORE_SCALE_REQUIRED',
        message: 'A normalized score scale with valid minimum and maximum is required for publication',
        field: 'scoreScale',
      });
    }
    const registrationLink = entity.officialLinks?.find(link => link.linkType === 'REGISTRATION');
    if (!registrationLink || !this.isHttpUrl(registrationLink.url)) {
      blockingIssues.push({
        code: 'INTERNATIONAL_TEST_OFFICIAL_REGISTRATION_URL_REQUIRED',
        message: 'A normalized official REGISTRATION URL is required for publication',
        field: 'officialLinks',
      });
    }

    return { blockingIssues, warnings };
  }

  private isHttpUrl(value: string | undefined): boolean {
    if (!value) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
