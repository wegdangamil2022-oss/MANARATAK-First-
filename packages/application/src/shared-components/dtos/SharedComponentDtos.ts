export interface PropertyDto {
  name: string;
  type: string;
  required: boolean;
}

export interface SlotDto {
  name: string;
  description: string;
}

export interface ComponentVersionDto {
  major: number;
  minor: number;
  patch: number;
}

export interface RenderingIntentDto {
  visualCategory: string;
  interactionModel: string;
}

export interface CreateSharedComponentDto {
  reference: string;
  ownerReference: string;
  properties: PropertyDto[];
  slots: SlotDto[];
  version: ComponentVersionDto;
  renderingIntent: RenderingIntentDto;
  metadata?: Record<string, string>;
}

export interface PublishComponentVersionDto {
  reference: string;
  properties: PropertyDto[];
  slots: SlotDto[];
  version: ComponentVersionDto;
}

export interface SharedComponentResponseDto {
  reference: string;
  ownerReference: string;
  version: string;
  state: string;
  renderingIntent: RenderingIntentDto;
  properties: PropertyDto[];
  slots: SlotDto[];
  metadata: Record<string, string>;
  isBackwardCompatible: boolean;
}
