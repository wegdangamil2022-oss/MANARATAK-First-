/** P8 owns score semantics. Consumers supply a frozen published version, never hard-coded test ranges. */
export type AdmissionScoreRange = { minimum: number; maximum: number; increment?: number };
export type AdmissionScoreProfile = {
  variantId: string | null;
  overall?: AdmissionScoreRange;
  sections: Array<AdmissionScoreRange & { sectionId: string }>;
  sourceUrl: string;
};
export type AdmissionVersionScale = {
  overallMinimum?: number | null;
  overallMaximum?: number | null;
  scoreIncrement?: number | null;
  metadata?: unknown;
};
export type AdmissionScoreEvaluation = {
  state: 'VALID' | 'INVALID' | 'UNVERIFIED';
  reason: string;
};
export function assertAdmissionScoreProfiles(
  value: unknown,
  owner: { variants?: Array<{ id: string; isActive: boolean }>; sections?: Array<{ id: string }> },
): AdmissionScoreProfile[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50) throw new Error('TEST_SCORE_PROFILES_INVALID');
  const scopes = new Set<string>();
  const range = (r: AdmissionScoreRange) => {
    if (
      !r ||
      !Number.isFinite(r.minimum) ||
      !Number.isFinite(r.maximum) ||
      r.maximum < r.minimum ||
      (r.increment !== undefined && (!Number.isFinite(r.increment) || r.increment <= 0))
    )
      throw new Error('TEST_SCORE_RANGE_INVALID');
  };
  for (const p of value as AdmissionScoreProfile[]) {
    if (
      !p ||
      !(p.variantId === null || typeof p.variantId === 'string') ||
      (p.variantId && !owner.variants?.some((v) => v.id === p.variantId && v.isActive)) ||
      !Array.isArray(p.sections) ||
      p.sections.length > 50 ||
      (!p.overall && !p.sections.length) ||
      typeof p.sourceUrl !== 'string'
    )
      throw new Error('TEST_SCORE_PROFILE_OWNER_INVALID');
    const scope = p.variantId ?? 'DEFAULT';
    if (scopes.has(scope)) throw new Error('TEST_SCORE_PROFILE_DUPLICATE');
    scopes.add(scope);
    try {
      const url = new URL(p.sourceUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch {
      throw new Error('TEST_SCORE_SOURCE_REQUIRED');
    }
    if (p.overall) range(p.overall);
    const sections = new Set<string>();
    for (const section of p.sections) {
      range(section);
      if (
        !owner.sections?.some((s) => s.id === section.sectionId) ||
        sections.has(section.sectionId)
      )
        throw new Error('TEST_SCORE_SECTION_OWNER_INVALID');
      sections.add(section.sectionId);
    }
  }
  return value as AdmissionScoreProfile[];
}
export function evaluateAdmissionScores(
  input: { variantId?: string | null; minimumScore?: unknown; sectionScores?: unknown },
  scales: AdmissionVersionScale[],
): AdmissionScoreEvaluation {
  const sections = input.sectionScores;
  if (
    sections !== undefined &&
    sections !== null &&
    (typeof sections !== 'object' || Array.isArray(sections))
  )
    return { state: 'INVALID', reason: 'SECTION_SCORES_INVALID' };
  const values = Object.entries(sections ?? {});
  if (values.length > 50) return { state: 'INVALID', reason: 'SECTION_SCORE_LIMIT' };
  const scope = (scale: AdmissionVersionScale) => {
    const metadata = scale.metadata as {
      admissionScoreScope?: { variantId?: string | null; sectionId?: string | null };
    } | null;
    return metadata?.admissionScoreScope;
  };
  const decide = (score: unknown, sectionId: string | null): AdmissionScoreEvaluation => {
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0)
      return { state: 'INVALID', reason: 'SCORE_INVALID' };
    const matches = scales.filter((scale) => {
      const ref = scope(scale),
        metadata = scale.metadata as Record<string, unknown> | null;
      if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'admissionScoreScope'))
        return (
          !!ref &&
          typeof ref === 'object' &&
          !Array.isArray(ref) &&
          ref.variantId === (input.variantId ?? null) &&
          ref.sectionId === sectionId
        );
      return !input.variantId && sectionId === null && scales.length === 1;
    });
    if (matches.length !== 1) return { state: 'UNVERIFIED', reason: 'REVIEWED_SCALE_REQUIRED' };
    const scale = matches[0],
      min = scale.overallMinimum,
      max = scale.overallMaximum,
      step = scale.scoreIncrement;
    if (
      typeof min !== 'number' ||
      typeof max !== 'number' ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      max < min
    )
      return { state: 'UNVERIFIED', reason: 'SCALE_BOUNDS_UNKNOWN' };
    if (step !== undefined && step !== null && (!Number.isFinite(step) || step <= 0))
      return { state: 'UNVERIFIED', reason: 'SCALE_INCREMENT_UNKNOWN' };
    if(typeof step==='number'&&(!Number.isFinite((score-min)/step)||Math.abs((score-min)/step)>Number.MAX_SAFE_INTEGER))return {state:'UNVERIFIED',reason:'SCALE_PRECISION_UNKNOWN'};
    if (
      score < min ||
      score > max ||
      (typeof step === 'number' &&
        step > 0 &&
        Math.abs((score - min) / step - Math.round((score - min) / step)) > 1e-7)
    )
      return { state: 'INVALID', reason: 'OUTSIDE_REVIEWED_SCALE' };
    return { state: 'VALID', reason: 'PUBLISHED_OWNER_SCALE' };
  };
  if (input.minimumScore !== null && input.minimumScore !== undefined) {
    const result = decide(input.minimumScore, null);
    if (result.state !== 'VALID') return result;
  }
  for (const [sectionId, score] of values) {
    const result = decide(score, sectionId);
    if (result.state !== 'VALID') return result;
  }
  return { state: 'VALID', reason: 'PUBLISHED_OWNER_SCALE' };
}
/** Frozen scale rows become authoritative only inside the owner's reviewed publish transaction. */
export function admissionPublicationScales(owner: {
  scoreScale?: { overallMinimum: number; overallMaximum: number; scoreIncrement?: number };
  variants?: Array<{ id: string; isActive: boolean }>;
  sections?: Array<{ id: string }>;
  optionalFields?: Record<string, unknown>;
}) {
  const profiles = assertAdmissionScoreProfiles(
    owner.optionalFields?.admissionScoreProfiles,
    owner,
  );
  const rows: Array<{
    scaleName: string;
    overallMinimum: number;
    overallMaximum: number;
    scoreIncrement?: number;
    metadata: {
      admissionScoreScope: { variantId: string | null; sectionId: string | null };
      sourceUrl?: string;
    };
  }> = [];
  const add = (
    range: AdmissionScoreRange,
    variantId: string | null,
    sectionId: string | null,
    sourceUrl?: string,
  ) =>
    rows.push({
      scaleName: `${variantId ?? 'DEFAULT'}:${sectionId ?? 'OVERALL'}`,
      overallMinimum: range.minimum,
      overallMaximum: range.maximum,
      scoreIncrement: range.increment,
      metadata: {
        admissionScoreScope: { variantId, sectionId },
        ...(sourceUrl ? { sourceUrl } : {}),
      },
    });
  if (owner.scoreScale && !profiles.some((p) => p.variantId === null && p.overall))
    add(
      {
        minimum: owner.scoreScale.overallMinimum,
        maximum: owner.scoreScale.overallMaximum,
        increment: owner.scoreScale.scoreIncrement,
      },
      null,
      null,
    );
  for (const p of profiles) {
    if (p.overall) add(p.overall, p.variantId, null, p.sourceUrl);
    for (const section of p.sections) add(section, p.variantId, section.sectionId, p.sourceUrl);
  }
  return rows;
}
