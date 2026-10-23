import {describe, expect, it} from 'vitest';
import {initialSourceState, readNextReviewPage} from '../../src/features/review-queue/ReviewLoader';
import {reviewSources} from '../../src/features/review-queue/ReviewSources';

describe('Owner pagination contracts',()=>{
 it('reads the international-test limit contract and preserves continuation',async()=>{
  const source=reviewSources.find(source=>source.domain==='tests')!;
  const result=await readNextReviewPage(initialSourceState(source,true),async()=>({data:[{id:'test-one',title:'TOEFL',status:'READY_TO_REVIEW'}],total:51,page:1,limit:50}),new AbortController().signal);
  expect(result.availability).toBe('partial');expect(result.total).toBe(51);
  expect(result.nextPage).toBe(2);expect(result.rows[0].href).toBe('/international-tests/test-one');
 });
 it('rejects wrong, conflicting and unrelated pagination aliases',async()=>{
  const tests=reviewSources.find(source=>source.domain==='tests')!;
  for(const pagination of [{limit:25},{pageSize:50,limit:25}]){
   const result=await readNextReviewPage(initialSourceState(tests,true),async()=>({data:[],total:0,page:1,...pagination}),new AbortController().signal);
   expect(result.errorCode).toBe('SOURCE_CONTRACT_INVALID');expect(result.total).toBeNull();
  }
  const other=reviewSources.find(source=>source.domain==='universities')!;
  const result=await readNextReviewPage(initialSourceState(other,true),async()=>({data:[],total:0,page:1,limit:50}),new AbortController().signal);
  expect(result.errorCode).toBe('SOURCE_CONTRACT_INVALID');expect(result.total).toBeNull();
 });
});
