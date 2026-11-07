import {randomUUID} from 'node:crypto';
import {PrismaClient,Prisma} from '@prisma/client';
import {expect,it} from 'vitest';
import {InternationalTestImportChangeExecutor,internationalTestSourceHash,prepareInternationalTestImport} from '@manaratak/application';
import {PrismaInternationalTestImportChangeGateway} from '../../src/international-tests/PrismaInternationalTestImportChangeGateway';
import {reviewBody,reviewEntry} from '../../../application/tests/tests-platform/fixtures/reviewedTestImport';

const normalize=(value:unknown):unknown=>Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!['id','versionId','createdAt','updatedAt','importedAt'].includes(key)).map(([key,v])=>[key,normalize(v)])):value;

it('grouped import preserves individual drafts, providers, receipts and update guards',async()=>{
  const url=new URL(process.env.DATABASE_URL!);
  if(process.env.TEST_BATCH_DATABASE_TESTS!=='YES'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/majors_full_'))throw Error('ISOLATED_TEST_BATCH_DATABASE_REQUIRED');
  const actorId=process.env.TEST_BATCH_ACTOR_ID!;
  if(!actorId)throw Error('AUTHORIZED_LOCAL_FIXTURE_ACTOR_REQUIRED');
  const db=new PrismaClient(),providerId=randomUUID(),tag=randomUUID();
  const entries=Array.from({length:5},(_,index)=>{
    const base=reviewEntry(),rawContent=base.rawContent+'\n\nتفاصيل المصدر '+index;
    const {providerId:_unused,...core}=base.core;
    return {...base,targetId:randomUUID(),sourceKey:`language/${tag}-${index}.md`,rawContent,sourceHash:internationalTestSourceHash(rawContent),
      ...(index%2===0?{providerResolution:'UNRESOLVED_FROM_SOURCE' as const}:{}),
      core:{...core,publicId:`FIXTURE-${tag}-${index}`,slug:`fixture-${tag}-${index}`,canonicalName:`Fixture ${tag} ${index}`,...(index%2===1?{providerId}:{})}};
  });
  const plan=prepareInternationalTestImport({...reviewBody(),changeSetId:randomUUID(),entries}),ids=entries.map(row=>row.targetId);
  let reference:unknown;
  try{
    for(const grouped of [false,true]){
      let captured:unknown;
      await expect(db.$transaction(async tx=>{
        await tx.internationalTestProvider.create({data:{id:providerId,key:tag,displayName:'Fixture provider '+tag}});
        // The outer transaction always rolls back. Nested owner transactions use
        // its client; READ ONLY is omitted solely inside this write-test boundary.
        const scoped=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='$executeRaw')return (sql:Prisma.Sql|TemplateStringsArray,...args:unknown[])=>{
          const strings='strings' in sql?sql.strings:sql;
          return strings.join('').includes('SET TRANSACTION READ ONLY')?Promise.resolve(0):value.call(target,sql,...args);
        };return typeof value==='function'?value.bind(target):value;}});
        const bound=new Proxy(db,{get(target,key){if(key==='$transaction')return (operation:(client:Prisma.TransactionClient)=>Promise<unknown>)=>operation(scoped);const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
        const standard=new PrismaInternationalTestImportChangeGateway(bound),gateway=new PrismaInternationalTestImportChangeGateway(bound,{batchPersistence:grouped}),executor=new InternationalTestImportChangeExecutor(gateway);
        const preview=await executor.preview(plan,actorId);
        expect(preview.state).toBe('READY');
        expect((await standard.preview(plan,actorId)).previewHash).toBe(preview.previewHash);
        const approval={actorId,planHash:plan.planHash,previewHash:preview.previewHash,approval:'APPROVE_WRITE' as const,recoveryGateToken:'ISOLATED_FORCED_ROLLBACK',recoveryEvidenceReference:'isolated/postgres-transaction'};
        await expect(executor.commit(plan,{...approval,previewHash:'0'.repeat(64)})).rejects.toThrow('STALE_PREVIEW');
        const result=await executor.commit(plan,approval);expect(result.created).toBe(5);
        const roots=await tx.internationalTest.findMany({where:{id:{in:ids}},orderBy:{id:'asc'},include:{versions:{include:{contentBlocks:{orderBy:{blockKey:'asc'}}},orderBy:{versionNumber:'asc'}}}});
        for(const root of roots){
          const entry=entries.find(row=>row.targetId===root.id)!;
          expect(root.isPubliclyVisible).toBe(false);expect(root.isSourceVerified).toBe(false);
          expect(root.providerId).toBe(entry.core.providerId??null);
          expect(root.versions[0].contentBlocks.find(block=>block.blockKey==='source.raw')?.content).toBe(entry.rawContent);
        }
        const revisions=await tx.$queryRaw<Array<{revision:number;approval:unknown}>>(Prisma.sql`SELECT "revision","approval" FROM "InternationalTestGovernance" WHERE "testId" IN (${Prisma.join(ids)})`);
        expect(revisions).toHaveLength(5);for(const row of revisions){expect(row.revision).toBe(1);expect(row.approval).toBeNull();}
        captured=normalize(roots.map(root=>({...root,versions:root.versions.map(version=>{const {m10Import:_receipt,...metadata}=version.metadata as Record<string,unknown>;return {...version,metadata};})})));
        if(reference)expect(captured).toEqual(reference);
        const replayPreview=await executor.preview(plan,actorId),replay=await executor.commit(plan,{...approval,previewHash:replayPreview.previewHash});
        expect(replay.replayed).toBe(true);expect(replay.databaseWrites).toBe(0);
        const update=prepareInternationalTestImport({...reviewBody(),changeSetId:randomUUID(),entries:[{...entries[0],sourceClassification:'REPLACE_EXISTING',resolution:'APPROVE_UPDATE',sourceCycle:'2027'}]});
        const updatedPreview=await executor.preview(update,actorId);expect(updatedPreview.state).toBe('READY');
        expect((await standard.preview(update,actorId)).previewHash).toBe(updatedPreview.previewHash);
        expect((await executor.commit(update,{...approval,planHash:update.planHash,previewHash:updatedPreview.previewHash})).updated).toBe(1);
        expect(await tx.internationalTestVersion.count({where:{testId:ids[0]}})).toBe(2);
        throw Error('ROLLBACK_BATCH_FIXTURE');
      },{timeout:60000,isolationLevel:'Serializable'})).rejects.toThrow('ROLLBACK_BATCH_FIXTURE');
      reference=captured;
      expect(await db.internationalTest.count({where:{id:{in:ids}}})).toBe(0);
      expect(await db.internationalTestProvider.count({where:{id:providerId}})).toBe(0);
    }
  }finally{await db.$disconnect();}
},60000);
