import { FinancePlatformUseCases } from '@manaratak/application';
import {
  IReferenceResolver,
  IServiceFinanceGateway,
  IServiceReferenceGateway,
} from '@manaratak/domain';

const resolveLookup = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('REFERENCE_VALUE_REQUIRED');
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(trimmed) || trimmed.startsWith('mem-')) return { id: trimmed };
  if (/^[A-Za-z]{2,3}$/.test(trimmed)) return { standardCode: trimmed.toUpperCase() };
  return { alias: trimmed };
};

export class CanonicalServiceReferenceGateway implements IServiceReferenceGateway {
  constructor(private readonly resolver: IReferenceResolver) {}
  async resolveCountryReference(input: string) {
    const resolved = await this.resolver.resolveCountry(resolveLookup(input));
    if (!resolved?.active) throw new Error(`SERVICE_COUNTRY_REFERENCE_NOT_ACTIVE:${input}`);
    return { id: resolved.id, label: resolved.standardCode };
  }
  async resolveLanguageReference(input: string) {
    const lookup = resolveLookup(input);
    const resolved = await this.resolver.resolveLanguage(lookup);
    if (!resolved?.active) throw new Error(`SERVICE_LANGUAGE_REFERENCE_NOT_ACTIVE:${input}`);
    return { id: resolved.id, label: resolved.standardCode };
  }
}

export class Phase19ServiceFinanceGateway implements IServiceFinanceGateway {
  constructor(private readonly finance: FinancePlatformUseCases) {}
  async createDraftInvoice(input: Parameters<IServiceFinanceGateway['createDraftInvoice']>[0]) {
    const invoice = await this.finance.createDraftInvoice(
      {
        originDomain: 'PHASE_20_SERVICE_REQUEST',
        originReferenceId: input.requestPublicId,
        studentReferenceId: input.studentReferenceId,
        payerReferenceId: input.studentReferenceId,
        lineItems: [{
          description: input.description,
          quantity: input.quantity,
          unitPrice: {
            amountMinorUnits: input.amountMinorUnits,
            currencyCode: input.currencyCode,
            scale: input.scale,
          },
          metadata: { serviceRequestId: input.requestId },
        }],
      },
      {
        actorId: input.actorId,
        idempotencyKey: `phase20-service-invoice:${input.requestPublicId}`,
        correlationId: input.requestPublicId,
        reason: 'Phase 20 service request invoice handoff',
      },
    );
    return { id: invoice.id, publicId: invoice.publicId };
  }

  async getInvoiceClearance(invoiceId: string) {
    return this.finance.getInvoiceClearance(invoiceId);
  }
}
