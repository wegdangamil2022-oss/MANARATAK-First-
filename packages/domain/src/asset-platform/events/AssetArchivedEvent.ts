import { AssetId } from '../value-objects/AssetId';

export class AssetArchivedEvent {
  public readonly occurredAt = new Date();
  constructor(public readonly assetId: AssetId) {}
}
