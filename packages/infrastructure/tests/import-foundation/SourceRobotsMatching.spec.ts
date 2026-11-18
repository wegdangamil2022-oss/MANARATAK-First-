import { describe, expect, it } from 'vitest';
import { assertRobotsAllowed } from '../../src/import-foundation/network/SignedSourceAccessAuthority';

const check = (rules: string, path: string) =>
  assertRobotsAllowed(`User-agent: *\n${rules}`, new URL(`https://example.org${path}`));

describe('robots rule matching', () => {
  it('matches literal prefixes, wildcards, queries and end anchors', () => {
    expect(() => check('Disallow: /catalog', '/catalog/item')).toThrow('SOURCE_ROBOTS_PATH_DENIED');
    expect(() => check('Disallow: /a*b*c$', '/axbyc')).toThrow('SOURCE_ROBOTS_PATH_DENIED');
    expect(() => check('Disallow: /a*b*c$', '/axbyc/more')).not.toThrow();
    expect(() => check('Disallow: /a*b*', '/axbyc')).toThrow('SOURCE_ROBOTS_PATH_DENIED');
    expect(() => check('Disallow: /*secret$', '/a/secret')).toThrow('SOURCE_ROBOTS_PATH_DENIED');
    expect(() => check('Disallow: /x?mode=private$', '/x?mode=private')).toThrow('SOURCE_ROBOTS_PATH_DENIED');
    expect(() => check('Disallow: /a+b', '/a+b')).toThrow('SOURCE_ROBOTS_PATH_DENIED');
    expect(() => check('Disallow: /a+b', '/aaab')).not.toThrow();
  });

  it('preserves longest-match precedence and allows a tie', () => {
    const rules = 'Disallow: /data/*\nAllow: /data/public*\nDisallow: /data/public/private';
    expect(() => check(rules, '/data/other')).toThrow('SOURCE_ROBOTS_PATH_DENIED');
    expect(() => check(rules, '/data/public/item')).not.toThrow();
    expect(() => check(rules, '/data/public/private')).toThrow('SOURCE_ROBOTS_PATH_DENIED');
    expect(() => check('Disallow: /same*\nAllow: /same*', '/same')).not.toThrow();
  });

  it('handles repeated wildcards from an untrusted policy without regex backtracking', () => {
    const path = `/${'a'.repeat(32)}x`;
    expect(() => check(`Disallow: /${'a*'.repeat(15)}z`, path)).not.toThrow();
    expect(() => check(`Disallow: /${'a*'.repeat(15)}x$`, path)).toThrow('SOURCE_ROBOTS_PATH_DENIED');
  });

  it('fails closed for excessive rule counts, individual rule length or target length', () => {
    expect(() => check(Array(1001).fill('Disallow: /x').join('\n'), '/')).toThrow('SOURCE_ROBOTS_POLICY_TOO_COMPLEX');
    expect(() => check(`Disallow: /${'a'.repeat(4096)}`, '/')).toThrow('SOURCE_ROBOTS_POLICY_TOO_COMPLEX');
    expect(() => check('Disallow: /x', `/${'a'.repeat(8192)}`)).toThrow('SOURCE_ROBOTS_PATH_TOO_LONG');
  });
});
