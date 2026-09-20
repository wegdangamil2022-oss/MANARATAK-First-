import { AssetId } from '../value-objects/AssetId';

export class AssetSanitizedEvent {
  public readonly occurredAt = new Date();
  constructor(public readonly assetId: AssetId) {}
}
