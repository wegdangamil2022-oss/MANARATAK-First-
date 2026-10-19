import type { IResolvedSettingsReader } from '@absheer/domain';

/** Values are administered through the canonical Settings workspace, never secrets. */
export class CertificateVerificationPolicy {
  constructor(private readonly settings: IResolvedSettingsReader) {}
  private async integer(
    key: string,
    min: number,
    max: number,
    fallback: number | null,
  ) {
    const resolved = await this.settings.readSetting(key, {
      domainId: 'certificates',
    });
    if (resolved.status === 'NOT_DEFINED' || resolved.status === 'NO_VALUE')
      return fallback;
    if (
      resolved.status !== 'RESOLVED' ||
      typeof resolved.value !== 'number' ||
      !Number.isSafeInteger(resolved.value) ||
      Number(resolved.value) < min ||
      Number(resolved.value) > max
    ) {
      throw new Error('CERTIFICATE_VERIFICATION_POLICY_INVALID');
    }
    return Number(resolved.value);
  }
  private cache?: {
    until: number;
    value: {
      retentionDays: number | null;
      ipPerMinute: number;
      codePerMinute: number;
    };
  };
  private pending?: Promise<{
    retentionDays: number | null;
    ipPerMinute: number;
    codePerMinute: number;
  }>;
  async read() {
    if (this.cache && this.cache.until > Date.now())
      return { ...this.cache.value };
    this.pending ??= this.load()
      .then((value) => {
        this.cache = { until: Date.now() + 5000, value };
        return value;
      })
      .finally(() => {
        this.pending = undefined;
      });
    return { ...(await this.pending) };
  }
  private async load() {
    const [retentionDays, ipPerMinute, codePerMinute] = await Promise.all([
      this.integer('certificates.verification.retention_days', 1, 36500, null),
      this.integer('certificates.verification.ip_per_minute', 1, 10000, 60),
      this.integer('certificates.verification.code_per_minute', 1, 10000, 120),
    ]);
    return {
      retentionDays,
      ipPerMinute: ipPerMinute!,
      codePerMinute: codePerMinute!,
    };
  }
}
