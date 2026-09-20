import { AssetId } from '../value-objects/AssetId';

export class AssetDeletedEvent {
  public readonly occurredAt = new Date();
  constructor(public readonly assetId: AssetId) {}
}
