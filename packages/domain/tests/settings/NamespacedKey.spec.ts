import { describe, it, expect } from 'vitest';
import { NamespacedKey } from '../../src/settings/value-objects/NamespacedKey';

describe('NamespacedKey', () => {
  it('creates a valid NamespacedKey', () => {
    const key = new NamespacedKey('feature.dark_mode');
    expect(key.getValue()).toBe('feature.dark_mode');
    expect(key.toString()).toBe('feature.dark_mode');
  });

  it('compares two NamespacedKeys for equality', () => {
    const key1 = new NamespacedKey('system.theme');
    const key2 = new NamespacedKey('system.theme');
    const key3 = new NamespacedKey('system.language');

    expect(key1.equals(key2)).toBe(true);
    expect(key1.equals(key3)).toBe(false);
  });

  it('throws error for empty or invalid key formats', () => {
    expect(() => new NamespacedKey('')).toThrow('NamespacedKey cannot be empty.');
    expect(() => new NamespacedKey('  ')).toThrow('NamespacedKey cannot be empty.');
    expect(() => new NamespacedKey('invalid key@symbol')).toThrow('Invalid NamespacedKey format');
  });
});
