import { PublicationReadinessIssue, PublicationReadinessPolicy } from '../publication-readiness/PublicationReadiness';
import { UniversityDto, UniversityImportCompletenessState, UniversityStatus } from './universities';

export class UniversityPublicationReadinessPolicy implements PublicationReadinessPolicy<UniversityDto> {
  public readonly domain = 'UNIVERSITIES';

  evaluate(entity: UniversityDto) {
    const blockingIssues: PublicationReadinessIssue[] = [];
    const warnings: PublicationReadinessIssue[] = [];
    const programs = Array.isArray(entity.academicPrograms) ? entity.academicPrograms : [];
    const publicPrograms = programs.filter((program) => program.status === 'ACTIVE');
    const excludedPrograms = programs.filter((program) => program.status !== 'ACTIVE' && program.status !== 'ARCHIVED');
    const acceptedTests = Array.isArray(entity.acceptedLanguageTests) ? entity.acceptedLanguageTests : [];
    const topLevelRequirements = (Array.isArray(entity.admissionRequirements) ? entity.admissionRequirements : [])
      .filter((requirement) => !('status' in requirement) || requirement.status === 'ACTIVE');
    const requirements = [
      ...topLevelRequirements,
      ...publicPrograms.flatMap((program) =>
        Array.isArray(program.admissionRequirements)
          ? program.admissionRequirements.filter((requirement) => requirement.status === 'ACTIVE')
          : [],
      ),
    ];

    if (entity.status !== UniversityStatus.READY_TO_PUBLISH) blockingIssues.push(issue('UNIVERSITY_INVALID_PUBLICATION_STATUS', 'status', 'University must be READY_TO_PUBLISH.'));
    if (entity.completenessStatus !== UniversityImportCompletenessState.COMPLETE) blockingIssues.push(issue('UNIVERSITY_INCOMPLETE', 'completenessStatus', 'University completeness must be COMPLETE.'));
    if (!entity.publicId?.startsWith('INS-')) blockingIssues.push(issue('UNIVERSITY_SOURCE_IDENTITY_MISSING', 'publicId', 'Permanent INS-* source identity is required.'));
    if (!entity.countryReferenceId) blockingIssues.push(issue('UNIVERSITY_CANONICAL_COUNTRY_REFERENCE_MISSING', 'countryReferenceId', 'Canonical country reference is required; country text alone is insufficient.'));

    publicPrograms.forEach((program, index) => {
      if (!program.degreeLevelId) blockingIssues.push(issue('UNIVERSITY_PROGRAM_DEGREE_REFERENCE_MISSING', `academicPrograms.${index}.degreeLevelId`, 'ACTIVE Academic Program requires canonical DegreeLevel ID before publication.'));
      if (program.majorMappingState === 'CANONICALLY_MAPPED' && !program.majorId) blockingIssues.push(issue('UNIVERSITY_PROGRAM_MAJOR_REFERENCE_MISSING', `academicPrograms.${index}.majorId`, 'ACTIVE CANONICALLY_MAPPED program requires canonical Major ID.'));
    });

    if (excludedPrograms.length > 0) {
      warnings.push(issue('UNIVERSITY_NON_ACTIVE_PROGRAMS_EXCLUDED', 'academicPrograms', `${excludedPrograms.length} non-active academic program(s) will remain internal and will not appear in public relationships.`));
    }

    if (acceptedTests.length > 0 && !requirements.some((requirement) => requirement.internationalTestId)) {
      blockingIssues.push(issue('UNIVERSITY_TEST_REFERENCES_NOT_CANONICAL', 'admissionRequirements', 'Named accepted tests require an ACTIVE canonical International Test relationship.'));
    }
    requirements.forEach((requirement, index) => {
      if (!requirement.internationalTestId) blockingIssues.push(issue('UNIVERSITY_TEST_REFERENCE_MISSING', `admissionRequirements.${index}.internationalTestId`, 'ACTIVE admission test requirement requires canonical International Test ID.'));
    });
    return { blockingIssues, warnings };
  }
}

function issue(code: string, field: string, message: string): PublicationReadinessIssue { return { code, field, message }; }
