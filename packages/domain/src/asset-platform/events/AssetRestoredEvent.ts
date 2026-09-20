import { AssetId } from '../value-objects/AssetId';

export class AssetRestoredEvent {
  public readonly occurredAt = new Date();
  constructor(public readonly assetId: AssetId) {}
}
