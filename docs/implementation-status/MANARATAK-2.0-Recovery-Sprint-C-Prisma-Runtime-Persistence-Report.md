# MANARATAK 2.0 - Recovery Sprint C - Prisma & Runtime Persistence Reality Check

## Summary
The goal of this sprint was to inspect the database persistence layers (Prisma schema, infrastructure repositories, and API runtime integration) to ensure they are coherent with the domain models built in previous sprints, and to identify any fake or stubbed code.

## 1. Prisma Schema Reality Check
- **Schema Status**: The `packages/infrastructure/prisma/schema.prisma` file is **REAL** and accurately reflects the implemented domain entities. It is not a placeholder.
- **Existing Models**: 
  - *System*: `Settings`
  - *Import Foundation*: `ImportBatch`, `ImportRecord`
  - *Core Entities*: `University`, `Scholarship`, `Major`, `InternationalTest`
  - *Student*: `StudentWorkspace`, `StudentSavedItem`
- **Matching Repositories**: The domain layer (`packages/domain`) correctly defines interfaces for all the core models present in the Prisma schema.
- **Indexes & Constraints**: The core entities (`University`, `Scholarship`, `Major`, `InternationalTest`) correctly define `@unique` constraints on `publicId`, `slug`, and `canonicalDedupKey`. 

## 2. Repository Alignment Classification
Upon inspecting `packages/infrastructure/src/index.ts` and the API Dependency Injection container, **ALL** repositories are currently stubbed. 

| Domain Area | Classification | Notes |
| :--- | :--- | :--- |
| **Import Foundation** | `STUB_ONLY` | Classes exist but have no logic. |
| **Universities** | `STUB_ONLY` | `PrismaUniversityRepository` is an empty class `export class PrismaUniversityRepository {}`. |
| **Scholarships** | `STUB_ONLY` | Empty stub class. |
| **Majors** | `STUB_ONLY` | Empty stub class. |
| **International Tests** | `STUB_ONLY` | Empty stub class. |
| **Courses** | `STUB_ONLY` | Empty stub class. |
| **Admin / Identity** | `INMEMORY_ONLY` | `InMemoryIdentityRepository` is registered but uses generic bypass types (`[key: string]: any`). |

**Crucial Finding**: While the tests pass because the `application` layer unit tests mock the repositories, hitting any actual API endpoint at runtime will result in a crash (e.g. `universityRepository.list is not a function`), because the DI container resolves the empty stub classes.

## 3. Runtime Database Readiness
- **Connection Handling**: `apps/api/src/server.ts` correctly parses `DATABASE_URL`. If provided, it boots the `PrismaConnection` and registers a health check. If it fails to connect, it exits gracefully. If missing, it falls back to logging an InMemory warning.
- **Prisma Client**: `npm run db:generate` executes successfully without errors and generates the Prisma client.
- **Readiness**: The API infrastructure is ready to communicate with Postgres, but the application cannot read/write data yet due to the empty repository stubs.

## 4. Redis / Queue Readiness
- **Connection Handling**: `REDIS_URL` is parsed and connected via `RedisClientFactory` if present, with health checks registered.
- **Queues/Workers**: There is no BullMQ queue initialization, nor are there any background workers.
- **Roadmap Impact**: This **can remain deferred**. The current business logic (CRUD operations and import classifications) is synchronous and does not block the roadmap.

## 5. Verification Results
No modifications to the Prisma schema were necessary as it perfectly matches the Phase boundaries and entity structures. 
- **Build**: ✅ `npm run build` passed.
- **Lint**: ✅ `npm run lint` passed.
- **Test**: ✅ `npm run test` passed (171/171).
- **Prisma**: ✅ `npm run db:generate` passed.

## Remaining Persistence Gaps
The primary gap is the total lack of Prisma queries (`findMany`, `create`, `update`, etc.) inside the infrastructure package. 

## Recommended Next Sprint
**Recovery Sprint D - Core Repository Implementations.**
Now that the schema is validated, we must flesh out the actual Prisma logic for the fundamental entities (`PrismaUniversityRepository`, `PrismaScholarshipRepository`, `PrismaMajorRepository`, `PrismaInternationalTestRepository`) so that the API can perform real database reads and writes.
