import { describe,expect,it,vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaSearchRequestRepository } from '../../src/search/PrismaSearchRequestRepository';
import { LogicalOperator, SearchCriteria,SearchPagination,SearchReference,SearchRequest,SearchRequestId,SearchRequestSpecification,SearchScope } from '@absheer/domain';
const base={id:'search-id',reference:'reference-a',scope:'PUBLIC_CATALOG',query:'private query',filters:[],logicalOperator:'AND',page:1,limit:20,sortField:null,sortDirection:null,state:'COMPLETED',totalCount:0,executionTimeMs:1,createdAt:new Date()};
describe('Prisma search persistence ownership',()=>{
 it('filters reference/actor/scope in SQL before take, then rejects unexpected rows defensively',async()=>{
  const own={...base,actorReferenceId:'actor-a'};
  const findMany=vi.fn().mockResolvedValue([own,{...base,actorReferenceId:'actor-b'},{...base,actorReferenceId:null},{...own,scope:'identity'},{...own,reference:'another-reference'}]);
  const repo=new PrismaSearchRequestRepository({apiSearchRequestRecord:{findMany}} as unknown as PrismaClient);
  const records=await repo.findBy(SearchRequestSpecification.byActorAndReference('actor-a',SearchReference.create('reference-a'),SearchScope.create('PUBLIC_CATALOG')));
  expect(findMany).toHaveBeenCalledWith({where:{actorReferenceId:'actor-a',reference:'reference-a',scope:'PUBLIC_CATALOG'},orderBy:{createdAt:'desc'},take:100});
  expect(records).toHaveLength(1);expect(records[0].getActorReferenceId()).toBe('actor-a');
 });
 it('persists ownership on create and never rewrites it during completion',async()=>{
  const upsert=vi.fn();const repo=new PrismaSearchRequestRepository({apiSearchRequestRecord:{upsert}} as unknown as PrismaClient);
  const row=SearchRequest.create(SearchRequestId.create('search-id'),SearchReference.create('reference-a'),SearchScope.create('PUBLIC_CATALOG'),SearchCriteria.create('study',[],LogicalOperator.AND),SearchPagination.create(1,20),undefined,'actor-a');
  await repo.save(row);row.complete(0,1);await repo.save(row);
  for(const [input] of upsert.mock.calls){expect(input.create.actorReferenceId).toBe('actor-a');expect(input.update).not.toHaveProperty('actorReferenceId');}
 });
 it('does not silently fall back to an unscoped read if the expanded schema is absent',async()=>{
  const findMany=vi.fn().mockRejectedValue(new Error('column actorReferenceId does not exist'));
  const repo=new PrismaSearchRequestRepository({apiSearchRequestRecord:{findMany}} as unknown as PrismaClient);
  await expect(repo.findBy(SearchRequestSpecification.byActorAndReference('actor-a',SearchReference.create('reference-a'),SearchScope.create('PUBLIC_CATALOG')))).rejects.toThrow('actorReferenceId');
  expect(findMany).toHaveBeenCalledTimes(1);
 });
});
