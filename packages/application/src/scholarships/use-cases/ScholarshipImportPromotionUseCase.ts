import { v4 as uuidv4 } from 'uuid';
import { 
  IScholarshipRepository, 
  ScholarshipStatus,
  ScholarshipImportPayloadSchema,
  ScholarshipNamingService,
  ScholarshipDeduplicationService,
  ScholarshipCompletenessClassifier,
  ScholarshipCompletenessState,
  ScholarshipPublicationStatus,
  ScholarshipVerificationStatus,
  ImportRecordDto,
  ImportRecordStatus
} from '@manaratak/domain';

export type PromotionResult = 
  | { type: 'CREATED'; scholarshipId: string }
  | { type: 'DUPLICATE'; existingId: string }
  | { type: 'REJECTED'; reason: string }
  | { type: 'FAILED'; error: string };

export class ScholarshipImportPromotionUseCase {
  constructor(private readonly repository: IScholarshipRepository) {}

  public async promote(record: ImportRecordDto): Promise<PromotionResult> {
    try {
      if (
        record.status !== ImportRecordStatus.VALID && 
        record.status !== ImportRecordStatus.COMPLETE && 
        record.status !== ImportRecordStatus.NEEDS_REVIEW
      ) {
        return { type: 'REJECTED', reason: `ImportRecord status is ${record.status}, not VALID, COMPLETE or NEEDS_REVIEW` };
      }

      const rawPayload = record.normalizedPayload || record.rawPayload;
      const validationResult = ScholarshipImportPayloadSchema.safeParse(rawPayload);
      
      if (!validationResult.success) {
        return { type: 'REJECTED', reason: 'Payload fails schema validation' };
      }
      
      const payload = validationResult.data;
      
      const classification = ScholarshipCompletenessClassifier.classify(payload);
      const canonicalName = ScholarshipNamingService.normalize(payload.scholarshipName);
      const dedupKey = ScholarshipDeduplicationService.generateKey(payload);
      
      const existing = await this.repository.findByDedupKey(dedupKey);
      if (existing) {
        return { type: 'DUPLICATE', existingId: existing.id };
      }
      
      let status = ScholarshipStatus.READY_TO_REVIEW;
      if (classification.state === ScholarshipCompletenessState.COMPLETE) {
        status = ScholarshipStatus.IMPORTED;
      }
      
      let applicationDeadline: Date | undefined;
      if (payload.applicationDeadline && payload.applicationDeadline !== '') {
        applicationDeadline = new Date(payload.applicationDeadline);
      }
      
      const publicId = `schol-${uuidv4().substring(0, 8)}`;
      // Generate safe slug
      const slug = canonicalName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + '-' + publicId.substring(0, 4);
        
      const created = await this.repository.create({
        publicId,
        slug,
        canonicalName,
        canonicalDedupKey: dedupKey,
        displayName: payload.scholarshipName,
        fundingCoverage: payload.fundingCoverage,
        coverageDetails: payload.coverageDetails,
        eligibleMajorsOrFields: payload.eligibleMajorsOrFields,
        degreeLevel: payload.degreeLevel,
        status,
        completenessStatus: classification.state,
        verificationStatus: ScholarshipVerificationStatus.PENDING,
        publicationStatus: ScholarshipPublicationStatus.DRAFT,
        applicationLink: payload.applicationLink === '' ? undefined : payload.applicationLink,
        officialSourceUrl: payload.officialSourceUrl === '' ? undefined : payload.officialSourceUrl,
        sponsorName: payload.sponsorName,
        studyCountry: payload.studyCountry,
        applicationDeadline,
        sourceImportRecordId: record.id,
        optionalFields: {
          requiredDocuments: payload.requiredDocuments,
          eligibilityCriteria: payload.eligibilityCriteria,
          studyLanguage: payload.studyLanguage,
          targetUniversities: payload.targetUniversities,
          targetAcademicPrograms: payload.targetAcademicPrograms,
          fundingAmount: payload.fundingAmount,
          currency: payload.currency,
          duration: payload.duration,
          localizedNames: payload.localizedNames
        }
      });
      
      return { type: 'CREATED', scholarshipId: created.id };
    } catch (error: any) {
      return { type: 'FAILED', error: error.message };
    }
  }
}
