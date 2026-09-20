import { describe, it, expect } from 'vitest';
import { 
  IInternationalTestRepository,
  InternationalTestDto,
  InternationalTestFilters,
  InternationalTestStatus,
  InternationalTestCategory,
  PaginatedInternationalTestResult
} from '../../src/tests-platform';

class MockInternationalTestRepository implements IInternationalTestRepository {
  private items: InternationalTestDto[] = [];

  async findById(id: string): Promise<InternationalTestDto | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async findBySlug(slug: string): Promise<InternationalTestDto | null> {
    return this.items.find(item => item.slug === slug) || null;
  }

  async findPublishedBySlug(slug: string): Promise<InternationalTestDto | null> {
    return this.items.find(item =>
      item.slug === slug &&
      item.status === InternationalTestStatus.PUBLISHED &&
      item.isPubliclyVisible === true
    ) || null;
  }

  async findByDedupKey(dedupKey: string): Promise<InternationalTestDto | null> {
    return this.items.find(item => item.canonicalDedupKey === dedupKey) || null;
  }

  async create(data: any): Promise<InternationalTestDto> {
    const created: InternationalTestDto = {
      id: data.id || `test-${this.items.length + 1}`,
      canonicalName: data.canonicalName,
      testCategory: data.testCategory || InternationalTestCategory.LANGUAGE_PROFICIENCY,
      providerName: data.providerName || 'ETS',
      status: data.status || InternationalTestStatus.IMPORTED,
      isPubliclyVisible: data.isPubliclyVisible ?? false,
      isSourceVerified: data.isSourceVerified ?? false,
      ...data
    };
    this.items.push(created);
    return created;
  }

  async update(id: string, data: any): Promise<InternationalTestDto> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Not found');
    this.items[index] = { ...this.items[index], ...data };
    return this.items[index];
  }

  async updateStatus(id: string, status: InternationalTestStatus): Promise<InternationalTestDto> {
    const item = await this.findById(id);
    if (!item) throw new Error('Not found');
    item.status = status;
    return item;
  }

  async list(filters: InternationalTestFilters): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    let result = [...this.items];
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      result = result.filter(item => statuses.includes(item.status));
    }
    return {
      data: result,
      total: result.length,
      page: filters.page || 1,
      limit: filters.limit || 20
    };
  }

  async listPublished(filters?: Omit<InternationalTestFilters, 'status'>): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    const listed = await this.list({ ...filters, status: InternationalTestStatus.PUBLISHED });
    const data = listed.data.filter(item => item.isPubliclyVisible === true);
    return { ...listed, data, total: data.length };
  }

  async listTests(filters: InternationalTestFilters): Promise<PaginatedInternationalTestResult<InternationalTestDto>> {
    return this.list(filters);
  }

  async getTest(id: string): Promise<InternationalTestDto | null> {
    return this.findById(id);
  }

  async getTestBySlug(slug: string): Promise<InternationalTestDto | null> {
    return this.findBySlug(slug);
  }

  async getTestByDeterministicKey(key: string): Promise<InternationalTestDto | null> {
    return this.findByDedupKey(key);
  }

  async upsertTest(data: any): Promise<InternationalTestDto> {
    if (data.id) {
      const existing = await this.findById(data.id);
      if (existing) return this.update(data.id, data);
    }
    return this.create(data);
  }
}

describe('InternationalTestRepositoryContract', () => {
  it('should conform to IInternationalTestRepository interface with mock implementation', async () => {
    const repo: IInternationalTestRepository = new MockInternationalTestRepository();

    const created = await repo.create({
      canonicalName: 'IELTS Academic',
      providerName: 'IDP',
      testCategory: InternationalTestCategory.LANGUAGE_PROFICIENCY,
      status: InternationalTestStatus.IMPORTED,
      canonicalDedupKey: 'LANGUAGE_PROFICIENCY:IDP:IELTS ACADEMIC'
    });

    expect(created.id).toBeDefined();
    expect(created.canonicalName).toBe('IELTS Academic');

    const foundByDedup = await repo.findByDedupKey('LANGUAGE_PROFICIENCY:IDP:IELTS ACADEMIC');
    expect(foundByDedup?.id).toBe(created.id);

    await repo.updateStatus(created.id, InternationalTestStatus.READY_TO_PUBLISH);
    const updated = await repo.findById(created.id);
    expect(updated?.status).toBe(InternationalTestStatus.READY_TO_PUBLISH);

    await repo.updateStatus(created.id, InternationalTestStatus.PUBLISHED);
    await repo.update(created.id, { isPubliclyVisible: true });
    const publishedList = await repo.listPublished();
    expect(publishedList.total).toBe(1);
    expect(publishedList.data[0].id).toBe(created.id);
  });

  it('should verify explicit methods exist for legacy app compatibility', () => {
    const repo: IInternationalTestRepository = new MockInternationalTestRepository();
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findBySlug).toBe('function');
    expect(typeof repo.findPublishedBySlug).toBe('function');
    expect(typeof repo.findByDedupKey).toBe('function');
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.update).toBe('function');
    expect(typeof repo.updateStatus).toBe('function');
    expect(typeof repo.list).toBe('function');
    expect(typeof repo.listPublished).toBe('function');
  });
});
