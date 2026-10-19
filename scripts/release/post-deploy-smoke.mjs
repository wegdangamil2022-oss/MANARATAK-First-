#!/usr/bin/env node
import { runSmoke } from './lib/SmokeContracts.mjs';
import { required } from './lib/ReleaseContracts.mjs';
const environment = process.argv[2];
if (!['validation', 'staging', 'production'].includes(environment))
  throw new Error('SMOKE_ENVIRONMENT_INVALID');
await runSmoke({
  api: required('ABSHEER_SMOKE_API_URL'),
  web: required('ABSHEER_SMOKE_WEB_URL'),
  admin: required('ABSHEER_SMOKE_ADMIN_URL'),
  sha: required('SOURCE_SHA'),
});
console.log(`POST_DEPLOY_SMOKE=${environment.toUpperCase()}_PASS`);
