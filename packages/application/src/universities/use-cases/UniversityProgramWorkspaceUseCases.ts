import {
  type AtomicPersistenceContext,
  type ProgramStudy,
  type ProgramIntake,
  validateProgramStudy,
  validateProgramIntake,
} from '@manaratak/domain';
import { AtomicDomainMutationCoordinator } from '../../event-foundation/use-cases/AtomicDomainMutationCoordinator';
import type { UniversityMutationContext } from './AdminUniversityUseCases';
export interface ProgramQuery {
  academicProgramId?:string;
  locale?:'ar'|'en';
  universityId?: string;
  universityPublicId?: string;
  majorId?: string;
  degreeLevelId?: string;
  countryReferenceId?: string;
  regionReferenceId?: string;
  cityReferenceId?: string;
  internationalTestId?: string;
  languageReferenceId?: string;
  programStatus?: string;
  parentStatus?: string;
  studyMode?: string;
  teachingDelivery?: string;
  hasScholarships?: boolean;
  search?: string;
  cursor?: string;
  limit: number;
}
export interface IUniversityProgramWorkspaceGateway {
  query(input: ProgramQuery, publicOnly?: boolean): Promise<any>;
  facet?(input:ProgramQuery,kind:'DEGREE'|'MAJOR'|'TEST'|'LANGUAGE',after:string|undefined,search:string|undefined,publicOnly:boolean):Promise<any>;
  save(
    programId: string,
    input: { study?: ProgramStudy; intake?: ProgramIntake },
    context: UniversityMutationContext,
    tx: AtomicPersistenceContext,
  ): Promise<any>;
}
export class UniversityProgramWorkspaceUseCases {
  constructor(
    private readonly gateway: IUniversityProgramWorkspaceGateway,
    private readonly mutations: AtomicDomainMutationCoordinator,
  ) {}
  query(input: ProgramQuery, publicOnly = false) {
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100)
      throw new Error('UNIVERSITY_PROGRAM_QUERY_INVALID');
    return this.gateway.query(input, publicOnly);
  }
  facet(input:ProgramQuery,kind:'DEGREE'|'MAJOR'|'TEST'|'LANGUAGE',after?:string,search?:string,publicOnly=true){
    if(!this.gateway.facet)throw new Error('UNIVERSITY_PROGRAM_FACETS_UNAVAILABLE');
    if(!Number.isSafeInteger(input.limit)||input.limit<1||input.limit>50)throw new Error('UNIVERSITY_PROGRAM_QUERY_INVALID');
    return this.gateway.facet(input,kind,after,search,publicOnly);
  }
  save(
    programId: string,
    input: { study?: ProgramStudy; intake?: ProgramIntake },
    context: UniversityMutationContext,
  ) {
    if (
      !context.actorId ||
      !context.reason?.trim() ||
      !Number.isSafeInteger(context.expectedRevision)
    )
      throw new Error('UNIVERSITY_EXPECTED_REVISION_REQUIRED');
    if (Boolean(input.study) === Boolean(input.intake))
      throw new Error('UNIVERSITY_PROGRAM_INPUT_INVALID');
    if (input.study) validateProgramStudy(input.study);
    if (input.intake) validateProgramIntake(input.intake);
    return this.mutations.execute(
      {
        domain: 'UNIVERSITIES',
        aggregateType: 'ACADEMIC_PROGRAM',
        aggregateId: programId,
        action: input.study
          ? 'UNIVERSITY_PROGRAM_STUDY_UPDATED'
          : 'UNIVERSITY_PROGRAM_INTAKE_UPDATED',
        context,
        auditMetadata: {
          reason: context.reason,
          expectedRevision: context.expectedRevision,
          intakeId: input.intake?.id,
        },
        outbox: {
          payload: {
            programId,
            intakeId: input.intake?.id ?? null,
            operation: input.study ? 'STUDY_UPDATED' : 'INTAKE_UPDATED',
            requiresPublishedParent: true,
            ...(input.intake
              ? {
                  applicationOpen: input.intake.applicationOpen,
                  applicationClose: input.intake.applicationClose,
                  applicantSegment: input.intake.applicantSegment,
                  timezone: input.intake.timezone,
                  status: input.intake.status,
                }
              : {}),
          },
        },
      },
      (tx) => this.gateway.save(programId, input, context, tx),
    );
  }
}
