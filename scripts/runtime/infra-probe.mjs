#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const env = process.env;
const nodeEnv = env.NODE_ENV || 'development';
const emit = (name, value) => console.log(`${name}=${value}`);
const validPg = value => { try { const url = new URL(value); return ['postgres:', 'postgresql:'].includes(url.protocol) && !!url.hostname && !!url.pathname.slice(1); } catch { return false; } };

async function postgres(label, value) {
  if (!validPg(value)) { emit(`${label}_CONNECT`, 'FAIL'); return false; }
  let client;
  try {
    client = new PrismaClient({ datasources: { db: { url: value } }, log: [], errorFormat: 'minimal' });
    await client.$connect();
    const one = await client.$queryRawUnsafe('SELECT 1 AS value');
    if (Number(one[0]?.value) !== 1) throw new Error('query failed');
    const identity = await client.$queryRawUnsafe(`SELECT current_database() AS database, current_user AS username, current_setting('server_version') AS version,
      COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS tls,
      (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_roles WHERE rolname = current_user) AS elevated,
      has_database_privilege(current_user, current_database(), 'CREATE') AS database_create,
      has_database_privilege(current_user, current_database(), 'TEMP') AS database_temp,
      EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND has_schema_privilege(current_user, n.oid, 'CREATE')) AS schema_create,
      pg_has_role(current_user, 'pg_write_all_data', 'MEMBER') AS global_write`);
    const user = identity[0];
    emit(`${label}_IDENTITY`, user?.database && user?.username ? 'PASS' : 'FAIL');
    if (user?.database && user?.username) {
      emit(`${label}_DATABASE`, String(user.database).replace(/[^a-zA-Z0-9_.-]/g, '_'));
      emit(`${label}_USER`, String(user.username).replace(/[^a-zA-Z0-9_.-]/g, '_'));
      emit(`${label}_VERSION`, String(user.version).replace(/[^a-zA-Z0-9_.-]/g, '_'));
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname.toLowerCase());
    const tlsStatus = user?.tls ? 'PASS' : local && ['development', 'test'].includes(nodeEnv) ? 'LOCAL_NOT_REQUIRED' : 'FAIL';
    emit(`${label}_TLS`, tlsStatus);
    const write = await client.$queryRawUnsafe(`SELECT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND (has_table_privilege(current_user, c.oid, 'INSERT')
      OR has_table_privilege(current_user, c.oid, 'UPDATE')
      OR has_table_privilege(current_user, c.oid, 'DELETE'))
    ) AS can_write, EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND c.relkind = 'S'
      AND (has_sequence_privilege(current_user, c.oid, 'USAGE') OR has_sequence_privilege(current_user, c.oid, 'UPDATE'))
    ) AS can_write_sequence`);
    const readOnly = !user?.elevated && !user?.global_write && !user?.database_create && !user?.database_temp && !user?.schema_create && !write[0]?.can_write && !write[0]?.can_write_sequence;
    emit(`${label}_READ_ONLY_ROLE`, readOnly ? 'PASS' : 'FAIL');
    emit(`${label}_CONNECT`, 'PASS');
    return !!user?.database && !!user?.username && tlsStatus !== 'FAIL' && readOnly;
  } catch { emit(`${label}_CONNECT`, 'FAIL'); return false; }
  finally { await client?.$disconnect().catch(() => {}); }
}

let ready = await postgres('POSTGRES', env.DATABASE_URL);
if (process.argv.includes('--direct')) ready = await postgres('DIRECT_URL', env.DIRECT_URL) && ready;
else emit('DIRECT_URL', validPg(env.DIRECT_URL) ? 'CONFIGURED' : 'FAIL');
const redisUrl = env.REDIS_URL;
let redisParsed;
try { redisParsed = new URL(redisUrl); } catch {}
if (!redisParsed?.hostname || !['redis:', 'rediss:'].includes(redisParsed.protocol)) { emit('REDIS_CONNECT', 'FAIL'); ready = false; }
else {
  let client;
  try { client = createClient({ url: redisUrl, socket: { connectTimeout: 3000, reconnectStrategy: false } });
    client.on('error', () => {});
    await client.connect(); if (await client.ping() !== 'PONG') throw new Error('PING failed'); emit('REDIS_CONNECT', 'PASS'); }
  catch { emit('REDIS_CONNECT', 'FAIL'); ready = false; }
  finally { if (client?.isOpen) await client.quit().catch(() => client.disconnect()); }
  const redisHost = redisParsed.hostname.toLowerCase();
  const localRedis = ['localhost', '127.0.0.1', '[::1]', 'redis'].includes(redisHost);
  const tls = redisUrl.startsWith('rediss://') ? 'PASS' : localRedis && ['development','test'].includes(nodeEnv) ? 'LOCAL_NOT_REQUIRED' : 'FAIL';
  emit('REDIS_TLS', tls); if (tls === 'FAIL') ready = false;
}
emit('REDIS_NAMESPACE', env.REDIS_NAMESPACE?.trim() ? 'PASS' : 'FAIL');
const smtpHost = env.SMTP_HOST?.toLowerCase();
const localSmtp = ['localhost', '127.0.0.1', '::1', 'mailpit'].includes(smtpHost);
const smtpCredentialsValid = Boolean(env.SMTP_USERNAME) === Boolean(env.SMTP_PASSWORD) && (!env.SMTP_USERNAME || env.SMTP_SECURE === 'true');
const mail = smtpCredentialsValid && env.EMAIL_DELIVERY_PROVIDER === 'smtp' && !!smtpHost && Number.isInteger(Number(env.SMTP_PORT)) && Number(env.SMTP_PORT) > 0 && Number(env.SMTP_PORT) <= 65535 && !!env.SMTP_FROM && (env.SMTP_SECURE === 'true' || localSmtp);
emit('TEST_EMAIL_CONFIG', mail ? 'PASS' : 'FAIL');
if (!mail || !env.REDIS_NAMESPACE || !validPg(env.DIRECT_URL)) ready = false;
emit('M6_RUNTIME_PROBE', ready ? 'READY' : 'BLOCKED');
process.exitCode = ready ? 0 : 1;
