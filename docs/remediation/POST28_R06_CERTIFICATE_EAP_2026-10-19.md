# R06 certificate artifact integrity and actual asset lifecycle

Implementation source: c42f8dd3a881ee559c6a4e0665204ea4b814c875, on the unified R06/R07 branch.

## Programming defect fixed

An existing ACTIVE generated certificate asset could previously be returned on retry without checking the newly rendered source bytes. A retry while SANITIZING also lacked that original-source comparison. The certificate store and direct generated-upload resume now compare the immutable generation source, artifact kind, render fingerprint, SHA-256 and byte count before delivery or provider side effects. Initial allocation records that provenance in existing metadata. Sanitized output may legitimately have a different digest and size, so its checksum is not substituted for the original render proof. Missing historical provenance is denied; no historical metadata is fabricated or backfilled. Existing stored delivery is unchanged, but regenerating legacy assets without source proof requires a separately reviewed recovery decision.

## Verification completed

The initial focused regression run captured failures before the fix. The final affected pack passed 52/52: 11 retry-integrity cases plus 41 existing certificate security cases. Infrastructure TypeScript checking and source quality passed. Focused ESLint has zero errors and three any warnings (two existing implementation warnings and one in the new test). Broad unit/database packs were not repeated.

A newly created PostgreSQL 16.15 cluster, system 7698163941403182988, applied 110/110 checked migrations. The runtime role had application reads and AssetRecord DML only; the setup role performed provisioning. No existing database or Neon was accessed. The dedicated cluster was stopped after the run.

The actual production rendering service deterministically generated PDF, PREVIEW and QR for one synthetic certificate identity. Actual IngestAssetUseCase, PrismaAssetRecordRepository, LocalAssetStorageGateway, ProcessAssetLifecycleUseCase and EapCertificateArtifactStore then completed all three assets: bounded loopback HTTP PUT, source verification, Windows Defender scan, raster reconstruction, a second Defender scan, clean-zone activation and authenticated-delivery use-case byte/hash verification. The successful run has 12 provider journal operations, six real clean scan results and three ACTIVE persisted assets. All three accepted identical retry without provider work and rejected same-length modified source. The reconstructed files retained matching visible raster pixels; the PDF output intentionally removes searchable text/interactivity.

The laboratory provider accepts only byte hashes registered from this synthetic render and its sanitized outputs. MuPDF processes PDF; an isolated headless Edge context with requests blocked renders SVG, since the installed MuPDF build does not support SVG. Edge metadata was recorded after the successful run, not pre-pinned. These are explicit laboratory adapters, not changes to deployed provider wiring or approval of MuPDF licensing/production operation. Earlier renderer-path, PDF detection and unsupported-SVG failures are retained with their original results. The successful evidence is certificate-eap-proof-edge-svg/result.json.

## Remaining acceptance boundaries

This run exercises fresh artifact ingestion and delivery use cases, but does not issue/attach a Certificate record, call the public authenticated download HTTP route or establish browser acceptance of the product. Earlier certificate issuance/attachment and HTTP tests remain separately sourced; they are not combined into a claimed single complete transaction. Existing R05 gates, Consent, Binding, schema and production configuration are unchanged. The INTERNAL PDF/PREVIEW and PUBLIC QR classifications are the existing generated-certificate contract; this work does not alter the separate CONFIDENTIAL/TEMPORARY R05 industrial-document decision.

R06 still has full worker-to-owner crash recovery and large-catalog eligibility performance to complete. R07 still needs full browser acceptance, a symlink-capable environment for the four blocked packaging cases, and final artifacts/CI against the final implementation source. The previously verified HTTPS artifacts were built from 642556c and are not relabelled as this later certificate source. Formal R06/R07 acceptance remains open; no main merge, promotion or production deployment occurred.

Evidence: docs/reviews/evidence/post28/c42f8dd3a881ee559c6a4e0665204ea4b814c875/R06-certificate-eap/evidence-index.json.
