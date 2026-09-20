import { AssetId } from '../value-objects/AssetId';

export class AssetQuarantinedEvent {
  public readonly occurredAt = new Date();
  constructor(public readonly assetId: AssetId) {}
}
