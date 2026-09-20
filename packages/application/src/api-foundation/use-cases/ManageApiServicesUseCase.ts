import {
  IApiServiceRepository,
  ApiService,
  ApiServiceId,
  ApiServiceReference,
  ApiOwnerReference,
  ApiServiceDefinition,
  EndpointDefinition,
  OperationDefinition,
  ApiVersion,
  ApiContractMetadata,
  CompatibilityMetadata,
  ExposureIntent,
  ApiMetadata,
  ApiServiceSpecification,
  ApiCompatibilityService,
  ApiLifecycleService,
  ApiServiceCreatedEvent,
  ApiServiceActivatedEvent,
  ApiVersionPublishedEvent,
  ApiServiceDeprecatedEvent,
  ApiServiceArchivedEvent,
  ApiLifecycleState
} from '@manaratak/domain';
import {
  CreateApiServiceDto,
  PublishVersionDto,
  ApiServiceResponseDto,
  EndpointDto,
  OperationDto,
  MetadataDto,
  VersionDto,
  ContractMetadataDto,
  CompatibilityMetadataDto,
  ExposureIntentDto
} from '../dtos/ApiServiceDtos';
import { IApiExposureGateway } from '../gateways/IApiExposureGateway';
import { v4 as uuidv4 } from 'uuid';

export class ManageApiServicesUseCase {
  constructor(
    private readonly apiServiceRepository: IApiServiceRepository,
    private readonly apiExposureGateway?: IApiExposureGateway
  ) {}

  public async createApiService(dto: CreateApiServiceDto): Promise<ApiServiceResponseDto> {
    const existing = await this.apiServiceRepository.findBy(
      new ApiServiceSpecification({ reference: dto.reference })
    );
    if (existing.length > 0) {
      throw new Error(`ApiService with reference "${dto.reference}" already exists`);
    }

    const apiService = this.mapToAggregate(
      uuidv4(),
      dto.reference,
      dto.ownerReference,
      dto.endpoints,
      dto.operations,
      dto.version,
      dto.contractMetadata,
      dto.compatibilityMetadata,
      dto.exposureIntent,
      dto.metadata
    );

    await this.apiServiceRepository.save(apiService);

    // Instantiate domain event (as per domain rules)
    new ApiServiceCreatedEvent(apiService.getReference());

    return this.mapToResponse(apiService);
  }

  public async activateApiService(reference: string): Promise<ApiServiceResponseDto> {
    const apiServices = await this.apiServiceRepository.findBy(
      new ApiServiceSpecification({ reference })
    );
    if (apiServices.length === 0) {
      throw new Error(`ApiService not found for reference "${reference}"`);
    }
    const apiService = apiServices[0];

    ApiLifecycleService.transitionTo(apiService, ApiLifecycleState.ACTIVATED);
    await this.apiServiceRepository.save(apiService);

    if (this.apiExposureGateway) {
      await this.apiExposureGateway.expose(apiService);
    }

    new ApiServiceActivatedEvent(apiService.getReference());

    return this.mapToResponse(apiService);
  }

  public async deprecateApiService(reference: string): Promise<ApiServiceResponseDto> {
    const apiServices = await this.apiServiceRepository.findBy(
      new ApiServiceSpecification({ reference })
    );
    if (apiServices.length === 0) {
      throw new Error(`ApiService not found for reference "${reference}"`);
    }
    const apiService = apiServices[0];

    ApiLifecycleService.transitionTo(apiService, ApiLifecycleState.DEPRECATED);
    await this.apiServiceRepository.save(apiService);

    if (this.apiExposureGateway) {
      await this.apiExposureGateway.decommission(apiService);
    }

    new ApiServiceDeprecatedEvent(apiService.getReference());

    return this.mapToResponse(apiService);
  }

  public async archiveApiService(reference: string): Promise<ApiServiceResponseDto> {
    const apiServices = await this.apiServiceRepository.findBy(
      new ApiServiceSpecification({ reference })
    );
    if (apiServices.length === 0) {
      throw new Error(`ApiService not found for reference "${reference}"`);
    }
    const apiService = apiServices[0];

    ApiLifecycleService.transitionTo(apiService, ApiLifecycleState.ARCHIVED);
    await this.apiServiceRepository.save(apiService);

    if (this.apiExposureGateway) {
      await this.apiExposureGateway.decommission(apiService);
    }

    new ApiServiceArchivedEvent(apiService.getReference());

    return this.mapToResponse(apiService);
  }

  public async publishVersion(dto: PublishVersionDto): Promise<ApiServiceResponseDto> {
    // Find the current service definition to perform a compatibility check
    const existing = await this.apiServiceRepository.findBy(
      new ApiServiceSpecification({ reference: dto.reference })
    );
    if (existing.length === 0) {
      throw new Error(`Base ApiService with reference "${dto.reference}" not found`);
    }
    const currentService = existing[0];

    // Map new definitions
    const endpoints = dto.endpoints.map(e => new EndpointDefinition(e.name, e.purpose));
    const operationsByEndpoint = new Map<string, OperationDefinition[]>();
    for (const op of dto.operations) {
      if (!operationsByEndpoint.has(op.endpointName)) {
        operationsByEndpoint.set(op.endpointName, []);
      }
      operationsByEndpoint.get(op.endpointName)!.push(
        new OperationDefinition(op.name, op.inputType, op.outputType, !!op.isIdempotent)
      );
    }
    const newDefinition = new ApiServiceDefinition(endpoints, operationsByEndpoint);

    // Validate compatibility if backward compatibility is claimed
    if (dto.compatibilityMetadata.backwardCompatible) {
      const isCompatible = ApiCompatibilityService.isBackwardCompatible(
        currentService.getDefinition(),
        newDefinition
      );
      if (!isCompatible) {
        throw new Error('Proposed API Definition changes are not backward compatible with the current version');
      }
    }

    // Creating a brand new ApiService for the new version as per immutability rule (ADR-3)
    // Generate a unique reference or identifier for the new service
    const newRefString = `${dto.reference}-v${dto.version.major}.${dto.version.minor}.${dto.version.patch}`;
    const newService = this.mapToAggregate(
      uuidv4(),
      newRefString,
      currentService.getOwnerReference().getValue(),
      dto.endpoints,
      dto.operations,
      dto.version,
      dto.contractMetadata,
      dto.compatibilityMetadata,
      dto.exposureIntent,
      dto.metadata
    );

    await this.apiServiceRepository.save(newService);

    new ApiVersionPublishedEvent(newService.getReference(), newService.getVersion());
    new ApiServiceCreatedEvent(newService.getReference());

    return this.mapToResponse(newService);
  }

  public async getApiServiceByReference(reference: string): Promise<ApiServiceResponseDto> {
    const apiServices = await this.apiServiceRepository.findBy(
      new ApiServiceSpecification({ reference })
    );
    if (apiServices.length === 0) {
      throw new Error(`ApiService not found for reference "${reference}"`);
    }
    return this.mapToResponse(apiServices[0]);
  }

  public async listApiServices(criteria: { ownerReference?: string; lifecycleState?: string }): Promise<ApiServiceResponseDto[]> {
    const services = await this.apiServiceRepository.findBy(
      new ApiServiceSpecification(criteria)
    );
    return services.map(s => this.mapToResponse(s));
  }

  private mapToAggregate(
    id: string,
    ref: string,
    ownerRef: string,
    endpointsDto: EndpointDto[],
    operationsDto: OperationDto[],
    versionDto: VersionDto,
    contractDto: ContractMetadataDto,
    compatibilityDto: CompatibilityMetadataDto,
    exposureDto: ExposureIntentDto,
    metadataDto: MetadataDto[]
  ): ApiService {
    const endpoints = endpointsDto.map(e => new EndpointDefinition(e.name, e.purpose));
    
    const operationsByEndpoint = new Map<string, OperationDefinition[]>();
    for (const op of operationsDto) {
      if (!operationsByEndpoint.has(op.endpointName)) {
        operationsByEndpoint.set(op.endpointName, []);
      }
      operationsByEndpoint.get(op.endpointName)!.push(
        new OperationDefinition(op.name, op.inputType, op.outputType, !!op.isIdempotent)
      );
    }

    const definition = new ApiServiceDefinition(endpoints, operationsByEndpoint);
    const version = new ApiVersion(versionDto.major, versionDto.minor, versionDto.patch);
    const contract = new ApiContractMetadata(
      contractDto.formatType,
      !!contractDto.isStreaming,
      contractDto.requestSchemaType || 'implicit'
    );
    const compatibility = new CompatibilityMetadata(
      compatibilityDto.backwardCompatible,
      compatibilityDto.forwardCompatible,
      compatibilityDto.supportStatus
    );
    const exposure = new ExposureIntent(
      exposureDto.exposePublicly,
      exposureDto.environmentTarget,
      exposureDto.networkCategory
    );
    const metaMap = new Map<string, string>();
    for (const m of metadataDto) {
      metaMap.set(m.key, m.value);
    }
    const metadata = new ApiMetadata(metaMap);

    return ApiService.create(
      new ApiServiceId(id),
      new ApiServiceReference(ref),
      new ApiOwnerReference(ownerRef),
      definition,
      version,
      contract,
      compatibility,
      exposure,
      metadata
    );
  }

  private mapToResponse(apiService: ApiService): ApiServiceResponseDto {
    const endpointsDto: EndpointDto[] = apiService.getDefinition().getEndpoints().map(e => ({
      name: e.getName(),
      purpose: e.getPurpose()
    }));

    const operationsDto: OperationDto[] = [];
    const map = apiService.getDefinition().getOperationsByEndpointMap();
    for (const [endpointName, ops] of map.entries()) {
      for (const op of ops) {
        operationsDto.push({
          endpointName,
          name: op.getName(),
          inputType: op.getInputType(),
          outputType: op.getOutputType(),
          isIdempotent: op.getIsIdempotent()
        });
      }
    }

    const metadataDto: MetadataDto[] = [];
    for (const [key, value] of apiService.getMetadata().getProperties().entries()) {
      metadataDto.push({ key, value });
    }

    return {
      id: apiService.getId().getValue(),
      reference: apiService.getReference().getValue(),
      ownerReference: apiService.getOwnerReference().getValue(),
      endpoints: endpointsDto,
      operations: operationsDto,
      version: apiService.getVersion().toString(),
      contractMetadata: {
        formatType: apiService.getContractMetadata().getFormatType(),
        isStreaming: apiService.getContractMetadata().getIsStreaming(),
        requestSchemaType: apiService.getContractMetadata().getRequestSchemaType()
      },
      compatibilityMetadata: {
        backwardCompatible: apiService.getCompatibilityMetadata().getBackwardCompatible(),
        forwardCompatible: apiService.getCompatibilityMetadata().getForwardCompatible(),
        supportStatus: apiService.getCompatibilityMetadata().getSupportStatus()
      },
      exposureIntent: {
        exposePublicly: apiService.getExposureIntent().getExposePublicly(),
        environmentTarget: apiService.getExposureIntent().getEnvironmentTarget(),
        networkCategory: apiService.getExposureIntent().getNetworkCategory()
      },
      metadata: metadataDto,
      lifecycleState: apiService.getLifecycleState()
    };
  }
}
