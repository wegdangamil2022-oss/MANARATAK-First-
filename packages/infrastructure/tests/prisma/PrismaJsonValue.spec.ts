import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  toNullablePrismaJson,
  toOptionalPrismaJson,
  toRequiredPrismaJson,
} from '../../src/prisma/PrismaJsonValue';

describe('PrismaJsonValue', () => {
  it('normalizes nested JSON and mirrors JSON omission rules for undefined values', () => {
    expect(
      toRequiredPrismaJson({ kept: true, omitted: undefined, items: [1, undefined, null] }),
    ).toEqual({
      kept: true,
      items: [1, null, null],
    });
  });

  it('distinguishes omitted, database-null, and JSON-null values', () => {
    expect(toOptionalPrismaJson(undefined)).toBeUndefined();
    expect(toNullablePrismaJson(undefined)).toBe(Prisma.DbNull);
    expect(toNullablePrismaJson(null)).toBe(Prisma.DbNull);
    expect(toRequiredPrismaJson(null)).toBe(Prisma.JsonNull);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 1n, Symbol('invalid')])(
    'rejects non-JSON payload %s',
    (value) => {
      expect(() => toRequiredPrismaJson(value)).toThrow(TypeError);
    },
  );

  it('rejects circular payloads', () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(() => toRequiredPrismaJson(value)).toThrow('Circular value');
  });
});
