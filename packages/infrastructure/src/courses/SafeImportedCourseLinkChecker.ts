import { lookup } from 'dns/promises';
import { request as httpsRequest } from 'https';
import { isIP } from 'net';
import { PublicNetworkAddressPolicy } from '../network/PublicNetworkAddressPolicy';
import {
  IImportedCourseLinkChecker,
  ImportedCourseLinkCheckResult,
} from '@manaratak/domain';

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 8_000;

function normalizeDomain(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return '';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.replace(/\.$/, '');
  } catch {
    return raw.split('/')[0].replace(/\.$/, '');
  }
}

function domainAllowed(hostname: string, allowedDomains: string[]): boolean {
  const host = normalizeDomain(hostname);
  return allowedDomains.some((value) => {
    const allowed = normalizeDomain(value);
    return Boolean(allowed) && (host === allowed || host.endsWith(`.${allowed}`));
  });
}

const publicNetworkAddressPolicy = new PublicNetworkAddressPolicy();

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

interface HeaderResult {
  status: number;
  location?: string;
}

export class SafeImportedCourseLinkChecker implements IImportedCourseLinkChecker {
  public async check(input: { url: string; allowedDomains: string[]; directCoursePathPatterns?: string[] }): Promise<ImportedCourseLinkCheckResult> {
    const checkedAt = new Date();
    let current = this.parseHttps(input.url);
    let redirected = false;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
      if (!domainAllowed(current.hostname, input.allowedDomains)) {
        return {
          state: 'BLOCKED_DOMAIN',
          checkedAt,
          redirectTarget: redirected ? current.toString() : null,
          detail: 'COURSE_LINK_DOMAIN_NOT_APPROVED',
        };
      }

      const resolved = await this.resolvePublicAddress(current.hostname);
      let response: HeaderResult;
      try {
        response = await this.request(current, resolved);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'COURSE_LINK_REQUEST_FAILED';
        return {
          state: 'NEEDS_REVIEW',
          checkedAt,
          redirectTarget: redirected ? current.toString() : null,
          detail: `COURSE_LINK_REQUEST_FAILED:${detail}`,
        };
      }
      const status = response.status;

      if (status >= 300 && status < 400) {
        const location = response.location;
        if (!location) {
          return {
            state: 'NEEDS_REVIEW',
            responseCode: status,
            checkedAt,
            redirectTarget: current.toString(),
            detail: 'COURSE_LINK_REDIRECT_LOCATION_MISSING',
          };
        }
        if (redirectCount === MAX_REDIRECTS) {
          return {
            state: 'NEEDS_REVIEW',
            responseCode: status,
            checkedAt,
            redirectTarget: new URL(location, current).toString(),
            detail: 'COURSE_LINK_REDIRECT_LIMIT_EXCEEDED',
          };
        }
        current = this.parseHttps(new URL(location, current).toString());
        redirected = true;
        continue;
      }

      if (status >= 200 && status < 300) {
        if (!this.isDirectCoursePage(current, input.directCoursePathPatterns ?? [])) {
          return {
            state: 'NOT_DIRECT_COURSE_PAGE',
            responseCode: status,
            redirectTarget: redirected ? current.toString() : null,
            checkedAt,
            detail: 'COURSE_LINK_NOT_DIRECT_COURSE_PAGE',
          };
        }
        return {
          state: redirected ? 'REDIRECTED_VALID' : 'VERIFIED_DIRECT',
          responseCode: status,
          redirectTarget: redirected ? current.toString() : null,
          checkedAt,
        };
      }

      if (status === 404 || status === 410) {
        return {
          state: 'BROKEN',
          responseCode: status,
          redirectTarget: redirected ? current.toString() : null,
          checkedAt,
          detail: 'COURSE_LINK_NOT_FOUND',
        };
      }

      return {
        state: 'NEEDS_REVIEW',
        responseCode: status,
        redirectTarget: redirected ? current.toString() : null,
        checkedAt,
        detail: `COURSE_LINK_HTTP_STATUS:${status}`,
      };
    }

    return { state: 'NEEDS_REVIEW', checkedAt, detail: 'COURSE_LINK_CHECK_INDETERMINATE' };
  }

  private isDirectCoursePage(url: URL, configuredPatterns: string[]): boolean {
    const path = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/u, '') || '/';
    const normalized = path.toLocaleLowerCase('en-US');
    const generic = new Set([
      '/', '/course', '/courses', '/catalog', '/search', '/learn', '/training', '/academy',
      '/all-courses', '/browse', '/programs', '/collections',
    ]);
    if (generic.has(normalized)) return false;

    const configured = configuredPatterns.filter((pattern) => pattern.trim().length > 0);
    if (configured.length > 0) {
      return configured.some((pattern) => {
        try {
          return new RegExp(pattern, 'iu').test(`${url.pathname}${url.search}`);
        } catch {
          return false;
        }
      });
    }

    // Conservative provider-neutral fallback: require a non-generic slug/identifier.
    // Provider-specific seeds can override this with explicit path patterns.
    const segments = normalized.split('/').filter(Boolean);
    if (segments.length >= 2) return segments.some((segment) => segment.length >= 3 && !generic.has(`/${segment}`));
    if (segments.length === 1) {
      const segment = segments[0];
      return segment.length >= 5 && !/^(?:course|courses|catalog|learn|training|academy|browse|search)$/u.test(segment);
    }
    return false;
  }

  private parseHttps(value: string): URL {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') throw new Error('COURSE_LINK_HTTPS_REQUIRED');
    if (parsed.username || parsed.password) throw new Error('COURSE_LINK_USERINFO_FORBIDDEN');
    if (parsed.port && parsed.port !== '443') throw new Error('COURSE_LINK_NON_STANDARD_PORT_FORBIDDEN');
    return parsed;
  }

  private async resolvePublicAddress(hostname: string): Promise<ResolvedAddress> {
    hostname = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
    const literalFamily = isIP(hostname);
    if (literalFamily) {
      if (!publicNetworkAddressPolicy.isPublic(hostname)) throw new Error('COURSE_LINK_PRIVATE_ADDRESS_BLOCKED');
      return { address: hostname, family: literalFamily as 4 | 6 };
    }

    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length) throw new Error('COURSE_LINK_DNS_EMPTY');
    if (addresses.some((entry) => !publicNetworkAddressPolicy.isPublic(entry.address))) {
      throw new Error('COURSE_LINK_PRIVATE_DNS_TARGET_BLOCKED');
    }

    const selected = addresses[0];
    return {
      address: selected.address,
      family: selected.family as 4 | 6,
    };
  }

  private async request(url: URL, resolved: ResolvedAddress): Promise<HeaderResult> {
    const head = await this.requestOnce(url, resolved, 'HEAD');
    if (head.status === 405 || head.status === 501) {
      return this.requestOnce(url, resolved, 'GET');
    }
    return head;
  }

  private requestOnce(url: URL, resolved: ResolvedAddress, method: 'HEAD' | 'GET'): Promise<HeaderResult> {
    return new Promise((resolve, reject) => {
      const req = httpsRequest({
        protocol: 'https:',
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method,
        servername: url.hostname,
        headers: method === 'GET'
          ? { Range: 'bytes=0-0', 'User-Agent': 'MANARATAK-LinkVerifier/1.0' }
          : { 'User-Agent': 'MANARATAK-LinkVerifier/1.0' },
        lookup: (_hostname: string, _options: unknown, callback: Function) => {
          callback(null, resolved.address, resolved.family);
        },
      }, (response) => {
        const locationHeader = response.headers.location;
        const location = Array.isArray(locationHeader) ? locationHeader[0] : locationHeader;
        const status = response.statusCode ?? 0;
        response.destroy();
        resolve({ status, location });
      });

      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy(new Error('COURSE_LINK_REQUEST_TIMEOUT'));
      });
      req.once('error', reject);
      req.end();
    });
  }
}
