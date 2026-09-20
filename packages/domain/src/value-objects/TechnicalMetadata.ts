import { ValueObject } from '@manaratak/core';

export interface TechnicalMetadataProps {
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  deletedBy?: string;
  deletedAt?: Date;
  version: number;
}

export class TechnicalMetadata extends ValueObject<TechnicalMetadataProps> {
  constructor(props: TechnicalMetadataProps) {
    super(props);
  }

  public static create(createdBy: string): TechnicalMetadata {
    return new TechnicalMetadata({
      createdBy,
      createdAt: new Date(),
      version: 1,
    });
  }
}
