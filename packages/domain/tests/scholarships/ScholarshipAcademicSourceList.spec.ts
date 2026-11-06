import { describe, expect, it } from 'vitest';
import { scholarshipAcademicSourceItems } from '../../src/scholarships/ScholarshipAcademicSourceList';
import { scholarshipSourceCalendarDate } from '../../src/scholarships/ScholarshipSourceCalendarDate';

describe('literal academic source list', () => {
  it('retains numbered items and continuations in order, excluding prose and headings', () => {
    expect(scholarshipAcademicSourceItems('Introductory context.\n\n**Bachelor**\n1. Computer Science.\n2. Mathematics and Physics.\nContinuation.\n\n**Master**\nContext for this degree.\n1) Computer Science.'))
      .toEqual(['Computer Science.', 'Mathematics and Physics.\nContinuation.', 'Computer Science.']);
  });
  it('does not manufacture academic entries from empty sections or unnumbered prose', () => {
    for (const text of ['', 'All programmes depend on citizenship.', '**Bachelor**\nSee the official portal.'])
      expect(scholarshipAcademicSourceItems(text)).toEqual([]);
  });
  it('parses explicit Arabic calendar dates without constructing an instant', () => {
    expect(scholarshipSourceCalendarDate('15 يناير 2026')).toBe('2026-01-15');
    expect(scholarshipSourceCalendarDate('1 سبتمبر 2026')).toBe('2026-09-01');
    expect(scholarshipSourceCalendarDate('29 فبراير 2028')).toBe('2028-02-29');
    for (const text of ['29 فبراير 2027', '31 أبريل 2027', '0 يناير 2027', '1/9/2026', 'September 2026', 'Rolling', '15 يناير 2026 14:00 CET'])
      expect(scholarshipSourceCalendarDate(text)).toBeNull();
  });
});
