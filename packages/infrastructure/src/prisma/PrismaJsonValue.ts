import { Prisma } from '@prisma/client';

type NormalizedJsonValue = Prisma.InputJsonValue | null;

function normalizeJsonValue(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): NormalizedJsonValue | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError(`Non-finite number at ${path} is not valid JSON`);
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`Unsupported ${typeof value} value at ${path}`);
  }
  if (ancestors.has(value)) throw new TypeError(`Circular value at ${path} is not valid JSON`);

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map(
        (item, index) => normalizeJsonValue(item, `${path}[${index}]`, ancestors) ?? null,
      );
    }

    const toJSON = Reflect.get(value, 'toJSON');
    if (typeof toJSON === 'function') {
      return normalizeJsonValue(Reflect.apply(toJSON, value, []), `${path}.toJSON()`, ancestors);
    }

    const result: Record<string, NormalizedJsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = normalizeJsonValue(item, `${path}.${key}`, ancestors);
      if (normalized !== undefined) result[key] = normalized;
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

export function toRequiredPrismaJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  const normalized = normalizeJsonValue(value, '$', new WeakSet());
  if (normalized === undefined) throw new TypeError('Required JSON value cannot be undefined');
  return normalized === null ? Prisma.JsonNull : normalized;
}

export function toOptionalPrismaJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull | undefined {
  if (value === undefined) return undefined;
  return toRequiredPrismaJson(value);
}

export function toNullablePrismaJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull | Prisma.NullTypes.DbNull {
  if (value === undefined || value === null) return Prisma.DbNull;
  return toRequiredPrismaJson(value);
}
