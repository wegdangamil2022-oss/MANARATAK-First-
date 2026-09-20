import {
  CertificateAuthoritativeEventEnvelope,
  CourseCompletedEventPayload,
  LearningPathCompletedEventPayload,
} from '@manaratak/domain';
import { CertificateUseCases } from './CertificateUseCases';
import { CertificateArtifactRenderUseCase } from './CertificateArtifactRenderUseCase';

export interface CertificateCompletionOutboxRecord {
  id: string;
  eventType: string;
  domain: string;
  payload: unknown;
  metadata?: unknown;
  createdAt?: Date | string;
}

/**
 * Trusted adapter for durable Phase 13 outbox/inbox delivery. It intentionally
 * accepts a persisted event record, not caller-supplied pedagogical facts.
 */
export class CertificateCompletionEventConsumer {
  constructor(
    private readonly certificates: CertificateUseCases,
    private readonly artifactRenderer?: CertificateArtifactRenderUseCase,
  ) {}

  public async consume(record: CertificateCompletionOutboxRecord) {
    if (record.domain !== 'COURSES') throw new Error('CERTIFICATE_SOURCE_EVENT_DOMAIN_INVALID');
    if (record.eventType !== 'CourseCompleted' && record.eventType !== 'LearningPathCompleted') {
      throw new Error('CERTIFICATE_SOURCE_EVENT_TYPE_INVALID');
    }
    const payload = this.object(record.payload) as unknown as CourseCompletedEventPayload | LearningPathCompletedEventPayload;
    const metadata = this.object(record.metadata);
    const eventVersion = this.text(metadata.eventVersion ?? metadata.schemaVersion);
    if (!eventVersion) throw new Error('CERTIFICATE_SOURCE_EVENT_VERSION_REQUIRED');
    // A versioned trusted completion may legitimately be non-credential-bearing.
    // Acknowledge it as a no-op so the durable dispatcher does not create a retry storm.
    if (payload.eligibleForCertificate !== true) return null;
    const envelope: CertificateAuthoritativeEventEnvelope<CourseCompletedEventPayload | LearningPathCompletedEventPayload> = {
      eventId: record.id,
      eventType: record.eventType,
      eventVersion,
      sourceDomain: 'COURSES',
      occurredAt: record.createdAt ?? new Date(),
      payload,
    };
    const certificate = await this.certificates.consumeCompletionEvent(envelope);
    if (certificate && this.artifactRenderer) {
      await this.artifactRenderer.renderCertificate(certificate.id, 'phase14-renderer', record.id);
    }
    return certificate;
  }

  private object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }
  private text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
