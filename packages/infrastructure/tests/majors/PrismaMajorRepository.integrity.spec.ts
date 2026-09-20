import { describe, expect, it } from 'vitest';
import { PrismaMajorRepository, MAJOR_OPTIONAL_FIELDS_RESERVED_KEYS } from '../../src/majors/PrismaMajorRepository';

describe('PrismaMajorRepository source integrity', () => {
  const repository = new PrismaMajorRepository({} as any) as any;

  it('never lets optionalFields shadow canonical columns', () => {
    const mapped = repository.mapToDto({
      id: 'canonical-id',
      publicId: 'canonical-public-id',
      slug: 'canonical-slug',
      canonicalName: 'Canonical',
      canonicalDedupKey: 'canonical-key',
      displayName: 'Canonical display',
      status: 'DRAFT',
      completenessStatus: 'NEEDS_REVIEW',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      optionalFields: {
        id: 'shadow-id',
        slug: 'shadow-slug',
        status: 'PUBLISHED',
        displayName: 'Shadow display',
        legacyNote: 'preserved'
      }
    });

    expect(mapped.id).toBe('canonical-id');
    expect(mapped.slug).toBe('canonical-slug');
    expect(mapped.status).toBe('DRAFT');
    expect(mapped.displayName).toBe('Canonical display');
    expect(mapped.optionalFields).toEqual({ legacyNote: 'preserved' });
  });

  it('reserves every canonical identity, lifecycle, relation, and timestamp key', () => {
    for (const key of ['id', 'publicId', 'slug', 'canonicalName', 'status', 'academicFieldId', 'profiles', 'createdAt']) {
      expect(MAJOR_OPTIONAL_FIELDS_RESERVED_KEYS.has(key)).toBe(true);
    }
  });

  it('keeps legacy optionalFields filter fallback behind an explicit compatibility mode', () => {
    const canonicalOnly = new PrismaMajorRepository({} as any, false) as any;
    const legacyEnabled = new PrismaMajorRepository({} as any, true) as any;
    const canonical = { facultyName: { contains: 'Medicine', mode: 'insensitive' } };
    const legacy = { optionalFields: { path: ['collegeOrFaculty'], string_contains: 'Medicine' } };

    expect(canonicalOnly.withLegacyOptionalFallback(canonical, legacy)).toEqual(canonical);
    expect(legacyEnabled.withLegacyOptionalFallback(canonical, legacy)).toEqual({
      OR: [canonical, legacy],
    });
  });

  it('rejects ownerless, self, and duplicate semantic relationships', () => {
    expect(() => repository.assertRelationshipInvariants([{
      relationshipType: 'SIMILAR'
    }])).toThrow(/must have/);

    expect(() => repository.assertRelationshipInvariants([{
      sourceMajorId: 'major-1',
      targetMajorId: 'major-1',
      relationshipType: 'SIMILAR'
    }])).toThrow(/itself/);

    const relationship = { sourceMajorId: 'major-1', targetMajorId: 'major-2', relationshipType: 'SIMILAR' };
    expect(() => repository.assertRelationshipInvariants([relationship, relationship])).toThrow(/Duplicate semantic/);
  });
});
