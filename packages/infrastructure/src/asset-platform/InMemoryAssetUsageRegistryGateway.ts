import {
  IAssetUsageRegistryGateway,
  AssetId
} from '@manaratak/domain';

export class InMemoryAssetUsageRegistryGateway implements IAssetUsageRegistryGateway {
  private readonly usages = new Map<string, Set<string>>();

  async isAssetInUse(id: AssetId): Promise<boolean> {
    const consumers = this.usages.get(id.value);
    return consumers !== undefined && consumers.size > 0;
  }

  async registerUsage(id: AssetId, consumerUrn: string): Promise<void> {
    let consumers = this.usages.get(id.value);
    if (!consumers) {
      consumers = new Set<string>();
      this.usages.set(id.value, consumers);
    }
    consumers.add(consumerUrn);
  }

  async unregisterUsage(id: AssetId, consumerUrn: string): Promise<void> {
    const consumers = this.usages.get(id.value);
    if (consumers) {
      consumers.delete(consumerUrn);
      if (consumers.size === 0) {
        this.usages.delete(id.value);
      }
    }
  }
}
