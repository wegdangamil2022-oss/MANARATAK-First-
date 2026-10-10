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

  it('filters faculty context through canonical fields without legacy JSON fallback', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const repository = new PrismaMajorRepository({$queryRaw: query} as any);
    await repository.list({collegeOrFaculty: 'Medicine'});
    for (const [sql] of query.mock.calls) {
      expect(sql.sql).toContain('r."facultyName"');
      expect(sql.values).toContain('Medicine');
      expect(sql.sql).not.toContain("->>'collegeOrFaculty'");
    }
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
