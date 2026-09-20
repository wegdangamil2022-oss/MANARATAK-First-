# Phase 09 / Phase 23 Documentation Alignment: International Tests Admin Data Requirements

## Summary
Updated the Phase 23 Enterprise Administration Portal documentation (`phase-23-04-admin-preview-ui-design-and-action-backlog.md`) to explicitly capture all essential data groups required for International Tests admin workspace (Phase 09). Additionally, replaced the generic Phase 09 placeholder APIs with instructions to use the real endpoints.

## Files Inspected
- `docs/phases/phase-23-enterprise-administration-portal/phase-23-04-admin-preview-ui-design-and-action-backlog.md`
- `docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md`
- `docs/phases/phase-24-enterprise-public-platform/phase-24-04-public-page-detail-requirements-backlog.md`

## Files Modified
- `docs/phases/phase-23-enterprise-administration-portal/phase-23-04-admin-preview-ui-design-and-action-backlog.md`
  - Replaced `POST /api/admin/phase09/action`, `POST /api/admin/phase09/publish`, and `DELETE /api/admin/phase09` with `[Use real Phase 09 API endpoint]`.
  - Added new section `22. International Tests Admin Workspace (Phase 09)` comprehensively defining the admin-managed data groups.

## Data Groups Added
1. **Core Test Identity**: Canonical names, Arabic/English localized names, categories, providers, lifecycle status.
2. **Test Versions / Variants**: Variant name, delivery mode, active status, specific official URLs.
3. **Score System**: Min/max scores, bands, CEFR mappings, validity duration, score reporting URL.
4. **Test Sections**: Types, duration, order, question types, section score ranges.
5. **Fees and Currency Metadata**: Registration, late, and cancellation fees, and currency code (noting Phase 19 owns actual payment).
6. **Registration and Policy Requirements**: ID docs, age rules, retake and accommodation policies.
7. **Availability**: Associated Phase 07 countries/cities, regions, testing windows.
8. **Official Links and Source Verification**: Preparation, information, registration URLs, and source tracking.
9. **Preparation Materials and Assets**: Links, PDFs, audio references tied strictly to Phase 05 EAP `AssetId`.
10. **Cross-Phase References**: Universities (11), Scholarships (12), Prep Courses (13), CMS (16), Tools (18), Paid Services (20).
11. **Import, Evidence, and Review**: Canonical keys, evidence snippets, validation results, and clear rules against auto-publish.
12. **Missing Data and Publication Readiness**: Strict tracking of incomplete fields and readiness statuses.

## Constraint Validations
- No Arabic mojibake or corrupted characters were found in the targeted documentation files.
- No code, Prisma schema, or package configuration changes were made.
- No APIs, fake data, or UI implementations were introduced. 
- Phase 06 vs Phase 09 boundaries and Phase 09 vs Phase 10 route ownership are strictly clarified in the documentation.

Classification:
PHASE_09_PHASE23_INTERNATIONAL_TESTS_ADMIN_DATA_REQUIREMENTS_ALIGNED
