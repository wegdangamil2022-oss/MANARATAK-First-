import {validateNeonPreflightDeclaration,requireDistinctNeonDeclarations,
  inspectNeonProviderIdentity,inspectNeonLiveIdentity} from './post28-neon-policy.mjs';

const SHA = /^[0-9a-f]{40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LABELS = new Set(['DB-G', 'DB-S', 'DB-U', 'DB-T', 'DB-E', 'DB-L']);
const fail = code => { throw new Error(code); };

export function validateTargetDeclaration(contract, label, rawUrl, env, sourceSha, options = {}) {
  if(contract?.kind==='POST28_NEON_TEST_DECLARATIONS')
    return validateNeonPreflightDeclaration(contract,label,rawUrl,env,sourceSha,options.registry);
  if (!['test', 'development'].includes(env.NODE_ENV) || env.POST28_ISOLATED_EXECUTION !== 'YES' ||
      env.DATABASE_TARGET_CLASS !== 'DISPOSABLE') fail('POST28_LOCAL_ISOLATION_REQUIRED');
  if (contract?.version !== 1 || contract.kind !== 'POST28_LOCAL_DATABASE_TARGETS' ||
      !SHA.test(sourceSha ?? '') || contract.sourceSha !== sourceSha ||
      !UUID.test(contract.runId ?? '') || !LABELS.has(label)) fail('POST28_TARGET_CONTRACT_INVALID');
  const expected = contract.targets?.[label];
  if (!expected || !['MIGRATION', 'SHADOW', 'APPLICATION', 'INSPECTOR'].includes(expected.roleKind) ||
      !/^[1-9][0-9]*$/.test(expected.serverIdentity ?? '') || !/^[1-9][0-9]*$/.test(expected.databaseOid ?? '') ||
      !/^[0-9a-f]{64}$/.test(expected.nonce ?? '') || !Number.isInteger(contract.postgresMajor) ||
      contract.postgresMajor < 15) fail('POST28_TARGET_IDENTITY_MISSING');
  let url;
  try { url = new URL(rawUrl); } catch { fail('POST28_DATABASE_URL_INVALID'); }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const database = decodeURIComponent(url.pathname.slice(1));
  const role = decodeURIComponent(url.username);
  if (!['postgresql:', 'postgres:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '::1'].includes(host) || url.hash || !url.password ||
      [...url.searchParams].some(([key, value]) => key !== 'schema' || value !== 'public') ||
      !/^manaratak_(?:post28_[a-z0-9_]+_test|eap_ci_test)$/.test(database) ||
      /prod|production|live|restore/i.test(database) ||
      !/^(?:post28_[a-z0-9_]+|eap_ci)$/.test(role) || /bootstrap|postgres|admin/i.test(role))
    fail('POST28_UNSAFE_DATABASE_TARGET');
  if (database !== expected.database || role !== expected.role ||
      Number(url.port || 5432) !== expected.port || expected.host !== '127.0.0.1')
    fail('POST28_DECLARED_TARGET_MISMATCH');
  if ((label === 'DB-G' && expected.roleKind !== 'MIGRATION') ||
      (label === 'DB-S' && expected.roleKind !== 'SHADOW') ||
      (['DB-T', 'DB-E', 'DB-L'].includes(label) && expected.roleKind !== 'APPLICATION'))
    fail('POST28_TARGET_ROLE_KIND_MISMATCH');
  return {label, ...expected, marker: `POST28_DISPOSABLE:${contract.runId}:${label}:${expected.nonce}`,
    postgresMajor: contract.postgresMajor};
}

export function requireDistinctTargets(a, b) {
  if(a.provider==='NEON'&&b.provider==='NEON') {
    requireDistinctNeonDeclarations(a,b);
    if(a.role===b.role)fail('POST28_NEON_DISTINCT_ROLES_REQUIRED');
    return;
  }
  // Loopback spelling and credentials are not database identity.
  if ((a.port === b.port && a.database === b.database) ||
      (a.serverIdentity === b.serverIdentity && a.databaseOid === b.databaseOid))
    fail('TARGET_AND_SHADOW_MUST_DIFFER');
}

export function inspectLiveTarget(expected, live, {requireEmpty = false, requireValidatedCatalog = false} = {}) {
  if(expected.provider==='NEON')return inspectNeonLiveIdentity(expected,live,{requireEmpty,requireValidatedCatalog});
  if (!live || live.database !== expected.database || live.role !== expected.role ||
      live.sessionRole !== expected.role || live.serverIdentity !== expected.serverIdentity ||
      live.databaseOid !== expected.databaseOid || live.marker !== expected.marker ||
      live.postgresMajor !== expected.postgresMajor || live.timezone !== 'UTC')
    fail('POST28_LIVE_TARGET_IDENTITY_MISMATCH');
  if (live.probeReadOnly !== true) fail('POST28_READ_ONLY_PROBE_REQUIRED');
  for (const key of ['superuser','createRole','createDatabase','replication','bypassRls',
    'privilegedMembership','globalWrite','databaseOwner','databaseCreate'])
    if (live[key] !== false) fail('POST28_ELEVATED_DATABASE_ROLE');
  if (typeof live.schemaCreate !== 'boolean' ||
      (['APPLICATION','INSPECTOR'].includes(expected.roleKind) && live.schemaCreate))
    fail('POST28_APPLICATION_DDL_FORBIDDEN');
  if (!Number.isSafeInteger(live.publicTables) || live.publicTables < 0 ||
      (requireEmpty && live.publicTables !== 0)) fail('POST28_EMPTY_DATABASE_REQUIRED');
  if (requireValidatedCatalog && (live.unvalidatedConstraints !== 0 || live.invalidIndexes !== 0))
    fail('POST28_CATALOG_VALIDATION_REQUIRED');
  return {label: expected.label, database: live.database, role: live.role,
    serverIdentity: live.serverIdentity, databaseOid: live.databaseOid,
    postgresMajor: live.postgresMajor, timezone: live.timezone, publicTables: live.publicTables, probeReadOnly:true};
}

// Inert dependencies can prove that a rejected declaration creates zero clients/queries.
export async function preflightTargets(contract, declarations, env, sourceSha, readIdentity, options = {}) {
  if(!Array.isArray(declarations)||declarations.length===0)fail('POST28_TARGET_DECLARATIONS_REQUIRED');
  const expected = declarations.map(({label, url}) => validateTargetDeclaration(contract, label, url, env, sourceSha,options));
  if (new Set(expected.map(row => row.label)).size !== expected.length) fail('POST28_DUPLICATE_TARGET_LABEL');
  for (let i = 0; i < expected.length; i++)
    for (let j = i + 1; j < expected.length; j++) requireDistinctTargets(expected[i], expected[j]);
  const results = [];
  if(expected.some(row=>row.provider==='NEON')) {
    if(typeof options.readProviderIdentity!=='function')fail('POST28_NEON_PROVIDER_PROOF_REQUIRED');
    // Validate every provider binding before any SQL client is constructed.
    for(const target of expected)inspectNeonProviderIdentity(target,await options.readProviderIdentity(target));
  }
  for (let i = 0; i < expected.length; i++) {
    const live = await readIdentity(declarations[i].url,expected[i]);
    results.push(inspectLiveTarget(expected[i], live, options));
  }
  if(expected.some(row=>row.provider==='NEON')) {
    for(let i=0;i<results.length;i++)for(let j=i+1;j<results.length;j++)
      if((results[i].branchId===results[j].branchId||results[i].endpointId===results[j].endpointId)&&
          results[i].databaseOid===results[j].databaseOid)fail('POST28_NEON_TARGET_ALIAS_COLLISION');
    for(const target of expected)inspectNeonProviderIdentity(target,await options.readProviderIdentity(target));
  }
  return results;
}
