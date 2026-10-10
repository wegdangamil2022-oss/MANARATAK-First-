import {
  IOutboxDeliveryGateway,
  OutboxDeliveryContext,
  TransactionalOutboxEntry,
} from '@manaratak/domain';
import { CertificateArtifactRenderUseCase } from './CertificateArtifactRenderUseCase';

/** Private durable render command; never accepts completion facts or issues certificates. */
export class CertificateArtifactOutboxDeliveryGateway implements IOutboxDeliveryGateway {
  constructor(private readonly renderer: CertificateArtifactRenderUseCase) {}
  public async deliver(
    entry: TransactionalOutboxEntry,
    context: OutboxDeliveryContext,
  ): Promise<void> {
    if (context.idempotencyKey !== entry.id)
      throw new Error('CERTIFICATE_RENDER_IDEMPOTENCY_KEY_MISMATCH');
    if (
      entry.domain !== 'CERTIFICATES' ||
      entry.eventType !== 'CertificateRenderRequested' ||
      entry.metadata.sourcePhase !== 'Phase14' ||
      entry.metadata.schemaVersion !== '1.0'
    )
      throw new Error('CERTIFICATE_RENDER_COMMAND_INVALID');
    const id = entry.payload.certificateId;
    if (
      typeof id !== 'string' ||
      !id.trim() ||
      entry.aggregate?.domain !== 'CERTIFICATES' ||
      entry.aggregate?.aggregateType !== 'Certificate' ||
      entry.aggregate.aggregateId !== id
    )
      throw new Error('CERTIFICATE_RENDER_COMMAND_IDENTITY_INVALID');
    await this.renderer.renderCertificate(id, 'phase14-renderer', entry.id);
  }
}
