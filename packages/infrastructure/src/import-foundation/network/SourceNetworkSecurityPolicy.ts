import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import type { ImportSourceDefinition } from '@manaratak/domain';
import { PublicNetworkAddressPolicy } from '../../network/PublicNetworkAddressPolicy';

export interface SourceAddressResolver {
  resolve(hostname: string): Promise<string[]>;
}

export class NodeSourceAddressResolver implements SourceAddressResolver {
  async resolve(hostname: string): Promise<string[]> {
    return (await dns.lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
  }
}

export interface ValidatedSourceTarget {
  url: URL;
  addresses: string[];
}

export class SourceNetworkSecurityPolicy {
  constructor(
    private readonly resolver: SourceAddressResolver = new NodeSourceAddressResolver(),
    private readonly addresses = new PublicNetworkAddressPolicy(),
  ) {}

  async validate(source: ImportSourceDefinition, value: string): Promise<ValidatedSourceTarget> {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error('SOURCE_URL_INVALID');
    }

    if (url.protocol !== 'https:') throw new Error('SOURCE_URL_SCHEME_BLOCKED');
    if (url.username || url.password) throw new Error('SOURCE_URL_CREDENTIALS_BLOCKED');

    this.validateScope(source, url);

    const hostname = url.hostname.startsWith('[') && url.hostname.endsWith(']')
      ? url.hostname.slice(1, -1)
      : url.hostname;
    const addresses = isIP(hostname) ? [hostname] : await this.resolver.resolve(hostname);
    if (!addresses.length || addresses.some((address) => !this.addresses.isPublic(address))) {
      throw new Error('SOURCE_ADDRESS_BLOCKED');
    }

    return { url, addresses };
  }

  private validateScope(source: ImportSourceDefinition, url: URL): void {
    const raw = source.metadata?.allowedUrlScope as
      | {
          allowedOrigins?: string[];
          allowedPathPrefixes?: string[];
          allowSubdomains?: boolean;
        }
      | undefined;

    const base = new URL(source.baseUrl);
    const origins = raw?.allowedOrigins?.length ? raw.allowedOrigins : [base.origin];
    const originAllowed = origins.some((origin) => {
      const candidate = new URL(origin);
      const exact = url.origin === candidate.origin;
      const subdomain =
        raw?.allowSubdomains === true &&
        url.protocol === candidate.protocol &&
        url.port === candidate.port &&
        url.hostname.endsWith(`.${candidate.hostname}`);
      return exact || subdomain;
    });
    if (!originAllowed) throw new Error('SOURCE_URL_OUT_OF_SCOPE');

    const prefixes = raw?.allowedPathPrefixes?.length ? raw.allowedPathPrefixes : ['/'];
    const pathAllowed = prefixes.some((prefix) => this.matchesPathPrefix(url.pathname, prefix));
    if (!pathAllowed) throw new Error('SOURCE_PATH_OUT_OF_SCOPE');
  }

  /**
   * Match an allow-listed path as a complete path segment, not a raw string prefix.
   * Example: `/catalog` allows `/catalog` and `/catalog/item`, but not `/catalog-evil`.
   */
  private matchesPathPrefix(pathname: string, configuredPrefix: string): boolean {
    let prefix = configuredPrefix.trim();
    if (!prefix.startsWith('/')) prefix = `/${prefix}`;
    while (prefix.length > 1 && prefix.endsWith('/')) prefix = prefix.slice(0, -1);

    if (prefix === '/') return true;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }
}
