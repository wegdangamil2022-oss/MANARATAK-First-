import { describe, it, expect } from 'vitest';
import { 
  ScholarshipStatus, 
  ScholarshipCompletenessState, 
  ImportRecordStatus,
  IScholarshipRepository,
  ScholarshipDto
} from '@manaratak/domain';
import { 
  ImportAdminUseCases, 
  AdminScholarshipUseCases, 
  PublicScholarshipUseCases 
} from '../../src';

class InMemoryScholarshipRepo implements IScholarshipRepository {
  public items: Map<string, ScholarshipDto> = new Map();

  async create(data: any): Promise<ScholarshipDto> {
    const id = data.id || `schol-${this.items.size + 1}`;
    const item: ScholarshipDto = {
      ...data,
      id,
      publicId: data.publicId || `public-${id}`,
      slug: data.slug || `slug-${id}`,
      canonicalName: data.canonicalName || data.displayName,
      canonicalDedupKey: data.canonicalDedupKey || `dedup-${id}`,
      displayName: data.displayName,
      fundingCoverage: data.fundingCoverage,
      coverageDetails: data.coverageDetails,
      eligibleMajorsOrFields: data.eligibleMajorsOrFields,
      degreeLevel: data.degreeLevel,
      status: data.status || ScholarshipStatus.DRAFT,
      completenessStatus: data.completenessStatus || ScholarshipCompletenessState.INCOMPLETE,
      createdAt: new Date(),
      updatedAt: new Date(),
      applicationLink: data.applicationLink,
      officialSourceUrl: data.officialSourceUrl,
      sponsorName: data.sponsorName,
      studyCountry: data.studyCountry,
      applicationDeadline: data.applicationDeadline,
      sourceImportRecordId: data.sourceImportRecordId,
      optionalFields: data.optionalFields || {}
    };
    this.items.set(id, item);
    return item;
  }

  async findById(id: string): Promise<ScholarshipDto | null> {
    return this.items.get(id) || null;
  }

  async findByPublicId(publicId: string): Promise<ScholarshipDto | null> {
    for (const item of this.items.values()) {
      if (item.publicId === publicId) return item;
    }
    return null;
  }

  async findBySlug(slug: string): Promise<ScholarshipDto | null> {
    for (const item of this.items.values()) {
      if (item.slug === slug) return item;
    }
    return null;
  }

  async findByDedupKey(key: string): Promise<ScholarshipDto | null> {
    for (const item of this.items.values()) {
      if (item.canonicalDedupKey === key) return item;
    }
    return null;
  }

  async updateStatus(id: string, status: ScholarshipStatus, completenessStatus?: ScholarshipCompletenessState): Promise<ScholarshipDto> {
    const item = this.items.get(id);
    if (!item) throw new Error(`Scholarship ${id} not found`);
    item.status = status;
    if (completenessStatus) item.completenessStatus = completenessStatus;
    item.updatedAt = new Date();
    this.items.set(id, item);
    return item;
  }

  async updateImportLink(id: string, sourceRecordId: string): Promise<ScholarshipDto> {
    const item = this.items.get(id);
    if (!item) throw new Error(`Scholarship ${id} not found`);
    item.sourceImportRecordId = sourceRecordId;
    this.items.set(id, item);
    return item;
  }

  async listByStatus(status: ScholarshipStatus, filters?: any): Promise<ScholarshipDto[]> {
    return Array.from(this.items.values()).filter(item => item.status === status);
  }

  async listPublishable(filters?: any): Promise<ScholarshipDto[]> {
    return Array.from(this.items.values()).filter(item => 
      item.status === ScholarshipStatus.READY_TO_PUBLISH || item.status === ScholarshipStatus.PUBLISHED
    );
  }

  async listPublished(filters?: any): Promise<{ data: ScholarshipDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const published = Array.from(this.items.values()).filter(item => item.status === ScholarshipStatus.PUBLISHED);
    return { data: published, total: published.length, page: 1, pageSize: 20, totalPages: 1 };
  }

  async listAll(filters?: any): Promise<{ data: ScholarshipDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
    let all = Array.from(this.items.values());
    if (filters?.status) {
      all = all.filter(item => item.status === filters.status);
    }
    return { data: all, total: all.length, page: 1, pageSize: 20, totalPages: 1 };
  }

  async update(id: string, data: any): Promise<ScholarshipDto> {
    const item = this.items.get(id);
    if (!item) throw new Error(`Scholarship ${id} not found`);
    Object.assign(item, data, { updatedAt: new Date() });
    this.items.set(id, item);
    return item;
  }
}

class InMemoryImportRepo {
  public batches: Map<string, any> = new Map();
  public records: Map<string, any> = new Map();

  async createBatch(data: any) {
    const id = `batch-${this.batches.size + 1}`;
    const batch = { id, createdAt: new Date(), ...data };
    this.batches.set(id, batch);
    return batch;
  }

  async updateBatchStats(id: string, stats: any) {
    const batch = this.batches.get(id);
    if (batch) {
      Object.assign(batch, stats);
      this.batches.set(id, batch);
      return batch;
    }
    throw new Error(`Import batch ${id} not found`);
  }

  async createRecord(data: any) {
    const id = `rec-${this.records.size + 1}`;
    const record = { id, createdAt: new Date(), updatedAt: new Date(), ...data };
    this.records.set(id, record);
    return record;
  }

  async getRecordById(id: string) {
    return this.records.get(id) || null;
  }

  async getBatchById(id: string) {
    return this.batches.get(id) || null;
  }

  async updateRecord(id: string, updates: any) {
    const record = this.records.get(id);
    if (record) {
      Object.assign(record, updates, { updatedAt: new Date() });
      this.records.set(id, record);
      return record;
    }
    return null;
  }

  async listBatches() {
    return Array.from(this.batches.values());
  }

  async listRecords(filters?: any) {
    let recs = Array.from(this.records.values());
    if (filters?.status) {
      recs = recs.filter(r => r.status === filters.status);
    }
    return { data: recs, total: recs.length, page: 1, pageSize: 50 };
  }
}

describe('Sprint 3.3 — Scholarship Import Trial & Public Visibility Verification', () => {
  const demoCsvDataset = `scholarshipName,fundingCoverage,degreeLevel,applicationLink,officialSourceUrl,studyCountry,sponsorName,applicationDeadline,coverageDetails,eligibleMajorsOrFields
King Fahd University Graduate Scholarship 2027,Fully Funded,Master,https://kfupm.edu.sa/apply,https://kfupm.edu.sa,Saudi Arabia,King Fahd University,2027-12-15,Full tuition and 2500 SAR monthly stipend,Engineering and Data Science
Doha Institute Master Fellowship 2027,Fully Funded,Master,https://dohainstitute.edu.qa/apply,,Qatar,Doha Institute,,,Social Sciences
,,Master,https://invalid.org/apply,,Yemen,Unknown Sponsor,,Partial support,General`;

  it('stages scholarship-shaped CSV data via generic import without creating or publishing scholarships', async () => {
    const scholarshipRepo = new InMemoryScholarshipRepo();
    const importRepo = new InMemoryImportRepo();

    // ImportAdminUseCases is constructed with generic importRepository only
    const importAdminUseCases = new ImportAdminUseCases(importRepo);
    const adminScholarshipUseCases = new AdminScholarshipUseCases(scholarshipRepo);
    const publicScholarshipUseCases = new PublicScholarshipUseCases(scholarshipRepo);

    // 1. Run Generic Import Data Trial
    const importResult = await importAdminUseCases.importData({
      dataText: demoCsvDataset,
      sourceSystem: 'DEMO_TRIAL_SUITE',
      dataType: 'SCHOLARSHIP'
    });

    expect(importResult.batch).toBeDefined();
    expect(importResult.records.length).toBe(3);

    // Verify records remain staged in importRepo
    const stagedRecords = await importRepo.listRecords();
    expect(stagedRecords.data.length).toBe(3);

    // Verify no scholarship entity is created by Phase 06 import
    expect(scholarshipRepo.items.size).toBe(0);

    // Verify no imported record becomes publicly visible through Phase 06
    const initialPublicList = await publicScholarshipUseCases.listScholarships({});
    expect(initialPublicList.data.length).toBe(0);

    // Verify removed Phase 06 domain promotion APIs no longer exist
    expect((importAdminUseCases as any).importScholarshipData).toBeUndefined();
    expect((importAdminUseCases as any).promoteRecord).toBeUndefined();

    // 2. Separate domain publication workflow (Phase 12 lifecycle, decoupled from Phase 06 import)
    const created = await scholarshipRepo.create({
      displayName: 'King Fahd University Graduate Scholarship 2027',
      fundingCoverage: 'Fully Funded',
      degreeLevel: 'Master',
      studyCountry: 'Saudi Arabia',
      status: ScholarshipStatus.DRAFT,
      completenessStatus: ScholarshipCompletenessState.COMPLETE,
      verificationStatus: 'VERIFIED',
      versions: [{ id: 'version-1' }],
      sponsorContext: { sponsorName: 'King Fahd University' },
      applicationCycles: [{ id: 'cycle-1' }]
    });

    await adminScholarshipUseCases.markReadyToPublish(created.id);
    await adminScholarshipUseCases.publish(created.id);

    const publicList = await publicScholarshipUseCases.listScholarships({});
    expect(publicList.data.length).toBe(1);
    expect(publicList.data[0].displayName).toBe('King Fahd University Graduate Scholarship 2027');
  });
});
