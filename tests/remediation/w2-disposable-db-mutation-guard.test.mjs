import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectDisposableDatabaseTarget } from '../../scripts/lib/disposable-database-target-guard.mjs';

const base = {
  NODE_ENV:'development', DATABASE_TARGET_CLASS:'DISPOSABLE', ALLOW_DISPOSABLE_DB_MUTATIONS:'YES',
  DATABASE_URL:'postgresql://u:p@127.0.0.1:5432/manaratak_test', DATABASE_DISPOSABLE_CONFIRM_TARGET:'127.0.0.1:5432/manaratak_test',
};
test('MNT-AUD-0075 permits only explicitly confirmed local disposable target',()=>{
  assert.equal(inspectDisposableDatabaseTarget('push',base).ok,true);
  assert.equal(inspectDisposableDatabaseTarget('push',{...base,NODE_ENV:'production'}).ok,false);
  assert.equal(inspectDisposableDatabaseTarget('push',{...base,DATABASE_TARGET_CLASS:'SHARED'}).ok,false);
  assert.equal(inspectDisposableDatabaseTarget('push',{...base,DATABASE_URL:'postgresql://u:p@db.example:5432/shared',DATABASE_DISPOSABLE_CONFIRM_TARGET:'db.example:5432/shared'}).ok,false);
});
test('MNT-AUD-0075 remote disposable target requires explicit CI approval and exact target confirmation',()=>{
  const env={...base,CI:'true',DATABASE_DISPOSABLE_REMOTE_APPROVED:'YES',DATABASE_URL:'postgresql://u:p@postgres:5432/testdb',DATABASE_DISPOSABLE_CONFIRM_TARGET:'postgres:5432/testdb'};
  assert.equal(inspectDisposableDatabaseTarget('migrate-dev',env).ok,true);
  assert.equal(inspectDisposableDatabaseTarget('migrate-dev',{...env,DATABASE_DISPOSABLE_CONFIRM_TARGET:'postgres:5432/other'}).ok,false);
});
