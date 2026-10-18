# R06 actual persisted path certificate rendering and correct bundled logo MIME

Source 3d04e28ba209c38765e43fc553563e17669bce4f; run 0d62c693-d0f4-42c8-9ff3-c9bff1793893; PostgreSQL postgres (PostgreSQL) 16.15, system 7698108137923792672.

One new actual PostgreSQL case consumes a real opted-in LearningPathCompleted event, obtains the locally HMAC-signed certificate and pinned template from persistence, runs CertificateUseCases.assertRenderable, and invokes the actual PDFKit/fontkit provider-neutral renderer. Resolver bytes come from the materialized synthetic historical trust asset and are checked against pinned SHA256 provenance. Actual PDF, SVG preview and QR bytes are retained in the indexed evidence. The preview contains the persisted certificate serial; no certificate artifact attachment is claimed and the physical certificatePdfAssetId remains NULL. Ten existing certificate cases repeat. No fresh malware scan or sanitization is represented by the historical image fixture.

The isolated rendering tests exposed that the bundled official logo is JPEG despite its PNG filename. The resolver test now declares its actual image/jpeg content; the approved renderer fallback also declares JPEG and validates its header/dimensions before decoding. Binary assets, signatures and provenance hashes remain unchanged. Five renderer tests pass, covering actual PDFs, editable preview, QR, approved design, deterministic bytes and oversized-image rejection.36 provisioning checks and source quality pass.

Two database failures are preserved: rendering itself succeeded, but the final empty-artifact assertion used an incorrect field name. The corrected assertion reads the canonical Prisma certificatePdfAssetId column. The original two failing renderer-unit cases are also preserved. Final database11/11 and renderer5/5 pass. These renderer tests are not counted as PostgreSQL cases.

110 historical migrations still match, schema diff0 and runtime DDL/ledger grants remain absent. Artifact EAP ingestion/attachment/student delivery/recovery still require actual proof; raw rendering alone does not satisfy those contracts. No whole R06 scenario is declared accepted and no R05/R07/production databases were touched.

Evidence: docs/reviews/evidence/post28/3d04e28ba209c38765e43fc553563e17669bce4f/R06-path-certificate-rendering/evidence-index.json. Actual database cases: 11 passed, zero failed/skipped in final runs. New distinct 1; repeats 10; cumulative 448 across SHAs, not one current-head acceptance run. R06 remains 0/26 accepted.
