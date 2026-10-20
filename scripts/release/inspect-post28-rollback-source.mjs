// Read-only candidate screening; never starts a server or changes a database.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyReleaseManifest,requireSha} from './lib/ReleaseContracts.mjs';

const repo=fs.realpathSync(process.cwd()),policy=JSON.parse(fs.readFileSync(path.join(repo,'config/testing/r12-local-rollback-preparation.json')));
assert([4,5].includes(process.argv.length),'R12_PREVIOUS_ARTIFACT_DIRECTORY_AND_NEW_OUTPUT_FILE_REQUIRED');
const previousSha=requireSha(policy.previousCandidateSha),currentSha=requireSha(policy.currentCandidateSha);
assert.notEqual(previousSha,currentSha,'R12_DISTINCT_CANDIDATES_REQUIRED');
execFileSync('git',['merge-base','--is-ancestor',previousSha,currentSha],{cwd:repo,stdio:'pipe'});
const previous=verifyReleaseManifest(process.argv[2],previousSha);
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const git=args=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const apiPaths=['apps/api','packages','vendor','package.json','package-lock.json'];
const apiChanges=git(['diff','--name-only',previousSha,currentSha,'--',...apiPaths]).split(/\r?\n/).filter(Boolean);
const adminChanges=git(['diff','--name-only',previousSha,currentSha,'--','apps/admin']).split(/\r?\n/).filter(Boolean);
const lock=execFileSync('git',['show',currentSha+':package-lock.json'],{cwd:repo});
const schema=execFileSync('git',['show',currentSha+':packages/infrastructure/prisma/schema.prisma'],{cwd:repo});
const schemaMatches=previous.runtimeRequirements.prismaSchemaSha256===digest(schema),lockMatches=previous.runtimeRequirements.lockSha256===digest(lock);
const api=previous.artifacts.find(a=>a.unit==='api');
const sourceCompatible=apiChanges.length===0&&schemaMatches&&lockMatches;
// An optional current artifact directory resolves the transfer blocker without treating source equality as a boot test.
const current=process.argv[4]?verifyReleaseManifest(process.argv[4],currentSha):null;
const artifactPairVerified=!!current&&current.runtimeRequirements.lockSha256===digest(lock)&&current.runtimeRequirements.prismaSchemaSha256===digest(schema);
const output=path.resolve(process.argv[3]);assert(output!==repo&&!output.startsWith(repo+path.sep),'R12_REVIEW_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED');
const result={kind:'POST28_R12_PREVIOUS_SOURCE_SCREEN',observedRepositoryHead:git(['rev-parse','HEAD']),
  operatorSha256:digest(fs.readFileSync(fileURLToPath(import.meta.url))),observedAt:new Date().toISOString(),
  currentCandidateSha:currentSha,previousCandidateSha:previousSha,previousManifestVerified:true,
  previousApiArtifactSha256:api.sha256,previousWorkerArtifactSha256:api.sha256,
  workerPackaging:'API artifact contains embedded polling worker; no standalone worker artifact claimed',
  ancestorVerified:true,apiChanges,adminChanges,schemaMatches,lockMatches,
  apiAndWorkerSourceCompatibleCandidate:sourceCompatible,
  sourceEqualityIsNotRuntimeCompatibility:true,rollbackOfDifferentApiImplementationDemonstrated:false,
  adminRollbackAllowed:false,adminExclusionReason:'Previous Admin predates the login bootstrap race fix; keep the reviewed current Admin',
  previousApiRuntimeCompatible:false,previousWorkerRuntimeCompatible:false,
  currentArtifactLocallyVerified:!!current,currentApiArtifactSha256:current?.artifacts.find(a=>a.unit==='api').sha256??null,
  artifactPairReadyForScopedApiRehearsal:artifactPairVerified&&sourceCompatible,
  rehearsalExecuted:false,formalR12Acceptance:false,productionAcceptance:false,
  decision:sourceCompatible?(artifactPairVerified?'ARTIFACT_PAIR_VERIFIED_RUNTIME_PROOF_REQUIRED':'SOURCE_CANDIDATE_ONLY_RUNTIME_PROOF_REQUIRED'):'FORWARD_FIX_OR_EXPLICIT_COMPATIBILITY_REVIEW_REQUIRED'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({decision:result.decision,schemaMatches,lockMatches,apiSourceChanged:apiChanges.length!==0,adminRollbackAllowed:false,rehearsalExecuted:false}));
