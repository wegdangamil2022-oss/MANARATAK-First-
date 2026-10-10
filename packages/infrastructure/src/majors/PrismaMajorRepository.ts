import { Prisma, PrismaClient } from '@prisma/client';
import {createHash} from 'crypto';
import {
  IMajorRepository,
  ITransactionalMajorRepository,
  AtomicPersistenceContext,
  MajorAliasDto,
  MajorClassificationMappingDto,
  MajorContentSectionDto,
  MajorDto,
  MajorFilters,
  MajorImportCompletenessState,
  MajorLevel,
  MajorLevelProfileDto,
  MajorLifecycleStatus,
  MajorRelationshipDto,
  MajorSourceDto,
  MajorStatus,
  MajorSourceIdentityPrefix,
  MajorVersionDto,
  PaginatedMajorResult,
  PublicMajorFilters,
  UpdateMajorDto,
  AcademicTaxonomyNodeDto,
  DegreeLevelDto,
  TaxonomyMappedMajorDto,
  ReviewedMajorClassificationInput,
  publicMajorProjection,
  assertMajorReviewCoverage,
  MajorNamingService,
} from '@manaratak/domain';

import { decodeStableCursor, encodeStableCursor, boundedCursorLimit } from '../api-foundation/StableCursor';

const MAJOR_INCLUDE = {
  academicField: true,
  discipline: true,
  classificationMappings: true,
  sources:{take:50,orderBy:{createdAt:'desc' as const}},
  levelProfiles: {
    include: {
      degreeLevel: true,
      academicField: true,
      discipline: true,
      classificationMappings: true,
    }
  }
};

export const MAJOR_OPTIONAL_FIELDS_RESERVED_KEYS = new Set([
  'id', 'publicId', 'code', 'slug', 'canonicalName', 'canonicalDedupKey',
  'displayName', 'localizedNameAr', 'localizedNameEn', 'status', 'completenessStatus', 'facultyName',
  'academicFieldId', 'disciplineId', 'currentPublishedVersionId',
  'academicField', 'discipline', 'classificationMappings', 'profiles',
  'versions', 'aliases', 'relationships', 'sources', 'createdAt', 'updatedAt'
]);

interface MajorTransactionContext extends AtomicPersistenceContext {
  readonly transactionClient: Prisma.TransactionClient;
}

export class PrismaMajorRepository implements ITransactionalMajorRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly legacyOptionalFieldFiltersEnabled = false,
    private readonly transactionBound = false,
  ) {}

  withTransaction(context: AtomicPersistenceContext): IMajorRepository {
    const transactionClient = (context as Partial<MajorTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) throw new Error('MAJOR_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaMajorRepository(
      transactionClient as unknown as PrismaClient,
      this.legacyOptionalFieldFiltersEnabled,
      true,
    );
  }

  async lockForRevision(id:string,expectedRevision:number):Promise<void> {
    if(!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const majorId=await this.resolveMajorId(id);
    const rows=await this.prisma.$queryRaw<Array<{revision:bigint;status:string}>>`SELECT floor(extract(epoch FROM "updatedAt")*1000)::bigint AS revision,status FROM "Major" WHERE id=${majorId} FOR UPDATE`;
    if(!rows.length) throw new Error('MAJOR_NOT_FOUND');
    if(Number(rows[0].revision)!==expectedRevision) throw new Error('MAJOR_STALE_REVISION');
    if(rows[0].status==='ARCHIVED') throw new Error('MAJOR_ARCHIVED_IMMUTABLE');
  }

  async advanceRevision(id:string,expectedRevision:number):Promise<number> {
    if(!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const majorId=await this.resolveMajorId(id);
    const rows=await this.prisma.$queryRaw<Array<{revision:bigint}>>`UPDATE "Major" SET "updatedAt"=GREATEST(clock_timestamp(),to_timestamp(${expectedRevision}/1000.0)+interval '1 millisecond') WHERE id=${majorId} RETURNING floor(extract(epoch FROM "updatedAt")*1000)::bigint AS revision`;
    if(!rows.length) throw new Error('MAJOR_NOT_FOUND');
    return Number(rows[0].revision);
  }

  async startWorkingCopy(id:string,actorId:string,reason:string):Promise<void> {
    if(!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const majorId=await this.resolveMajorId(id);const profiles=await this.prisma.majorLevelProfile.findMany({where:{majorId}});
    const profile=profiles.find(item=>item.id===id || item.code===id) ?? (profiles.length===1?profiles[0]:undefined);
    if(!profile || ['ARCHIVED','REJECTED'].includes(profile.status)) throw new Error('TARGET_MAJOR_PROFILE_REQUIRED');
    const latest=await this.prisma.majorVersion.findFirst({where:{majorId,profileId:profile.id},orderBy:{versionNumber:'desc'}});
    if(!latest) throw new Error('MAJOR_WORKING_COPY_SOURCE_REQUIRED');
    if(!latest.publishedAt && !['PUBLISHED','SUPERSEDED','ARCHIVED'].includes(latest.status)) throw new Error('MAJOR_WORKING_COPY_ALREADY_EXISTS');
    const version=await this.prisma.majorVersion.create({data:{majorId,profileId:profile.id,versionNumber:latest.versionNumber+1,status:'NEEDS_REVIEW',sourceHash:latest.sourceHash,sourceUri:latest.sourceUri,sourceFileName:latest.sourceFileName,sourceImportRecordId:latest.sourceImportRecordId,rawContentBlocks:latest.rawContentBlocks ?? undefined,metadata:{workingCopyOf:latest.id,actorId,reason}}});
    const sections=await this.prisma.majorContentSection.findMany({where:{profileId:profile.id,versionId:latest.id}});
    await this.prisma.majorContentSection.createMany({data:sections.map(section=>({profileId:profile.id,versionId:version.id,sectionKey:section.sectionKey,title:section.title,locale:section.locale,content:section.content,sourceSectionPath:section.sourceSectionPath,reviewStatus:'NEEDS_REVIEW'}))});
    await this.prisma.majorLevelProfile.update({where:{id:profile.id},data:{status:'READY_TO_REVIEW',completenessStatus:'NEEDS_REVIEW'}});
  }

  async unpublishProfile(id:string):Promise<void> {
    if(!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const majorId=await this.resolveMajorId(id);const profiles=await this.prisma.majorLevelProfile.findMany({where:{majorId}});
    const profile=profiles.find(item=>item.id===id || item.code===id) ?? (profiles.length===1?profiles[0]:undefined);
    if(!profile?.currentPublishedVersionId) throw new Error('MAJOR_PROFILE_NOT_PUBLISHED');
    await this.prisma.majorLevelProfile.update({where:{id:profile.id},data:{status:'READY_TO_REVIEW',currentPublishedVersionId:null}});
    const live=await this.prisma.majorLevelProfile.findFirst({where:{majorId,currentPublishedVersionId:{not:null}}});
    await this.prisma.major.update({where:{id:majorId},data:{status:live?'PUBLISHED':'READY_TO_REVIEW',currentPublishedVersionId:live?.currentPublishedVersionId ?? null}});
  }

  async reviewWorkingVersion(id:string,versionId:string,actorId:string,reason:string,coverage:Record<string,string>):Promise<void> {
    if(!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const majorId=await this.resolveMajorId(id);
    const version=await this.prisma.majorVersion.findFirst({where:{id:versionId,majorId},include:{profile:true}});
    if(!version?.profileId || !version.profile || version.publishedAt || ['PUBLISHED','SUPERSEDED','ARCHIVED'].includes(version.status)) throw new Error('MAJOR_REVIEW_WORKING_VERSION_REQUIRED');
    const profile=version.profile;
    if(['PUBLISHED','ARCHIVED','REJECTED'].includes(profile.status)) throw new Error('MAJOR_REVIEW_PROFILE_IMMUTABLE');
    const sections=await this.prisma.majorContentSection.findMany({where:{profileId:profile.id,versionId},orderBy:[{sectionKey:'asc'},{id:'asc'}]});
    assertMajorReviewCoverage(profile.level,coverage,sections);
    if(!sections.length || sections.some(section=>!section.content.trim() || !['COMPLETE','APPROVED'].includes(section.reviewStatus))) throw new Error('MAJOR_REVIEW_CONTENT_INCOMPLETE');
    if(!version.sourceHash || !/^[a-f0-9]{64}$/i.test(version.sourceHash)) throw new Error('MAJOR_REVIEW_SOURCE_HASH_REQUIRED');
    const source=await this.prisma.majorSource.findFirst({where:{sourceHash:version.sourceHash,OR:[{majorId,profileId:null},{majorId,profileId:profile.id}]}});
    if(!source) throw new Error('MAJOR_REVIEW_OWNER_SOURCE_REQUIRED');
    if(!profile.degreeLevelId || (!profile.academicFieldId && !profile.disciplineId)) throw new Error('MAJOR_REVIEW_CANONICAL_REFERENCES_REQUIRED');
    const digest=await this.workingVersionDigest(majorId,profile.id,versionId);
    await this.prisma.majorContentSection.updateMany({where:{profileId:profile.id,versionId},data:{reviewStatus:'APPROVED'}});
    await this.prisma.majorVersion.update({where:{id:versionId},data:{status:'APPROVED',approvedBy:actorId,metadata:{...this.asRecord(version.metadata),reviewApproval:{digest,actorId,reason,coverage,reviewedAt:new Date().toISOString()}}}});
    await this.prisma.majorLevelProfile.update({where:{id:profile.id},data:{completenessStatus:'COMPLETE'}});
  }

  private async workingVersionDigest(majorId:string,profileId:string,versionId:string):Promise<string> {
    const [major,profile,version,sections,mappings,sources]=await Promise.all([
      this.prisma.major.findUnique({where:{id:majorId},select:{canonicalName:true,canonicalDedupKey:true,displayName:true,academicFieldId:true,disciplineId:true}}),
      this.prisma.majorLevelProfile.findFirst({where:{id:profileId,majorId},select:{id:true,majorId:true,degreeLevelId:true,academicFieldId:true,disciplineId:true,level:true,displayName:true,code:true}}),
      this.prisma.majorVersion.findFirst({where:{id:versionId,majorId,profileId},select:{id:true,sourceHash:true,sourceUri:true,sourceImportRecordId:true}}),
      this.prisma.majorContentSection.findMany({where:{profileId,versionId},orderBy:[{sectionKey:'asc'},{id:'asc'}],select:{id:true,sectionKey:true,title:true,content:true,locale:true}}),
      this.prisma.majorClassificationMapping.findMany({where:{OR:[{majorId,profileId:null},{profileId}]},orderBy:{id:'asc'},select:{taxonomyNodeId:true,relationshipType:true,profileId:true}}),
      this.prisma.majorSource.findMany({where:{OR:[{majorId,profileId:null},{profileId}]},orderBy:{id:'asc'},select:{id:true,sourceHash:true,sourceUri:true,sourceType:true}}),
    ]);
    if(!major || !profile || !version) throw new Error('MAJOR_REVIEW_FOREIGN_VERSION');
    return createHash('sha256').update(JSON.stringify({major,profile,version,sections,mappings,sources})).digest('hex');
  }

  async findById(id: string): Promise<MajorDto | null> {
    let record = await this.prisma.major.findUnique({
      where: { id },
      include: MAJOR_INCLUDE
    });
    if (!record) {
      const profile = await this.prisma.majorLevelProfile.findFirst({
        where: {
          OR: [
            { id },
            { code: id },
          ]
        },
        select: { majorId: true }
      });
      if (profile) {
        record = await this.prisma.major.findUnique({
          where: { id: profile.majorId },
          include: MAJOR_INCLUDE
        });
      }
    }
    if (!record) {
      record = await this.prisma.major.findUnique({
        where: { publicId: id },
        include: MAJOR_INCLUDE
      });
    }
    return record ? this.mapToDto(record) : null;
  }

  async findByPublicId(publicId: string): Promise<MajorDto | null> {
    const record = await this.prisma.major.findUnique({
      where: { publicId },
      include: MAJOR_INCLUDE
    });
    return record ? this.mapToDto(record) : null;
  }

  async findPublishedByIds(ids: string[]): Promise<MajorDto[]> {
    if (!ids.length) return [];
    const records = await this.prisma.major.findMany({
      where: { id: { in: [...new Set(ids)] }, status: MajorStatus.PUBLISHED },
      include: MAJOR_INCLUDE,
    });
    return records.map((record) => this.mapToDto(record));
  }

  async findBySlug(slug: string): Promise<MajorDto | null> {
    const record = await this.prisma.major.findUnique({
      where: { slug },
      include: MAJOR_INCLUDE
    });
    return record ? this.mapToDto(record) : null;
  }

  async findByDedupKey(key: string): Promise<MajorDto | null> {
    const record = await this.prisma.major.findUnique({
      where: { canonicalDedupKey: key },
      include: MAJOR_INCLUDE
    });
    return record ? this.mapToDto(record) : null;
  }

  async create(data: Omit<MajorDto, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<MajorDto, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MajorDto> {
    const {
      id: _id, createdAt: _createdAt, updatedAt: _updatedAt,
      publicId, slug, canonicalName, canonicalDedupKey, displayName, localizedNameAr, localizedNameEn, status,
      completenessStatus, facultyName, academicFieldId, disciplineId, currentPublishedVersionId,
      optionalFields, profiles: _profiles, versions: _versions, aliases: _aliases,
      relationships: _relationships, classificationMappings: _classificationMappings,
      sources: _sources,
      ...rest
    } = data;
    
    const safeOptionalFields = {
      ...this.sanitizeOptionalFields(optionalFields),
      ...rest
    };

    const record = await this.prisma.major.create({
      data: {
        publicId, slug, canonicalName, canonicalDedupKey, displayName, localizedNameAr, localizedNameEn, status,
        completenessStatus, facultyName,
        academicFieldId,
        disciplineId,
        currentPublishedVersionId,
        optionalFields: safeOptionalFields as Prisma.InputJsonObject
      },
      include: MAJOR_INCLUDE
    });
    return this.mapToDto(record);
  }

  async update(id: string, updates: UpdateMajorDto): Promise<MajorDto> {
    const {
      displayName, localizedNameAr, localizedNameEn, status, completenessStatus, academicFieldId, disciplineId,
      currentPublishedVersionId, optionalFields,
      ...rest
    } = updates;
    
    const resolvedId = await this.resolveMajorId(id);
    const existing = await this.prisma.major.findUnique({ where: { id: resolvedId }});
    const existingOptional = this.sanitizeOptionalFields(existing?.optionalFields);

    const safeOptionalFields = {
      ...existingOptional,
      ...this.sanitizeOptionalFields(optionalFields),
      ...rest
    };

    const record = await this.prisma.major.update({
      where: { id: resolvedId },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        localizedNameAr: localizedNameAr !== undefined ? localizedNameAr : undefined,
        localizedNameEn: localizedNameEn !== undefined ? localizedNameEn : undefined,
        status: status !== undefined ? status : undefined,
        completenessStatus: completenessStatus !== undefined ? completenessStatus : undefined,
        academicFieldId: academicFieldId !== undefined ? academicFieldId : undefined,
        disciplineId: disciplineId !== undefined ? disciplineId : undefined,
        currentPublishedVersionId: currentPublishedVersionId !== undefined ? currentPublishedVersionId : undefined,
        optionalFields: safeOptionalFields as Prisma.InputJsonObject
      },
      include: MAJOR_INCLUDE
    });
    return this.mapToDto(record);
  }

  async updateStatus(id: string, status: MajorLifecycleStatus): Promise<void> {
    if (!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    const majorId = await this.resolveMajorId(id);
    await this.acquireVersionAllocationLock(majorId);
    const profiles = await this.prisma.majorLevelProfile.findMany({ where: { majorId } });
    const profile = profiles.find(item => item.id === id || item.code === id)
      ?? (profiles.length === 1 ? profiles[0] : undefined);
    if (profiles.length && !profile) throw new Error('TARGET_MAJOR_PROFILE_REQUIRED');
    if (profile) {
      const allowed:Record<string,string[]>={IMPORTED:['READY_TO_REVIEW','REJECTED','ARCHIVED'],READY_TO_REVIEW:['READY_TO_REVIEW','READY_TO_PUBLISH','REJECTED','ARCHIVED'],READY_TO_PUBLISH:['PUBLISHED','READY_TO_REVIEW','REJECTED','ARCHIVED'],PUBLISHED:['READY_TO_REVIEW'],REJECTED:['READY_TO_REVIEW','ARCHIVED'],ARCHIVED:[]};
      if(!allowed[profile.status]?.includes(status)) throw new Error('MAJOR_INVALID_LIFECYCLE_TRANSITION');
      let versionId: string | null = ['ARCHIVED','REJECTED'].includes(status) ? null : profile.currentPublishedVersionId;
      if (status === MajorStatus.PUBLISHED) {
        if (profile.status !== MajorStatus.READY_TO_PUBLISH) throw new Error('MAJOR_INVALID_PUBLICATION_STATUS');
        const version = await this.prisma.majorVersion.findFirst({
          where: { majorId, profileId: profile.id, status: {notIn:['ARCHIVED','SUPERSEDED']} },
          orderBy: { versionNumber: 'desc' },
        });
        if (!version || version.status!=='APPROVED' || !await this.prisma.majorContentSection.count({ where: { profileId: profile.id, versionId: version.id } })) {
          throw new Error('MAJOR_PUBLICATION_CONTENT_MISSING');
        }
        const unreviewed = await this.prisma.majorContentSection.count({ where: {
          profileId: profile.id, versionId: version.id, reviewStatus: { notIn: ['APPROVED', 'PUBLISHED'] },
        } });
        if (unreviewed) throw new Error('MAJOR_PUBLICATION_CONTENT_REVIEW_REQUIRED');
        const approval=this.asRecord(this.asRecord(version.metadata).reviewApproval as Record<string,unknown>);
        if(!version.approvedBy || approval.actorId!==version.approvedBy || approval.digest!==await this.workingVersionDigest(majorId,profile.id,version.id)) throw new Error('MAJOR_PUBLICATION_STALE_APPROVAL');
        await this.lockActivePublicationReferences(profile,majorId);
        versionId = version.id;
        if(profile.currentPublishedVersionId && profile.currentPublishedVersionId!==version.id) await this.prisma.majorVersion.updateMany({where:{id:profile.currentPublishedVersionId,majorId,profileId:profile.id,status:'PUBLISHED'},data:{status:'SUPERSEDED',supersededAt:new Date()}});
        await this.prisma.majorVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
        const owner=await this.prisma.major.findUnique({where:{id:majorId},include:MAJOR_INCLUDE});
        if(!owner) throw new Error('MAJOR_NOT_FOUND');
        const major=this.mapToDto(owner);
        const selected=major.profiles?.find(item=>item.id===profile.id);
        if(!selected) throw new Error('TARGET_MAJOR_PROFILE_REQUIRED');
        const sections=await this.prisma.majorContentSection.findMany({where:{profileId:profile.id,versionId:version.id},orderBy:[{sectionKey:'asc'},{id:'asc'}]});
        const scoped={...major,publicId:profile.code || major.publicId,degreeLevel:profile.level,classificationCode:profile.code ?? undefined,
          displayName:profile.displayName || major.displayName,localizedNameAr:profile.localizedNameAr || major.localizedNameAr,
          localizedNameEn:profile.localizedNameEn || major.localizedNameEn,currentPublishedVersionId:version.id,
          profiles:[{...selected,status:MajorStatus.PUBLISHED,currentPublishedVersionId:version.id}]};
        const payload=publicMajorProjection(scoped,sections.map(section=>this.mapContentSectionToDto(section)));
        await this.prisma.$executeRaw`INSERT INTO "MajorPublicationSnapshot" ("versionId","majorId","profileId","payload","reviewerId") VALUES (${version.id},${majorId},${profile.id},${JSON.stringify(payload)}::jsonb,${version.approvedBy})`;

      }
      await this.prisma.majorLevelProfile.update({ where: { id: profile.id }, data: { status, currentPublishedVersionId: versionId } });
      const published = await this.prisma.majorLevelProfile.findFirst({ where: { majorId, currentPublishedVersionId: { not: null } } });
      await this.prisma.major.update({ where: { id: majorId }, data: {
        status: published ? MajorStatus.PUBLISHED : status,
        currentPublishedVersionId: published?.currentPublishedVersionId ?? null,
      } });
      return;
    }
    await this.prisma.major.update({ where: { id: majorId }, data: { status } });
  }

  async updateImportLink(id: string, sourceImportRecordId: string): Promise<void> {
    const resolvedId = await this.resolveMajorId(id);
    const existing = await this.prisma.major.findUnique({ where: { id: resolvedId }});
    const existingOptional = this.sanitizeOptionalFields(existing?.optionalFields);

    await this.prisma.major.update({
      where: { id: resolvedId },
      data: {
        optionalFields: {
          ...existingOptional,
          sourceImportRecordId,
        } as Prisma.InputJsonObject,
      },
    });
  }

  async list(filters:MajorFilters):Promise<PaginatedMajorResult<MajorDto>> {
    const page=Math.min(1000,Math.max(1,filters.page || 1));const pageSize=Math.min(50,Math.max(1,filters.pageSize || 25));
    const query=Prisma.sql`WITH rows AS (
      SELECT p.id AS "rowId",m.id AS "majorId",p.id AS "profileId",p."createdAt",p.status,p."completenessStatus",p.level,
        coalesce(p."academicFieldId",m."academicFieldId") AS "fieldId",coalesce(p."disciplineId",m."disciplineId") AS "disciplineId",
        coalesce(p."displayName",m."displayName") AS "displayName",m."canonicalName",coalesce(p."localizedNameAr",m."localizedNameAr") AS "nameAr",
        coalesce(p."localizedNameEn",m."localizedNameEn") AS "nameEn",p.code,m."facultyName",m."optionalFields"
      FROM "MajorLevelProfile" p JOIN "Major" m ON m.id=p."majorId"
      UNION ALL
      SELECT m.id,m.id,NULL::text,m."createdAt",m.status,m."completenessStatus",m."optionalFields"->>'degreeLevel',m."academicFieldId",m."disciplineId",
        m."displayName",m."canonicalName",m."localizedNameAr",m."localizedNameEn",m."publicId",m."facultyName",m."optionalFields"
      FROM "Major" m WHERE NOT EXISTS(SELECT 1 FROM "MajorLevelProfile" p WHERE p."majorId"=m.id)
    ), filtered AS (SELECT * FROM rows r WHERE
      (${filters.status ?? null}::text IS NULL OR r.status=${filters.status ?? null})
      AND (${filters.completenessStatus ?? null}::text IS NULL OR r."completenessStatus"=${filters.completenessStatus ?? null})
      AND (${filters.degreeLevel ?? null}::text IS NULL OR upper(r.level)=${filters.degreeLevel?.toUpperCase() ?? null})
      AND (${filters.academicFieldId ?? null}::text IS NULL OR r."fieldId"=${filters.academicFieldId ?? null})
      AND (${filters.disciplineId ?? null}::text IS NULL OR r."disciplineId"=${filters.disciplineId ?? null})
      AND (${filters.search ?? ''}='' OR strpos(lower(concat_ws(' ',r."displayName",r."canonicalName",r."nameAr",r."nameEn",r.code)),lower(${filters.search ?? ''}))>0
        OR EXISTS(SELECT 1 FROM "MajorAlias" a WHERE a."majorId"=r."majorId" AND strpos(lower(a.alias),lower(${filters.search ?? ''}))>0))
      AND (${filters.taxonomyNodeId ?? null}::text IS NULL OR r."fieldId"=${filters.taxonomyNodeId ?? null} OR r."disciplineId"=${filters.taxonomyNodeId ?? null}
        OR EXISTS(SELECT 1 FROM "MajorClassificationMapping" c WHERE c."taxonomyNodeId"=${filters.taxonomyNodeId ?? null} AND (c."profileId"=r."profileId" OR (c."majorId"=r."majorId" AND c."profileId" IS NULL))))
      AND (${filters.collegeOrFaculty ?? ''}='' OR strpos(lower(coalesce(r."facultyName",'')),lower(${filters.collegeOrFaculty ?? ''}))>0)
      AND (${filters.academicFieldOrDiscipline ?? ''}='' OR EXISTS(SELECT 1 FROM "AcademicTaxonomyNode" n WHERE n.id IN (r."fieldId",r."disciplineId") AND strpos(lower(n."canonicalName"),lower(${filters.academicFieldOrDiscipline ?? ''}))>0))
    )`;
    const [ids,counts]=await Promise.all([
      this.prisma.$queryRaw<Array<{majorId:string;profileId:string|null}>>(Prisma.sql`${query} SELECT "majorId","profileId" FROM filtered ORDER BY "createdAt" DESC,"rowId" DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`),
      this.prisma.$queryRaw<Array<{total:bigint;published:bigint;needsReview:bigint;complete:bigint}>>(Prisma.sql`${query} SELECT count(*) AS total,count(*) FILTER(WHERE status='PUBLISHED') AS published,count(*) FILTER(WHERE status='READY_TO_REVIEW' OR "completenessStatus"='NEEDS_REVIEW') AS "needsReview",count(*) FILTER(WHERE "completenessStatus"='COMPLETE') AS complete FROM filtered`),
    ]);
    const majors=ids.length?await this.prisma.major.findMany({where:{id:{in:[...new Set(ids.map(row=>row.majorId))]}},include:MAJOR_INCLUDE}):[];
    const data=ids.map(row=>{
      const record=majors.find(major=>major.id===row.majorId);if(!record) throw new Error('MAJOR_LIST_OWNER_CHANGED');
      const major=this.mapToDto(record);const profile=major.profiles?.find(item=>item.id===row.profileId);
      return profile?{...major,profileId:profile.id,status:profile.status ?? major.status,completenessStatus:profile.completenessStatus ?? major.completenessStatus,
        degreeLevel:profile.level,classificationCode:profile.code,publicId:profile.code || major.publicId,displayName:profile.displayName || major.displayName,
        nameAr:profile.localizedNameAr || major.localizedNameAr,nameEn:profile.localizedNameEn || major.localizedNameEn || major.canonicalName}:major;
    });
    const total=Number(counts[0]?.total ?? 0);
    return {data,total,page,pageSize,totalPages:Math.ceil(total/pageSize),stats:{published:Number(counts[0]?.published ?? 0),needsReview:Number(counts[0]?.needsReview ?? 0),complete:Number(counts[0]?.complete ?? 0)}};
  }

  async findPublishedSnapshot(slug:string,options?:{degreeLevel?:string;profileCode?:string}):Promise<MajorDto|null> {
    const rows=await this.prisma.$queryRaw<Array<{payload:Prisma.JsonValue}>>`SELECT s.payload FROM "MajorPublicationSnapshot" s
      JOIN "MajorLevelProfile" p ON p.id=s."profileId" AND p."majorId"=s."majorId" AND p."currentPublishedVersionId"=s."versionId"
      JOIN "MajorVersion" v ON v.id=s."versionId" AND v."majorId"=s."majorId" AND v."profileId"=p.id AND v.status='PUBLISHED'
      JOIN "Major" m ON m.id=s."majorId" WHERE s.payload->>'slug'=${slug}
      AND (${options?.degreeLevel ?? null}::text IS NULL OR s.payload->>'degreeLevel'=${options?.degreeLevel?.toUpperCase() ?? null})
      AND (${options?.profileCode ?? null}::text IS NULL OR s.payload->>'classificationCode'=${options?.profileCode ?? null})
      ORDER BY s."publishedAt" DESC,s."versionId" LIMIT 1`;
    return rows[0] ? this.snapshotDto(rows[0].payload) : null;
  }

  async listPublished(filters:PublicMajorFilters):Promise<PaginatedMajorResult<MajorDto>> {
    const limit=boundedCursorLimit(filters.limit,20,50);
    const after=decodeStableCursor(filters.cursor);
    const query=Prisma.sql`FROM "MajorPublicationSnapshot" s
      JOIN "MajorLevelProfile" p ON p.id=s."profileId" AND p."majorId"=s."majorId" AND p."currentPublishedVersionId"=s."versionId"
      JOIN "MajorVersion" v ON v.id=s."versionId" AND v."majorId"=s."majorId" AND v."profileId"=p.id AND v.status='PUBLISHED'
      WHERE (${filters.degreeLevel ?? null}::text IS NULL OR s.payload->>'degreeLevel'=${filters.degreeLevel?.toUpperCase() ?? null})
        AND (${filters.academicFieldId ?? null}::text IS NULL OR s.payload->>'academicFieldId'=${filters.academicFieldId ?? null})
        AND (${filters.disciplineId ?? null}::text IS NULL OR s.payload->>'disciplineId'=${filters.disciplineId ?? null})
        AND (${filters.taxonomyNodeId ?? null}::text IS NULL OR s.payload->>'academicFieldId'=${filters.taxonomyNodeId ?? null} OR s.payload->>'disciplineId'=${filters.taxonomyNodeId ?? null})
        AND (${filters.search ?? ''}='' OR strpos(lower(s.payload->>'displayName'),lower(${filters.search ?? ''}))>0 OR strpos(lower(s.payload->>'canonicalName'),lower(${filters.search ?? ''}))>0 OR strpos(lower(s.payload->>'localizedNameAr'),lower(${filters.search ?? ''}))>0 OR strpos(lower(s.payload->>'localizedNameEn'),lower(${filters.search ?? ''}))>0)`;
    const [rows,counts]=await Promise.all([
      this.prisma.$queryRaw<Array<{versionId:string;payload:Prisma.JsonValue}>>(Prisma.sql`SELECT s."versionId",s.payload ${query} AND (${after}::text IS NULL OR s."versionId">${after}) ORDER BY s."versionId" LIMIT ${limit+1}`),
      this.prisma.$queryRaw<Array<{total:bigint}>>(Prisma.sql`SELECT count(*) AS total ${query}`),
    ]);
    const hasMore=rows.length>limit; const data=rows.slice(0,limit);const total=Number(counts[0]?.total ?? 0);
    return {data:data.map(row=>this.snapshotDto(row.payload)),total,page:1,pageSize:limit,totalPages:Math.ceil(total/limit),hasMore,nextCursor:hasMore?encodeStableCursor(data.at(-1)!.versionId):null};
  }

  private snapshotDto(value:Prisma.JsonValue):MajorDto {
    const payload=this.asRecord(value) as unknown as MajorDto;
    const content=this.asRecord(value).contentSections;
    return {...payload,status:MajorStatus.PUBLISHED,completenessStatus:MajorImportCompletenessState.COMPLETE,
      profiles:payload.profiles?.map(profile=>({...profile,contentSections:Array.isArray(content)?content as unknown as MajorContentSectionDto[]:[]}))};
  }

  async createVersion(data: Omit<MajorVersionDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorVersionDto> {
    if(!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    if(!data.majorId) throw new Error('MAJOR_VERSION_OWNER_REQUIRED');
    await this.acquireVersionAllocationLock(data.majorId);
    const record = await this.prisma.majorVersion.create({
      data: {
        majorId: data.majorId ?? '',
        profileId: data.profileId,
        versionNumber: data.versionNumber,
        status: data.status,
        sourceImportRecordId: data.sourceImportRecordId,
        sourceFileName: data.sourceFileName,
        sourceUri: data.sourceUri,
        sourceHash: data.sourceHash,
        importedAt: data.importedAt,
        publishedAt: data.publishedAt,
        approvedBy: data.approvedBy,
        supersededAt: data.supersededAt,
        changeSummary: data.changeSummary as Prisma.InputJsonObject | undefined,
        rawContentBlocks: data.rawContentBlocks as Prisma.InputJsonObject | undefined,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
    });

    await this.prisma.major.update({where:{id:data.majorId},data:{updatedAt:new Date()}});
    return this.mapVersionToDto(record);
  }

  async acquireVersionAllocationLock(majorId: string): Promise<void> {
    if(!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    await this.prisma.$queryRaw`
      SELECT id FROM "Major" WHERE id=${majorId} FOR UPDATE
    `;
  }

  async listVersions(idOrProfileId: string, options?: { profileId?: string;page?:number }): Promise<MajorVersionDto[]> {
    const resolvedProfile = await this.resolveProfile(idOrProfileId, options?.profileId);
    if (options?.profileId && !resolvedProfile) return [];
    if (options?.profileId && resolvedProfile) {
      const records = await this.prisma.majorVersion.findMany({
        where: { profileId: resolvedProfile.id },
        take:25,skip:(Math.min(1000,Math.max(1,options?.page ?? 1))-1)*25,
        orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
      });
      return records.map((record) => this.mapVersionToDto(record));
    }
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorVersion.findMany({
      where: { majorId },
      take:25,skip:(Math.min(1000,Math.max(1,options?.page ?? 1))-1)*25,
      orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.mapVersionToDto(record));
  }

  async createLevelProfile(data: Omit<MajorLevelProfileDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorLevelProfileDto> {
    const record = await this.prisma.majorLevelProfile.create({
      data: {
        majorId: data.majorId ?? '',
        level: data.level,
        degreeLevelId: data.degreeLevelId,
        code: data.code,
        profileType: data.profileType,
        displayName: data.displayName,
        localizedNameAr: data.localizedNameAr,
        localizedNameEn: data.localizedNameEn,
        collegeContext: data.collegeContext,
        academicFieldId: data.academicFieldId,
        disciplineId: data.disciplineId,
        currentPublishedVersionId: data.currentPublishedVersionId,
        status: data.status,
        completenessStatus: data.completenessStatus,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
      include: {
        degreeLevel: true,
        academicField: true,
        discipline: true,
        classificationMappings: true,
      }
    });

    return this.mapLevelProfileToDto(record);
  }

  async findLevelProfile(majorId: string, level: MajorLevel, code?: string): Promise<MajorLevelProfileDto | null> {
    const record = await this.prisma.majorLevelProfile.findFirst({
      where: {
        majorId,
        level,
        code: code ?? null,
      },
      include: {
        degreeLevel: true,
        academicField: true,
        discipline: true,
        classificationMappings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return record ? this.mapLevelProfileToDto(record) : null;
  }

  async listLevelProfiles(idOrProfileId: string): Promise<MajorLevelProfileDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorLevelProfile.findMany({
      where: { majorId },
      include: {
        degreeLevel: true,
        academicField: true,
        discipline: true,
        classificationMappings: true,
      },
      orderBy: [{ level: 'asc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.mapLevelProfileToDto(record));
  }

  async allocateNextProfileCode(prefix:MajorSourceIdentityPrefix,floor=0):Promise<string> {
    if(!this.transactionBound) throw new Error('MAJOR_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    // One allocator lock avoids opposite-order deadlocks when one discovery spans multiple levels.
    await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(10,10)::text`;
    const rows=await this.prisma.$queryRaw<Array<{maximum:bigint}>>`SELECT coalesce(max(substring(code FROM 5)::bigint),0) AS maximum FROM "MajorLevelProfile" WHERE code ~ ${'^'+prefix+'-[0-9]{1,12}$'}`;
    const maximum=Math.max(floor,Number(rows[0]?.maximum ?? 0));
    if(!Number.isSafeInteger(maximum) || maximum<0) throw new Error('MAJOR_PROFILE_CODE_RANGE_INVALID');
    return `${prefix}-${String(maximum+1).padStart(4,'0')}`;
  }

  async listByTaxonomyNode(taxonomyNodeId: string): Promise<TaxonomyMappedMajorDto[]> {
    const records = await this.prisma.majorClassificationMapping.findMany({
      where: { taxonomyNodeId },
      include: {
        major: { select: { id: true, canonicalName: true } },
        profile: { select: { id: true, displayName: true, level: true } },
      },
      orderBy: [{ relationshipType: 'asc' }, { createdAt: 'asc' }],
    });

    return records.map((record) => ({
      id: record.id,
      relationshipType: record.relationshipType as TaxonomyMappedMajorDto['relationshipType'],
      major: record.major ?? undefined,
      profile: record.profile
        ? {
            id: record.profile.id,
            displayName: record.profile.displayName ?? record.profile.level,
            level: record.profile.level as MajorLevel,
          }
        : undefined,
    }));
  }

  async createContentSections(data: Array<Omit<MajorContentSectionDto, 'id'>>): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.majorContentSection.createMany({
      data: data.map((section) => ({
        profileId: section.profileId,
        versionId: section.versionId,
        sectionKey: section.sectionKey,
        title: section.title,
        locale: section.locale,
        content: section.content,
        sourceSectionPath: section.sourceSectionPath,
        reviewStatus: section.reviewStatus,
        metadata: section.metadata as Prisma.InputJsonObject | undefined,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async listContentSections(
    idOrProfileId: string,
    options?: { profileId?: string; versionId?: string; publishedOnly?: boolean }
  ): Promise<MajorContentSectionDto[]> {
    const resolvedProfile = await this.resolveProfile(idOrProfileId, options?.profileId);

    if (resolvedProfile) {
      const profileId = resolvedProfile.id;
      let targetVersionId = options?.versionId;
      if (options?.publishedOnly && (!resolvedProfile.currentPublishedVersionId ||
        (targetVersionId && targetVersionId !== resolvedProfile.currentPublishedVersionId))) return [];

      if (!targetVersionId) {
        if (options?.publishedOnly) {
          if (!resolvedProfile.currentPublishedVersionId) {
            // Draft not published: do not leak drafts on public pages
            return [];
          }
          targetVersionId = resolvedProfile.currentPublishedVersionId;
        } else {
          // Admin view: fetch latest working version for THIS profile
          const latestVersion = await this.prisma.majorVersion.findFirst({
            where: { profileId },
            orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }],
            select: { id: true }
          });
          targetVersionId = latestVersion?.id;
        }
      }

      if (targetVersionId) {
        const records = await this.prisma.majorContentSection.findMany({
          where: {
            profileId,
            versionId: targetVersionId,
          },
          orderBy: [{ sectionKey: 'asc' }, { createdAt: 'asc' }],
        });
        return records.map((record) => this.mapContentSectionToDto(record));
      }

      const records = await this.prisma.majorContentSection.findMany({
        where: { profileId },
        orderBy: [{ sectionKey: 'asc' }, { createdAt: 'asc' }],
      });
      return records.map((record) => this.mapContentSectionToDto(record));
    }

    return [];
  }

  async updateContentSections(
    profileId: string,
    versionId: string,
    sections: Array<{ id?: string; sectionKey: string; title?: string; content: string; reviewStatus?: string }>
  ): Promise<{ count: number; sections: MajorContentSectionDto[] }> {
    if (!this.transactionBound) throw new Error('MAJOR_CONTENT_TRANSACTION_REQUIRED');
    if(sections.length>100) throw new Error('MAJOR_CONTENT_SECTION_LIMIT');
    const version = await this.prisma.majorVersion.findUnique({
      where: { id: versionId },
      include: { profile: true }
    });
    if (!version) {
      throw new Error(`Version with id ${versionId} not found`);
    }
    if (version.profileId !== profileId || version.profile?.majorId !== version.majorId) {
      throw new Error('MAJOR_CONTENT_FOREIGN_VERSION');
    }
    if (version.publishedAt || ['PUBLISHED', 'ARCHIVED', 'SUPERSEDED'].includes(version.status)
      || ['PUBLISHED', 'ARCHIVED'].includes(version.profile.status)) {
      throw new Error('MAJOR_CONTENT_PUBLISHED_VERSION_IMMUTABLE');
    }
    const sectionKeys = new Set<string>();
    for (const sec of sections) {
      if (!sec.sectionKey.trim() || sectionKeys.has(sec.sectionKey)) throw new Error('MAJOR_CONTENT_DUPLICATE_OR_EMPTY_SECTION_KEY');
      if (sec.reviewStatus && !['NEEDS_REVIEW', 'COMPLETE', 'INCOMPLETE'].includes(sec.reviewStatus)) {
        throw new Error('MAJOR_CONTENT_INVALID_REVIEW_STATUS');
      }
      sectionKeys.add(sec.sectionKey);
      if (sec.id) {
        const existing = await this.prisma.majorContentSection.findUnique({
          where: { id: sec.id },
          select: { profileId: true, versionId: true, sectionKey: true },
        });
        if (!existing || existing.profileId !== profileId || existing.versionId !== versionId || existing.sectionKey !== sec.sectionKey) {
          throw new Error('MAJOR_CONTENT_FOREIGN_SECTION');
        }
      }
    }

    for (const sec of sections) {
      if (sec.id) {
        await this.prisma.majorContentSection.update({
          where: { id: sec.id },
          data: {
            title: sec.title,
            content: sec.content,
            reviewStatus: sec.reviewStatus || 'NEEDS_REVIEW',
            updatedAt: new Date(),
          }
        });
      } else {
        await this.prisma.majorContentSection.upsert({
          where: {
            profileId_versionId_sectionKey_locale: {
              profileId,
              versionId,
              sectionKey: sec.sectionKey,
              locale: 'ar',
            }
          },
          update: {
            title: sec.title,
            content: sec.content,
            reviewStatus: sec.reviewStatus || 'NEEDS_REVIEW',
            updatedAt: new Date(),
          },
          create: {
            profileId,
            versionId,
            sectionKey: sec.sectionKey,
            title: sec.title,
            content: sec.content,
            locale: 'ar',
            reviewStatus: sec.reviewStatus || 'NEEDS_REVIEW',
          }
        });
      }
    }

    await this.prisma.majorVersion.update({
      where: { id: versionId },
      data: {status:'NEEDS_REVIEW',approvedBy:null,metadata:{...this.asRecord(version.metadata),reviewApproval:null},updatedAt:new Date()}
    });
    await this.prisma.majorLevelProfile.update({
      where: { id: profileId },
      data: {status:'READY_TO_REVIEW',completenessStatus:'NEEDS_REVIEW',updatedAt:new Date()}
    });

    const updated = await this.prisma.majorContentSection.findMany({
      where: { profileId, versionId },
      orderBy: [{ sectionKey: 'asc' }],
    });

    return {
      count: sections.length,
      sections: updated.map(s => this.mapContentSectionToDto(s))
    };
  }

  async createAliases(data: Array<Omit<MajorAliasDto, 'id'>>): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.majorAlias.createMany({
      data: data.map((alias) => ({
        majorId: alias.majorId ?? '',
        locale: alias.locale,
        alias: alias.alias,
        normalizedAlias: alias.normalizedAlias ?? alias.alias.trim().toLowerCase(),
        aliasType: alias.aliasType ?? 'ALIAS',
        sourceId: alias.sourceId,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async listAliases(idOrProfileId: string): Promise<MajorAliasDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorAlias.findMany({
      where: { majorId },
      orderBy: [{ aliasType: 'asc' }, { locale: 'asc' }, { alias: 'asc' }],
    });

    return records.map((record) => ({
      ...record,
      locale: record.locale ?? undefined,
      aliasType: record.aliasType as MajorAliasDto['aliasType'],
      sourceId: record.sourceId ?? undefined,
    }));
  }

  async createRelationships(data: Array<Omit<MajorRelationshipDto, 'id'>>): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    this.assertRelationshipInvariants(data);
    const result = await this.prisma.majorRelationship.createMany({
      data: data.map((relationship) => ({
        sourceMajorId: relationship.sourceMajorId,
        targetMajorId: relationship.targetMajorId,
        sourceProfileId: relationship.sourceProfileId,
        targetProfileId: relationship.targetProfileId,
        relationshipType: relationship.relationshipType,
        confidence: relationship.confidence,
        notes: relationship.notes,
        metadata: relationship.metadata as Prisma.InputJsonObject | undefined,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async listRelationships(idOrProfileId: string): Promise<MajorRelationshipDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorRelationship.findMany({
      where: {
        OR: [
          { sourceMajorId: majorId },
          { targetMajorId: majorId },
          { sourceProfile: { majorId } },
          { targetProfile: { majorId } },
        ],
      },
      orderBy: [{ relationshipType: 'asc' }, { createdAt: 'asc' }],
    });

    return records.map((record) => ({
      ...record,
      sourceMajorId: record.sourceMajorId ?? undefined,
      targetMajorId: record.targetMajorId ?? undefined,
      sourceProfileId: record.sourceProfileId ?? undefined,
      targetProfileId: record.targetProfileId ?? undefined,
      relationshipType: record.relationshipType as MajorRelationshipDto['relationshipType'],
      confidence: record.confidence ?? undefined,
      notes: record.notes ?? undefined,
      metadata: this.asRecord(record.metadata),
    }));
  }

  async createClassificationMappings(data: Array<Omit<MajorClassificationMappingDto, 'id'>>): Promise<{ count: number }> {
    if (data.length === 0) {
      return { count: 0 };
    }

    this.assertClassificationMappingInvariants(data);
    const result = await this.prisma.majorClassificationMapping.createMany({
      data: data.map((mapping) => ({
        majorId: mapping.majorId,
        profileId: mapping.profileId,
        taxonomyNodeId: mapping.taxonomyNodeId,
        relationshipType: mapping.relationshipType,
        standardType: mapping.standardType,
        standardCode: mapping.standardCode,
        confidence: mapping.confidence,
        notes: mapping.notes,
        metadata: mapping.metadata as Prisma.InputJsonObject | undefined,
      })),
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async reviewGraph(id:string,kind:'ALIAS'|'RELATIONSHIP',input:Record<string,string>,actorId:string):Promise<void> {
    if(!this.transactionBound) throw new Error('MAJOR_GRAPH_TRANSACTION_REQUIRED');
    const majorId=await this.resolveMajorId(id);
    const owner=await this.prisma.major.findUnique({where:{id:majorId}});
    if(!owner || ['PUBLISHED','ARCHIVED','REJECTED'].includes(owner.status)) throw new Error('MAJOR_GRAPH_OWNER_IMMUTABLE');
    if(!input.evidenceReference?.trim()) throw new Error('MAJOR_GRAPH_REVIEW_EVIDENCE_REQUIRED');
    if(kind==='ALIAS') {
      const alias=input.alias?.trim();if(!alias) throw new Error('MAJOR_ALIAS_REQUIRED');
      const normalizedAlias=MajorNamingService.normalizeSearchText(alias);
      const aliasType=input.aliasType || 'ALIAS';
      if(!['ALIAS','SYNONYM','HISTORICAL_NAME'].includes(aliasType) || !['ar','en'].includes(input.locale)) throw new Error('MAJOR_ALIAS_INVALID_TYPE');
      const duplicate=await this.prisma.majorAlias.findFirst({where:{majorId,normalizedAlias,locale:input.locale,aliasType}});
      if(duplicate) throw new Error('MAJOR_ALIAS_DUPLICATE');
      await this.prisma.majorAlias.create({data:{majorId,alias,normalizedAlias,locale:input.locale,aliasType,sourceId:input.evidenceReference}});
    } else {
      const target=await this.prisma.major.findUnique({where:{id:input.targetMajorId}});
      if(!target || target.id===majorId || ['REJECTED','ARCHIVED'].includes(target.status)) throw new Error('MAJOR_RELATIONSHIP_INVALID_TARGET');
      const type=input.relationshipType;
      if(!['SIMILAR','PARENT','CHILD','CROSS_LISTED'].includes(type)) throw new Error('MAJOR_RELATIONSHIP_INVALID_TYPE');
      // Serialize topology changes in one owner transaction; prevent cycles in PARENT/CHILD links.
      await this.prisma.$queryRaw`SELECT pg_advisory_xact_lock(10, 9)::text`;
      const parent=type==='CHILD'?target.id:majorId;const child=type==='CHILD'?majorId:target.id;
      if(['PARENT','CHILD'].includes(type)) {
        const cycle=await this.prisma.$queryRaw<Array<{exists:boolean}>>`WITH RECURSIVE edges AS (
          SELECT CASE WHEN "relationshipType"='PARENT' THEN "sourceMajorId" ELSE "targetMajorId" END AS child,
            CASE WHEN "relationshipType"='PARENT' THEN "targetMajorId" ELSE "sourceMajorId" END AS parent
          FROM "MajorRelationship" WHERE "relationshipType" IN ('PARENT','CHILD') AND "sourceMajorId" IS NOT NULL AND "targetMajorId" IS NOT NULL
        ), ancestors(id) AS (SELECT ${child}::text UNION SELECT e.parent FROM edges e JOIN ancestors a ON e.child=a.id)
        SELECT EXISTS(SELECT 1 FROM ancestors WHERE id=${parent}) AS exists`;
        if(cycle[0]?.exists) throw new Error('MAJOR_RELATIONSHIP_CYCLE');
      }
      const sourceChild=type==='PARENT'?majorId:target.id;const sourceParent=type==='PARENT'?target.id:majorId;
      const duplicate=await this.prisma.majorRelationship.findFirst({where:{OR:['PARENT','CHILD'].includes(type)?[{sourceMajorId:sourceChild,targetMajorId:sourceParent,relationshipType:'PARENT'},{sourceMajorId:sourceParent,targetMajorId:sourceChild,relationshipType:'CHILD'}]:[{sourceMajorId:majorId,targetMajorId:target.id,relationshipType:type},{sourceMajorId:target.id,targetMajorId:majorId,relationshipType:type}]}});
      if(duplicate) throw new Error('MAJOR_RELATIONSHIP_DUPLICATE');
      await this.prisma.majorRelationship.create({data:{sourceMajorId:majorId,targetMajorId:target.id,relationshipType:type,notes:input.reason,metadata:{actorId,evidenceReference:input.evidenceReference}}});
    }
  }

  async addReviewedClassificationMapping(majorId: string, input: ReviewedMajorClassificationInput): Promise<MajorClassificationMappingDto> {
    if (!this.transactionBound) throw new Error('MAJOR_GRAPH_TRANSACTION_REQUIRED');
    if (!input.reason.trim() || !input.evidenceReference.trim()) throw new Error('MAJOR_GRAPH_REVIEW_EVIDENCE_REQUIRED');
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "Major" WHERE "id" = ${majorId} FOR UPDATE`);
    const owner = await this.prisma.major.findUnique({ where: { id: majorId }, select: { id: true, status: true } });
    if (!owner) throw new Error('MAJOR_GRAPH_OWNER_NOT_FOUND');
    if (['PUBLISHED', 'ARCHIVED', 'REJECTED', 'SUPERSEDED', 'MERGED'].includes(owner.status)) throw new Error('MAJOR_GRAPH_OWNER_IMMUTABLE');
    if (input.profileId) {
      await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "MajorLevelProfile" WHERE "id" = ${input.profileId} FOR SHARE`);
      const profile = await this.prisma.majorLevelProfile.findUnique({ where: { id: input.profileId }, select: { majorId: true, status: true } });
      if (!profile || profile.majorId !== majorId) throw new Error('MAJOR_GRAPH_FOREIGN_PROFILE_OWNER');
      if (['PUBLISHED', 'ARCHIVED', 'REJECTED', 'SUPERSEDED', 'MERGED'].includes(profile.status)) throw new Error('MAJOR_GRAPH_OWNER_IMMUTABLE');
    }
    await this.prisma.$queryRaw(Prisma.sql`SELECT "id" FROM "AcademicTaxonomyNode" WHERE "id" = ${input.taxonomyNodeId} FOR SHARE`);
    const node = await this.prisma.academicTaxonomyNode.findUnique({ where: { id: input.taxonomyNodeId }, select: { id: true, status: true, standardType: true, standardCode: true } });
    if (!node || node.status !== 'ACTIVE') throw new Error('MAJOR_CANONICAL_TAXONOMY_REFERENCE_NOT_ACTIVE');
    const mappingOwner = { majorId, profileId: input.profileId ?? null };
    const duplicateOwner = input.profileId ? { profileId: input.profileId } : { majorId, profileId: null };
    const duplicate = await this.prisma.majorClassificationMapping.findFirst({ where: { ...duplicateOwner, taxonomyNodeId: node.id, relationshipType: input.relationshipType } });
    if (duplicate) throw new Error('MAJOR_GRAPH_DUPLICATE_MAPPING');
    const record = await this.prisma.majorClassificationMapping.create({ data: {
      ...mappingOwner, taxonomyNodeId: node.id, relationshipType: input.relationshipType,
      standardType: node.standardType, standardCode: node.standardCode,
      notes: input.reason.trim(), metadata: { source: 'ADMIN_REVIEW', evidenceReference: input.evidenceReference.trim() },
    } });
    return this.mapClassificationMappingToDto(record);
  }

  async listClassificationMappings(idOrProfileId: string): Promise<MajorClassificationMappingDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorClassificationMapping.findMany({
      where: {
        OR: [
          { majorId },
          { profile: { majorId } },
        ],
      },
      orderBy: [{ relationshipType: 'asc' }, { createdAt: 'asc' }],
    });

    return records.map((record) => this.mapClassificationMappingToDto(record));
  }

  async createSource(data: Omit<MajorSourceDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<MajorSourceDto> {
    this.assertHasOwner(data.majorId, data.profileId, 'MajorSource');
    const record = await this.prisma.majorSource.create({
      data: {
        majorId: data.majorId,
        profileId: data.profileId,
        sourceType: data.sourceType,
        sourceName: data.sourceName,
        sourceLocale: data.sourceLocale,
        sourceUri: data.sourceUri,
        sourceHash: data.sourceHash,
        importedAt: data.importedAt,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
    });

    return this.mapSourceToDto(record);
  }

  async listSources(idOrProfileId: string): Promise<MajorSourceDto[]> {
    const majorId = await this.resolveMajorId(idOrProfileId);
    const records = await this.prisma.majorSource.findMany({
      where: { majorId },
      take:50,
      orderBy: [{ importedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map((record) => this.mapSourceToDto(record));
  }

  private async lockActivePublicationReferences(profile:{degreeLevelId:string|null;academicFieldId:string|null;disciplineId:string|null},majorId:string):Promise<void> {
    const degrees=await this.prisma.$queryRaw<Array<{id:string;status:string}>>`SELECT id,status FROM "DegreeLevel" WHERE id=${profile.degreeLevelId} ORDER BY id FOR SHARE`;
    if(degrees.length!==1 || degrees[0].status!=='ACTIVE') throw new Error('MAJOR_CANONICAL_DEGREE_REFERENCE_NOT_ACTIVE');
    const mappings=await this.prisma.majorClassificationMapping.findMany({where:{OR:[{majorId,profileId:null},{profileId:(profile as {id?:string}).id}]},select:{taxonomyNodeId:true}});
    const ids=[...new Set([profile.academicFieldId,profile.disciplineId,...mappings.map(mapping=>mapping.taxonomyNodeId)].filter((id):id is string=>Boolean(id)))].sort();
    for(const id of ids) {
      const nodes=await this.prisma.$queryRaw<Array<{id:string;status:string}>>`SELECT id,status FROM "AcademicTaxonomyNode" WHERE id=${id} FOR SHARE`;
      if(nodes.length!==1 || nodes[0].status!=='ACTIVE') throw new Error('MAJOR_CANONICAL_TAXONOMY_REFERENCE_NOT_ACTIVE');
    }
  }

  private async resolveMajorId(id: string): Promise<string> {
    const majorCount = await this.prisma.major.count({ where: { id } });
    if (majorCount > 0) {
      return id;
    }
    const profile = await this.prisma.majorLevelProfile.findFirst({
      where: {
        OR: [
          { id },
          { code: id },
        ]
      },
      select: { majorId: true }
    });
    if (profile) {
      return profile.majorId;
    }
    const majorByPublicId = await this.prisma.major.findUnique({
      where: { publicId: id },
      select: { id: true }
    });
    if (majorByPublicId) {
      return majorByPublicId.id;
    }
    return id;
  }

  private async resolveProfile(idOrProfileId: string, optionsProfileId?: string): Promise<{ id: string; majorId: string; level: string; code: string | null; currentPublishedVersionId: string | null } | null> {
    if (optionsProfileId) {
      const majorId = await this.resolveMajorId(idOrProfileId);
      const p = await this.prisma.majorLevelProfile.findFirst({
        where: {
          majorId,
          OR: [
            { id: optionsProfileId },
            { code: optionsProfileId },
          ]
        },
        select: { id: true, majorId: true, level: true, code: true, currentPublishedVersionId: true }
      });
      return p;
    }

    const directProfile = await this.prisma.majorLevelProfile.findFirst({
      where: {
        OR: [
          { id: idOrProfileId },
          { code: idOrProfileId },
        ]
      },
      select: { id: true, majorId: true, level: true, code: true, currentPublishedVersionId: true }
    });
    if (directProfile) return directProfile;

    const majorId = await this.resolveMajorId(idOrProfileId);
    const profiles = await this.prisma.majorLevelProfile.findMany({
      where: { majorId },
      orderBy: [{ level: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, majorId: true, level: true, code: true, currentPublishedVersionId: true }
    });
    if (profiles.length > 0) {
      return profiles[0];
    }
    return null;
  }

  private mapToDto(record: any): MajorDto {
    const { optionalFields, levelProfiles, academicField, discipline, classificationMappings, ...rest } = record;
    const safeOptionalFields = this.sanitizeOptionalFields(optionalFields);
    return {
      ...safeOptionalFields,
      ...rest,
      revision:new Date(record.updatedAt).getTime(),
      optionalFields: safeOptionalFields,
      academicField: academicField ? this.mapNodeToDto(academicField) : null,
      discipline: discipline ? this.mapNodeToDto(discipline) : null,
      classificationMappings: classificationMappings ? classificationMappings.map((m: any) => this.mapClassificationMappingToDto(m)) : undefined,
      profiles: levelProfiles ? levelProfiles.map((p: any) => this.mapLevelProfileToDto(p)) : undefined,
    } as MajorDto;
  }

  private asRecord(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private sanitizeOptionalFields(value: Prisma.JsonValue | Record<string, unknown> | null | undefined): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this.asRecord(value)).filter(([key]) => !MAJOR_OPTIONAL_FIELDS_RESERVED_KEYS.has(key))
    );
  }

  private assertHasOwner(majorId: string | undefined, profileId: string | undefined, subject: string): void {
    if (!majorId && !profileId) {
      throw new Error(`${subject} must have a Major or MajorLevelProfile owner`);
    }
  }

  private assertClassificationMappingInvariants(data: Array<Omit<MajorClassificationMappingDto, 'id'>>): void {
    const semanticKeys = new Set<string>();
    for (const mapping of data) {
      this.assertHasOwner(mapping.majorId, mapping.profileId, 'MajorClassificationMapping');
      if (!mapping.taxonomyNodeId?.trim()) throw new Error('MajorClassificationMapping requires taxonomyNodeId');
      const key = [mapping.majorId ?? '', mapping.profileId ?? '', mapping.taxonomyNodeId, mapping.relationshipType].join('|');
      if (semanticKeys.has(key)) throw new Error(`Duplicate semantic MajorClassificationMapping: ${key}`);
      semanticKeys.add(key);
    }
  }

  private assertRelationshipInvariants(data: Array<Omit<MajorRelationshipDto, 'id'>>): void {
    const semanticKeys = new Set<string>();
    for (const relationship of data) {
      this.assertHasOwner(relationship.sourceMajorId, relationship.sourceProfileId, 'MajorRelationship source');
      this.assertHasOwner(relationship.targetMajorId, relationship.targetProfileId, 'MajorRelationship target');
      const source = relationship.sourceMajorId ?? relationship.sourceProfileId!;
      const target = relationship.targetMajorId ?? relationship.targetProfileId!;
      if (source === target) throw new Error('MajorRelationship cannot target itself');
      const key = [source, target, relationship.relationshipType].join('|');
      if (semanticKeys.has(key)) throw new Error(`Duplicate semantic MajorRelationship: ${key}`);
      semanticKeys.add(key);
    }
  }

  private mapVersionToDto(record: Prisma.MajorVersionGetPayload<Record<string, never>>): MajorVersionDto {
    return {
      ...record,
      profileId: record.profileId ?? undefined,
      sourceImportRecordId: record.sourceImportRecordId ?? undefined,
      sourceFileName: record.sourceFileName ?? undefined,
      sourceUri: record.sourceUri ?? undefined,
      sourceHash: record.sourceHash ?? undefined,
      importedAt: record.importedAt ?? undefined,
      publishedAt: record.publishedAt ?? undefined,
      approvedBy: record.approvedBy ?? undefined,
      supersededAt: record.supersededAt ?? undefined,
      status: record.status as MajorVersionDto['status'],
      changeSummary: this.asRecord(record.changeSummary),
      rawContentBlocks: this.asRecord(record.rawContentBlocks),
      metadata: this.asRecord(record.metadata),
    };
  }

  private mapLevelProfileToDto(record: any): MajorLevelProfileDto {
    const { degreeLevel, academicField, discipline, classificationMappings, ...rest } = record;
    return {
      ...rest,
      level: record.level as MajorLevelProfileDto['level'],
      degreeLevelId: record.degreeLevelId ?? undefined,
      code: record.code ?? undefined,
      profileType: record.profileType as MajorLevelProfileDto['profileType'],
      displayName: record.displayName ?? undefined,
      localizedNameAr: record.localizedNameAr ?? undefined,
      localizedNameEn: record.localizedNameEn ?? undefined,
      collegeContext: record.collegeContext ?? undefined,
      academicFieldId: record.academicFieldId ?? undefined,
      disciplineId: record.disciplineId ?? undefined,
      currentPublishedVersionId: record.currentPublishedVersionId ?? undefined,
      status: record.status as MajorLevelProfileDto['status'],
      completenessStatus: record.completenessStatus as MajorLevelProfileDto['completenessStatus'],
      metadata: this.asRecord(record.metadata),
      degreeLevel: degreeLevel ? this.mapDegreeLevelToDto(degreeLevel) : null,
      academicField: academicField ? this.mapNodeToDto(academicField) : null,
      discipline: discipline ? this.mapNodeToDto(discipline) : null,
      classificationMappings: classificationMappings ? classificationMappings.map((m: any) => this.mapClassificationMappingToDto(m)) : undefined,
    };
  }

  private mapContentSectionToDto(record: Prisma.MajorContentSectionGetPayload<Record<string, never>>): MajorContentSectionDto {
    return {
      ...record,
      profileId: record.profileId ?? undefined,
      versionId: record.versionId ?? undefined,
      title: record.title ?? undefined,
      locale: record.locale ?? undefined,
      sourceSectionPath: record.sourceSectionPath ?? undefined,
      reviewStatus: record.reviewStatus as MajorContentSectionDto['reviewStatus'],
      metadata: this.asRecord(record.metadata),
    };
  }

  private mapSourceToDto(record: Prisma.MajorSourceGetPayload<Record<string, never>>): MajorSourceDto {
    return {
      ...record,
      majorId: record.majorId ?? undefined,
      profileId: record.profileId ?? undefined,
      sourceLocale: record.sourceLocale ?? undefined,
      sourceUri: record.sourceUri ?? undefined,
      sourceHash: record.sourceHash ?? undefined,
      importedAt: record.importedAt ?? undefined,
      sourceType: record.sourceType as MajorSourceDto['sourceType'],
      metadata: this.asRecord(record.metadata),
    };
  }

  private mapNodeToDto(node: any): AcademicTaxonomyNodeDto | null {
    if (!node) return null;
    return {
      nodeId: node.id,
      nodeType: node.nodeType,
      canonicalCode: node.canonicalCode,
      canonicalName: node.canonicalName,
      description: node.description ?? undefined,
      status: node.status,
      standardType: node.standardType,
      standardCode: node.standardCode ?? undefined,
      localizedNames: node.localizedNames ? (node.localizedNames as any) : undefined,
      metadata: node.metadata ? (node.metadata as any) : undefined,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  private mapDegreeLevelToDto(dl: any): DegreeLevelDto | null {
    if (!dl) return null;
    return {
      id: dl.id,
      canonicalCode: dl.canonicalCode,
      nameEn: dl.nameEn,
      nameAr: dl.nameAr,
      displayRank: dl.displayRank,
      status: dl.status,
      aliases: dl.aliases ? (dl.aliases as any) : undefined,
      metadata: dl.metadata ? (dl.metadata as any) : undefined,
      createdAt: dl.createdAt,
      updatedAt: dl.updatedAt,
    };
  }

  private mapClassificationMappingToDto(record: any): MajorClassificationMappingDto {
    return {
      id: record.id,
      majorId: record.majorId ?? undefined,
      profileId: record.profileId ?? undefined,
      taxonomyNodeId: record.taxonomyNodeId,
      relationshipType: record.relationshipType as MajorClassificationMappingDto['relationshipType'],
      standardType: record.standardType ?? undefined,
      standardCode: record.standardCode ?? undefined,
      confidence: record.confidence ?? undefined,
      notes: record.notes ?? undefined,
      metadata: this.asRecord(record.metadata),
    };
  }
}
