import {
  IServiceCatalogRepository,
  PaginatedServiceCatalogResult,
  PublicServiceCatalogFilters,
  PublicServiceCatalogItemDto,
  ServiceCatalogItemDto,
  ServiceStatus,
} from '@manaratak/domain';

export class PublicServiceCatalogUseCases {
  constructor(private readonly repository: IServiceCatalogRepository) {}

  public async listServices(
    filters: PublicServiceCatalogFilters,
  ): Promise<PaginatedServiceCatalogResult<PublicServiceCatalogItemDto>> {
    const paginated = await this.repository.listPublished(filters);

    return {
      ...paginated,
      data: paginated.data.map((service: ServiceCatalogItemDto) =>
        this.mapToPublicDto(service, filters.locale),
      ),
    };
  }

  public async getService(
    slug: string,
    locale?: 'ar' | 'en',
  ): Promise<PublicServiceCatalogItemDto> {
    const service = await this.repository.findBySlug(slug);

    if (!service || (service.status !== ServiceStatus.PUBLISHED && !service.publishedSnapshot)) {
      throw new Error('Service not found');
    }

    return this.mapToPublicDto(service, locale);
  }

  private mapToPublicDto(
    service: ServiceCatalogItemDto,
    locale?: 'ar' | 'en',
  ): PublicServiceCatalogItemDto {
    if (service.publishedSnapshot) {
      if(service.publishedSnapshot.id!==service.id || service.publishedSnapshot.status!==ServiceStatus.PUBLISHED) throw new Error('Service not found');
      service = { ...service.publishedSnapshot } as unknown as ServiceCatalogItemDto;
    }
    const localizedContent=Object.fromEntries((['ar','en'] as const).flatMap(key=>{const pair=service.localizedContent?.[key];return pair?.displayName?.trim() && pair.serviceDescription?.trim() ? [[key,{displayName:pair.displayName,serviceDescription:pair.serviceDescription}]] : [];}));
    const localized = locale ? localizedContent[locale] : undefined;
    return {
      approvedPrice:
        service.approvedPrice &&
        (!service.approvedPrice.effectiveTo ||
          new Date(service.approvedPrice.effectiveTo).getTime() > Date.now())
          ? service.approvedPrice
          : null,
      cancellationPolicyCode: service.cancellationPolicyCode ?? 'FINANCE_REVIEW_REQUIRED',
      fulfillmentPolicy: service.fulfillmentPolicy ?? 'QUOTE_REQUIRED',
      inputSchema: service.inputSchema,
      localizedContent,
      publicId: service.publicId,
      slug: service.slug,
      displayName: localized?.displayName ?? service.displayName,
      serviceCategory: service.serviceCategory,
      fulfillmentType: service.fulfillmentType,
      serviceDescription: localized?.serviceDescription ?? service.serviceDescription,
      serviceAvailabilityStatus: service.serviceAvailabilityStatus,
      requiredInputsOrDocuments: service.requiredInputsOrDocuments,
      deliveryMode: service.deliveryMode,
      responsibleServiceOwnerType: service.responsibleServiceOwnerType,
      providerName: service.providerName,
      estimatedDeliveryTime: service.estimatedDeliveryTime,
      appointmentRequired: service.appointmentRequired,
      supportedCountryReferenceIds: service.supportedCountryReferenceIds,
      supportedLanguageReferenceIds: service.supportedLanguageReferenceIds,
      supportedCountries: service.supportedCountries,
      supportedLanguages: service.supportedLanguages,
      servicePrerequisites: service.servicePrerequisites,
      deliveryArtifactTypes: service.deliveryArtifactTypes,
      pricingReferenceId: service.pricingReferenceId,
      thumbnailAssetId: service.thumbnailAssetId,
      publicDisplayMetadata: Object.fromEntries(
        Object.entries(service.publicDisplayMetadata ?? {}).filter(([key]) =>
          ['includes', 'excludes', 'faqs', 'badge'].includes(key),
        ),
      ),
      version: service.version,
    };
  }
}
