#!/usr/bin/env node
import { verifyReleaseManifest, required } from './lib/ReleaseContracts.mjs';
const expectedSha = required('SOURCE_SHA', {
  ...process.env,
  SOURCE_SHA: process.env.SOURCE_SHA ?? process.env.GITHUB_SHA,
});
const manifest = verifyReleaseManifest(process.argv[2] || 'release-artifacts', expectedSha);
console.log(
  `RELEASE_ARTIFACTS=SOURCE_DIGESTS_VERIFIED sourceSha=${manifest.sourceSha} RUNTIME_BOOT=UNVERIFIED PROMOTION=BLOCKED_WITHOUT_SIGNED_EVIDENCE`,
);
