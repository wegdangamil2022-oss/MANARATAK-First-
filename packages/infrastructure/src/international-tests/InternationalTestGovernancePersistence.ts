import { createHash, randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { InternationalTestDto, InternationalTestPublicationReadinessPolicy, publicInternationalTest, assertOfficialTestUrl } from '@manaratak/domain';

const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' && !(value instanceof Date) ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])) : value;
export const internationalTestCandidateHash = (value: unknown): string => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export class InternationalTestGovernancePersistence {
  constructor(private readonly prisma: PrismaClient, private readonly bound: boolean) {}
  private assertBound() { if (!this.bound) throw new Error('INTERNATIONAL_TEST_TRANSACTION_REQUIRED'); }
  async revision(testId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{revision:number}>>(Prisma.sql`SELECT "revision" FROM "InternationalTestGovernance" WHERE "testId"=${testId}`);
    return rows[0]?.revision ?? 0;
  }
  async advance(testId: string, expected: number, preserveApproval = false): Promise<void> {
    this.assertBound();
    await this.prisma.$executeRaw(Prisma.sql`INSERT INTO "InternationalTestGovernance" ("testId","revision") VALUES (${testId},0) ON CONFLICT ("testId") DO NOTHING`);
    const changed = await this.prisma.$executeRaw(Prisma.sql`UPDATE "InternationalTestGovernance" SET "revision"="revision"+1,"approval"=CASE WHEN ${preserveApproval} THEN "approval" ELSE NULL END WHERE "testId"=${testId} AND "revision"=${expected}`);
    if (changed !== 1) throw new Error('INTERNATIONAL_TEST_REVISION_CONFLICT');
  }
  private async attestation(testId:string,payload:unknown,actorId:string):Promise<void> {
    this.assertBound();
    await this.prisma.$executeRaw(Prisma.sql`INSERT INTO "InternationalTestEvidenceHistory" ("id","testId","payload","actorId") VALUES (${randomUUID()},${testId},${JSON.stringify(payload)}::jsonb,${actorId})`);
  }
  async candidate(test: InternationalTestDto) {
    const versions = await this.prisma.internationalTestVersion.findMany({where:{testId:test.id, sourceHash:{not:null}, sourceFileName:{not:null}}, orderBy:[{versionNumber:'desc'}],take:1,include:{contentBlocks:true}});
    const evidence = await this.prisma.internationalTestEvidence.findUnique({where:{testId:test.id}});
    const provider = test.providerId ? await this.prisma.internationalTestProvider.findUnique({where:{id:test.providerId}}) : null;
    const payload = publicInternationalTest(test); delete payload.currentPublishedVersionId; payload.status = 'PUBLISHED' as InternationalTestDto['status'];
    const countryIds=test.availability?.availableCountryIds??[];const cityIds=test.availability?.availableCityIds??[];
    if(countryIds.length>500||cityIds.length>5000)throw new Error('INTERNATIONAL_TEST_AVAILABILITY_LIMIT_EXCEEDED');
    const [countries,cities]=await Promise.all([countryIds.length?this.prisma.referenceCountry.findMany({where:{id:{in:countryIds}},select:{id:true,name:true,nameAr:true,iso2Code:true,isActive:true,lifecycleState:true}}):[],cityIds.length?this.prisma.referenceCity.findMany({where:{id:{in:cityIds}},select:{id:true,name:true,nameAr:true,countryIso2Code:true,isActive:true,lifecycleState:true}}):[]]);
    if(countries.length!==countryIds.length||cities.length!==cityIds.length||[...countries,...cities].some(row=>!row.isActive||row.lifecycleState!=='ACTIVE')||cities.some(city=>!countries.some(country=>country.iso2Code===city.countryIso2Code)))throw new Error('INTERNATIONAL_TEST_AVAILABILITY_REFERENCE_INVALID');
    payload.locations={countries:countries.map(({id,name,nameAr,iso2Code})=>({id,name,nameAr,iso2Code})),cities:cities.map(({id,name,nameAr,countryIso2Code})=>({id,name,nameAr,countryIso2Code}))};
    const version = versions[0];
    return {payload,version,evidence,provider,hash:internationalTestCandidateHash({payload,sourceHash:version?.sourceHash,sourceVersionId:version?.id,blocks:version?.contentBlocks.map(b=>({id:b.id,reviewStatus:b.reviewStatus,content:b.content,metadata:b.metadata})),evidence,providerWebsite:provider?.officialWebsite})};
  }
  async execute(test: InternationalTestDto, action: string, input: Record<string,unknown>, actorId: string): Promise<unknown> {
    const testId = test.id; const page = Math.min(1000,Math.max(1,Number(input.page)||1)); const offset = (page-1)*25;
    if (action === 'HISTORY') {
      const rows = await this.prisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT "id","payload","actorId","capturedAt" FROM "InternationalTestEvidenceHistory" WHERE "testId"=${testId} ORDER BY "capturedAt" DESC,"id" DESC LIMIT 25 OFFSET ${offset}`);
      const releases = await this.prisma.$queryRaw<Array<Record<string,unknown>>>(Prisma.sql`SELECT "id","candidateHash","reviewerId","publishedAt" FROM "InternationalTestPublicationSnapshot" WHERE "testId"=${testId} ORDER BY "publishedAt" DESC,"id" DESC LIMIT 25 OFFSET ${offset}`);
      const state=await this.prisma.$queryRaw<Array<{revision:number;approval:unknown;verification:unknown}>>(Prisma.sql`SELECT "revision","approval","verification" FROM "InternationalTestGovernance" WHERE "testId"=${testId}`);
      const current=await this.prisma.internationalTestEvidence.findUnique({where:{testId},select:{retrievedAt:true}});
      return {page,evidence:rows,releases,governance:state[0]??null,freshness:{basis:'SOURCE_RETRIEVED_AT',checkedAt:new Date().toISOString(),categories:[{category:'FEE',days:30},{category:'REGISTRATION',days:90},{category:'WINDOW',days:30},{category:'CENTER',days:180}].map(policy=>({...policy,needsVerification:!current?.retrievedAt||Date.now()-current.retrievedAt.getTime()>policy.days*86400000}))}};
    }
    if(action==='READINESS') {
      const candidate=await this.candidate(test);
      const rows=await this.prisma.$queryRaw<Array<{approval:Record<string,unknown>|null;verification:Record<string,unknown>|null}>>(Prisma.sql`SELECT "approval","verification" FROM "InternationalTestGovernance" WHERE "testId"=${testId}`);
      const blockers:string[]=[];
      if(candidate.version?.contentBlocks.some(block=>!['APPROVED','IGNORED','MAPPED'].includes(block.reviewStatus)))blockers.push('INTERNATIONAL_TEST_SOURCE_BLOCK_REVIEW_REQUIRED');
      if(!rows[0]?.verification?.reviewerId || rows[0].verification?.evidenceHash!==internationalTestCandidateHash(candidate.evidence))blockers.push('INTERNATIONAL_TEST_VERIFICATION_STALE');
      if(!rows[0]?.approval?.reviewerId || rows[0].approval?.candidateHash!==candidate.hash)blockers.push('INTERNATIONAL_TEST_APPROVAL_STALE');
      const retrieved=candidate.evidence?.retrievedAt;
      if(!retrieved||retrieved.getTime()>Date.now()||Date.now()-retrieved.getTime()>(test.fees?.length||test.availability?.testingWindowsNotes?30:90)*86400000)blockers.push('INTERNATIONAL_TEST_SOURCE_REVERIFICATION_REQUIRED');
      return {blockers,candidateHash:candidate.hash};
    }
    this.assertBound();
    if (!actorId || !String(input.reason??'').trim()) throw new Error('INTERNATIONAL_TEST_REVIEW_REASON_REQUIRED');
    await this.prisma.$executeRaw(Prisma.sql`INSERT INTO "InternationalTestGovernance" ("testId","revision") VALUES (${testId},0) ON CONFLICT ("testId") DO NOTHING`);
    if (action === 'BLOCK') {
      const version = await this.prisma.internationalTestVersion.findFirst({where:{id:String(input.versionId),testId}});
      if (!version || version.sourceHash !== input.sourceHash || version.status === 'PUBLISHED' || version.status === 'SUPERSEDED') throw new Error('INTERNATIONAL_TEST_SOURCE_HASH_CONFLICT');
      const decision = String(input.decision);
      if (!['APPROVED','IGNORED','MAPPED'].includes(decision) || (decision === 'MAPPED' && !String(input.mappingReference??'').trim())) throw new Error('INTERNATIONAL_TEST_BLOCK_DECISION_INVALID');
      const changed = await this.prisma.internationalTestContentBlock.updateMany({where:{id:String(input.blockId),versionId:version.id},data:{reviewStatus:decision,metadata:{reviewerId:actorId,reviewedAt:new Date().toISOString(),reason:String(input.reason),mappingReference:input.mappingReference??null}}});
      if (changed.count !== 1) throw new Error('INTERNATIONAL_TEST_CHILD_OWNER_NOT_FOUND');
      return {success:true};
    }
    if(action==='REMOVE_RELATIONSHIP') {
      const kind=String(input.kind);const referenceId=String(input.referenceId);const relationshipType=String(input.relationshipType);
      if(!referenceId||!relationshipType)throw new Error('INTERNATIONAL_TEST_RELATIONSHIP_REQUIRED');
      const writers={COUNTRY:this.prisma.internationalTestCountryRelationship,LANGUAGE:this.prisma.internationalTestLanguageRelationship,TAXONOMY:this.prisma.internationalTestAcademicTaxonomyRelationship,DEGREE:this.prisma.internationalTestDegreeRelationship};
      const writer=writers[kind as keyof typeof writers] as unknown as {deleteMany(input:unknown):Promise<{count:number}>};if(!writer)throw new Error('INTERNATIONAL_TEST_RELATIONSHIP_KIND_INVALID');
      const field=kind==='TAXONOMY'?'taxonomyNodeId':kind==='DEGREE'?'degreeLevelId':'canonicalReferenceId';
      const result=await writer.deleteMany({where:{testId,[field]:referenceId,relationshipType}});return {removed:result.count};
    }
    if (action === 'PROFILE') {
      const kind=String(input.kind); const raw=input.payload as Record<string,unknown>;
      const fields:Record<string,string[]> = {
        SESSION:['versionId','title','sessionCode','registrationOpensAt','registrationClosesAt','startsAt','endsAt','timezone','status'],
        CENTER:['displayName','centerCode','countryIso2Code','cityName','address','officialUrl','status'],
        REQUIREMENT:['versionId','requirementType','title','description','isMandatory'],
        POLICY:['versionId','policyType','title','description','sourceUrl','effectiveFrom','effectiveTo'],
        EQUIVALENCY:['sourceScale','sourceValue','targetScale','targetValue','confidence'],
      };
      if (!fields[kind] || !raw || Object.keys(raw).some(key=>!fields[kind].includes(key)&&key!=='id')) throw new Error('INTERNATIONAL_TEST_PROFILE_FIELDS_INVALID');
      const data:Record<string,unknown>={};
      for (const field of fields[kind]) if (raw[field] !== undefined && raw[field] !== '') {
        if (field.endsWith('At') || field.startsWith('effective')) { const date=new Date(String(raw[field])); if (!Number.isFinite(date.getTime())) throw new Error('INTERNATIONAL_TEST_PROFILE_DATE_INVALID'); data[field]=date; }
        else if (field==='confidence') { if(typeof raw[field]!=='number'||!Number.isFinite(raw[field])||Number(raw[field])<0||Number(raw[field])>1) throw new Error('INTERNATIONAL_TEST_PROFILE_CONFIDENCE_INVALID'); data[field]=raw[field]; }
        else if (field==='isMandatory') {if(typeof raw[field]!=='boolean') throw new Error('INTERNATIONAL_TEST_PROFILE_BOOLEAN_INVALID');data[field]=raw[field];}
        else {if(typeof raw[field]!=='string'||String(raw[field]).length>5000) throw new Error('INTERNATIONAL_TEST_PROFILE_TEXT_INVALID'); data[field]=String(raw[field]).trim();}
      }
      if(data.versionId){const version=await this.prisma.internationalTestVersion.findFirst({where:{id:String(data.versionId),testId}});if(!version||['PUBLISHED','SUPERSEDED','ARCHIVED'].includes(version.status)) throw new Error('INTERNATIONAL_TEST_PROFILE_VERSION_INVALID');}
      const required=kind==='CENTER'?['displayName','status']:kind==='EQUIVALENCY'?['sourceScale','sourceValue','targetScale','targetValue']:kind==='SESSION'?['title','status']:kind==='POLICY'?['title','policyType']:['title','requirementType'];
      if(required.some(key=>!data[key])) throw new Error('INTERNATIONAL_TEST_PROFILE_REQUIRED_FIELDS');
      for(const [a,b] of [['registrationOpensAt','registrationClosesAt'],['startsAt','endsAt'],['effectiveFrom','effectiveTo']]) if(data[a]&&data[b]&&Number(data[a])>Number(data[b])) throw new Error('INTERNATIONAL_TEST_PROFILE_DATE_ORDER_INVALID');
      if(data.timezone) try {new Intl.DateTimeFormat('en',{timeZone:String(data.timezone)});} catch {throw new Error('INTERNATIONAL_TEST_PROFILE_TIMEZONE_INVALID');}
      const provider=test.providerId?await this.prisma.internationalTestProvider.findUnique({where:{id:test.providerId}}):null;
      for(const field of ['sourceUrl','officialUrl']) if(data[field]) assertOfficialTestUrl(String(data[field]),provider?.officialWebsite??undefined);
      if(kind==='CENTER') {const country=await this.prisma.referenceCountry.findUnique({where:{iso2Code:String(data.countryIso2Code??'')},select:{isActive:true,lifecycleState:true}});if(!country?.isActive||country.lifecycleState!=='ACTIVE') throw new Error('INTERNATIONAL_TEST_PROFILE_COUNTRY_INVALID');}
      if(kind==='EQUIVALENCY'&&!['ENGLISH_LANGUAGE','NON_ENGLISH_LANGUAGE','LANGUAGE_PROFICIENCY'].includes(test.testCategory)) throw new Error('INTERNATIONAL_TEST_EQUIVALENCY_FAMILY_INVALID');
      // Every editorial profile record carries independently reviewed source provenance.
      if(!String(input.evidenceReference??'').trim()) throw new Error('INTERNATIONAL_TEST_PROFILE_SOURCE_REQUIRED');
      data.metadata={reviewerId:actorId,reviewedAt:new Date().toISOString(),reason:input.reason,evidenceReference:input.evidenceReference};
      const writers={SESSION:this.prisma.internationalTestSession,CENTER:this.prisma.internationalTestCenter,REQUIREMENT:this.prisma.internationalTestRequirement,POLICY:this.prisma.internationalTestPolicy,EQUIVALENCY:this.prisma.internationalTestEquivalencyMapping};
      const writer=writers[kind as keyof typeof writers] as unknown as {create(input:unknown):Promise<unknown>;update(input:unknown):Promise<unknown>};
      return raw.id?writer.update({where:{id:String(raw.id),testId},data}):writer.create({data:{testId,...data}});
    }
    const candidate = await this.candidate(test);
    if (action === 'VERIFY' || action === 'APPROVE' || action === 'PUBLISH') {
      const ev = candidate.evidence;
      if (!ev?.contentHash || !/^[a-f0-9]{64}$/i.test(ev.contentHash) || !ev.sourceUrl || !ev.retrievedAt || !['HIGH','AUTHORITATIVE'].includes(ev.sourceTrustLevel??'')) throw new Error('INTERNATIONAL_TEST_SOURCE_ATTESTATION_REQUIRED');
      assertOfficialTestUrl(ev.sourceUrl,candidate.provider?.officialWebsite??undefined);
      for (const link of test.officialLinks??[]) assertOfficialTestUrl(link.url,candidate.provider?.officialWebsite??undefined);
      if(ev.retrievedAt.getTime()>Date.now() || Date.now()-ev.retrievedAt.getTime() > (test.fees?.length||test.availability?.testingWindowsNotes?30:90)*86400000) throw new Error('INTERNATIONAL_TEST_SOURCE_REVERIFICATION_REQUIRED');
      if (candidate.version && candidate.version.sourceHash !== ev.contentHash) throw new Error('INTERNATIONAL_TEST_SOURCE_HASH_CONFLICT');
      if (action === 'VERIFY') {
        const verification = {evidenceHash:internationalTestCandidateHash(ev),reviewerId:actorId,reviewedAt:new Date().toISOString(),reason:input.reason};
        await this.attestation(testId,{kind:'VERIFICATION',sourceUrl:ev.sourceUrl,contentHash:ev.contentHash,...verification},actorId);
        await this.prisma.$executeRaw(Prisma.sql`UPDATE "InternationalTestGovernance" SET "verification"=${JSON.stringify(verification)}::jsonb,"approval"=NULL WHERE "testId"=${testId}`);
        return {success:true};
      }
      const state = await this.prisma.$queryRaw<Array<{approval: Record<string,unknown>|null;verification:Record<string,unknown>|null}>>(Prisma.sql`SELECT "approval","verification" FROM "InternationalTestGovernance" WHERE "testId"=${testId}`);
      if (!state[0]?.verification?.reviewerId || state[0].verification.evidenceHash !== internationalTestCandidateHash(ev)) throw new Error('INTERNATIONAL_TEST_VERIFICATION_STALE');
      if (candidate.version?.contentBlocks.some(b=>!['APPROVED','IGNORED','MAPPED'].includes(b.reviewStatus))) throw new Error('INTERNATIONAL_TEST_SOURCE_BLOCK_REVIEW_REQUIRED');
      const references:Array<{table:string;id:string}>=[...(test.countryRelationships??[]).map(r=>({table:'ReferenceCountry',id:r.canonicalReferenceId??''})),...(test.languageRelationships??[]).map(r=>({table:'ReferenceLanguage',id:r.canonicalReferenceId??''})),...(test.academicTaxonomyRelationships??[]).map(r=>({table:'AcademicTaxonomyNode',id:r.taxonomyNodeId})),...(test.degreeRelationships??[]).map(r=>({table:'DegreeLevel',id:r.degreeLevelId??''})),...(test.availability?.availableCountryIds??[]).map(id=>({table:'ReferenceCountry',id})),...(test.availability?.availableCityIds??[]).map(id=>({table:'ReferenceCity',id})),...(test.fees??[]).map(r=>({table:'ReferenceCurrency',id:r.currencyReferenceId}))];
      for(const ref of references.sort((a,b)=>`${a.table}:${a.id}`.localeCompare(`${b.table}:${b.id}`))) {
        const columns=ref.table==='AcademicTaxonomyNode'||ref.table==='DegreeLevel'?Prisma.raw('"status"'):Prisma.raw('"lifecycleState","isActive"');
        const rows=await this.prisma.$queryRaw<Array<{status?:string;lifecycleState?:string;isActive?:boolean}>>(Prisma.sql`SELECT ${columns} FROM ${Prisma.raw('"'+ref.table+'"')} WHERE "id"=${ref.id} FOR SHARE`);
        if(rows.length!==1 || (rows[0].status?!['ACTIVE','PUBLISHED'].includes(rows[0].status):rows[0].lifecycleState!=='ACTIVE'||!rows[0].isActive)) throw new Error('INTERNATIONAL_TEST_CANONICAL_REFERENCE_INACTIVE');
      }
      const issues = new InternationalTestPublicationReadinessPolicy().evaluate({...test,status:'READY_TO_PUBLISH' as InternationalTestDto['status'],isSourceVerified:true}).blockingIssues;
      if (issues.length) throw new Error('INTERNATIONAL_TEST_PUBLICATION_NOT_READY');
      if (action === 'APPROVE') {
        const approval = {candidateHash:candidate.hash,reviewerId:actorId,reviewedAt:new Date().toISOString(),reason:input.reason};
        await this.attestation(testId,{kind:'APPROVAL',sourceUrl:ev.sourceUrl,contentHash:ev.contentHash,sourceVersionId:candidate.version?.id,...approval},actorId);
        await this.prisma.$executeRaw(Prisma.sql`UPDATE "InternationalTestGovernance" SET "approval"=${JSON.stringify(approval)}::jsonb WHERE "testId"=${testId}`);
        if (candidate.version) await this.prisma.internationalTestVersion.update({where:{id:candidate.version.id},data:{status:'APPROVED',approvedBy:actorId}});
        return approval;
      }
      const approval = state[0]?.approval;
      if (!approval?.reviewerId || approval.candidateHash !== candidate.hash) throw new Error('INTERNATIONAL_TEST_APPROVAL_STALE');
      const latest = await this.prisma.internationalTestVersion.findFirst({where:{testId},orderBy:{versionNumber:'desc'}});
      const versionId = randomUUID();
      await this.prisma.internationalTestVersion.create({data:{id:versionId,testId,versionNumber:(latest?.versionNumber??0)+1,status:'PUBLISHED',sourceHash:candidate.version?.sourceHash??ev.contentHash,publishedAt:new Date(),approvedBy:String(approval.reviewerId),metadata:{publicationSnapshot:true,candidateHash:candidate.hash}}});
      const payload = {...candidate.payload,currentPublishedVersionId:versionId};
      await this.prisma.$executeRaw(Prisma.sql`INSERT INTO "InternationalTestPublicationSnapshot" ("id","testId","candidateHash","payload","reviewerId") VALUES (${versionId},${testId},${candidate.hash},${JSON.stringify(payload)}::jsonb,${String(approval.reviewerId)})`);
      return {versionId};
    }
    if (action === 'REVOKE') {
      await this.attestation(testId,{kind:'REVOCATION',sourceUrl:candidate.evidence?.sourceUrl,contentHash:candidate.evidence?.contentHash,reason:input.reason,reviewedAt:new Date().toISOString()},actorId);
      await this.prisma.$executeRaw(Prisma.sql`UPDATE "InternationalTestGovernance" SET "verification"=NULL,"approval"=NULL WHERE "testId"=${testId}`);
      return {success:true};
    }
    throw new Error('INTERNATIONAL_TEST_GOVERNANCE_ACTION_INVALID');
  }
}
