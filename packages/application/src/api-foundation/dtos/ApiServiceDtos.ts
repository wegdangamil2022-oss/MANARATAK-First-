export interface EndpointDto {
  name: string;
  purpose: string;
}

export interface OperationDto {
  endpointName: string;
  name: string;
  inputType: string;
  outputType: string;
  isIdempotent?: boolean;
}

export interface VersionDto {
  major: number;
  minor: number;
  patch: number;
}

export interface ContractMetadataDto {
  formatType: string;
  isStreaming?: boolean;
  requestSchemaType?: string;
}

export interface CompatibilityMetadataDto {
  backwardCompatible: boolean;
  forwardCompatible: boolean;
  supportStatus: string;
}

export interface ExposureIntentDto {
  exposePublicly: boolean;
  environmentTarget: string;
  networkCategory: string;
}

export interface MetadataDto {
  key: string;
  value: string;
}

export interface CreateApiServiceDto {
  reference: string;
  ownerReference: string;
  endpoints: EndpointDto[];
  operations: OperationDto[];
  version: VersionDto;
  contractMetadata: ContractMetadataDto;
  compatibilityMetadata: CompatibilityMetadataDto;
  exposureIntent: ExposureIntentDto;
  metadata: MetadataDto[];
}

export interface PublishVersionDto {
  reference: string;
  endpoints: EndpointDto[];
  operations: OperationDto[];
  version: VersionDto;
  contractMetadata: ContractMetadataDto;
  compatibilityMetadata: CompatibilityMetadataDto;
  exposureIntent: ExposureIntentDto;
  metadata: MetadataDto[];
}

export interface ApiServiceResponseDto {
  id: string;
  reference: string;
  ownerReference: string;
  endpoints: EndpointDto[];
  operations: OperationDto[];
  version: string;
  contractMetadata: ContractMetadataDto;
  compatibilityMetadata: CompatibilityMetadataDto;
  exposureIntent: ExposureIntentDto;
  metadata: MetadataDto[];
  lifecycleState: string;
}
