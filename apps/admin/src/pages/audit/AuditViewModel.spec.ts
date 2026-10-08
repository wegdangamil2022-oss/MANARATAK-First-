import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { auditFilterParams, auditTargetLink, auditCsvCell } from './AuditViewModel';

describe('audit investigation view model', () => {
  it('converts UTC dates and includes the complete end minute', () => {
    const params = auditFilterParams({ from: '2026-10-01T12:30', until: '2026-10-01T12:31', actorId: ' user ' }, 'UTC');
    expect(params.get('from')).toBe('2026-10-01T12:30:00.000Z');
    expect(params.get('until')).toBe('2026-10-01T12:31:59.999Z');
    expect(params.get('actorId')).toBe('user');
  });

  it.each(['2026-02-30T12:00', 'invalid', '2026-10-01T25:00'])('rejects invalid or normalized dates: %s', from => {
    expect(() => auditFilterParams({ from }, 'UTC')).toThrow('AUDIT_DATE_INVALID');
  });

  it('rejects an inverted range', () => {
    expect(() => auditFilterParams({ from: '2026-10-02T00:00', until: '2026-10-01T00:00' }, 'UTC')).toThrow('AUDIT_DATE_RANGE_INVALID');
  });

  it('interprets local dates using the browser zone and rejects a daylight-saving gap', () => {
    // An isolated process avoids changing the timezone of other tests.
    const script = `const convert = ${auditFilterParams.toString()};
      const result = convert({from:'2026-01-01T12:00'},'LOCAL').get('from');
      let gap; try {convert({from:'2026-03-08T02:30'},'LOCAL')} catch(error) {gap=error.message}
      process.stdout.write(JSON.stringify({result,gap}));`;
    const result = JSON.parse(execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' }));
    expect(result).toEqual({ result: '2026-01-01T17:00:00.000Z', gap: 'AUDIT_DATE_INVALID' });
  });

  it('offers owner links only with the matching permission and escapes IDs', () => {
    expect(auditTargetLink('UNIVERSITY', 'uni/1', () => false)).toBeNull();
    expect(auditTargetLink('UNIVERSITY', 'uni/1', permission => permission === 'admin:universities:manage')).toBe('/universities/uni%2F1');
    expect(auditTargetLink('IDENTITY', 'user&admin', () => true)).toBe('/identities?search=user%26admin');
    expect(auditTargetLink('UNKNOWN', '1', () => true)).toBeNull();
  });

  it.each(['=SUM(A1)', ' +cmd', '-1+2', '@formula', '\tformula'])('protects CSV formula cells: %s', value => {
    expect(auditCsvCell(value)).toMatch(/^"'/);
  });
});
