# R06 actual Node 22 course source HTTPS repair — 2026-10-18

Source 378fc1050d31930d782b3ceae503e6bcfda7ebc1; run 345733f9-050f-42f3-9871-47e82986ce4b; PostgreSQL postgres (PostgreSQL) 16.15, system 7698053124805686684.

The actual production SafeImportedCourseLinkChecker failed a public read-only HTTPS HEAD on Node 22.16.0 with Invalid IP address: undefined. Node family autodetection calls custom lookup with all:true; the adapter incorrectly returned a scalar address. It now returns a one-element array containing only the already validated pinned address for all:true, and preserves the scalar callback contract otherwise. Hostname/SNI and the single validated DNS resolution remain unchanged. Mixed public/private DNS still fails before any request. Official contract: https://nodejs.org/docs/latest-v22.x/api/net.html#socketconnectoptions-connectlistener .

A red unit regression preceded the fix; seven focused checker tests pass. Broad application/infrastructure course tests pass 295/295 after correcting a pre-existing whitespace-sensitive browser-runner source invariant. The corrected invariant also requires source-change detection and explicit false browser/runtime acceptance; no production browser gate was weakened. Both intermediate failing reports remain indexed. Infrastructure TypeScript, source quality and tracked secret scanning passed before the test-only invariant correction.

On frozen source 378fc1050d31930d782b3ceae503e6bcfda7ebc1 the actual checker reached https://cs50.harvard.edu/x/ with VERIFIED_DIRECT and HTTP 200. This is public HTTPS reachability, not source ownership approval or an end-to-end imported-course publication chain. Eight affected course-major visibility PostgreSQL/HTTP regressions pass on a fresh isolated PG16.15 cluster, with all 110 historical migration checksums matching and zero schema drift. No additional distinct DB scenario is counted.

The project owner explicitly defined Cross-Tenant as isolation of the current student's ownership. Institutional tenant architecture is therefore outside this R06 requirement; this does not waive the remaining cross-student certificate/invoice/graph tests. Original decision history and the owner's clarification are included. R05/R07 and production databases were not changed.

Evidence: docs/reviews/evidence/post28/378fc1050d31930d782b3ceae503e6bcfda7ebc1/R06-source-network/evidence-index.json. Actual database cases: 8 passed, zero failed/skipped in final runs. New distinct 0; repeats 8; cumulative 348 across SHAs, not one current-head acceptance run. R06 remains 0/26 accepted.
