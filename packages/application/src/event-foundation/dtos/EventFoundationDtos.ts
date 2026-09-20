export interface RegisterEnterpriseEventDto {
  reference: string;
  ownerReference: string;
  type: string;
  category: string;
  payloadMetadata: Record<string, any>;
  version: string;
  metadata?: Record<string, any>;
  correlationReference?: string;
  causationReference?: string;
}

export interface PublishEnterpriseEventDto {
  reference: string;
}

export interface EnterpriseEventDto {
  id: string;
  reference: string;
  ownerReference: string;
  type: string;
  category: string;
  payloadMetadata: Record<string, any>;
  version: string;
  metadata: Record<string, any>;
  correlationReference?: string;
  causationReference?: string;
  lifecycleState: string;
}
