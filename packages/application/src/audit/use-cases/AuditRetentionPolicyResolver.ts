export type AuditRetentionClass = 'SECURITY_CRITICAL' | 'FINANCIAL' | 'IDENTITY_ACCESS' | 'AUTHENTICATION' | 'STANDARD_ADMIN';
export type AuditRetentionDurations = Partial<Record<AuditRetentionClass, number>>;

/** No default legal duration. Unconfigured classes keep events without an automatic expiry. */
export class AuditRetentionPolicyResolver {
  constructor(private readonly approvedDurations: Readonly<AuditRetentionDurations> = {}) {
    for (const days of Object.values(approvedDurations)) this.validate(days);
  }

  resolve(input: { category: string; severity: string; regulatoryTags?: string[]; retentionPeriodInDays?: number }) {
    const category = input.category.toUpperCase();
    const tags = input.regulatoryTags ?? [];
    const retentionClass: AuditRetentionClass = tags.includes('SECURITY_CRITICAL') ? 'SECURITY_CRITICAL'
      : /FINANC(E|IAL)/.test(category) ? 'FINANCIAL'
      : /IDENTITY|AUTHORIZATION|CREDENTIAL/.test(category) ? 'IDENTITY_ACCESS'
      : /AUTHENTICATION|^AUTH$/.test(category) ? 'AUTHENTICATION'
      : input.severity === 'CRITICAL' || category === 'CRITICAL_MUTATION' ? 'SECURITY_CRITICAL' : 'STANDARD_ADMIN';
    const days = input.retentionPeriodInDays ?? this.approvedDurations[retentionClass];
    if (days !== undefined) this.validate(days);
    return {
      retentionClass,
      retentionPeriodInDays: days,
      status: days === undefined ? 'UNCONFIGURED_RETAIN' : input.retentionPeriodInDays !== undefined ? 'EXPLICIT_OWNER_DURATION' : 'APPROVED_POLICY',
    } as const;
  }

  private validate(days: number) {
    if (!Number.isSafeInteger(days) || days <= 0 || !Number.isFinite(days * 86_400_000))
      throw new Error('AUDIT_RETENTION_DURATION_INVALID');
  }
}
