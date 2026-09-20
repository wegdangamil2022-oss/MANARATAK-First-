import { PrismaClient } from '@prisma/client';
import {
  ApiContractMetadata,
  ApiLifecycleState,
  ApiMetadata,
  ApiOwnerReference,
  ApiService,
  ApiServiceDefinition,
  ApiServiceId,
  ApiServiceReference,
  ApiVersion,
  CompatibilityMetadata,
  EndpointDefinition,
  ExposureIntent,
  IApiServiceRepository,
  OperationDefinition,
} from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

type ApiSnapshot = {
  id: string;
  reference: string;
  ownerReference: string;
  endpoints: Array<{ name: string; purpose: string }>;
  operations: Array<{ endpointName: string; name: string; inputType: string; outputType: string; isIdempotent: boolean }>;
  version: { major: number; minor: number; patch: number };
  contract: { formatType: string; isStreaming: boolean; requestSchemaType: string };
  compatibility: { backwardCompatible: boolean; forwardCompatible: boolean; supportStatus: string };
  exposure: { exposePublicly: boolean; environmentTarget: string; networkCategory: string };
  metadata: Record<string, string>;
  lifecycleState: ApiLifecycleState;
};

export class PrismaApiServiceRepository implements IApiServiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(apiService: ApiService): Promise<void> {
    const snapshot = this.toSnapshot(apiService);
    await (this.prisma as any).apiServiceControlRecord.upsert({
      where: { id: snapshot.id },
      update: {
        reference: snapshot.reference, ownerReference: snapshot.ownerReference,
        lifecycleState: snapshot.lifecycleState, version: `${snapshot.version.major}.${snapshot.version.minor}.${snapshot.version.patch}`, snapshot,
      },
      create: {
        id: snapshot.id, reference: snapshot.reference, ownerReference: snapshot.ownerReference,
        lifecycleState: snapshot.lifecycleState, version: `${snapshot.version.major}.${snapshot.version.minor}.${snapshot.version.patch}`, snapshot,
      },
    });
  }

  async findBy(specification: ISpecification<ApiService>): Promise<ApiService[]> {
    const rows = await (this.prisma as any).apiServiceControlRecord.findMany({ orderBy: { updatedAt: 'asc' } });
    return rows.map((row: any) => this.fromSnapshot(row.snapshot as ApiSnapshot)).filter((item: ApiService) => specification.isSatisfiedBy(item));
  }

  private toSnapshot(service: ApiService): ApiSnapshot {
    const operations: ApiSnapshot['operations'] = [];
    for (const endpoint of service.getDefinition().getEndpoints()) {
      for (const operation of service.getDefinition().getOperationsForEndpoint(endpoint.getName())) {
        operations.push({ endpointName: endpoint.getName(), name: operation.getName(), inputType: operation.getInputType(), outputType: operation.getOutputType(), isIdempotent: operation.getIsIdempotent() });
      }
    }
    return {
      id: service.getId().getValue(), reference: service.getReference().getValue(), ownerReference: service.getOwnerReference().getValue(),
      endpoints: service.getDefinition().getEndpoints().map((endpoint) => ({ name: endpoint.getName(), purpose: endpoint.getPurpose() })), operations,
      version: { major: service.getVersion().getMajor(), minor: service.getVersion().getMinor(), patch: service.getVersion().getPatch() },
      contract: { formatType: service.getContractMetadata().getFormatType(), isStreaming: service.getContractMetadata().getIsStreaming(), requestSchemaType: service.getContractMetadata().getRequestSchemaType() },
      compatibility: { backwardCompatible: service.getCompatibilityMetadata().getBackwardCompatible(), forwardCompatible: service.getCompatibilityMetadata().getForwardCompatible(), supportStatus: service.getCompatibilityMetadata().getSupportStatus() },
      exposure: { exposePublicly: service.getExposureIntent().getExposePublicly(), environmentTarget: service.getExposureIntent().getEnvironmentTarget(), networkCategory: service.getExposureIntent().getNetworkCategory() },
      metadata: Object.fromEntries(service.getMetadata().getProperties()), lifecycleState: service.getLifecycleState(),
    };
  }

  private fromSnapshot(snapshot: ApiSnapshot): ApiService {
    const endpoints = snapshot.endpoints.map((endpoint) => new EndpointDefinition(endpoint.name, endpoint.purpose));
    const operations = new Map<string, OperationDefinition[]>();
    for (const operation of snapshot.operations) {
      const list = operations.get(operation.endpointName) ?? [];
      list.push(new OperationDefinition(operation.name, operation.inputType, operation.outputType, operation.isIdempotent));
      operations.set(operation.endpointName, list);
    }
    return new ApiService(
      new ApiServiceId(snapshot.id), new ApiServiceReference(snapshot.reference), new ApiOwnerReference(snapshot.ownerReference),
      new ApiServiceDefinition(endpoints, operations), new ApiVersion(snapshot.version.major, snapshot.version.minor, snapshot.version.patch),
      new ApiContractMetadata(snapshot.contract.formatType, snapshot.contract.isStreaming, snapshot.contract.requestSchemaType),
      new CompatibilityMetadata(snapshot.compatibility.backwardCompatible, snapshot.compatibility.forwardCompatible, snapshot.compatibility.supportStatus),
      new ExposureIntent(snapshot.exposure.exposePublicly, snapshot.exposure.environmentTarget, snapshot.exposure.networkCategory),
      new ApiMetadata(new Map(Object.entries(snapshot.metadata))), snapshot.lifecycleState,
    );
  }
}
