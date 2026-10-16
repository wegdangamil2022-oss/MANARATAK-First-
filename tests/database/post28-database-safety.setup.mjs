// Shared by legacy and POST28 DB configurations; runs before test-module imports.
export function rejectProtectedSuiteTargets(env = process.env) {
  if(env.POST28_TARGET_LABEL==='DB-R' || env.DATABASE_TARGET_CLASS==='RECOVERY_REFERENCE')
    throw new Error('POST28_DESTRUCTIVE_SUITE_RESTORE_TARGET_FORBIDDEN');
  for(const name of ['DATABASE_URL','DIRECT_URL','W3_DATABASE_TEST_DATABASE_URL']) {
    if(!env[name])continue;
    let url;
    try {url=new URL(env[name]);}catch{throw new Error('POST28_DATABASE_SUITE_URL_INVALID');}
    const database=decodeURIComponent(url.pathname.slice(1)),role=decodeURIComponent(url.username);
    if(!['postgres:','postgresql:'].includes(url.protocol) || /prod|production|live|restore/i.test(database) ||
      role==='manaratak_restore_runner')throw new Error('POST28_DESTRUCTIVE_SUITE_PROTECTED_TARGET_FORBIDDEN');
  }
}
export default function setup() {rejectProtectedSuiteTargets();}
