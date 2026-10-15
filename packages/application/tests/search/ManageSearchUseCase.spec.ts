import { describe, expect, it, vi } from 'vitest';
import { ManageSearchUseCase, type SearchActorContext } from '../../src/search/use-cases/ManageSearchUseCase';
import { LogicalOperator, SearchCriteria, SearchPagination, SearchReference, SearchRequest, SearchRequestId, SearchResult, SearchScope } from '@manaratak/domain';

function row(actorReferenceId?: string, scope='PUBLIC_CATALOG', reference='shared-reference') {
  return SearchRequest.create(SearchRequestId.create(`id-${actorReferenceId ?? 'legacy'}-${scope}-${reference}`),SearchReference.create(reference),SearchScope.create(scope),SearchCriteria.create('private query',[],LogicalOperator.AND),SearchPagination.create(1,20),undefined,actorReferenceId);
}
const dto={scope:'PUBLIC_CATALOG',criteria:{query:'study'},pagination:{page:1,limit:20}};
describe('ManageSearchUseCase actor/scope boundary',()=>{
 it('writes the trusted actor on both lifecycle saves',async()=>{
  const repo={save:vi.fn(),findBy:vi.fn()}; const gateway={execute:vi.fn().mockResolvedValue(new SearchResult(0,1))};
  const result=await new ManageSearchUseCase(repo,gateway).executeSearch(dto,{actorReferenceId:'actor-a'});
  expect(result.request.getActorReferenceId()).toBe('actor-a');expect(repo.save).toHaveBeenCalledTimes(2);
  expect(repo.save.mock.calls.every(([saved])=>saved.getActorReferenceId()==='actor-a')).toBe(true);
 });
 it('returns only the caller’s reference and permitted scope, excluding legacy or other-actor records',async()=>{
  const own=row('actor-a'); const records=[own,row('actor-b'),row(),row('actor-a','identity'),row('actor-a','PUBLIC_CATALOG','other-reference')];
  // Even an adapter returning too many rows must not expose another user's data.
  const repo={save:vi.fn(),findBy:vi.fn().mockResolvedValue(records)};
  const service=new ManageSearchUseCase(repo,{execute:vi.fn()});
  expect(await service.getSearchRequestHistory('shared-reference',{actorReferenceId:'actor-a'})).toEqual([own]);
  const spec=repo.findBy.mock.calls[0][0];expect(spec.getActorReferenceId()).toBe('actor-a');expect(spec.getScope().getValue()).toBe('PUBLIC_CATALOG');
 });
 it.each([undefined,{actorReferenceId:''},{actorReferenceId:'  '}])('fails closed without a trusted actor',async context=>{
  const repo={save:vi.fn(),findBy:vi.fn()};const service=new ManageSearchUseCase(repo,{execute:vi.fn()});
  await expect(service.executeSearch(dto,context as unknown as SearchActorContext)).rejects.toThrow('SEARCH_ACTOR_REQUIRED');
  await expect(service.getSearchRequestHistory('some-reference',context as unknown as SearchActorContext)).rejects.toThrow('SEARCH_ACTOR_REQUIRED');
  expect(repo.save).not.toHaveBeenCalled();expect(repo.findBy).not.toHaveBeenCalled();
 });
 it('rejects arbitrary owner scopes before creating any persistent record',async()=>{
  const repo={save:vi.fn(),findBy:vi.fn()};const gateway={execute:vi.fn()};
  await expect(new ManageSearchUseCase(repo,gateway).executeSearch({...dto,scope:'identity'},{actorReferenceId:'actor-a'})).rejects.toThrow('SEARCH_SCOPE_UNSUPPORTED');
  expect(repo.save).not.toHaveBeenCalled();expect(gateway.execute).not.toHaveBeenCalled();
 });
});
