import { afterEach, describe, expect, it } from 'vitest';
import { destructiveDatabaseTestsEnabled } from './disposableDatabaseGuard';

const originalRun = process.env.RUN_DATABASE_INTEGRATION_TESTS;
const originalMutation = process.env.DATABASE_MUTATIONS_ALLOWED;

afterEach(() => {
  if (originalRun === undefined) delete process.env.RUN_DATABASE_INTEGRATION_TESTS;
  else process.env.RUN_DATABASE_INTEGRATION_TESTS = originalRun;
  if (originalMutation === undefined) delete process.env.DATABASE_MUTATIONS_ALLOWED;
  else process.env.DATABASE_MUTATIONS_ALLOWED = originalMutation;
});

describe('destructive database test guard', () => {
  it('requires explicit mutation opt-in and a local disposable database name', () => {
    process.env.RUN_DATABASE_INTEGRATION_TESTS = 'true';
    process.env.DATABASE_MUTATIONS_ALLOWED = 'true';

    expect(destructiveDatabaseTestsEnabled('postgresql://postgres:secret@db.example.com:5432/manaratak_test')).toBe(false);
    expect(destructiveDatabaseTestsEnabled('postgresql://postgres:secret@localhost:5432/manaratak_production')).toBe(false);
    expect(destructiveDatabaseTestsEnabled('postgresql://postgres:secret@localhost:5432/manaratak_wpic10_test')).toBe(true);
  });

  it('rejects a disposable URL unless both explicit opt-ins are present', () => {
    process.env.RUN_DATABASE_INTEGRATION_TESTS = 'true';
    delete process.env.DATABASE_MUTATIONS_ALLOWED;
    expect(destructiveDatabaseTestsEnabled('postgresql://postgres:secret@localhost:5432/manaratak_test')).toBe(false);
  });
});
