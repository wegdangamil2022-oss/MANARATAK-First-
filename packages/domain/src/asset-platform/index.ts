// Aggregates
export * from './aggregates/AssetRecord';

// Value Objects
export * from './value-objects/AssetId';
export * from './value-objects/AssetReference';
export * from './value-objects/AssetOwnerReference';
export * from './value-objects/AssetStorageLocator';
export * from './value-objects/AssetChecksum';
export * from './value-objects/AssetMetadata';
export * from './value-objects/AssetVersion';
export * from './value-objects/AssetVersionChain';
export * from './value-objects/AssetRetentionMetadata';
export * from './value-objects/AssetSanitizationMetadata';

// Enums
export * from './enums/AssetLifecycleState';
export * from './enums/AssetSecurityClassification';
export * from './enums/AssetRetentionCategory';
export * from './enums/AssetStorageZone';

// Repositories
export * from './repositories/IAssetRecordRepository';

// Gateways
export * from './gateways/IAssetStorageGateway';
export * from './gateways/IAssetMalwareScannerGateway';
export * from './gateways/IAssetSanitizationGateway';
export * from './gateways/IAssetUsageRegistryGateway';

// Events
export * from './events/AssetQuarantinedEvent';
export * from './events/AssetMalwareScanSucceededEvent';
export * from './events/AssetMalwareScanFailedEvent';
export * from './events/AssetSanitizedEvent';
export * from './events/AssetActivatedEvent';
export * from './events/AssetArchivedEvent';
export * from './events/AssetDeletedEvent';
export * from './events/AssetRestoredEvent';
