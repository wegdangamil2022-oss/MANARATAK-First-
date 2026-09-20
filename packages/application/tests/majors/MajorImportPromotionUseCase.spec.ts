import { describe, expect, it, vi } from 'vitest';
import {
  IMajorRepository,
  ImportRecordDto,
  ImportRecordStatus,
  MajorDeduplicationService,
  MajorImportCompletenessState,
  MajorStatus,
  resolveMajorSourceIdentity,
} from '@manaratak/domain';
import { MajorImportPromotionUseCase } from '../../src/majors/use-cases/MajorImportPromotionUseCase';
import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';

describe('MajorImportPromotionUseCase', () => {
  it.each([
    ['MJR-0001', ['MJR', 'MAS', 'DOC'], 'MJR-0001'],
    ['MAS-1116', ['MJR', 'MAS', 'DOC'], 'MAS-1116'],
    ['DOC-1114', ['MJR', 'MAS', 'DOC'], 'DOC-1114'],
    ['FEL-0329', ['FEL'], 'FEL-0329'],
  ] as const)(
    'preserves source identity %s as the canonical public ID',
    (sourceId, prefixes, expected) => {
      expect(resolveMajorSourceIdentity(sourceId, prefixes)).toBe(expected);
    },
  );

  const createMockRepo = (): IMajorRepository => ({
    create: vi
      .fn()
      .mockImplementation(async (data) => ({
        id: 'major-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      })),
    findByDedupKey: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    findByPublicId: vi.fn(),
    findBySlug: vi.fn(),
    updateStatus: vi.fn(),
    updateImportLink: vi.fn(),
    createSource: vi.fn().mockResolvedValue({ id: 'source-1' }),
    createVersion: vi.fn().mockResolvedValue({ id: 'version-1', versionNumber: 1 }),
    createLevelProfile: vi.fn().mockResolvedValue({ id: 'profile-1', level: 'BACHELOR' }),
    findLevelProfile: vi.fn().mockResolvedValue(null),
    listLevelProfiles: vi.fn().mockResolvedValue([]),
    createContentSections: vi.fn().mockResolvedValue({ count: 0 }),
    listContentSections: vi.fn().mockResolvedValue([]),
    createAliases: vi.fn().mockResolvedValue({ count: 0 }),
    listAliases: vi.fn().mockResolvedValue([]),
    createRelationships: vi.fn().mockResolvedValue({ count: 0 }),
    listRelationships: vi.fn().mockResolvedValue([]),
    createClassificationMappings: vi.fn().mockResolvedValue({ count: 0 }),
    listClassificationMappings: vi.fn().mockResolvedValue([]),
    listSources: vi.fn().mockResolvedValue([]),
    listVersions: vi.fn().mockResolvedValue([]),
  });

  const createRecord = (
    status: ImportRecordStatus,
    payload: Record<string, unknown>,
  ): ImportRecordDto => ({
    id: 'rec-1',
    batchId: 'batch-1',
    status,
    rawPayload: payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('rejects records that are not VALID or NEEDS_REVIEW', async () => {
    const repo = createMockRepo();
    const useCase = new MajorImportPromotionUseCase(repo);

    const result = await useCase.promote(createRecord(ImportRecordStatus.STAGED, {}));

    expect(result.type).toBe('REJECTED');
    if (result.type === 'REJECTED') {
      expect(result.reason).toContain('not VALID or NEEDS_REVIEW');
    }
  });

  it('rolls back the atomic boundary instead of emitting a promotion for a rejected record', async () => {
    const boundRepository = createMockRepo();
    const repository = Object.assign(createMockRepo(), {
      withTransaction: vi.fn().mockReturnValue(boundRepository),
    });
    const execute = vi.fn(async (_definition, mutation) =>
      mutation({ boundaryId: 'promotion-boundary' }),
    );
    const coordinator = { execute } as unknown as AtomicDomainMutationCoordinator;
    const useCase = new MajorImportPromotionUseCase(repository, undefined, coordinator);

    const result = await useCase.promote(createRecord(ImportRecordStatus.STAGED, {}));

    expect(result.type).toBe('REJECTED');
    expect(repository.withTransaction).toHaveBeenCalledWith({ boundaryId: 'promotion-boundary' });
    expect(execute).toHaveBeenCalledOnce();
  });

  it('creates an imported major from a trusted VALID import record', async () => {
    const repo = createMockRepo();
    const useCase = new MajorImportPromotionUseCase(repo);

    const result = await useCase.promote(
      createRecord(ImportRecordStatus.VALID, {
        canonicalMajorName: 'Computer Science',
        degreeLevel: 'Bachelor',
        degreeLevelId: 'degree-bachelor',
        sourceClassificationSystem: 'CIP',
        academicFieldOrDiscipline: 'Computing',
        academicFieldId: 'taxonomy-computing',
        officialSourceUrl: 'https://nces.ed.gov/ipeds/cipcode',
        acquiredSkills: ['Programming', 'Algorithms'],
      }),
    );

    expect(result.type).toBe('CREATED');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'Computer Science',
        canonicalName: 'Computer Science',
        canonicalDedupKey: 'computer-science|taxonomy-computing|unknown',
        status: MajorStatus.IMPORTED,
        completenessStatus: MajorImportCompletenessState.COMPLETE,
        sourceImportRecordId: 'rec-1',
        optionalFields: expect.objectContaining({
          acquiredSkills: ['Programming', 'Algorithms'],
        }),
      }),
    );
    expect(repo.createSource).toHaveBeenCalledWith(
      expect.objectContaining({
        majorId: 'major-1',
        sourceType: 'CATALOG_FILE',
        sourceHash: expect.any(String),
      }),
    );
    expect(repo.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        majorId: 'major-1',
        versionNumber: 1,
        status: 'NEEDS_REVIEW',
        sourceImportRecordId: 'rec-1',
        changeSummary: expect.objectContaining({
          addedFields: expect.arrayContaining(['canonicalMajorName']),
        }),
      }),
    );
    expect(repo.createAliases).toHaveBeenCalledWith([
      expect.objectContaining({
        majorId: 'major-1',
        alias: 'Computer Science',
        normalizedAlias: 'computer science',
      }),
    ]);
  });

  it('stores aliases and phase 8 classification mappings from import payloads', async () => {
    const repo = createMockRepo();
    const useCase = new MajorImportPromotionUseCase(repo);

    await useCase.promote(
      createRecord(ImportRecordStatus.VALID, {
        canonicalMajorName: 'Computer Science',
        degreeLevel: 'Bachelor',
        sourceClassificationSystem: 'MANARATAK_PHASE_10_CATALOG',
        academicFieldOrDiscipline: 'Computing',
        academicFieldId: 'taxonomy-computing',
        disciplineId: 'taxonomy-software',
        classificationCode: 'MJR-0100',
        officialSourceUrl: 'https://manaratak.test/majors/computer-science',
        localizedNames: { ar: 'علوم الحاسب', en: 'Computer Science' },
        aliases: ['CS'],
        synonyms: ['Computing Science'],
      }),
    );

    expect(repo.createAliases).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ alias: 'Computer Science', aliasType: 'ALIAS' }),
        expect.objectContaining({ alias: 'علوم الحاسب', locale: 'ar', aliasType: 'TRANSLATION' }),
        expect.objectContaining({ alias: 'CS', aliasType: 'ALIAS' }),
        expect.objectContaining({ alias: 'Computing Science', aliasType: 'SYNONYM' }),
      ]),
    );
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ publicId: 'MJR-0100' }));
    expect(repo.createClassificationMappings).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          majorId: 'major-1',
          profileId: 'profile-1',
          taxonomyNodeId: 'taxonomy-computing',
          relationshipType: 'PRIMARY',
        }),
        expect.objectContaining({
          majorId: 'major-1',
          profileId: 'profile-1',
          taxonomyNodeId: 'taxonomy-software',
          relationshipType: 'SECONDARY',
        }),
      ]),
    );
  });

  it('creates a review-ready major when trusted source fields are missing', async () => {
    const repo = createMockRepo();
    const useCase = new MajorImportPromotionUseCase(repo);

    const result = await useCase.promote(
      createRecord(ImportRecordStatus.NEEDS_REVIEW, {
        canonicalMajorName: 'Business Administration',
        degreeLevel: 'Master',
        sourceClassificationSystem: 'ISCED',
        collegeOrFaculty: 'Business',
      }),
    );

    expect(result.type).toBe('CREATED');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: MajorStatus.READY_TO_REVIEW,
        completenessStatus: MajorImportCompletenessState.NEEDS_REVIEW,
      }),
    );
  });

  it('creates a review version instead of duplicating an existing major', async () => {
    const repo = createMockRepo();
    repo.findByDedupKey = vi.fn().mockResolvedValue({ id: 'existing-1' });
    repo.listVersions = vi.fn().mockResolvedValue([{ id: 'version-1', versionNumber: 3 }]);
    const useCase = new MajorImportPromotionUseCase(repo);

    const result = await useCase.promote(
      createRecord(ImportRecordStatus.VALID, {
        canonicalMajorName: 'Computer Science',
        degreeLevel: 'Bachelor',
        sourceClassificationSystem: 'CIP',
        academicFieldOrDiscipline: 'Computing',
        collegeOrFaculty: 'College of Engineering',
        sourceUrl: 'https://nces.ed.gov/ipeds/cipcode',
      }),
    );

    expect(result.type).toBe('VERSION_CREATED');
    if (result.type === 'VERSION_CREATED') {
      expect(result.existingId).toBe('existing-1');
      expect(result.versionNumber).toBe(4);
    }
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.createSource).toHaveBeenCalledWith(
      expect.objectContaining({
        majorId: 'existing-1',
        metadata: expect.objectContaining({
          crossListingContext: 'college-of-engineering',
        }),
      }),
    );
    expect(repo.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        majorId: 'existing-1',
        versionNumber: 4,
        status: 'NEEDS_REVIEW',
        metadata: expect.objectContaining({
          promotionResult: 'VERSION_CREATED',
        }),
      }),
    );
  });

  it('records added, changed and removed fields when a new import version arrives', async () => {
    const repo = createMockRepo();
    repo.findByDedupKey = vi.fn().mockResolvedValue({ id: 'existing-1' });
    repo.listVersions = vi.fn().mockResolvedValue([
      {
        id: 'version-3',
        versionNumber: 3,
        rawContentBlocks: {
          canonicalMajorName: 'Computer Science',
          degreeLevel: 'Bachelor',
          academicFieldOrDiscipline: 'Computing',
          oldField: 'legacy',
        },
      },
    ]);
    const useCase = new MajorImportPromotionUseCase(repo);

    await useCase.promote(
      createRecord(ImportRecordStatus.VALID, {
        canonicalMajorName: 'Computer Science',
        degreeLevel: 'Bachelor',
        academicFieldOrDiscipline: 'Computing and Informatics',
        newField: 'new',
      }),
    );

    expect(repo.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        versionNumber: 4,
        changeSummary: expect.objectContaining({
          addedFields: ['newField'],
          changedFields: ['academicFieldOrDiscipline'],
          removedFields: ['oldField'],
          diffSource: 'PREVIOUS_VERSION',
        }),
      }),
    );
  });

  it('creates a level profile and content sections for detail dossier records', async () => {
    const repo = createMockRepo();
    const useCase = new MajorImportPromotionUseCase(repo);

    const result = await useCase.promote(
      createRecord(ImportRecordStatus.NEEDS_REVIEW, {
        canonicalMajorName: 'Medicine and Surgery',
        degreeLevel: 'Bachelor',
        sourceClassificationSystem: 'MANARATAK_PHASE_10_DETAIL_DOSSIER',
        classificationCode: 'MJR-0001',
        localizedNames: { ar: 'الطب والجراحة', en: 'Medicine and Surgery' },
        sourceImportMode: 'DETAIL_DOSSIER',
        contentBlocks: [
          {
            blockKey: '01-overview',
            title: 'النبذة',
            content: 'تفاصيل التخصص.',
            sourceSectionPath: 'النبذة',
            reviewStatus: 'NEEDS_REVIEW',
          },
        ],
      }),
    );

    expect(result.type).toBe('CREATED');
    expect(repo.createLevelProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        majorId: 'major-1',
        level: 'BACHELOR',
        code: 'MJR-0001',
        localizedNameAr: 'الطب والجراحة',
        localizedNameEn: 'Medicine and Surgery',
      }),
    );
    expect(repo.createSource).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'profile-1',
        sourceType: 'DETAIL_DOSSIER',
      }),
    );
    expect(repo.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'profile-1',
        metadata: expect.objectContaining({
          contentBlockCount: 1,
          sourceImportMode: 'DETAIL_DOSSIER',
        }),
      }),
    );
    expect(repo.createContentSections).toHaveBeenCalledWith([
      expect.objectContaining({
        profileId: 'profile-1',
        versionId: 'version-1',
        sectionKey: '01-overview',
        title: 'النبذة',
        content: 'تفاصيل التخصص.',
        locale: undefined,
        reviewStatus: 'NEEDS_REVIEW',
        metadata: expect.objectContaining({
          localeResolution: 'UNKNOWN_REVIEW_REQUIRED',
        }),
      }),
    ]);
  });

  it('uses source-declared content locale instead of forcing Arabic', async () => {
    const repo = createMockRepo();
    const useCase = new MajorImportPromotionUseCase(repo);

    await useCase.promote(
      createRecord(ImportRecordStatus.NEEDS_REVIEW, {
        canonicalMajorName: 'Computer Science',
        degreeLevel: 'Bachelor',
        classificationCode: 'MJR-0100',
        sourceImportMode: 'DETAIL_DOSSIER',
        contentBlocks: [{ title: 'Overview', content: 'English content.', locale: 'en' }],
      }),
    );

    expect(repo.createContentSections).toHaveBeenCalledWith([
      expect.objectContaining({
        content: 'English content.',
        locale: 'en',
        metadata: expect.objectContaining({
          localeResolution: 'SOURCE_DECLARED',
        }),
      }),
    ]);
  });

  it('keeps the same Major identity across MJR, MAS and DOC catalog codes', () => {
    const bachelorKey = MajorDeduplicationService.generateKey({
      canonicalMajorName: 'Medical Sciences',
      degreeLevel: 'Bachelor',
      sourceClassificationSystem: 'MANARATAK_PHASE_10_CATALOG',
      academicFieldOrDiscipline: 'Health Sciences',
      collegeOrFaculty: 'College of Medicine',
      classificationCode: 'MJR-0004',
    });

    const masterKey = MajorDeduplicationService.generateKey({
      canonicalMajorName: 'Medical Sciences',
      degreeLevel: 'Master',
      sourceClassificationSystem: 'MANARATAK_PHASE_10_CATALOG',
      academicFieldOrDiscipline: 'Health Sciences',
      collegeOrFaculty: 'Graduate Studies',
      classificationCode: 'MAS-0001',
    });

    const doctorateKey = MajorDeduplicationService.generateKey({
      canonicalMajorName: 'Medical Sciences',
      degreeLevel: 'Doctorate',
      sourceClassificationSystem: 'MANARATAK_PHASE_10_DETAIL_DOSSIER',
      academicFieldOrDiscipline: 'Health Sciences',
      classificationCode: 'DOC-0001',
      sourceImportMode: 'DETAIL_DOSSIER',
    });

    expect(bachelorKey).toBe('medical-sciences|health-sciences|unknown');
    expect(masterKey).toBe(bachelorKey);
    expect(doctorateKey).toBe(bachelorKey);
  });

  it('uses the existing Major and creates a new level profile when degree changes', async () => {
    const repo = createMockRepo();
    repo.findByDedupKey = vi.fn().mockResolvedValue({ id: 'major-medical-sciences' });
    repo.listVersions = vi.fn().mockResolvedValue([{ id: 'version-1', versionNumber: 1 }]);
    repo.createLevelProfile = vi
      .fn()
      .mockResolvedValue({ id: 'profile-master-1', level: 'MASTER', code: 'MAS-0001' });
    const useCase = new MajorImportPromotionUseCase(repo);

    const result = await useCase.promote(
      createRecord(ImportRecordStatus.NEEDS_REVIEW, {
        canonicalMajorName: 'Medical Sciences',
        degreeLevel: 'Master',
        sourceClassificationSystem: 'MANARATAK_PHASE_10_CATALOG',
        academicFieldOrDiscipline: 'Health Sciences',
        collegeOrFaculty: 'Graduate College',
        classificationCode: 'MAS-0001',
      }),
    );

    expect(result).toEqual({
      type: 'VERSION_CREATED',
      existingId: 'major-medical-sciences',
      versionNumber: 2,
    });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.findByDedupKey).toHaveBeenCalledWith('medical-sciences|health-sciences|unknown');
    expect(repo.createLevelProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        majorId: 'major-medical-sciences',
        level: 'MASTER',
        code: 'MAS-0001',
        collegeContext: 'Graduate College',
      }),
    );
  });

  it('keeps detail dossiers attached to the catalog Major instead of creating a duplicate', async () => {
    const repo = createMockRepo();
    repo.findByDedupKey = vi.fn().mockResolvedValue({ id: 'major-computer-science' });
    repo.findLevelProfile = vi
      .fn()
      .mockResolvedValue({ id: 'profile-bachelor-1', level: 'BACHELOR', code: 'MJR-0100' });
    repo.listVersions = vi.fn().mockResolvedValue([{ id: 'version-1', versionNumber: 5 }]);
    const useCase = new MajorImportPromotionUseCase(repo);

    const result = await useCase.promote(
      createRecord(ImportRecordStatus.NEEDS_REVIEW, {
        canonicalMajorName: 'Computer Science',
        degreeLevel: 'Bachelor',
        sourceClassificationSystem: 'MANARATAK_PHASE_10_DETAIL_DOSSIER',
        academicFieldOrDiscipline: 'Computing',
        classificationCode: 'MJR-0100',
        sourceImportMode: 'DETAIL_DOSSIER',
        contentBlocks: [{ title: 'Overview', content: 'Computer science details.' }],
      }),
    );

    expect(result).toEqual({
      type: 'VERSION_CREATED',
      existingId: 'major-computer-science',
      versionNumber: 6,
    });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.findByDedupKey).toHaveBeenCalledWith('computer-science|computing|unknown');
    expect(repo.createContentSections).toHaveBeenCalledWith([
      expect.objectContaining({
        profileId: 'profile-bachelor-1',
        content: 'Computer science details.',
      }),
    ]);
  });

  it('allocates from the highest version even when repository results are unsorted', async () => {
    const repo = createMockRepo();
    repo.findByDedupKey = vi.fn().mockResolvedValue({ id: 'major-1' });
    repo.acquireVersionAllocationLock = vi.fn().mockResolvedValue(undefined);
    repo.listVersions = vi.fn().mockResolvedValue([
      { id: 'version-8', versionNumber: 8, status: 'NEEDS_REVIEW' },
      { id: 'version-2', versionNumber: 2, status: 'NEEDS_REVIEW' },
      { id: 'version-5', versionNumber: 5, status: 'NEEDS_REVIEW' },
    ]);
    const result = await new MajorImportPromotionUseCase(repo).promote(createRecord(ImportRecordStatus.NEEDS_REVIEW, {
      canonicalMajorName: 'Computer Science',
      degreeLevel: 'Bachelor',
      classificationCode: 'MJR-0100',
    }));
    expect(result).toEqual({ type: 'VERSION_CREATED', existingId: 'major-1', versionNumber: 9 });
    expect(repo.acquireVersionAllocationLock).toHaveBeenCalledWith('major-1');
    expect(repo.createVersion).toHaveBeenCalledWith(expect.objectContaining({ versionNumber: 9 }));
  });

  it('treats the persisted import record as source identity for completeness', async () => {
    const repo = createMockRepo();
    await new MajorImportPromotionUseCase(repo).promote(createRecord(ImportRecordStatus.VALID, {
      canonicalMajorName: 'Computer Science',
      degreeLevel: 'Bachelor',
      degreeLevelId: 'degree-bachelor',
      academicFieldId: 'taxonomy-computing',
    }));
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      sourceImportRecordId: 'rec-1',
      completenessStatus: MajorImportCompletenessState.COMPLETE,
    }));
  });
});
