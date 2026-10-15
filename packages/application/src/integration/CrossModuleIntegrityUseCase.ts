import type {
  ICmsRepository,ICourseRepository,IReferenceDataRepository,
  IMajorRepository,
  IUniversityRepository,
  IScholarshipRepository,
  IInternationalTestRepository,
} from '@manaratak/domain';
import { isPublicScholarshipOwner } from '@manaratak/domain';
import {
  crossModuleIntegrityReport,
  type IntegrityFact,
  type IntegrityOwner,
} from './CrossModuleIntegrityReport';

/** Owner repositories are read only. Authorization is passed explicitly by the API boundary. */
export class CrossModuleIntegrityUseCase {
  constructor(
    private readonly majors: IMajorRepository,
    private readonly universities: IUniversityRepository,
    private readonly scholarships: IScholarshipRepository,
    private readonly tests: IInternationalTestRepository,
    private readonly cms?:ICmsRepository,
    private readonly courses?:ICourseRepository,
    private readonly references?:IReferenceDataRepository,
  ) {}
  async execute(owner: IntegrityOwner, allowed: ReadonlySet<IntegrityOwner>, page = 1) {
    if (!allowed.has(owner) || !Number.isInteger(page) || page < 1 || page > 10000)
      throw new Error('INTEGRITY_OWNER_SCOPE_INVALID');
    const repositories = {
      MAJORS: this.majors,
      UNIVERSITIES: this.universities,
      SCHOLARSHIPS: this.scholarships,
      TESTS: this.tests,
    };
    if(['PROGRAMS','COURSES','COUNTRIES'].includes(owner))throw new Error('INTEGRITY_SOURCE_OWNER_NOT_SUPPORTED');
    const startedAt=new Date().toISOString();
    const listed=owner==='CMS'?await this.cms!.listContent({page,pageSize:20}):await repositories[owner as keyof typeof repositories].list({page,pageSize:20});

    const full=await Promise.all(listed.data.slice(0,20).map(async(row)=>{try{return owner==='CMS'?await this.cms!.findContentById(row.id):await repositories[owner as keyof typeof repositories].findById(row.id);}catch{return null;}}));
    // Publication lists are not relationship detail contracts. Missing detail reads stay explicit.
    const source={data:full.flatMap(row=>row?[row]:[]),total:listed.total};
    const facts: IntegrityFact[] = [];
    const sourceFindings:Array<{owner:IntegrityOwner;ownerId:string;targetOwner:IntegrityOwner;targetId:string;code:string}>=[];
    let referenceReadFailures=0;
    let referencesTruncated = false;
    for (const row of source.data) {
      const refs: IntegrityFact['references'] = [];
      const add = (target: IntegrityOwner, id?: string | null) => {
        if (id && allowed.has(target) && !refs.some((r) => r.owner === target && r.id === id))
          refs.push({ owner: target, id });
      };
      if(owner==='CMS'){
        const links=await this.cms!.listDomainLinks?.(row.id).catch(()=>{++referenceReadFailures;return [];})??[];
        const mapping:Record<string,IntegrityOwner>={UNIVERSITY:'UNIVERSITIES',ACADEMIC_PROGRAM:'PROGRAMS',SCHOLARSHIP:'SCHOLARSHIPS',MAJOR:'MAJORS',INTERNATIONAL_TEST:'TESTS',COURSE:'COURSES',REFERENCE_COUNTRY:'COUNTRIES'};
        for(const link of links){const domain=mapping[link.targetType];if(domain)add(domain,link.targetId);else sourceFindings.push({owner,ownerId:row.id,targetOwner:'CMS',targetId:row.id,code:'UNKNOWN_POLYMORPHIC_OWNER'});}
      }
      if(owner==='MAJORS')for(const link of (row as import('@manaratak/domain').MajorDto).relationships??[])add('MAJORS',link.targetMajorId);
      if(owner==='TESTS')for(const link of (row as import('@manaratak/domain').InternationalTestDto).countryRelationships??[])add('COUNTRIES',link.canonicalReferenceId);
      if (owner === 'UNIVERSITIES')
        for (const program of (row as Awaited<ReturnType<IUniversityRepository['findById']>>)
          ?.academicPrograms ?? []) {
          if (program.status !== 'ACTIVE') continue;
          add('PROGRAMS',program.id);
          add('MAJORS', program.majorId);
          for (const requirement of program.admissionRequirements ?? [])
            if (requirement.status === 'ACTIVE') add('TESTS', requirement.internationalTestId);
        }
      if (owner === 'SCHOLARSHIPS') {
        const scholarship = row as NonNullable<
          Awaited<ReturnType<IScholarshipRepository['findById']>>
        >;
        for (const target of scholarship.majorTargets ?? []) add('MAJORS', target.majorId);
        for (const target of scholarship.universityLinks ?? []){add('UNIVERSITIES', target.universityId);add('PROGRAMS',target.academicProgramId);}
        for (const item of scholarship.eligibilityItems ?? [])
          add('TESTS', item.internationalTestId);
        for (const item of scholarship.requiredDocumentItems ?? [])
          add('TESTS', item.internationalTestId);
      }
      if (refs.length > 50) referencesTruncated = true;
      facts.push({
        owner,
        id: row.id,
        status: String(
          owner === 'SCHOLARSHIPS'
            ? (row as { publicationStatus?: string }).publicationStatus
            : row.status,
        ),
        references: refs.slice(0, 50),
      });
    }
    if (
      owner === 'SCHOLARSHIPS' &&
      allowed.has('UNIVERSITIES') &&
      this.universities.findPublishedAcademicProgramsByIds
    ) {
      const links = source.data
        .flatMap(
          (row) =>
            (row as NonNullable<Awaited<ReturnType<IScholarshipRepository['findById']>>>)
              .universityLinks ?? [],
        )
        .filter((link) => link.academicProgramId);
      const ids = [...new Set(links.map((link) => link.academicProgramId!))].slice(0, 50);
      if (links.length > 50) referencesTruncated = true;
      const programs = await this.universities.findPublishedAcademicProgramsByIds(ids);
      for (const fact of facts) {
        const row = source.data.find((row) => row.id === fact.id) as NonNullable<
          Awaited<ReturnType<IScholarshipRepository['findById']>>
        >;
        for (const link of row.universityLinks ?? []) {
          if (!link.academicProgramId || !ids.includes(link.academicProgramId)) continue;
          const program = programs.find((program) => program.ownerId === link.academicProgramId);
          if (program && link.universityId) {
            const ref = fact.references.find(
              (ref) => ref.owner === 'UNIVERSITIES' && ref.id === link.universityId,
            );
            if (ref) {
              ref.expectedParentId = link.universityId;
              ref.actualParentId = program.universityOwnerId;
            }
          }
        }
      }
    }
    const refs = [
      ...new Map(facts.flatMap((f) => f.references).map((r) => [`${r.owner}:${r.id}`, r])).values(),
    ];
    const selected = refs.slice(0, 50);
    if (refs.length > selected.length) referencesTruncated = true;
    const targets = await Promise.all(selected.map(async(ref)=>{
      try{
        if(ref.owner==='PROGRAMS'){if(!this.universities.readProgramIntegrityReference)throw new Error('OWNER_PORT_MISSING');const row=await this.universities.readProgramIntegrityReference(ref.id);return {key:`${ref.owner}:${ref.id}`,exists:!!row,published:row?.publiclyEligible??false,unavailable:false};}
        if(ref.owner==='COURSES'){if(!this.courses)throw new Error('OWNER_PORT_MISSING');const row=await this.courses.findById(ref.id),published=row?await this.courses.findBySlug(row.slug):null;return {key:`${ref.owner}:${ref.id}`,exists:!!row,published:!!published&&published.status==='PUBLISHED'&&published.completenessStatus==='COMPLETE'&&(published.originType!=='EXTERNAL_LINKED_COURSE'||(published.accessType==='FREE_STUDY_AND_CERTIFICATE'&&published.isStudyFree===true&&published.isFreeCertificate===true)),unavailable:false};}
        if(ref.owner==='COUNTRIES'){if(!this.references?.getCountryById)throw new Error('OWNER_PORT_MISSING');const row=await this.references.getCountryById(ref.id);return {key:`${ref.owner}:${ref.id}`,exists:!!row,published:row?.isActive===true&&row.lifecycleState==='ACTIVE',unavailable:false};}
        if(ref.owner==='CMS'){const row=await this.cms?.findContentById(ref.id);return {key:`${ref.owner}:${ref.id}`,exists:!!row,published:row?.status==='PUBLISHED',unavailable:false};}
        const target=await repositories[ref.owner].findById(ref.id);
        const published=!!target&&(ref.owner==='SCHOLARSHIPS'?isPublicScholarshipOwner(target as NonNullable<Awaited<ReturnType<IScholarshipRepository['findById']>>>):ref.owner==='TESTS'?Boolean((target as import('@manaratak/domain').InternationalTestDto).isPubliclyVisible&&(target as import('@manaratak/domain').InternationalTestDto).currentPublishedVersionId):target.status==='PUBLISHED');
        return {key:`${ref.owner}:${ref.id}`,exists:!!target,published,unavailable:false};
      }catch{return {key:`${ref.owner}:${ref.id}`,exists:false,published:false,unavailable:true};}
    }));
    const checked = new Map(
      targets.filter((t): t is NonNullable<typeof t> => !!t).map((t) => [t.key, t]),
    );
    for (const fact of facts)
      for (const ref of fact.references) {
        const target = checked.get(`${ref.owner}:${ref.id}`);
        if (target&&!target.unavailable) ref.publiclyEligible = target.published;
      }
    const symmetryFindings:Array<{owner:IntegrityOwner;ownerId:string;targetOwner:IntegrityOwner;targetId:string;code:string}>=[];
    let symmetryPairsChecked=0,symmetryUnavailable=0;
    if(owner==='SCHOLARSHIPS'&&allowed.has('PROGRAMS')&&this.universities.readProgramIntegrityReference){
      for(const sourceRow of source.data){const row=sourceRow as import('@manaratak/domain').ScholarshipDto;if(!isPublicScholarshipOwner(row))continue;
        for(const link of row.universityLinks??[]){if(!link.academicProgramId||link.resolutionStatus!=='RESOLVED'||symmetryPairsChecked>=10)continue;
          try{const program=await this.universities.readProgramIntegrityReference(link.academicProgramId);if(!program?.publiclyEligible||(link.universityId&&link.universityId!==program.universityId))continue;
            ++symmetryPairsChecked;const reverse=await this.scholarships.listPublished({ownerId:row.id,academicProgramId:link.academicProgramId,limit:1});
            if(!reverse.data.some(s=>s.id===row.id))symmetryFindings.push({owner,ownerId:row.id,targetOwner:'PROGRAMS',targetId:link.academicProgramId,code:'REVERSE_RELATIONSHIP_MISMATCH'});
          }catch{++symmetryUnavailable;}
        }
      }
    }
    const report = crossModuleIntegrityReport(facts, allowed, 'PERMISSIONED_OWNER_SAMPLE', false);
    const missing = facts.flatMap((f) =>
      f.references
        .filter((r) => checked.get(`${r.owner}:${r.id}`)?.exists === false&&!checked.get(`${r.owner}:${r.id}`)?.unavailable)
        .map((r) => ({
          owner: f.owner,
          ownerId: f.id,
          targetOwner: r.owner,
          targetId: r.id,
          code: 'MISSING_OWNER_REFERENCE',
        })),
    );
    return {
      ...report,
      findings: [...report.findings, ...missing,...symmetryFindings,...sourceFindings,...facts.flatMap(f=>f.references.filter(r=>checked.get(`${r.owner}:${r.id}`)?.unavailable).map(r=>({owner:f.owner,ownerId:f.id,targetOwner:r.owner,targetId:r.id,code:'TARGET_OWNER_UNAVAILABLE'})))].map(finding=>({...finding,ownerPublicId:source.data.find(row=>row.id===finding.ownerId)?.publicId??null})),
      referenceReadFailures,
      sourceReadFailures:full.filter(row=>row===null).length,
      sourceRowsListed:listed.data.length,
      startedAt,
      freshness:{basis:'LIVE_OWNER_READ_TIME',capturedAt:report.capturedAt,productionMetricsFreshness:'UNVERIFIED'},
      checks:['MISSING_REFERENCES','PUBLICATION_STATE','POLYMORPHIC_OWNER_ID','PROGRAM_PARENT','SCHOLARSHIP_PROGRAM_SYMMETRY'],
      symmetry:{pairsChecked:symmetryPairsChecked,failedOwnerReads:symmetryUnavailable,maxPairs:10,coverage:'BOUNDED_CANONICAL_PAIRS'},
      sourceHydration:'OWNER_DETAIL_READS',
      targetOwnerFailures:targets.filter(row=>row?.unavailable).length,
      sourceOwner: owner,
      page,
      pageSize: 20,
      total: source.total,
      hasMore: page * 20 < source.total,
      scanned: facts.length,
      targetReferencesChecked: selected.length,
      referencesTruncated,
      coverage: 'PARTIAL_OWNER_SAMPLE' as const,
    };
  }
}
