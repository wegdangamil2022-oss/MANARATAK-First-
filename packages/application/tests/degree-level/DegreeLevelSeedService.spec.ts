import { describe, expect, it, beforeEach } from 'vitest';
import { DegreeLevelSeedService } from '../../src/degree-level/DegreeLevelSeedService';
import { IDegreeLevelRepository } from '@manaratak/domain';

describe('DegreeLevelSeedService', () => {
  let mockRepo: IDegreeLevelRepository;
  let service: DegreeLevelSeedService;
  let memoryStore = new Map<string, any>();

  beforeEach(() => {
    memoryStore.clear();
    mockRepo = {
      listDegreeLevels: async () => Array.from(memoryStore.values()),
      getDegreeLevelByCode: async (code) => memoryStore.get(code) || null,
      getDegreeLevelById: async (id) => Array.from(memoryStore.values()).find(x => x.id === id) || null,
      upsertDegreeLevel: async (data) => {
        const id = memoryStore.has(data.canonicalCode) ? memoryStore.get(data.canonicalCode).id : 'id-' + data.canonicalCode;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        memoryStore.set(data.canonicalCode, record);
        return record;
      }
    };
    service = new DegreeLevelSeedService(mockRepo);
  });

  it('A. canonical Degree Levels can be created/seeded', async () => {
    await service.seedDegreeLevels();
    const levels = await mockRepo.listDegreeLevels();
    expect(levels.length).toBeGreaterThan(0);
    const codes = levels.map(l => l.canonicalCode);
    expect(codes).toContain('BACHELOR');
    expect(codes).toContain('MASTER');
    expect(codes).toContain('DOCTORATE');
    expect(codes).toContain('ASSOCIATE');
    expect(codes).toContain('DIPLOMA');
    expect(codes).toContain('FELLOWSHIP');
    expect(codes).toContain('CERTIFICATE');
  });

  it('B. repeated seed execution is idempotent', async () => {
    await service.seedDegreeLevels();
    const countAfterFirst = (await mockRepo.listDegreeLevels()).length;
    await service.seedDegreeLevels();
    const countAfterSecond = (await mockRepo.listDegreeLevels()).length;
    expect(countAfterFirst).toEqual(countAfterSecond);
  });

  it('C. canonical codes are unique', async () => {
    await service.seedDegreeLevels();
    const levels = await mockRepo.listDegreeLevels();
    const codes = levels.map(l => l.canonicalCode);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toEqual(uniqueCodes.size);
  });

  it('D. canonical reference lookup works', async () => {
    await service.seedDegreeLevels();
    const bachelor = await mockRepo.getDegreeLevelByCode('BACHELOR');
    expect(bachelor).toBeDefined();
    expect(bachelor?.canonicalCode).toEqual('BACHELOR');
  });
});
