# MANARATAK Certificates — Final Source Closure — 2026-09-05

## Scope
Phase 14 certificate administration, trusted issuance, template governance, issuer governance, public verification, QR, lifecycle, audit, and course/learning-path integration.

## Product decisions
- MANARATAK issues **Certificates of Completion**, not academic degrees or third-party professional accreditation.
- Initial issuance is not a manual Admin action. It is accepted only from authoritative Phase 13 `CourseCompleted` / `LearningPathCompleted` persisted events.
- Imported/external courses never receive a MANARATAK certificate automatically.
- One trusted completion identity maps idempotently to one initial certificate.
- Recipient display name is snapshotted at issuance and sealed in the signed certificate envelope.
- Certificate records are never hard-deleted. Corrections use revoke + reissue; renewable credentials use renewal; inactive historical records may be archived.
- QR resolves to the public verification UI, not to raw API JSON.
- Public verification is privacy-minimized and omits student IDs, signing material, hashes, and administrative revocation reasons.
- Template changes are versioned and maker/checker governed before activation.
- PDF/preview/QR rendered artifacts are owned by the EAP asset pipeline and attach back to Phase 14 through a governed, audited artifact boundary.

## Admin workspace
The operational Admin area now includes:
1. Certificate registry
2. Certificate detail and lifecycle
3. Template management and visual preview
4. Issuer management
5. Runtime readiness and governance

Template authoring includes:
- Arabic / English / bilingual language policy
- Landscape / portrait layout
- MANARATAK green `#044A37` and gold `#E3B04B`
- Arabic/English titles and body copy
- Signatory text
- EAP logo / seal / signature / design asset handles
- Permanent / expiring / renewable validity policy
- Renewal period and revalidation controls

Runtime readiness is read from the Phase 14 owner service; the Admin UI does not hard-code the verification URL or signing stack as ready.

## Public verification
The public verification page:
- accepts the QR verification code automatically from `?code=`;
- displays certificate status, recipient snapshot, achievement, issuer, completion date, issue date, validity and expiry;
- validates the signed envelope and cryptographic signature;
- records verification activity;
- explicitly states that a MANARATAK completion certificate is not an academic degree or external professional accreditation unless an independent issuer/accreditation is explicitly present.

## QR + printable certificate smoke test
A temporary source-only certificate was generated outside the project database using the **same in-repository QR encoder**. The QR was embedded in a temporary landscape PDF, the PDF was rendered at 220 DPI, and OpenCV's independent QR decoder read the rendered certificate.

Expected URL:
`https://manaratak.org/certificates/verify?code=MNR-E2E-QR-20260905`

Decoded URL:
`https://manaratak.org/certificates/verify?code=MNR-E2E-QR-20260905`

Result: **MATCH / PASS**.

The temporary learner/course/certificate artifacts were not inserted into MANARATAK source data or the database and are removed before final packaging.

## Closure gates
- Certificates source closure: `90/90 PASS`
- Study destinations: `90/90 PASS`
- Courses Admin: `88/88 PASS`
- Imported courses: `90/90 PASS`
- International tests: `37/37 PASS`
- Import Foundation: `PASS`
- P4 cross-domain read models: `64/64 PASS`
- P10 source closure: `96/96 PASS`
- P13 source closure: `98/98 PASS`
- W2: `23/23 PASS`
- Source quality: `PASS`
- Package dependency cycles: `0`
- File dependency cycles: `0`
- Accessibility findings: `0`

## Database / runtime boundary
- Database mutations executed: **0**
- Migration executions: **0**
- Backfills: **0**
- Existing migrations modified: **0**
- Existing migrations removed: **0**
- New migration source: `20260905050000_certificate_brand_defaults` (source-only; changes future template color defaults only)
- Prisma source gate runtime result: `prisma-cli-not-installed`; no dependency download or database action was attempted.
- Production KMS/HSM, deployed database proof, and EAP renderer execution remain deployment/runtime gates rather than source-closure claims.
