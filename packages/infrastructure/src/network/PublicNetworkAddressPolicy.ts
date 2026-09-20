import { isIP } from 'node:net';

export class PublicNetworkAddressPolicy {
  isPublic(address: string): boolean {
    const candidate = address.startsWith('[') && address.endsWith(']') ? address.slice(1, -1) : address;
    const family = isIP(candidate);
    if (family === 4) return this.isPublicIpv4(candidate);
    if (family !== 6) return false;
    const normalized = candidate.toLowerCase().split('%')[0];
    const mappedTail = normalized.match(/^(?:::ffff:|(?:0:){5}ffff:)(.+)$/)?.[1];
    const mapped = mappedTail?.includes('.') ? mappedTail : this.mappedHexToIpv4(mappedTail);
    if (mapped) return this.isPublicIpv4(mapped);
    return !(normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff') || normalized.startsWith('2001:db8:'));
  }
  private mappedHexToIpv4(value?: string): string | undefined {
    if (!value) return undefined; const parts = value.split(':'); if (parts.length !== 2 || parts.some((part) => !/^[a-f0-9]{1,4}$/.test(part))) return undefined;
    const high = parseInt(parts[0], 16); const low = parseInt(parts[1], 16); return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }
  private isPublicIpv4(address: string): boolean {
    const octets = address.split('.').map(Number);
    if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
    const [a, b] = octets;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)));
  }
}
