import { AssetId } from '../value-objects/AssetId';

export class AssetActivatedEvent {
  public readonly occurredAt = new Date();
  constructor(public readonly assetId: AssetId) {}
}
