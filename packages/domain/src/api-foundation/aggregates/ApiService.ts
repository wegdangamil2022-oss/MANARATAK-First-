import { ApiServiceId } from '../value-objects/ApiServiceId';
import { ApiServiceReference } from '../value-objects/ApiServiceReference';
import { ApiOwnerReference } from '../value-objects/ApiOwnerReference';
import { ApiServiceDefinition } from '../value-objects/ApiServiceDefinition';
import { ApiVersion } from '../value-objects/ApiVersion';
import { ApiLifecycleState } from '../enums/ApiLifecycleState';
import { ApiContractMetadata } from '../value-objects/ApiContractMetadata';
import { CompatibilityMetadata } from '../value-objects/CompatibilityMetadata';
import { ExposureIntent } from '../value-objects/ExposureIntent';
import { ApiMetadata } from '../value-objects/ApiMetadata';

export class ApiService {
  constructor(
    private readonly id: ApiServiceId,
    private readonly reference: ApiServiceReference,
    private readonly ownerReference: ApiOwnerReference,
    private readonly definition: ApiServiceDefinition,
    private readonly version: ApiVersion,
    private readonly contractMetadata: ApiContractMetadata,
    private readonly compatibilityMetadata: CompatibilityMetadata,
    private readonly exposureIntent: ExposureIntent,
    private readonly metadata: ApiMetadata,
    private lifecycleState: ApiLifecycleState
  ) {}

  public getId(): ApiServiceId { return this.id; }
  public getReference(): ApiServiceReference { return this.reference; }
  public getOwnerReference(): ApiOwnerReference { return this.ownerReference; }
  public getDefinition(): ApiServiceDefinition { return this.definition; }
  public getVersion(): ApiVersion { return this.version; }
  public getContractMetadata(): ApiContractMetadata { return this.contractMetadata; }
  public getCompatibilityMetadata(): CompatibilityMetadata { return this.compatibilityMetadata; }
  public getExposureIntent(): ExposureIntent { return this.exposureIntent; }
  public getMetadata(): ApiMetadata { return this.metadata; }
  public getLifecycleState(): ApiLifecycleState { return this.lifecycleState; }

  public activate(): void {
    if (this.lifecycleState !== ApiLifecycleState.CREATED) {
      throw new Error('ApiService can only be activated from CREATED state');
    }
    this.lifecycleState = ApiLifecycleState.ACTIVATED;
  }

  public deprecate(): void {
    if (this.lifecycleState !== ApiLifecycleState.ACTIVATED) {
      throw new Error('ApiService can only be deprecated from ACTIVATED state');
    }
    this.lifecycleState = ApiLifecycleState.DEPRECATED;
  }

  public archive(): void {
    if (this.lifecycleState === ApiLifecycleState.ACTIVATED) {
      throw new Error('ApiService cannot be archived directly from ACTIVATED state without being DEPRECATED first');
    }
    this.lifecycleState = ApiLifecycleState.ARCHIVED;
  }

  public static create(
    id: ApiServiceId,
    reference: ApiServiceReference,
    ownerReference: ApiOwnerReference,
    definition: ApiServiceDefinition,
    version: ApiVersion,
    contractMetadata: ApiContractMetadata,
    compatibilityMetadata: CompatibilityMetadata,
    exposureIntent: ExposureIntent,
    metadata: ApiMetadata
  ): ApiService {
    return new ApiService(
      id,
      reference,
      ownerReference,
      definition,
      version,
      contractMetadata,
      compatibilityMetadata,
      exposureIntent,
      metadata,
      ApiLifecycleState.CREATED
    );
  }
}
