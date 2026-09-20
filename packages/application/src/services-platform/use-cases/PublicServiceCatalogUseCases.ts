import {
  IServiceCatalogRepository,
  PaginatedServiceCatalogResult,
  PublicServiceCatalogFilters,
  PublicServiceCatalogItemDto,
  ServiceCatalogItemDto,
  ServiceStatus
} from '@manaratak/domain';

export class PublicServiceCatalogUseCases {
  constructor(private readonly repository: IServiceCatalogRepository) {}

  public async listServices(filters: PublicServiceCatalogFilters): Promise<PaginatedServiceCatalogResult<PublicServiceCatalogItemDto>> {
    const paginated = await this.repository.listPublished(filters);

    return {
      ...paginated,
      data: paginated.data.map((service: ServiceCatalogItemDto) => this.mapToPublicDto(service))
    };
  }

  public async getService(slug: string): Promise<PublicServiceCatalogItemDto> {
    const service = await this.repository.findBySlug(slug);

    if (!service || service.status !== ServiceStatus.PUBLISHED) {
      throw new Error('Service not found');
    }

    return this.mapToPublicDto(service);
  }

  private mapToPublicDto(service: ServiceCatalogItemDto): PublicServiceCatalogItemDto {
    return {
      publicId: service.publicId,
      slug: service.slug,
      displayName: service.displayName,
      serviceCategory: service.serviceCategory,
      fulfillmentType: service.fulfillmentType,
      serviceDescription: service.serviceDescription,
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
      publicDisplayMetadata: service.publicDisplayMetadata,
      version: service.version,
    };
  }
}
