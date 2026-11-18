import { isIP } from 'node:net';

export class PublicNetworkAddressPolicy {
  isPublic(address: string): boolean {
    const candidate = address.startsWith('[') && address.endsWith(']') ? address.slice(1, -1) : address;
    const family = isIP(candidate);
    if (family === 4) return this.isPublicIpv4(candidate);
    if (family !== 6) return false;
    // Canonicalize before comparing ranges: the same IPv6 address can have many
    // spellings (for example 0:0:0:0:0:0:0:1 and ::1).
    let normalized: string;
    try {
      normalized = new URL(`http://[${candidate}]/`).hostname.slice(1, -1);
    } catch {
      return false;
    }
    const mappedTail = normalized.match(/^::ffff:(.+)$/)?.[1];
    const mapped = mappedTail?.includes('.') ? mappedTail : this.mappedHexToIpv4(mappedTail);
    if (mapped) return this.isPublicIpv4(mapped);
    const [first, second] = normalized.split(':').map((part) => parseInt(part || '0', 16));
    // Allow global unicast only. Reject translation/tunnelling ranges as their
    // embedded IPv4 destination may be private on the deploying network.
    if (first < 0x2000 || first > 0x3fff || first === 0x2002) return false;
    if (first === 0x2001 && (second <= 0x01ff || second === 0x0db8)) return false;
    if (first === 0x3fff && second < 0x1000) return false; // documentation prefix
    return true;
  }
  private mappedHexToIpv4(value?: string): string | undefined {
    if (!value) return undefined; const parts = value.split(':'); if (parts.length !== 2 || parts.some((part) => !/^[a-f0-9]{1,4}$/.test(part))) return undefined;
    const high = parseInt(parts[0], 16); const low = parseInt(parts[1], 16); return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }
  private isPublicIpv4(address: string): boolean {
    const octets = address.split('.').map(Number);
    if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
    const [a, b, c] = octets;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0) || (a === 192 && b === 168) || (a === 192 && b === 88 && c === 99) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
}
