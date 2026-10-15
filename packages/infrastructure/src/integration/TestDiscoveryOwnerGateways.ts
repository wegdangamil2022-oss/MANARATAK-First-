import {
  StudentToolPublicAccessPolicy,
  type IStudentToolRegistryRepository,
  type IServiceCatalogRepository,
  type IServiceOperationsRepository,
  type ITestDiscoveryOwnerGateway,
  type TestDiscoveryIdentity,
} from '@manaratak/domain';
export class StudentToolTestDiscoveryOwnerGateway implements ITestDiscoveryOwnerGateway {
  constructor(private readonly tools: IStudentToolRegistryRepository) {}
  async resolve(ownerKey: string, locale: 'ar' | 'en'): Promise<TestDiscoveryIdentity | null> {
    const tool = await this.tools.findByKey(ownerKey);
    if (
      !tool ||
      !StudentToolPublicAccessPolicy.isDiscoverable(tool) ||
      !Number.isInteger(tool.revision) ||
      tool.availability.allowedRegions.length ||
      !tool.supportedLocales.includes(locale) ||
      (tool.availability.allowedLocales.length &&
        !tool.availability.allowedLocales.includes(locale))
    )
      return null;
    const anonymous = tool.availability.anonymousEnabled && tool.featureFlags.anonymousEnabled;
    const authenticated =
      tool.availability.authenticatedEnabled && tool.featureFlags.authenticatedEnabled;
    if (!anonymous && !authenticated) return null;
    return {
      ownerKey: tool.toolKey,
      revision: String(tool.revision),
      publicId: tool.toolKey,
      slug: tool.toolKey,
      displayName: locale === 'en' ? tool.nameEn : tool.nameAr,
      href: `/tools/${encodeURIComponent(tool.toolKey)}`,
      requiresSignIn: !anonymous,
    };
  }
}
export class ServiceTestDiscoveryOwnerGateway implements ITestDiscoveryOwnerGateway {
  constructor(
    private readonly services: IServiceCatalogRepository,
    private readonly operations: IServiceOperationsRepository,
  ) {}
  async resolve(ownerKey: string, locale: 'ar' | 'en'): Promise<TestDiscoveryIdentity | null> {
    const root = await this.services.findById(ownerKey);
    if (
      !root ||
      root.status === 'ARCHIVED' ||
      (!root.publishedSnapshot && root.status !== 'PUBLISHED')
    )
      return null;
    const service = { ...root, ...root.publishedSnapshot };
    if (
      service.serviceAvailabilityStatus !== 'AVAILABLE' ||
      !Number.isInteger(service.version) ||
      !service.localizedContent?.[locale]?.displayName
    )
      return null;
    if (service.providerReferenceId) {
      const provider = await this.operations.findProviderById(service.providerReferenceId);
      if (
        !provider ||
        provider.status !== 'QUALIFIED' ||
        !provider.supportedServiceIds.includes(root.id)
      )
        return null;
    } else if (service.fulfillmentType !== 'CONSULTATION') return null;
    const price = service.approvedPrice;
    if (
      service.fulfillmentPolicy === 'CHARGEABLE' &&
      (!price ||
        !/^\d+$/.test(price.amountMinorUnits) ||
        !Number.isInteger(price.scale) ||
        !price.currencyCode ||
        (price.effectiveTo &&
          (!Number.isFinite(Date.parse(price.effectiveTo)) ||
            Date.parse(price.effectiveTo) <= Date.now())))
    )
      return null;
    if (!['FREE', 'CHARGEABLE', 'QUOTE_REQUIRED'].includes(service.fulfillmentPolicy ?? ''))
      return null;
    return {
      ownerKey: root.id,
      revision: String(service.version),
      publicId: service.publicId,
      slug: service.slug,
      displayName: service.localizedContent![locale].displayName,
      href: `/services/${encodeURIComponent(service.slug)}`,
      fulfillmentPolicy: service.fulfillmentPolicy,
      price:
        service.fulfillmentPolicy === 'CHARGEABLE' && price
          ? {
              amountMinorUnits: price.amountMinorUnits,
              currencyCode: price.currencyCode,
              scale: price.scale,
            }
          : null,
    };
  }
}
