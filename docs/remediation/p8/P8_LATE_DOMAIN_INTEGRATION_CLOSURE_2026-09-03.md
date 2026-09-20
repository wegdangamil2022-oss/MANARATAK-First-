# P8 — Late-Domain Integration Source Closure (P16 → P21)

**Date:** 2026-09-03  
**Scope:** Source-level closure only. No live database migration, runtime/E2E certification, or production deployment is performed in this package.  
**Authority:** `MANARATAK_Source_Closure_Repair_Plan_v1.0_2026-09-03` + Roadmap v6.0 + active Cross-Phase Relationship Closure Matrix.

## 1. Closure decision

P8 is treated as the remediation step for the late domains P16–P21, not as the numbered product Phase 8 Academic Taxonomy. The work preserves the existing P16/P17/P18/P19 implementations and closes only proven cross-phase source gaps. No downstream domain is allowed to redefine P7–P15 business truth.

## 2. Ownership boundaries preserved

- **P16 CMS:** editorial content, versions, localization, publishing/SEO metadata only. Student workspace stores references; current CMS truth is hydrated through a P16-owned read adapter.
- **P17 AI:** remains the only model/provider/prompt/execution boundary. P18 calls `IEnterpriseAIConsumerGateway` / `Phase17StudentToolsAIConsumerGateway`; no provider SDK is introduced in P18/P20/P21.
- **P18 Student Tools:** orchestrates canonical owner reads. Scholarship candidates come from P12 with P7/P8 canonical reference resolution; optional private student context is projected from P15. P18 does not become scholarship or workspace owner.
- **P19 Finance:** remains the sole invoice/payment/ledger/refund/transaction authority. P20 requests a P19 draft invoice through a gateway and never posts ledger/payment logic itself.
- **P20 Services:** owns service catalog, request, provider assignment, fulfillment status, and the service-side reference to a P19 invoice.
- **P21 Career & Alumni:** owns recruitment employer/opportunity metadata. Geography is persisted with P7 canonical Country/City IDs; compatibility text is non-authoritative.

## 3. Closed source relationships

### R-029 — P16 → P15 CMS saved-item hydration

Added `IStudentSavedItemHydrationGateway` and `StudentSavedItemHydrationService`. `CmsStudentSavedItemHydrationGateway` reads current P16 content and exposes only published owner truth. P15 retains the saved reference and does not copy CMS ownership.

### R-030 — P18 → P15 private Student Tool save

Existing Phase 18/15 save path remains owner-safe and is included in the P8 regression gate.

### R-031 — P20 → P15 private service state

Added typed P20 service request contracts, durable source repository mapping, student request use cases, and authenticated Student Workspace routes for request create/list/detail. P15 composes P20 owner state rather than storing service fulfillment truth.

### R-032 / R-034 — P19 → P15 finance reads and P7 → P19 currency

Existing source wiring is preserved and regression-verified. P8 introduces no competing finance implementation.

### R-035 — P7 → P20 service countries/languages

Removed the service platform's generated/dummy authority. P20 now persists `supportedCountryReferenceIds` and `supportedLanguageReferenceIds` through explicit join records referencing P7 `ReferenceCountry` / `ReferenceLanguage`. Compatibility labels may enter the application edge only to be resolved to canonical IDs; they are not persistence identity.

### R-036 — P7 → P21 career geography

Career employers/jobs now carry canonical Country/City IDs and have P21 owner persistence. `CanonicalCareerReferenceGateway` resolves through the P7 resolver contract and validates City→Country consistency when both are supplied. Text country/city fields are retained only as compatibility/source labels.

### R-037 / R-038 / R-039 / R-040 — P18 owner reads, private context, AI

- University comparison continues to consume P11 published owner reads.
- Scholarship recommendations now resolve country/language through P7 and DegreeLevel through the P8 DegreeLevel SSoT before querying P12. The gateway paginates canonical published candidates instead of comparing source labels as relationship identity.
- `Phase15StudentContextGateway` supplies a minimal private workspace projection for authenticated tools without transferring P15 ownership.
- All AI execution remains behind the P17 enterprise AI consumer gateway.

### R-041 — P20 → P19 invoice handoff

`Phase19ServiceFinanceGateway` delegates to `FinancePlatformUseCases.createDraftInvoice` with:

- `originDomain = PHASE_20_SERVICE_REQUEST`
- `originReferenceId = service request public ID`
- student/payer reference propagated from the P20 request
- a **server-derived deterministic idempotency key** per service request

P20 stores only the returned finance invoice identity. P19 remains the only authority for money validation, invoice calculation and financial persistence.

## 4. Source persistence added

Source models were added for:

- `ServiceCatalogRecord`
- `ServiceCatalogCountryRecord`
- `ServiceCatalogLanguageRecord`
- `ServiceRequestRecord`
- `CareerEmployerRecord`
- `CareerJobPostingRecord`

The source migration is:

`packages/infrastructure/prisma/migrations/20260903210000_p8_late_domain_integrations/migration.sql`

**Runtime gate:** the migration is intentionally not executed in this package. Database deployment remains `Runtime Pending` under the project plan.

## 5. Compatibility and non-destructive rules

- Existing P16–P19 owner implementations are reused rather than rewritten.
- P7 canonical reference tables remain upstream owners.
- Compatibility text fields are retained where existing API/UI callers may still send labels, but source persistence relationship identity is canonical ID.
- No live DB mutation is performed.
- No removed Career registry is recreated.
- P23 Admin selector/editor completion and P24 Public live composition remain their own later remediation steps; P8 does not falsely mark those consumer UI rows closed.

## 6. Verification gate

P8 is source-closed only when all of the following pass:

1. `npm run phase8:plan:verify`
2. `npm run phase16:verify`
3. `npm run phase17:verify` in a tracked Git worktree (the P17 verifier inspects Git-tracked source)
4. `npm run phase18:verify`
5. `npm run phase19:verify`
6. `npm run phase7:plan:verify`
7. `npm run w1:verify`
8. `npm run w2:verify`
9. `npm run w3:verify`
10. Syntax transpilation check for all P8-touched TypeScript sources.

A full dependency-backed `typecheck/build/unit` is not certified by this package if `node_modules` is absent. That limitation must be reported, not hidden. The checked-in `dist` tree is therefore a pre-P8 compiled artifact until dependencies are installed and the normal workspace build is run.

## 7. Closure state

**P8 source state:** `SOURCE CLOSED / RUNTIME PENDING` after the gates above pass.  
**Deferred by design:** live Prisma migration, real DB validation, dependency-backed workspace build/typecheck/unit suite, runtime/E2E verification, P23 authoring UI, P24 public live graph.

## 8. Final source verification evidence

Final rerun after the P20 repository identity fix:

- `phase8:plan:verify`: **PASS 54/54**
- Phase 15 source verifier: **PASS 14/14**
- Phase 15/16 closure verifier: **PASS 13/13**
- Phase 16 source verifier: **PASS 22/22**
- Phase 17 source verifier: **PHASE17_SOURCE_READY=YES** (executed in a temporary local Git index; the `.git` directory is not packaged)
- Phase 18 source verifier: **PASS**
- Phase 19 source verifier: **PASS**
- P7 plan verifier: **PASS 16/16**
- W1: **PASS 30/30**
- W2: **PASS 23/23**
- W3: **PASS 31/31**
- W12: **PASS 14/14**
- W13: **PASS 13/13**
- W14: **PASS 14/14**
- Syntax transpilation of all 35 P8-touched TypeScript/TSX files: **PASS 35/35**

The final P20 correction keeps `ServiceCatalogItem.publicId` immutable after creation: repository update operations cannot rewrite the service public identity. A dedicated assertion is included in the P8 verifier.

### Final declaration

**P8 = SOURCE CLOSED / RUNTIME PENDING.**

The remaining pending items are environment-dependent only: dependency-backed workspace typecheck/build/unit suite, Prisma validation/generation against an installed dependency tree, live migration execution, database/runtime/E2E proof, and the later P23/P24 remediation packages required by the plan.
