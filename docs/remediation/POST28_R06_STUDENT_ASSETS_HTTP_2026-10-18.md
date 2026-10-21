# R06 Student asset HTTP owner boundaries

Source 92461e771267d7026dcbd900fed7b30d7e8794ba; run f549e0ae-8b37-40a1-a89a-e3aaf564aaa9; PostgreSQL postgres (PostgreSQL) 16.15, system 7698090449893491016.

Four new actual PostgreSQL/JWT/HTTP identities extend the existing14 student binding cases. The real student router lists only the JWT owner's PDF assets even when a foreign ownerId is supplied as a query parameter; foreign asset ID and owner ID never appear. Foreign PDF delivery returns404 ASSET_NOT_FOUND before the unconfigured storage provider. Completing a foreign asset returns the existing400 STUDENT_DOCUMENT_UPLOAD_DENIED with identical asset, binding, consent and owner event facts. Upload allocation with consent:false returns400 before any asset is created.

The fixture adds real PrismaStudentWorkspaceRepository, StudentDocumentUploadUseCases, IngestAssetUseCase, asset repository and lifecycle use case to the router. Storage/signing adapters are deliberately unconfigured: no successful upload, scan or provider delivery is claimed, and a bypass into those capabilities would fail these expected owner-denial contracts. Synthetic existing PDF evidence is reused; Defender/MuPDF are not rerun.

All18 actual HTTP/database identities pass at the recorded source;4 are new and14 repeats. No production code, schema, historical owner data, consent or binding is changed. Setup110 migration checksums and schema diff0 pass without runtime DDL/ledger grants. This test-only extension adds no permission grants.

The successful fresh student upload-to-delivery pipeline and issued certificate artifact delivery, broader graph coverage and owning-phase browser/provider approvals remain. R05/R07 are untouched and no entire scenario is accepted.

Evidence: docs/reviews/evidence/post28/92461e771267d7026dcbd900fed7b30d7e8794ba/R06-student-assets-http/evidence-index.json. Actual database cases: 18 passed, zero failed/skipped in final runs. New distinct 4; repeats 14; cumulative 434 across SHAs, not one current-head acceptance run. R06 remains 0/26 accepted.
