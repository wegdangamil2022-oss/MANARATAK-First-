import { createHash } from 'node:crypto';
import { ServiceCatalogItemDto } from '@manaratak/domain';

export function stableServicePayload(value: unknown): string {
  if (Array.isArray(value))
    return JSON.stringify(value.map((v) => JSON.parse(stableServicePayload(v))));
  if (value && typeof value === 'object')
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, JSON.parse(stableServicePayload(v))]),
      ),
    );
  return JSON.stringify(value ?? null);
}
export const serviceFingerprint = (value: unknown) =>
  createHash('sha256').update(stableServicePayload(value)).digest('hex');
export function serviceInput(service: ServiceCatalogItemDto, input: Record<string, unknown>) {
  if (Buffer.byteLength(JSON.stringify(input)) > 16384) throw new Error('SERVICE_INPUT_TOO_LARGE');
  const fields = service.inputSchema ?? [];
  if (fields.length > 40) throw new Error('SERVICE_INPUT_SCHEMA_INVALID');
  if (Object.keys(input).some((key) => !fields.some((f) => f.key === key)))
    throw new Error('SERVICE_INPUT_UNKNOWN_FIELD');
  for (const field of fields) {
    const value = input[field.key];
    if (value === undefined || value === '') {
      if (field.required) throw new Error('SERVICE_INPUT_REQUIRED');
      continue;
    }
    const valid =
      field.type === 'NUMBER'
        ? typeof value === 'number' && Number.isFinite(value)
        : field.type === 'BOOLEAN'
          ? typeof value === 'boolean'
          : typeof value === 'string' && value.length <= 2000;
    if (!valid) throw new Error('SERVICE_INPUT_TYPE_INVALID');
    if (typeof value === 'string' && /^(https?:|data:|blob:|file:)/i.test(value))
      throw new Error('SERVICE_INPUT_RAW_URL_FORBIDDEN');
  }
  return input;
}
export function assertServiceReadiness(service: ServiceCatalogItemDto) {
  if (!['FREE', 'CHARGEABLE', 'QUOTE_REQUIRED'].includes(service.fulfillmentPolicy ?? ''))
    throw new Error('SERVICE_FULFILLMENT_POLICY_REQUIRED');
  if (!Array.isArray(service.inputSchema)) throw new Error('SERVICE_INPUT_SCHEMA_REQUIRED');
  if (service.fulfillmentPolicy === 'CHARGEABLE' && !service.pricingReferenceId)
    throw new Error('SERVICE_PRICING_REQUIRED');
  if (service.fulfillmentType !== 'CONSULTATION' && !service.providerReferenceId)
    throw new Error('SERVICE_PROVIDER_REQUIRED');
  if (service.fulfillmentType === 'BOOKING' && !service.appointmentRequired)
    throw new Error('SERVICE_APPOINTMENT_POLICY_REQUIRED');
  if (
    ['DOCUMENT_PROCESSING', 'MANAGED_SERVICE'].includes(service.fulfillmentType) &&
    !service.deliveryArtifactTypes?.length
  )
    throw new Error('SERVICE_DELIVERY_POLICY_REQUIRED');
  if (!service.estimatedDeliveryTime || !service.slaPolicy) throw new Error('SERVICE_SLA_REQUIRED');
  if (
    !service.localizedContent?.ar?.displayName ||
    !service.localizedContent?.en?.displayName ||
    !service.localizedContent.ar.serviceDescription ||
    !service.localizedContent.en.serviceDescription
  )
    throw new Error('SERVICE_TRANSLATIONS_REQUIRED');
}
