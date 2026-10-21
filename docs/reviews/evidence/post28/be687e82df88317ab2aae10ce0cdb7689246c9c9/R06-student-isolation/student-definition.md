# R06: tenant boundary clarification required

This is a requirements gap, not a PASS or a proposed automatic waiver.

Evidence at source 54df6f85e7dd36a78a3936a72556392a2236819c:
- packages/infrastructure/prisma/schema.prisma: StudentWorkspace (2912) has a unique studentReferenceId and no canonical tenant identity; StudentApplicationTracker (2990) and StudentApplicationDocumentBinding (6110) join student/tracker/asset ownership, not an institutional tenant. AssetRecord (2878) has ownerId/ownerType, not a tenant FK.
- apps/api/src/presentation/api/router/StudentDocumentReviewRouter.ts evaluates admin:students:documents:review with IP/request time. The permission is global; it does not currently receive an institutional resource/tenant attribute.
- packages/domain/src/authorization/services/AuthorizationEvaluatorService.ts accepts context attributes, but that does not create a tenant identity, membership authority or data ownership model.

Current repair validates student asset ownership, disallows self-review, requires current persisted review permission, and rechecks consent/binding/version and permission after IO. Negative HTTP tests cover a leaked path reaching an unauthenticated caller or another unprivileged identity. These are not proof of isolation between two institutional tenants whose reviewers both hold the global permission.

Required project definition: does Cross-Tenant mean the current student/asset ownership boundary, or two separate institutional customers with independently scoped reviewers? If institutional tenancy is required, define the tenant owner, canonical membership and reviewer scope, how existing rows acquire a tenant, and the applicable independent schema/security review gates. Do not infer it from nationality, scholarship University, metadata, role name or an untrusted request header. No tenant column, made-up organization or blanket reviewer restriction has been added. The existing requirement remains open until this is resolved and proven.

Recommendation: preserve global reviewer behavior until the intended institutional boundary is defined; continue denying callers without review permission and mismatched student asset ownership. Do not mark cross-institutional tenant isolation PASS on the strength of cross-student tests.

## Project definition resolved — 2026-10-18

The project owner answered the pending requirement question: «عزل ملكية الطالب الحالي» (isolation of the current student's ownership). R06 Cross-Tenant therefore means the existing canonical student ownership boundary, not an institutional tenant model. This is a requirements clarification, not technical approval or evidence that tests passed. No schema change or global reviewer restriction follows from it. Prior institutional-tenancy uncertainty is resolved for this R06 scope; remaining student ownership tests across documents, certificates, invoices and graph responses must still be assessed individually.
