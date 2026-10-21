# Canonical relationships and public navigation

Authority: Roadmap v6.0, P07–P21 owner contracts and the cross-phase relationship register. This clarification preserves existing phase ownership; Admin/Public are consumers, not new business-data owners.

## Four responsibilities

1. **Owner model and PostgreSQL:** persist canonical references and their integrity constraints. A display label such as TOEFL is not an identity.
2. **Admin and import review:** select/resolve the owner record and approve the relationship through its owner commands. Text matching may propose candidates; it cannot approve them.
3. **Public owner API:** expose only currently eligible owner publications and explicitly allowed fields. A valid FK or approved relationship alone does not authorize public disclosure.
4. **Student/public UI:** turn an eligible canonical reference into navigation. Adding a button does not require a second relationship table or URL column.

## Existing academic paths

| Relationship | Persistent owner reference | Review/public composition |
| --- | --- | --- |
| Major ↔ course | P13 `CourseMajorProjection.majorId/courseId` | Manual proposal or lineage from reviewed taxonomy/mapping; public projection requires APPROVED and published owners. P10 reverse view calls P13. |
| Course ↔ test | P13 `CourseInternationalTestRelationship` | Explicit relationship type and review; public reads also require a visible test with an owner-matched published version. A preparation course is not a substitute for the test certificate. |
| Scholarship ↔ major/degree | P12 `ScholarshipMajorTarget`, `ScholarshipDegreeTarget`, eligibility references | Canonical selection and readiness validation. Funded program pairs retain the real university/program/major/degree combination rather than inventing a Cartesian product. |
| Scholarship ↔ university/program | P12 `ScholarshipUniversityLink` | Program parent must match the selected university; referenced program must remain publicly eligible. |
| Scholarship ↔ required test | P12 `ScholarshipEligibilityItem.internationalTestId` or `ScholarshipRequiredDocument.internationalTestId` | Owner relationship editor already supports canonical test selection; public requirement rows can expose a navigation action. |
| University program ↔ admission test | P11 `UniversityProgramAdmissionRequirement` | Owner-scoped test/version/variant and score interpretation; preserve reviewed requirement identity and version semantics. |

## Public test navigation contract

- `GET /public/international-tests/id/:id?locale=ar|en` resolves the canonical owner ID through an immutable published snapshot. It never falls back to `findById` or an admin DTO.
- Existing slug routes remain supported. A UI slug already associated with an owner ID is converted through that known identity; free text is never guessed into an ID.
- Related navigation performs a bounded direct read. It does not depend on the first catalog page, download every test, or use cached/prototype content after an owner withdrawal.
- Validate returned owner identity, publication status, and visibility. API errors leave the current page intact and show an unavailable message. Ignore responses after navigation, locale changes, unmount, or a later selection.
- Inline requirement actions need both a canonical ID from the public projection and a navigation handler. A label-only document remains text. Optional evidence must not be promoted into the required-exams summary.
- Current public visibility constraints stay enforced. If required rows cannot be safely exposed, `hasUnavailableRequirements` indicates partial requirements without exposing private owner identities or facts. Public UI directs the applicant to the official source; it must not silently imply that the remaining rows are the entire requirement set.

## Import and migration boundary for the new scholarship file

The owner's 2026-10-22 instruction pauses migrations, seeds, imports, recovery and schema/ledger writes until the new scholarship source is supplied and reviewed. Source analysis, code, documentation and tests without database writes remain allowed.

For the incoming file: preserve the original bytes/provenance; produce a read-only field and relationship mapping; distinguish required, optional, alternative, waived and unknown requirements; resolve candidates against canonical owners; retain unresolved items for review. Do not create identities from names, fabricate approvals, reuse synthetic students/consents, or infer a specific score scale/version from an ambiguous number. Any required schema addition is reviewed as a future migration; none is applied by this clarification.
