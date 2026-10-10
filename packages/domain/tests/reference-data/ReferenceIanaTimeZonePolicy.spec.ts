import { describe, expect, it } from 'vitest';
import { isRuntimeSupportedIanaTimeZone, runtimeIanaTimeZoneCandidates } from '../../src';

describe('P7 IANA identifier validation (ICU snapshot, not authoritative IANA registry)', () => {
  it('accepts canonical fixed UTC and named cities, rejects invented bare names and paths', () => {
    expect(isRuntimeSupportedIanaTimeZone('UTC')).toBe(true);
    expect(isRuntimeSupportedIanaTimeZone('Asia/Riyadh')).toBe(true);
    expect(isRuntimeSupportedIanaTimeZone('Europe/London')).toBe(true);
    expect(isRuntimeSupportedIanaTimeZone('Riyadh')).toBe(false);
    expect(isRuntimeSupportedIanaTimeZone('../Etc/UTC')).toBe(false);
    expect(isRuntimeSupportedIanaTimeZone('Mars/VallesMarineris')).toBe(false);
    expect(isRuntimeSupportedIanaTimeZone(123)).toBe(false);
  });
  it('keeps autocomplete bounded to actual runtime timezone values', () => {
    const choices = runtimeIanaTimeZoneCandidates();
    expect(choices).toContain('UTC');
    expect(choices).toEqual([...choices].sort());
  });
});
