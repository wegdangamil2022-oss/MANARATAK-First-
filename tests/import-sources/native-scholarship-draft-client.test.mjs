import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeScholarshipDraftClient} from '../../scripts/import/native-scholarship-draft-client.mjs';

const graph=[{Scholarship:[{id:'draft'}]}];
test('preserves SQL failure category instead of disguising it as a retryable pipe error',async()=>{
  const client={errors:'ERROR:  duplicate key value violates unique constraint "Scholarship_slug_key"\nDETAIL: sensitive payload must not be emitted',
    send:async()=>{throw new Error('write EOF');}};
  await assert.rejects(NativeScholarshipDraftClient.prototype.copyScholarshipGraph.call(client,graph),error=>
    error.message==='SCHOLARSHIP_DRAFT_WRITE_FAILED:duplicate key value violates unique constraint "Scholarship_slug_key"');
});
test('keeps connection failures distinguishable for safe receipt-based retries',async()=>{
  const failure=new Error('NATIVE_IMPORT_CONNECTION_CLOSED');
  const client={errors:'SSL connection has been closed unexpectedly',send:async()=>{throw failure;}};
  await assert.rejects(NativeScholarshipDraftClient.prototype.copyScholarshipGraph.call(client,graph),error=>error===failure);
});
