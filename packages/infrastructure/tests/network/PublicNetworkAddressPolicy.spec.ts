import { describe, expect, it } from 'vitest';
import { PublicNetworkAddressPolicy } from '../../src/network/PublicNetworkAddressPolicy';
describe('PublicNetworkAddressPolicy', () => {
  const policy = new PublicNetworkAddressPolicy();
  it.each(['0.1.2.3','10.0.0.1','100.64.0.1','127.0.0.1','169.254.1.1','172.16.0.1','192.0.0.1','192.168.1.1','198.18.0.1','224.0.0.1','::','::1','fc00::1','fe80::1','ff00::1','2001:db8::1','::ffff:127.0.0.1','::ffff:10.0.0.1','::ffff:192.168.1.1','::ffff:169.254.1.1','::ffff:172.16.0.1'])('blocks %s', (address) => expect(policy.isPublic(address)).toBe(false));
  it.each(['93.184.216.34','8.8.8.8','2606:4700:4700::1111','::ffff:8.8.8.8'])('allows public %s', (address) => expect(policy.isPublic(address)).toBe(true));
  it.each([
    '0:0:0:0:0:0:0:1', '0:0:0:0:0:0:0:0',
    '0:0:0:0:0:ffff:7f00:1', '0:0:0:0:0:ffff:0a00:1',
    '64:ff9b::7f00:1', '::127.0.0.1', '2002:7f00:1::1',
    '2001:0db8::1', '2001:0::7f00:1', '3fff::1',
    '192.0.2.1', '198.51.100.1', '203.0.113.1',
  ])('blocks alternate or special-purpose address %s', (address) => expect(policy.isPublic(address)).toBe(false));
  it('accepts an expanded spelling of a public mapped IPv4 address', () => {
    expect(policy.isPublic('0:0:0:0:0:ffff:808:808')).toBe(true);
  });
});
