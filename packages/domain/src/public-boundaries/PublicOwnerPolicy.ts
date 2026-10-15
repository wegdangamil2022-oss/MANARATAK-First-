import {evaluateAdmissionScores,type AdmissionVersionScale} from '../tests-platform/AdmissionScoreInterpretation';
/** Shared owner-publication decisions. Presence of a foreign key is never publication proof. */
export function isPublicScholarshipOwner(value: {
  publicationStatus?: unknown;
  status?: unknown;
  verificationStatus?: unknown;
  completenessStatus?: unknown;
}): boolean {
  return (
    value.publicationStatus === 'PUBLISHED' &&
    value.status === 'PUBLISHED' &&
    value.verificationStatus === 'VERIFIED' &&
    value.completenessStatus === 'COMPLETE'
  );
}
export function isPublicUniversityProgram(value: {
  status?: unknown;
  majorMappingState?: unknown;
  majorId?: unknown;
  degreeLevelId?: unknown;
  major?: {
    status?: unknown;
    levelProfiles?: Array<{
      degreeLevelId?: unknown;
      status?: unknown;
      currentPublishedVersionId?: unknown;
    }>;
  } | null;
}): boolean {
  return (
    value.status === 'ACTIVE' &&
    value.majorMappingState === 'CANONICALLY_MAPPED' &&
    Boolean(value.majorId) &&
    Boolean(value.degreeLevelId) &&
    value.major?.status === 'PUBLISHED' &&
    Boolean(
      value.major.levelProfiles?.some(
        (profile) =>
          profile.degreeLevelId === value.degreeLevelId &&
          profile.status === 'PUBLISHED' &&
          profile.currentPublishedVersionId,
      ),
    )
  );
}
export function assertUniversityProgramParent(
  universityId: string | null | undefined,
  program: { id: string; ownerId?: string | null } | null | undefined,
): string | null {
  if (!program) return universityId ?? null;
  if (!program.ownerId) throw new Error('SCHOLARSHIP_PROGRAM_PARENT_UNVERIFIED');
  if (universityId && universityId !== program.ownerId)
    throw new Error('SCHOLARSHIP_ACADEMIC_PROGRAM_UNIVERSITY_MISMATCH');
  return program.ownerId;
}
export function publicGraphRouteKey(identity: {
  slug?: string | null;
  publicId?: string | null;
}): string | null {
  // Public slug readers have no implicit internal-ID/publicId fallback contract.
  const slug = identity.slug?.trim();
  return slug && slug.length <= 240 && !/[\\/\u0000-\u001f?#]/.test(slug) ? slug : null;
}
export type PublicScoreDecision = 'VALID' | 'INVALID' | 'UNVERIFIED';
export function publicScoreDecision(
  score: unknown,
  scale:
    | { minimumScore?: unknown; maximumScore?: unknown; minScore?: unknown; maxScore?: unknown }
    | null
    | undefined,
): PublicScoreDecision {
  if (score === null || score === undefined) return 'VALID';
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) return 'INVALID';
  const minimum = scale?.minimumScore ?? scale?.minScore,
    maximum = scale?.maximumScore ?? scale?.maxScore;
  if (
    typeof minimum !== 'number' ||
    typeof maximum !== 'number' ||
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    maximum < minimum
  )
    return 'UNVERIFIED';
  return score >= minimum && score <= maximum ? 'VALID' : 'INVALID';
}

export function isPublicAdmissionRequirement(value: {
  sectionScores?: unknown;
  status?: string;
  internationalTestId?: string;
  testVariantId?: string | null;
  testVersionId?: string | null;
  minimumScore?: number | null;
  internationalTest?: {
    isPubliclyVisible?: boolean;
    status?: string;
    currentPublishedVersion?: {
      id?: string;
      status?: string;
      metadata?:unknown;
      scoreScales?: AdmissionVersionScale[];
    } | null;
  };
  testVariant?: { testId?: string; isActive?: boolean } | null;
  testVersion?: {
    testId?: string;
    status?: string;
    metadata?:unknown;
    scoreScales?: AdmissionVersionScale[];
  } | null;
}): boolean {
  if (value.status !== 'ACTIVE' || value.internationalTest?.status !== 'PUBLISHED' || value.internationalTest.isPubliclyVisible === false) return false;
  const version = value.testVersionId
    ? value.testVersion
    : value.internationalTest.currentPublishedVersion;
  if (!version || version.status !== 'PUBLISHED') return false;
  if (value.testVersionId && value.testVersion?.testId !== value.internationalTestId) return false;
  if (
    value.testVariantId &&
    (value.testVariant?.testId !== value.internationalTestId || value.testVariant?.isActive !== true)
  )
    return false;
  if(value.testVariantId){const publishedIds=(version.metadata as {publishedVariantIds?:unknown}|null)?.publishedVariantIds;const scaleProof=(version.scoreScales??[]).some(scale=>(scale.metadata as {admissionScoreScope?:{variantId?:string}}|null)?.admissionScoreScope?.variantId===value.testVariantId);if(!(Array.isArray(publishedIds)&&publishedIds.includes(value.testVariantId))&&!scaleProof)return false;}
  return evaluateAdmissionScores({variantId:value.testVariantId,minimumScore:value.minimumScore,sectionScores:value.sectionScores},version.scoreScales??[]).state==='VALID';
}

/** Canonical parent and joined-owner proof for a public scholarship institution edge. */
export function isPublicScholarshipUniversityLink(value: {
  universityId?: string | null; academicProgramId?: string | null; resolutionStatus?: string;
  university?: { id?: string; status?: string } | null;
  academicProgram?: Parameters<typeof isPublicUniversityProgram>[0] & { universityId?: string; university?: { status?: string } | null } | null;
}): boolean {
  if (value.resolutionStatus !== 'RESOLVED') return false;
  if (value.academicProgramId && (!value.academicProgram || !isPublicUniversityProgram(value.academicProgram))) return false;
  if (value.universityId && value.academicProgram && value.universityId !== value.academicProgram.universityId) return false;
  return (value.university ?? value.academicProgram?.university)?.status === 'PUBLISHED';
}
