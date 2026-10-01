import { randomUUID } from 'node:crypto';
import {
  CourseProviderRegistryError, ExternalCourseProviderStatus, OutboxProcessingState,
  normalizeExternalCourseProviderName, type CourseProviderRegistryFilters,
  type ICourseProviderRegistryRepository, type UpdateCourseProviderMappings,
} from '@manaratak/domain';
import { AtomicAuditedOutboxMutationExecutor } from '../../event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';

export function validateProviderMappings(input: UpdateCourseProviderMappings): void {
  const invalid = () => { throw new CourseProviderRegistryError('PROVIDER_MAPPING_INVALID'); };
  if (!input.mappingsReviewed || !input.reason.trim() || input.reason.length > 1000 || !input.evidenceReference.trim() || input.evidenceReference.length > 300 ||
      !input.displayName.trim() || input.displayName.length > 300 || !Number.isFinite(Date.parse(input.expectedUpdatedAt)) || input.aliases.length > 100 || input.allowedDomains.length > 50) invalid();
  const aliases = input.aliases.map(item => normalizeExternalCourseProviderName(item.alias));
  if (aliases.some(alias => !alias) || new Set(aliases).size !== aliases.length || input.aliases.some(item => item.alias.length > 300 || (item.locale && (item.locale.length > 35 || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(item.locale))))) invalid();
  // Domains are exact public hostnames, never URLs, wildcards, ports or IP literals.
  if (input.allowedDomains.some(domain => domain.length > 253 || domain.split('.').some(label => label.length > 63) || domain !== domain.toLowerCase() || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/u.test(domain) || /\.(?:local|internal|localhost|invalid|test)$/u.test(domain)) || new Set(input.allowedDomains).size !== input.allowedDomains.length) invalid();
  if (input.officialWebsite) {
    let url: URL;
    try { url = new URL(input.officialWebsite); } catch { return invalid(); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !input.allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) invalid();
  }
}

export class CourseProviderRegistryUseCases {
  constructor(private readonly repository: ICourseProviderRegistryRepository, private readonly executor: AtomicAuditedOutboxMutationExecutor) {}

  async list(filters: CourseProviderRegistryFilters) {
    if (!Number.isSafeInteger(filters.page) || filters.page < 1 || !Number.isSafeInteger(filters.pageSize) || filters.pageSize < 1 || filters.pageSize > 100) throw new CourseProviderRegistryError('PROVIDER_MAPPING_INVALID');
    const result = await this.repository.listRegistry(filters);
    return { ...result, page: filters.page, pageSize: filters.pageSize, totalPages: Math.ceil(result.total / filters.pageSize) };
  }

  async get(id: string) {
    const provider = await this.repository.findById(id);
    if (!provider) throw new CourseProviderRegistryError('PROVIDER_NOT_FOUND');
    return provider;
  }

  async resolveLabel(label: string) {
    const rawLabel = label;
    const provider = await this.repository.resolveByName(label);
    if (!provider || provider.status !== ExternalCourseProviderStatus.APPROVED) return { rawLabel, state: 'REVIEW_REQUIRED' as const, providerId: null };
    return { rawLabel, state: 'VERIFIED_MAPPING' as const, providerId: provider.id, publicId: provider.publicId };
  }

  async update(id: string, input: UpdateCourseProviderMappings, actorId: string, correlationId?: string) {
    if (!actorId || !this.executor || !this.repository.updateMappingsInTransaction) throw new CourseProviderRegistryError('PROVIDER_AUDITED_TRANSACTION_REQUIRED');
    validateProviderMappings(input);
    const previous = await this.get(id);
    const auditId = randomUUID(); const now = new Date(); const action = 'COURSE_PROVIDER_MAPPINGS_REVIEWED';
    return this.executor.execute({
      id: auditId, reference: 'AUD-' + auditId, action, category: 'COURSES', severity: 'INFO',
      actorId, actorType: 'IDENTITY', targetId: id, targetType: 'EXTERNAL_COURSE_PROVIDER', source: 'admin-course-provider-registry', timestamp: now,
      contextMetadata: { reason: input.reason.trim(), evidenceReference: input.evidenceReference.trim(), before: { displayName: previous.displayName, officialWebsite: previous.officialWebsite, aliases: previous.aliases, allowedDomains: previous.allowedDomains }, after: input }, correlationReference: correlationId,
    }, {
      id: randomUUID(), eventType: action, domain: 'COURSES', aggregate: { domain: 'COURSES', aggregateType: 'EXTERNAL_COURSE_PROVIDER', aggregateId: id },
      payload: { providerId: id, publicId: previous.publicId, reason: input.reason.trim(), evidenceReference: input.evidenceReference.trim() },
      metadata: { actorId, atomicity: 'BUSINESS_AUDIT_OUTBOX' }, correlationId, createdAt: now, availableAt: now, state: OutboxProcessingState.PENDING, attempts: 0,
    }, context => this.repository.updateMappingsInTransaction(id, input, context));
  }
}
