export type ScholarshipCanonicalTarget =
  | 'PROVIDER_UNIVERSITY'
  | 'UNIVERSITY'
  | 'ACADEMIC_PROGRAM'
  | 'COUNTRY'
  | 'LANGUAGE'
  | 'CURRENCY'
  | 'DEGREE_LEVEL'
  | 'MAJOR'
  | 'INTERNATIONAL_TEST';

export interface ScholarshipCanonicalScreeningRecord {
  requirementKey: string;
  target: ScholarshipCanonicalTarget;
  state: string;
  rawValue: string | null;
  canonicalReferenceId: string | null;
  canonicalPublicId: string | null;
  canonicalStandardCode: string | null;
}

export interface ScholarshipCanonicalDecisionLike {
  decisionId?: string;
  fieldOrRequirementKey: string;
  canonicalEntityType: string;
  canonicalId?: string;
  rawValue: string;
  resolutionType: string;
  recordedAt?: string;
}

export interface ScholarshipResolvedScreeningSnapshot {
  entries: ScholarshipCanonicalScreeningRecord[];
  decisionIds: string[];
}

/**
 * W8 canonical reader for all historical scholarship-import screening shapes.
 * Precedence is the canonical Phase 6 persisted _domainHandoff, then legacy
 * metadata.canonicalScreening, then legacy root _canonicalScreening.
 * Durable admin decisions are overlaid by requirement key so every consumer
 * sees the same effective canonical snapshot.
 */
export class ScholarshipImportScreeningReader {
  static entries(rawPayload: unknown): ScholarshipCanonicalScreeningRecord[] {
    return this.rawEntries(rawPayload).flatMap((item) => {
      const target = this.target(item.target ?? item.canonicalEntityType);
      const state = this.string(item.state)?.toUpperCase();
      if (!target || !state) return [];
      const requirementKey = this.string(
        item.requirementKey ?? item.fieldOrRequirementKey ?? item.target ?? item.canonicalEntityType,
      ) ?? target;
      return [{
        requirementKey,
        target,
        state,
        rawValue: this.string(item.rawValue ?? item.requestedCanonicalId ?? item.canonicalId) ?? null,
        canonicalReferenceId: this.string(item.canonicalReferenceId ?? item.canonicalId) ?? null,
        canonicalPublicId: this.string(item.canonicalPublicId) ?? null,
        canonicalStandardCode: this.string(item.canonicalStandardCode) ?? null,
      }];
    });
  }

  static resolve(
    rawPayload: unknown,
    decisions: readonly ScholarshipCanonicalDecisionLike[] = [],
  ): ScholarshipResolvedScreeningSnapshot {
    const entries = this.entries(rawPayload).map((item) => ({ ...item }));
    const effective = new Map<string, ScholarshipCanonicalDecisionLike>();
    for (const decision of decisions) {
      const key = this.string(decision.fieldOrRequirementKey);
      if (!key) continue;
      const current = effective.get(key);
      if (!current || this.decisionOrder(decision) >= this.decisionOrder(current)) effective.set(key, decision);
    }

    for (const [requirementKey, decision] of effective) {
      const target = this.target(decision.canonicalEntityType);
      if (!target) continue;
      const state = decision.resolutionType === 'RESOLVED'
        ? 'RESOLVED'
        : decision.resolutionType === 'NOT_APPLICABLE'
          ? 'NOT_APPLICABLE'
          : 'REVIEW_REQUIRED';
      const index = entries.findIndex((item) => item.requirementKey === requirementKey);
      const current = index >= 0 ? entries[index] : undefined;
      const replacement: ScholarshipCanonicalScreeningRecord = {
        requirementKey,
        target,
        state,
        rawValue: this.string(decision.rawValue) ?? current?.rawValue ?? null,
        canonicalReferenceId: decision.resolutionType === 'RESOLVED'
          ? this.string(decision.canonicalId) ?? null
          : null,
        canonicalPublicId: current?.canonicalPublicId ?? null,
        canonicalStandardCode: current?.canonicalStandardCode ?? null,
      };
      if (index >= 0) entries[index] = replacement;
      else entries.push(replacement);
    }

    return {
      entries,
      decisionIds: [...effective.values()]
        .map((decision) => this.string(decision.decisionId))
        .filter((value): value is string => Boolean(value))
        .sort(),
    };
  }

  static rawEntries(rawPayload: unknown): Record<string, unknown>[] {
    const raw = this.object(rawPayload);
    const metadata = this.object(raw.metadata);
    const handoff = this.object(raw._domainHandoff);
    const source = Array.isArray(handoff.canonicalScreening)
      ? handoff.canonicalScreening
      : Array.isArray(metadata.canonicalScreening)
        ? metadata.canonicalScreening
        : Array.isArray(raw._canonicalScreening)
          ? raw._canonicalScreening
          : [];
    return source.map((value) => this.object(value));
  }

  static has(rawPayload: unknown): boolean {
    return this.rawEntries(rawPayload).length > 0;
  }

  static findRequirement(rawPayload: unknown, key: string): Record<string, unknown> | null {
    return this.rawEntries(rawPayload).find((entry) =>
      (this.string(entry.requirementKey ?? entry.fieldOrRequirementKey ?? entry.target ?? entry.canonicalEntityType) ?? '') === key
    ) ?? null;
  }

  private static decisionOrder(decision: ScholarshipCanonicalDecisionLike): string {
    const timestamp = this.string(decision.recordedAt) ?? '';
    const id = this.string(decision.decisionId) ?? '';
    return `${timestamp}\u001f${id}`;
  }

  private static target(value: unknown): ScholarshipCanonicalTarget | undefined {
    const target = this.string(value)?.toUpperCase();
    return target && new Set([
      'PROVIDER_UNIVERSITY', 'UNIVERSITY', 'ACADEMIC_PROGRAM', 'COUNTRY', 'LANGUAGE', 'CURRENCY',
      'DEGREE_LEVEL', 'MAJOR', 'INTERNATIONAL_TEST',
    ]).has(target) ? target as ScholarshipCanonicalTarget : undefined;
  }

  private static object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private static string(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
