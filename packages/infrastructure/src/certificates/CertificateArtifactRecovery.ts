import type { ICertificateRepository } from '@absheer/domain';
import type { EapCertificateArtifactStore } from './EapCertificateArtifactStore';
/** Bounded reconciliation; only withdrawn certificates' unpublished uploads are cancelled. */
export class CertificateArtifactRecovery {
  constructor(
    private readonly certificates: ICertificateRepository,
    private readonly store: EapCertificateArtifactStore,
  ) {}
  async sweep(): Promise<void> {
    if (
      !this.certificates.listAbandonedRenderJobs ||
      !this.certificates.markRenderCleanup
    )
      throw new Error('CERTIFICATE_ARTIFACT_RECOVERY_UNAVAILABLE');
    const jobs = await this.certificates.listAbandonedRenderJobs(25);
    for (const job of jobs) {
      await this.store.cleanupAbandoned(
        job.id,
        job.fingerprint,
        job.attachedIds,
      );
      await this.certificates.markRenderCleanup(job.id, job.fingerprint);
    }
  }
}
