import { describe, expect, it, vi } from 'vitest';
import { PrismaMajorRepository } from '../../src/majors/PrismaMajorRepository';
describe('Taxonomy mapped major navigation read model', () => {
  it('resolves the owning major for a profile-only mapping without writing any relationship', async () => {
    const findMany = vi.fn(async () => [
      {
        id: 'mapping',
        relationshipType: 'PRIMARY',
        major: null,
        profile: {
          id: 'profile',
          displayName: 'Master profile',
          level: 'MASTER',
          major: { id: 'owner', canonicalName: 'Engineering' },
        },
      },
    ]);
    const db = { majorClassificationMapping: { findMany } };
    const result = await new PrismaMajorRepository(db as any).listByTaxonomyNode('node');
    expect(result[0]).toMatchObject({
      id: 'mapping',
      major: { id: 'owner', canonicalName: 'Engineering' },
      profile: { id: 'profile', level: 'MASTER' },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taxonomyNodeId: 'node' },
        include: expect.objectContaining({
          profile: {
            select: expect.objectContaining({
              major: { select: { id: true, canonicalName: true } },
            }),
          },
        }),
      }),
    );
  });
});
