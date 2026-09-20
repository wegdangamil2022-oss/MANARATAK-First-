# MANARATAK 2.0 - Sprint 2.2 - Backend Stub Audit & Real Persistence Plan

## 1. Stub Inventory
A complete scan of the backend workspaces identified 377 temporary stubs bridging the compilation gaps from Sprint 2.1:
- `packages/domain/src/generated/dummy.ts`: 295 stubbed exports (classes, interfaces, enums).
- `packages/infrastructure/src/index.ts`: 56 mock repository and gateway classes.
- `packages/application/src/index.ts`: 26 stubbed Use Case classes.

**Classification:**
- **ACCEPTABLE_PROTOTYPE:** Some Infrastructure gateways (e.g., `InMemoryEventPublishingGateway`, `InMemoryCacheExecutionGateway`) are perfectly acceptable for initial development and can remain mocked.
- **REQUIRED_BEFORE_DATABASE_INTEGRATION:** The dummy domain models (e.g., `InternationalTestCategory`) and mock Prisma repositories (e.g., `PrismaUniversityRepository` without a real schema backing) MUST be replaced before we can migrate actual data.
- **REQUIRED_BEFORE_ADMIN_LAUNCH:** All `Admin*UseCases` stubs in `packages/application/src/index.ts`.
- **REQUIRED_BEFORE_PUBLIC_LAUNCH:** All `Public*UseCases` stubs in `packages/application/src/index.ts`.

## 2. TypeScript Strictness Audit
During Sprint 2.1, specific `tsconfig.json` compiler options were relaxed in `packages/application`, `packages/domain`, and `apps/api` to unblock compilation while the codebase was fragmented.

- `strict: false` -> **Temporary.** Must be re-enabled once real types replace `any` in dummy signatures.
- `noImplicitAny: false` -> **Temporary.** Required for the `..._args: any[]` pattern in dummy classes.
- `noUnusedLocals: false` / `noUnusedParameters: false` -> **Temporary.** Used to bypass unused generic parameters (e.g., `<T = any>`) in dummy definitions.
- `strictNullChecks: false` -> **Temporary.**

**Recommendation:**
These relaxations are strictly temporary. As we replace stubs with real implementations in upcoming sprints, we will progressively re-enable strict mode, starting with `packages/domain`.

## 3. Prisma / Database Readiness
**Status:** The current `packages/infrastructure/prisma/schema.prisma` is entirely empty (only defines the PostgreSQL provider and Prisma Client generator).
- Real persistence models are missing for all domains.
- We are 100% disconnected from the database at this time.

**Next Steps:**
The immediate next step is to introduce the foundation schema (Identity, Profiles, Settings, Auth Roles).

## 4. API Runtime Readiness
- `apps/api` compiles successfully and starts the Express server.
- All routers (Admin, Public, and Foundation) are registered in the DI container.
- However, since 100% of the underlying Use Cases and Repositories are mapped to dummy/memory implementations, the API acts solely as a structural shell. It cannot process complex business logic or persist real state.

## 5. Architecture Boundary Safety
- **No Phase 25:** Confirmed. The `index.ts` files do not reference a Phase 25 structure.
- **No standalone Search Platform:** Confirmed. Search is integrated into the foundation context.
- **No Organizations/Employers Platform:** Confirmed.
- **Phase 06 (CMS):** Confirmed generic import mechanics only.
- **Phase 12:** Confirmed owns scholarships.
- **Phase 05 (File Management):** Confirmed owns EAP/asset references.
- **Phase 17 (AI Platform):** Confirmed remains the only AI gateway owner.

## 6. Recommended Replacement Order
To safely replace the stubs and move toward a production-ready system, the next sprints should follow this order:

1. **Sprint 2.3: Core Persistence Foundation**
   - Goal: Define the real `schema.prisma` for Identity, Auth Roles, Settings, and Base Entities.
   - Why: Database schemas dictate domain entities. We cannot remove domain stubs until the database schema is defined and Prisma client is generated.
2. **Sprint 2.4: Core Domain & Application Un-Stubbing**
   - Goal: Implement real `IdentityRouter`, `AuthorizationAdminRouter`, and replace their `packages/application` and `packages/domain` stubs. Re-enable `strict` mode for `packages/domain`.
   - Why: Once persistence exists, we can write the real business logic for user sessions and RBAC.
3. **Sprint 2.5: Scholarship & Public Read Models**
   - Goal: Build out Phase 12 (Scholarships) schema, un-stub its repositories, and implement the public APIs.
   - Why: Scholarships represent the primary core value proposition of the system and depend on the core foundation established in Sprints 2.3 and 2.4.
