> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 09 International Tests Platform

## Part C - Implementation Guide

### 9.C.1 Executive Summary & Architecture Overview

**Architectural Commentary**
This document provides the definitive implementation guide for **Phase 09 (International Tests Platform)**. It translates the architectural requirements of Part A and the domain contracts of Part B into concrete enterprise integration patterns, architectural workflows, and deployment topologies adhering strictly to ADR-025 (TypeScript / Node.js / Express / Prisma ORM / PostgreSQL canonical stack).

The platform is built on Clean Architecture and CQRS principles. The Write Model (Commands) manages test standards, versions, sections, scoring scales, score bands, delivery modes, and cross-test equivalencies using Domain-Driven Design (DDD) aggregates and Prisma ORM. The Read Model (Queries) delivers ultra-fast test reference lookups and equivalency projections via a distributed Redis caching tier.

---

> **ADR-028 persistence note (2026-09-06):** Historical `@@schema(...)` examples in earlier revisions are superseded. The canonical runtime uses Prisma `public` with ownership enforced by `persistence-ownership.manifest.json`; this guide does not authorize a separate physical/logical PostgreSQL schema.

### 9.C.2 Technology Stack

**Architectural Commentary**

- **Runtime Environment**: Node.js 22.16.0 (`>=22.16.0 <23`) / TypeScript 5.x / Express.js
- **Primary Persistence**: Relational SQL Database (PostgreSQL via Prisma ORM) under the `tests` database schema
- **In-Memory Cache**: Distributed Redis Cache (Read-through caching for test nodes and score conversions)
- **Message Broker & Events**: Enterprise Transactional Outbox / Inbox Event Bus
- **Validation Pipeline**: Zod Schema Validation
- **Testing Framework**: Vitest (Unit & Integration Testing)

---

### 9.C.3 Project & Directory Structure

**Architectural Commentary**
The platform is organized strictly following Clean Architecture principles to isolate core domain business logic from infrastructure dependencies and delivery mechanisms.

```text
src/
├── domain/               # Pure DDD Aggregates, Entities, Value Objects, Domain Events
│   ├── entities/         # TestEntity, TestVersionEntity, ScoreScaleEntity, ScoreBandEntity
│   ├── value-objects/    # ValidityPeriod, ScoreRange, DeliveryModeCode
│   └── events/           # TestCreatedEvent, TestVersionPublishedEvent, TestEquivalencyUpdatedEvent
├── application/          # CQRS Use Cases, Handlers, Commands, Queries, DTOs, Zod Validators
│   ├── commands/         # CreateTestCommand, PublishTestVersionCommand, UpdateEquivalencyCommand
│   ├── queries/          # GetTestSummaryQuery, SearchTestsQuery, GetEquivalenciesQuery
│   ├── validators/       # Zod Schemas for commands and queries
│   └── projections/      # Read models & projections for downstream consumers
├── infrastructure/       # Persistence, Repositories, Caching, Outbox
│   ├── persistence/      # Prisma Client (`tests` schema), Repositories
│   ├── caching/          # Redis Cache Service
│   └── messaging/        # Outbox Relays & Inbox Consumers
└── presentation/         # Express API Controllers, Middleware, Routes
    ├── controllers/      # TestController, TestVersionController, EquivalencyController
    └── middleware/       # Authentication, Validation, Error Handling
```

---

### 9.C.4 Persistence Strategy & Prisma Schema Mapping

**Architectural Commentary**
All persistence entities operate under the PostgreSQL `tests` schema managed by Prisma ORM. Auditing fields (`createdAt`, `lastModifiedAt`) and soft-deletion flags (`isDeleted`) are enforced on every table.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Test {
  id               String                 @id @default(uuid())
  publicId         String                 @unique @map("public_id")
  nomenclature     String
  code             String                 @unique
  standardCode     String                 @map("standard_code")
  governingBodyId  String                 @map("governing_body_id")
  lifecycleState   String                 @map("lifecycle_state")
  createdAt        DateTime               @default(now()) @map("created_at")
  lastModifiedAt   DateTime               @updatedAt @map("last_modified_at")
  isDeleted        Boolean                @default(false) @map("is_deleted")

  versions         TestVersion[]
  countryLinks     TestCountryRelationship[]
  languageLinks    TestLanguageRelationship[]
  academicLinks    TestAcademicTaxonomyRelationship[]

  @@map("tests")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestVersion {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  parentTestReferenceId String         @map("parent_test_reference_id")
  versionName            String         @map("version_name")
  validityDurationMonths Int            @map("validity_duration_months")
  effectiveDate          DateTime       @map("effective_date")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  test                   Test           @relation(fields: [parentTestReferenceId], references: [publicId])
  sections               TestSection[]

  @@map("test_versions")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestSection {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  testVersionReferenceId String         @map("test_version_reference_id")
  sectionName            String         @map("section_name")
  sequenceOrder          Int            @map("sequence_order")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  testVersion            TestVersion    @relation(fields: [testVersionReferenceId], references: [publicId])

  @@map("test_sections")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestProvider {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  providerReferenceId    String         @map("provider_reference_id")
  name                   String         @map("name")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  @@map("test_providers")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model DeliveryMode {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  modeCode               String         @map("mode_code")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  @@map("delivery_modes")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestRequirement {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  testVersionReferenceId String         @map("test_version_reference_id")
  requirementDetails     String         @map("requirement_details")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  @@map("test_requirements")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestSession {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  testVersionReferenceId String         @map("test_version_reference_id")
  sessionDate            DateTime       @map("session_date")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  @@map("test_sessions")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestCenter {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  locationReferenceId    String         @map("location_reference_id")
  name                   String         @map("name")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  @@map("test_centers")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestPolicy {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  testVersionReferenceId String         @map("test_version_reference_id")
  policyDetails          String         @map("policy_details")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  @@map("test_policies")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ValidityPeriod {
  id                     String         @id @default(uuid())
  publicId               String         @unique @map("public_id")
  testVersionReferenceId String         @map("test_version_reference_id")
  durationMonths         Int            @map("duration_months")
  createdAt              DateTime       @default(now()) @map("created_at")
  lastModifiedAt         DateTime       @updatedAt @map("last_modified_at")
  isDeleted              Boolean        @default(false) @map("is_deleted")

  @@map("validity_periods")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ScoreScale {
  id             String      @id @default(uuid())
  publicId       String      @unique @map("public_id")
  scaleName      String      @map("scale_name")
  minScore       Float       @map("min_score")
  maxScore       Float       @map("max_score")
  scoreIncrement Float       @map("score_increment")
  createdAt      DateTime    @default(now()) @map("created_at")
  lastModifiedAt DateTime    @updatedAt @map("last_modified_at")
  isDeleted      Boolean     @default(false) @map("is_deleted")

  bands          ScoreBand[]

  @@map("score_scales")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ScoreBand {
  id                     String     @id @default(uuid())
  publicId               String     @unique @map("public_id")
  scoreScaleReferenceId String     @map("score_scale_reference_id")
  bandName               String     @map("band_name")
  minScore               Float      @map("min_score")
  maxScore               Float      @map("max_score")
  createdAt              DateTime   @default(now()) @map("created_at")
  lastModifiedAt         DateTime   @updatedAt @map("last_modified_at")
  isDeleted              Boolean    @default(false) @map("is_deleted")

  scoreScale             ScoreScale @relation(fields: [scoreScaleReferenceId], references: [publicId])

  @@map("score_bands")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestEquivalencyMapping {
  id                    String   @id @default(uuid())
  publicId              String   @unique @map("public_id")
  sourceTestReferenceId String   @map("source_test_reference_id")
  targetTestReferenceId String   @map("target_test_reference_id")
  status                String   @map("status")
  equivalencyLevel      String   @map("equivalency_level")
  createdAt             DateTime @default(now()) @map("created_at")
  lastModifiedAt        DateTime @updatedAt @map("last_modified_at")
  isDeleted             Boolean  @default(false) @map("is_deleted")

  @@map("test_equivalency_mappings")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestCountryRelationship {
  id                  String   @id @default(uuid())
  testReferenceId    String   @map("test_reference_id")
  countryReferenceId String   @map("country_reference_id")
  createdAt           DateTime @default(now()) @map("created_at")

  test                Test     @relation(fields: [testReferenceId], references: [publicId])

  @@map("test_country_relationships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestLanguageRelationship {
  id                   String   @id @default(uuid())
  testReferenceId     String   @map("test_reference_id")
  languageReferenceId String   @map("language_reference_id")
  createdAt            DateTime @default(now()) @map("created_at")

  test                 Test     @relation(fields: [testReferenceId], references: [publicId])

  @@map("test_language_relationships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestAcademicTaxonomyRelationship {
  id                           String   @id @default(uuid())
  testReferenceId             String   @map("test_reference_id")
  academicTaxonomyReferenceId String   @map("academic_taxonomy_reference_id")
  createdAt                    DateTime @default(now()) @map("created_at")

  test                         Test     @relation(fields: [testReferenceId], references: [publicId])

  @@map("test_academic_relationships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestDegreeRelationship {
  id                  String   @id @default(uuid())
  testReferenceId     String   @map("test_reference_id")
  degreeReferenceId   String   @map("degree_reference_id")
  createdAt           DateTime @default(now()) @map("created_at")

  test                Test     @relation(fields: [testReferenceId], references: [publicId])

  @@map("test_degree_relationships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestStandard {
  id                       String         @id @default(uuid())
  publicId                 String         @unique @map("public_id")
  governingBodyReferenceId String         @map("governing_body_reference_id")
  name                     String         @map("name")
  createdAt                DateTime       @default(now()) @map("created_at")
  lastModifiedAt           DateTime       @updatedAt @map("last_modified_at")
  isDeleted                Boolean        @default(false) @map("is_deleted")

  @@map("test_standards")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model TestTaxonomyEntity {
  id                       String         @id @default(uuid())
  publicId                 String         @unique @map("public_id")
  name                     String         @map("name")
  createdAt                DateTime       @default(now()) @map("created_at")
  lastModifiedAt           DateTime       @updatedAt @map("last_modified_at")
  isDeleted                Boolean        @default(false) @map("is_deleted")

  @@map("test_taxonomy_entities")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}
```

---

### 9.C.5 Aggregate & Entity Implementation Strategy

**Architectural Commentary**
Core domain aggregates encapsulate business rules and domain invariants in pure TypeScript classes. Mutative operations are executed via aggregate methods.

```typescript
import { ITestEntity, ReferenceLifecycleState } from '../domain-contracts';

export class TestAggregate implements ITestEntity {
  public readonly id: string;
  public readonly publicId: string;
  public nomenclature: string;
  public code: string;
  public standardCode: string;
  public governingBodyId: string;
  public lifecycleState: ReferenceLifecycleState;

  constructor(params: {
    id: string;
    publicId: string;
    nomenclature: string;
    code: string;
    standardCode: string;
    governingBodyId: string;
    lifecycleState?: ReferenceLifecycleState;
  }) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.nomenclature = params.nomenclature;
    this.code = params.code;
    this.standardCode = params.standardCode;
    this.governingBodyId = params.governingBodyId;
    this.lifecycleState = params.lifecycleState ?? 'Draft';
  }

  public updateNomenclature(newNomenclature: string): void {
    if (!newNomenclature || newNomenclature.trim().length === 0) {
      throw new Error('Nomenclature cannot be empty');
    }
    this.nomenclature = newNomenclature.trim();
  }

  public publish(): void {
    if (this.lifecycleState === 'Active') {
      throw new Error('Test is already active');
    }
    this.lifecycleState = 'Active';
  }
}
```

---

### 9.C.6 Repository Implementation Strategy

**Architectural Commentary**
Repositories encapsulate Prisma Client database interactions and implement `ITestRepository<T>`, enforcing soft-deletion filters and aggregate hydration.

```typescript
import { PrismaClient } from '@prisma/client';
import { ITestRepository, ITestEntity } from '../domain-contracts';
import { TestAggregate } from '../domain/TestAggregate';

export class TestRepository implements ITestRepository<ITestEntity> {
  constructor(private readonly prisma: PrismaClient) {}

  public async getByIdAsync(id: string): Promise<ITestEntity | null> {
    const record = await this.prisma.test.findFirst({
      where: { id, isDeleted: false },
    });
    return record ? this.mapToAggregate(record) : null;
  }

  public async getByPublicIdAsync(publicId: string): Promise<ITestEntity | null> {
    const record = await this.prisma.test.findFirst({
      where: { publicId, isDeleted: false },
    });
    return record ? this.mapToAggregate(record) : null;
  }

  public async getAllActiveAsync(): Promise<readonly ITestEntity[]> {
    const records = await this.prisma.test.findMany({
      where: { isDeleted: false, lifecycleState: 'Active' },
    });
    return records.map((r) => this.mapToAggregate(r));
  }

  public async createAsync(entity: ITestEntity): Promise<void> {
    await this.prisma.test.create({
      data: {
        id: entity.id,
        publicId: entity.publicId,
        nomenclature: entity.nomenclature,
        code: entity.code,
        standardCode: entity.standardCode,
        governingBodyId: entity.governingBodyId,
        lifecycleState: entity.lifecycleState,
      },
    });
  }

  public async updateAsync(entity: ITestEntity): Promise<void> {
    await this.prisma.test.update({
      where: { id: entity.id },
      data: {
        nomenclature: entity.nomenclature,
        lifecycleState: entity.lifecycleState,
      },
    });
  }

  public async deleteAsync(id: string): Promise<void> {
    await this.prisma.test.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  private mapToAggregate(record: any): TestAggregate {
    return new TestAggregate({
      id: record.id,
      publicId: record.publicId,
      nomenclature: record.nomenclature,
      code: record.code,
      standardCode: record.standardCode,
      governingBodyId: record.governingBodyId,
      lifecycleState: record.lifecycleState,
    });
  }
}
```

---

### 9.C.7 Service & CQRS Implementation

**Architectural Commentary**
CQRS handlers physically separate state-mutating commands from high-throughput queries.

```typescript
// Command Handler Example
export class CreateTestCommandHandler {
  constructor(
    private readonly repository: TestRepository,
    private readonly outbox: OutboxService,
  ) {}

  public async execute(command: {
    publicId: string;
    nomenclature: string;
    code: string;
    standardCode: string;
    governingBodyId: string;
  }): Promise<void> {
    const aggregate = new TestAggregate({
      id: crypto.randomUUID(),
      publicId: command.publicId,
      nomenclature: command.nomenclature,
      code: command.code,
      standardCode: command.standardCode,
      governingBodyId: command.governingBodyId,
      lifecycleState: 'Draft',
    });

    await this.repository.createAsync(aggregate);

    await this.outbox.enqueueEvent({
      eventType: 'TestCreated',
      payload: {
        testReferenceId: aggregate.publicId,
        nomenclature: aggregate.nomenclature,
      },
    });
  }
}

// Query Handler Example
export class GetTestSummaryQueryHandler {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(testReferenceId: string) {
    const record = await this.prisma.test.findFirst({
      where: { publicId: testReferenceId, isDeleted: false },
      select: {
        publicId: true,
        nomenclature: true,
        standardCode: true,
        lifecycleState: true,
      },
    });

    if (!record) {
      throw new Error(`Test with reference ${testReferenceId} not found`);
    }

    return {
      testReferenceId: record.publicId,
      nomenclature: record.nomenclature,
      standardCode: record.standardCode,
      lifecycleState: record.lifecycleState,
    };
  }
}
```

---

### 9.C.8 Validation Pipeline (Zod)

**Architectural Commentary**
Validation occurs strictly prior to command execution using Zod schemas.

```typescript
import { z } from 'zod';

export const createTestSchema = z.object({
  publicId: z.string().min(3).max(100),
  nomenclature: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  standardCode: z.string().min(2).max(50),
  governingBodyId: z.string().uuid(),
});

export const publishTestVersionSchema = z.object({
  versionReferenceId: z.string().uuid(),
  parentTestReferenceId: z.string().uuid(),
  validityDurationMonths: z.number().int().positive(),
  effectiveDate: z.string().datetime(),
});

export const equivalencyMappingSchema = z.object({
  sourceTestReferenceId: z.string().min(3),
  targetTestReferenceId: z.string().min(3),
  equivalencyLevel: z.enum(['FullTest', 'SectionSpecific', 'ScoreBand']),
  status: z.enum(['Pending', 'Verified', 'Deprecated']),
});
```

---

### 9.C.9 Event Integration & Transactional Outbox

**Architectural Commentary**
Aggregate state mutations emit domain events persisted atomically into the transactional outbox table within the same Prisma transaction.

```typescript
export interface ITestCreatedEvent {
  readonly eventId: string;
  readonly eventType: 'TestCreated';
  readonly occurredAt: Date;
  readonly testReferenceId: string;
  readonly nomenclature: string;
}

export interface ITestVersionPublishedEvent {
  readonly eventId: string;
  readonly eventType: 'TestVersionPublished';
  readonly occurredAt: Date;
  readonly testVersionReferenceId: string;
  readonly parentTestReferenceId: string;
}
```

---

### 9.C.10 Cache Integration Strategy

**Architectural Commentary**
High-frequency test queries utilize a Read-Through caching strategy with Redis (`tests:node:{publicId}`). Write operations invoke explicit Cache Invalidation to maintain data consistency.

```typescript
export class TestCacheService {
  constructor(private readonly redis: any) {}

  public async getCachedTestSummary(publicId: string): Promise<any | null> {
    const raw = await this.redis.get(`tests:summary:${publicId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async setCachedTestSummary(publicId: string, data: any, ttlSeconds = 3600): Promise<void> {
    await this.redis.set(`tests:summary:${publicId}`, JSON.stringify(data), 'EX', ttlSeconds);
  }

  public async invalidateTestCache(publicId: string): Promise<void> {
    await this.redis.del(`tests:summary:${publicId}`);
  }
}
```

---

### 9.C.11 Import Integration & Seed Strategy

**Architectural Commentary**

- **Import Boundary**:
  - **Phase 06 (Universal Import Platform):** Provides generic execution infrastructure (file readers, batching, worker queues, error tracking).
  - **Phase 07 (Enterprise Reference Data & DAG Foundation):** Provides shared reference identity (Countries, Languages) and hierarchy mechanics (7.13).
  - **Phase 08 (Academic Taxonomy):** Provides academic classification nodes.
  - **Phase 09 (International Tests Platform):** Owns test entity definitions, scoring scales, equivalency matrices, and test validation rules.
- **Seed Strategy**: Seed baseline international test standards (e.g., IELTS, TOEFL iBT, SAT, GRE, GMAT, CEFR, HSK, TestDaF) using official standard codes. Fictitious production records are strictly prohibited.

**International Test Import Execution Workflow**

Phase 09 receives staged generic records from Phase 06 and applies test-domain rules in the following sequence:

1. Validate mandatory fields: test name, test category, provider name, official registration URL, and score scale definition.
2. Normalize canonical names by removing marketing text, emojis, year-only decorations, duplicate tokens, and source-platform clutter.
3. Generate a deterministic deduplication key using canonical test name, provider, category, delivery mode, and score scale.
4. Validate score scales, section structures, bands, validity periods, and equivalency mappings as Phase 09-owned domain structures.
5. Validate fee metadata as informational test metadata only. Registration fees, late fees, rescheduling fees, cancellation fees, currencies, and fee validity windows MUST NOT trigger payment execution inside Phase 09.
6. Register imported downloadable sample materials through Phase 05 EAP when files are persisted. Official external preparation URLs may be retained as source links.
7. Merge duplicate records by enriching missing optional fields only. Published or admin-reviewed fields are protected from silent overwrites.
8. Route conflicts, unofficial sources, stale fees, or ambiguous score mappings to `NeedsReview`.
9. Publish only records that satisfy mandatory fields, trusted-source requirements, and administrator approval.

**Public Rendering & Fake Data Protection Rule**
- Public test detail pages (Phase 24) MUST ONLY query and render records with `status === 'PUBLISHED'`.
- Hardcoded metrics (like "180 Universities accepting this test") MUST NOT be used. Counts and references must be fetched dynamically from their respective owner domains (e.g., Phase 11, Phase 12). If unavailable, display "Pending".
- Import confidence and source trust assist administrators in review but NEVER cause automatic publishing.
- The Admin UI (`AdminInternationalTestDetailPage`) does not execute imports directly; it reviews and curates data staged by Phase 06.

**Fee Implementation Rule**
- Fee models (`InternationalTestFeeMetadata`) represent descriptive catalog prices only. The implementation MUST NOT attempt to build checkout carts or integrate payment gateways in Phase 09. Payments belong strictly to Phase 19.



**Public Read-Model Preparation**

Phase 09 should expose read models suitable for Phase 24 test pages, including test overview, score scale, format, fees, centers, validity, official registration links, sample resources, related preparation courses, and related student services. Phase 24 composes the page and owns no test rules.

---

### 9.C.12 Cross-Test Equivalency Engine

**Architectural Commentary**
The Equivalency Engine maps score conversions across distinct test standards (e.g., TOEFL iBT 94-101 to IELTS Band 7.0, or CEFR C1 alignment).

```typescript
export class TestEquivalencyEngine {
  public calculateEquivalency(params: {
    sourceTestId: string;
    sourceScore: number;
    targetTestId: string;
    mapping: { minScore: number; maxScore: number; targetScore: number }[];
  }): number {
    const match = params.mapping.find(
      (m) => params.sourceScore >= m.minScore && params.sourceScore <= m.maxScore,
    );
    if (!match) {
      throw new Error(`No score equivalency mapping found for score ${params.sourceScore}`);
    }
    return match.targetScore;
  }
}
```

---

### 9.C.13 Resilience, Security & Performance Strategy

**Architectural Commentary**

- **Security & Isolation**: Tenant isolation and access controls adhere strictly to ADR-027. Operations require authenticated RBAC tokens.
- **Performance Optimization**: High-throughput read endpoints leverage Prisma compiled selections, unique composite indexing on `public_id`, and keyset pagination (`take`, `cursor`).

---

### 9.C.14 Testing Strategy

**Architectural Commentary**

- **Unit Tests**: Vitest validates aggregates, domain rules, and Zod validators.
- **Integration Tests**: Validates Prisma schema operations and repository mapping against ephemeral PostgreSQL instances.
- **CQRS & Pipeline Tests**: Validates Command and Query handlers end-to-end.

---

### 9.C.15 Final Implementation Review Checklist

- [x] Alignment with Phase 9 Part A — All layers and components match the architectural specification.
- [x] Alignment with Phase 9 Part B — Implementation strictly uses defined TypeScript contracts without modification.
- [x] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [x] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [x] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [x] Foundation Reuse Verification — Consumes Phase 05, 06, 07, and 08 properly.
- [x] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 09 — Domain Contracts](phase-09-02-domain-contracts.md)
- **Next**: [Phase 10 — Major Platform](../phase-10-major-platform/)
