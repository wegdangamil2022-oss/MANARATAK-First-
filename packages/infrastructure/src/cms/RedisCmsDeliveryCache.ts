import { ICmsDeliveryCache, PublicCmsContentDto } from '@manaratak/domain';

interface RedisCmsClient {
  isReady: boolean;
  buildKey(feature: string, key: string): string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  incr(key: string): Promise<number>;
  publish(channel: string, message: string): Promise<unknown>;
}

export class RedisCmsDeliveryCache implements ICmsDeliveryCache {
  public constructor(private readonly client: RedisCmsClient, private readonly ttlSeconds = 300) {}

  public async getPublished(siteIdentifier: string, locale: string, slug: string): Promise<PublicCmsContentDto | null> {
    if (!this.client.isReady) return null;
    try {
      const value = await this.client.get(await this.contentKey(siteIdentifier, locale, slug));
      return value ? (JSON.parse(value) as PublicCmsContentDto) : null;
    } catch { return null; }
  }

  public async setPublished(content: PublicCmsContentDto): Promise<void> {
    if (!this.client.isReady) return;
    try { await this.client.set(await this.contentKey(content.siteIdentifier, content.locale, content.slug), JSON.stringify(content), { EX: this.ttlSeconds }); }
    catch { /* Public delivery falls back to the relational projection. */ }
  }

  public async invalidateSite(siteIdentifier: string, reason: string): Promise<void> {
    if (!this.client.isReady) return;
    try {
      await this.client.incr(this.versionKey(siteIdentifier));
      await this.client.publish(this.client.buildKey('cms-events', encodeURIComponent(siteIdentifier)), JSON.stringify({ type: 'CmsDeliveryInvalidated', siteIdentifier, reason, occurredAt: new Date().toISOString() }));
    } catch { /* Invalidation is fail-open; the short TTL remains a safety net. */ }
  }

  private async contentKey(siteIdentifier: string, locale: string, slug: string): Promise<string> {
    const version = (await this.client.get(this.versionKey(siteIdentifier))) ?? '0';
    return this.client.buildKey('cms-delivery', `${encodeURIComponent(siteIdentifier)}:${version}:${encodeURIComponent(locale)}:${encodeURIComponent(slug)}`);
  }

  private versionKey(siteIdentifier: string): string {
    return this.client.buildKey('cms-delivery-version', encodeURIComponent(siteIdentifier));
  }
}
