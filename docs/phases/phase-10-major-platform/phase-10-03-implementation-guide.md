> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 10 Major Platform

## Part C – Implementation Guide

### 10.C.1 Executive Summary & Architecture Overview

**Architectural Commentary**
This document provides the definitive implementation guide for **Phase 10 (Major Platform)**. It translates the enterprise architecture of Part A and the domain contracts of Part B into concrete enterprise integration patterns, architectural workflows, and deployment topologies adhering strictly to ADR-025 (TypeScript / Node.js / Express / Prisma ORM / PostgreSQL canonical stack).

The Major Platform functions as the single source of truth for academic majors, curriculum versions, degree level alignments, study durations, delivery formats, and cross-standard major equivalencies. Built on Clean Architecture and CQRS principles, the Write Model manages majors, versions, requirements, and classification mappings using Domain-Driven Design (DDD) aggregates and Prisma ORM under the `majors` database schema. The Read Model delivers high-speed major reference lookups and cross-major search queries via a distributed Redis caching tier.

---

> **ADR-028 persistence note (2026-09-06):** Historical `@@schema(...)` examples in earlier revisions are superseded. The canonical runtime uses Prisma `public` with ownership enforced by `persistence-ownership.manifest.json`; this guide does not authorize a separate physical/logical PostgreSQL schema.

### 10.C.2 Technology Stack

**Architectural Commentary**

- **Runtime Environment**: Node.js 22.16.0 (`>=22.16.0 <23`) / TypeScript 5.x / Express.js
- **Primary Persistence**: Relational SQL Database (PostgreSQL via Prisma ORM) under the `majors` database schema
- **In-Memory Cache**: Distributed Redis Cache (Read-through caching for majors and classification projections)
- **Message Broker & Events**: Enterprise Transactional Outbox / Inbox Event Bus
- **Validation Pipeline**: Zod Schema Validation
- **Testing Framework**: Vitest (Unit & Integration Testing)

---

### 10.C.3 Project & Directory Structure

**Architectural Commentary**
The platform is organized strictly following Clean Architecture principles to isolate core domain business logic from infrastructure dependencies and delivery mechanisms.

```text
src/
├── domain/               # Pure DDD Aggregates, Entities, Value Objects, Domain Events
│   ├── entities/         # MajorAggregate, MajorVersionEntity, DeliveryFormatEntity
│   ├── value-objects/    # StudyDuration, MajorRequirementRule
│   └── events/           # MajorCreatedEvent, MajorVersionPublishedEvent, MajorEquivalencyUpdatedEvent
├── application/          # CQRS Use Cases, Handlers, Commands, Queries, DTOs, Zod Validators
│   ├── commands/         # CreateMajorCommand, PublishMajorVersionCommand, UpdateEquivalencyCommand
│   ├── queries/          # GetMajorSummaryQuery, SearchMajorsQuery, GetMajorEquivalenciesQuery
│   ├── validators/       # Zod Schemas for commands and queries
│   └── projections/      # Read models & projections for downstream consumers
├── infrastructure/       # Persistence, Repositories, Caching, Outbox
│   ├── persistence/      # Prisma Client (`majors` schema), Repositories
│   ├── caching/          # Redis Cache Service
│   └── messaging/        # Outbox Relays & Inbox Consumers
└── presentation/         # Express API Controllers, Middleware, Routes
    ├── controllers/      # MajorController, MajorVersionController, MajorEquivalencyController
    └── middleware/       # Authentication, Validation, Error Handling
```

---

### 10.C.4 Persistence Strategy & Prisma Schema Mapping

**Architectural Commentary**
All persistence entities operate under the PostgreSQL `majors` schema managed by Prisma ORM. Auditing fields (`createdAt`, `lastModifiedAt`) and soft-deletion flags (`isDeleted`) are enforced on every table.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Major {
  id               String                        @id @default(uuid())
  publicId         String                        @unique @map("public_id")
  canonicalName    String                        @map("canonical_name")
  code             String                        @unique
  standardCode     String                        @map("standard_code")
  lifecycleState   String                        @map("lifecycle_state")
  createdAt        DateTime                      @default(now()) @map("created_at")
  lastModifiedAt   DateTime                      @updatedAt @map("last_modified_at")
  isDeleted        Boolean                       @default(false) @map("is_deleted")

  versions         MajorVersion[]
  aliases          MajorAlias[]
  synonyms         MajorSynonym[]
  countryLinks     MajorCountryRelationship[]
  languageLinks    MajorLanguageRelationship[]
  academicLinks    MajorAcademicTaxonomyRelationship[]

  @@map("majors")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorVersion {
  id               String             @id @default(uuid())
  publicId         String             @unique @map("public_id")
  majorReferenceId String             @map("major_reference_id")
  versionName      String             @map("version_name")
  minimumMonths    Int                @map("minimum_months")
  maximumMonths    Int                @map("maximum_months")
  effectiveDate    DateTime           @map("effective_date")
  createdAt        DateTime           @default(now()) @map("created_at")
  lastModifiedAt   DateTime           @updatedAt @map("last_modified_at")
  isDeleted        Boolean            @default(false) @map("is_deleted")

  major            Major              @relation(fields: [majorReferenceId], references: [publicId])
  requirements     MajorRequirement[]

  @@map("major_versions")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorRequirement {
  id                      String       @id @default(uuid())
  publicId                String       @unique @map("public_id")
  majorVersionReferenceId String       @map("major_version_reference_id")
  requirementName         String       @map("requirement_name")
  requirementCode         String       @map("requirement_code")
  createdAt               DateTime     @default(now()) @map("created_at")
  lastModifiedAt          DateTime     @updatedAt @map("last_modified_at")
  isDeleted               Boolean      @default(false) @map("is_deleted")

  majorVersion            MajorVersion @relation(fields: [majorVersionReferenceId], references: [publicId])

  @@map("major_requirements")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model DeliveryFormat {
  id             String   @id @default(uuid())
  publicId       String   @unique @map("public_id")
  formatCode     String   @unique @map("format_code")
  displayName    String   @map("display_name")
  createdAt      DateTime @default(now()) @map("created_at")
  lastModifiedAt DateTime @updatedAt @map("last_modified_at")
  isDeleted      Boolean  @default(false) @map("is_deleted")

  @@map("delivery_formats")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorAlias {
  id               String   @id @default(uuid())
  publicId         String   @unique @map("public_id")
  majorReferenceId String   @map("major_reference_id")
  aliasName        String   @map("alias_name")
  locale           String   @default("en")
  createdAt        DateTime @default(now()) @map("created_at")
  isDeleted        Boolean  @default(false) @map("is_deleted")

  major            Major    @relation(fields: [majorReferenceId], references: [publicId])

  @@map("major_aliases")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorSynonym {
  id               String   @id @default(uuid())
  publicId         String   @unique @map("public_id")
  majorReferenceId String   @map("major_reference_id")
  synonymTerm      String   @map("synonym_term")
  locale           String   @default("en")
  createdAt        DateTime @default(now()) @map("created_at")
  isDeleted        Boolean  @default(false) @map("is_deleted")

  major            Major    @relation(fields: [majorReferenceId], references: [publicId])

  @@map("major_synonyms")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorEquivalencyMapping {
  id                   String   @id @default(uuid())
  publicId             String   @unique @map("public_id")
  sourceMajorPublicId  String   @map("source_major_public_id")
  targetMajorPublicId  String   @map("target_major_public_id")
  equivalencyLevel     String   @map("equivalency_level")
  status               String   @map("status")
  createdAt            DateTime @default(now()) @map("created_at")
  lastModifiedAt       DateTime @updatedAt @map("last_modified_at")
  isDeleted            Boolean  @default(false) @map("is_deleted")

  @@map("major_equivalency_mappings")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorCountryRelationship {
  id                  String   @id @default(uuid())
  majorReferenceId    String   @map("major_reference_id")
  countryReferenceId String   @map("country_reference_id")
  createdAt           DateTime @default(now()) @map("created_at")

  major               Major    @relation(fields: [majorReferenceId], references: [publicId])

  @@map("major_country_relationships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorLanguageRelationship {
  id                   String   @id @default(uuid())
  majorReferenceId     String   @map("major_reference_id")
  languageReferenceId String   @map("language_reference_id")
  createdAt            DateTime @default(now()) @map("created_at")

  major                Major    @relation(fields: [majorReferenceId], references: [publicId])

  @@map("major_language_relationships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorAcademicTaxonomyRelationship {
  id                           String   @id @default(uuid())
  majorReferenceId             String   @map("major_reference_id")
  academicTaxonomyReferenceId String   @map("academic_taxonomy_reference_id")
  createdAt                    DateTime @default(now()) @map("created_at")

  major                        Major    @relation(fields: [majorReferenceId], references: [publicId])

  @@map("major_academic_relationships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorDegreeLevelRelationship {
  id                     String   @id @default(uuid())
  majorReferenceId       String   @map("major_reference_id")
  degreeLevelReferenceId String   @map("degree_level_reference_id")
  createdAt              DateTime @default(now()) @map("created_at")

  major                  Major    @relation(fields: [majorReferenceId], references: [publicId])

  @@map("major_degree_relationships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorStandard {
  id                       String         @id @default(uuid())
  publicId                 String         @unique @map("public_id")
  governingBodyReferenceId String         @map("governing_body_reference_id")
  name                     String         @map("name")
  createdAt                DateTime       @default(now()) @map("created_at")
  lastModifiedAt           DateTime       @updatedAt @map("last_modified_at")
  isDeleted                Boolean        @default(false) @map("is_deleted")

  @@map("major_standards")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorProvider {
  id                  String         @id @default(uuid())
  publicId            String         @unique @map("public_id")
  providerReferenceId String         @map("provider_reference_id")
  name                String         @map("name")
  createdAt           DateTime       @default(now()) @map("created_at")
  lastModifiedAt      DateTime       @updatedAt @map("last_modified_at")
  isDeleted           Boolean        @default(false) @map("is_deleted")

  @@map("major_providers")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorTaxonomyEntity {
  id               String         @id @default(uuid())
  publicId         String         @unique @map("public_id")
  name             String         @map("name")
  createdAt        DateTime       @default(now()) @map("created_at")
  lastModifiedAt   DateTime       @updatedAt @map("last_modified_at")
  isDeleted        Boolean        @default(false) @map("is_deleted")

  @@map("major_taxonomy_entities")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model MajorClassificationEntity {
  id               String         @id @default(uuid())
  publicId         String         @unique @map("public_id")
  name             String         @map("name")
  createdAt        DateTime       @default(now()) @map("created_at")
  lastModifiedAt   DateTime       @updatedAt @map("last_modified_at")
  isDeleted        Boolean        @default(false) @map("is_deleted")

  @@map("major_classification_entities")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}
```

---

### 10.C.5 Aggregate & Entity Implementation Strategy

**Architectural Commentary**
Core domain aggregates encapsulate business rules and invariants in pure TypeScript classes.

```typescript
import { IMajorEntity, ReferenceLifecycleState } from '../domain-contracts';

export class MajorAggregate implements IMajorEntity {
  public readonly id: string;
  public readonly publicId: string;
  public canonicalName: string;
  public code: string;
  public standardCode: string;
  public lifecycleState: ReferenceLifecycleState;

  constructor(params: {
    id: string;
    publicId: string;
    canonicalName: string;
    code: string;
    standardCode: string;
    lifecycleState?: ReferenceLifecycleState;
  }) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.canonicalName = params.canonicalName;
    this.code = params.code;
    this.standardCode = params.standardCode;
    this.lifecycleState = params.lifecycleState ?? 'Draft';
  }

  public updateCanonicalName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Canonical name cannot be empty');
    }
    this.canonicalName = newName.trim();
  }

  public publish(): void {
    if (this.lifecycleState === 'Active') {
      throw new Error('Major is already active');
    }
    this.lifecycleState = 'Active';
  }
}
```

---

### 10.C.6 Repository Implementation Strategy

**Architectural Commentary**
Repositories encapsulate Prisma Client database interactions, implementing `IMajorRepository<T>` contracts.

```typescript
import { PrismaClient } from '@prisma/client';
import { IMajorRepository, IMajorEntity } from '../domain-contracts';
import { MajorAggregate } from '../domain/MajorAggregate';

export class MajorRepository implements IMajorRepository<IMajorEntity> {
  constructor(private readonly prisma: PrismaClient) {}

  public async getByIdAsync(id: string): Promise<IMajorEntity | null> {
    const record = await this.prisma.major.findFirst({
      where: { id, isDeleted: false },
    });
    return record ? this.mapToAggregate(record) : null;
  }

  public async getByPublicIdAsync(publicId: string): Promise<IMajorEntity | null> {
    const record = await this.prisma.major.findFirst({
      where: { publicId, isDeleted: false },
    });
    return record ? this.mapToAggregate(record) : null;
  }

  public async createAsync(entity: IMajorEntity): Promise<void> {
    await this.prisma.major.create({
      data: {
        id: entity.id,
        publicId: entity.publicId,
        canonicalName: entity.canonicalName,
        code: entity.code,
        standardCode: entity.standardCode,
        lifecycleState: entity.lifecycleState,
      },
    });
  }

  public async updateAsync(entity: IMajorEntity): Promise<void> {
    await this.prisma.major.update({
      where: { id: entity.id },
      data: {
        canonicalName: entity.canonicalName,
        lifecycleState: entity.lifecycleState,
      },
    });
  }

  private mapToAggregate(record: any): MajorAggregate {
    return new MajorAggregate({
      id: record.id,
      publicId: record.publicId,
      canonicalName: record.canonicalName,
      code: record.code,
      standardCode: record.standardCode,
      lifecycleState: record.lifecycleState,
    });
  }
}
```

---

### 10.C.7 Service & CQRS Implementation

**Architectural Commentary**
CQRS handlers physically separate state-mutating commands from high-throughput queries.

```typescript
// Command Handler Example
export class CreateMajorCommandHandler {
  constructor(
    private readonly repository: MajorRepository,
    private readonly outbox: OutboxService,
  ) {}

  public async execute(command: {
    publicId: string;
    canonicalName: string;
    code: string;
    standardCode: string;
  }): Promise<void> {
    const aggregate = new MajorAggregate({
      id: crypto.randomUUID(),
      publicId: command.publicId,
      canonicalName: command.canonicalName,
      code: command.code,
      standardCode: command.standardCode,
      lifecycleState: 'Draft',
    });

    await this.repository.createAsync(aggregate);

    await this.outbox.enqueueEvent({
      eventType: 'MajorCreated',
      payload: {
        majorPublicId: aggregate.publicId,
        canonicalName: aggregate.canonicalName,
      },
    });
  }
}

// Query Handler Example
export class GetMajorSummaryQueryHandler {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(majorPublicId: string) {
    const record = await this.prisma.major.findFirst({
      where: { publicId: majorPublicId, isDeleted: false },
      select: {
        publicId: true,
        canonicalName: true,
        code: true,
        standardCode: true,
        lifecycleState: true,
      },
    });

    if (!record) {
      throw new Error(`Major with public ID ${majorPublicId} not found`);
    }

    return record;
  }
}
```

---

### 10.C.8 Validation Pipeline (Zod)

**Architectural Commentary**
Validation occurs strictly prior to command execution using Zod schemas.

```typescript
import { z } from 'zod';

export const createMajorSchema = z.object({
  publicId: z.string().min(3).max(100),
  canonicalName: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  standardCode: z.string().min(2).max(50),
});

export const createMajorVersionSchema = z.object({
  majorReferenceId: z.string().min(3),
  versionName: z.string().min(1).max(100),
  minimumMonths: z.number().int().positive(),
  maximumMonths: z.number().int().positive(),
  effectiveDate: z.string().datetime(),
});

export const majorEquivalencySchema = z.object({
  sourceMajorPublicId: z.string().min(3),
  targetMajorPublicId: z.string().min(3),
  equivalencyLevel: z.enum(['ExactMatch', 'BroadMatch', 'NarrowMatch', 'RelatedMatch']),
  status: z.enum(['Pending', 'Verified', 'Deprecated']),
});
```

---

### 10.C.9 Event Integration & Transactional Outbox

**Architectural Commentary**
Aggregate state mutations emit domain events persisted atomically into the transactional outbox table within the same transaction.

```typescript
export interface IMajorCreatedEvent {
  readonly eventId: string;
  readonly eventType: 'MajorCreated';
  readonly occurredAt: Date;
  readonly majorPublicId: string;
  readonly canonicalName: string;
}

export interface IMajorVersionPublishedEvent {
  readonly eventId: string;
  readonly eventType: 'MajorVersionPublished';
  readonly occurredAt: Date;
  readonly versionPublicId: string;
  readonly majorPublicId: string;
}
```

---

### 10.C.10 Cache Integration Strategy

**Architectural Commentary**
High-frequency major reference queries leverage a Read-Through caching strategy with Redis (`majors:summary:{publicId}`). Write operations invalidate the cache explicitly.

```typescript
export class MajorCacheService {
  constructor(private readonly redis: any) {}

  public async getCachedMajorSummary(publicId: string): Promise<any | null> {
    const raw = await this.redis.get(`majors:summary:${publicId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async setCachedMajorSummary(
    publicId: string,
    data: any,
    ttlSeconds = 3600,
  ): Promise<void> {
    await this.redis.set(`majors:summary:${publicId}`, JSON.stringify(data), 'EX', ttlSeconds);
  }

  public async invalidateMajorCache(publicId: string): Promise<void> {
    await this.redis.del(`majors:summary:${publicId}`);
  }
}
```

---

### 10.C.11 Import Integration & Seed Strategy

**Architectural Commentary**

- **Import Boundary**:
  - **Phase 06 (Universal Import Platform):** Provides generic execution infrastructure (file readers, batching, worker queues, error tracking).
  - **Phase 07 (Enterprise Reference Data):** Provides shared reference identity (Countries, Languages).
  - **Phase 08 (Academic Taxonomy):** Provides underlying academic fields and CIP/ISCED detailed classification codes.
  - **Phase 10 (Major Platform):** Owns major canonical definitions, versions, requirements, delivery formats, and cross-major equivalency mappings.
- **Seed Strategy**: Seed baseline international major catalogs (e.g., Computer Science, Electrical Engineering, Business Administration, Medicine, Law) linked to ISCED-F / CIP codes. Fictitious production records are strictly prohibited.

### 10.C.11.1 Major Import Execution & Admin Workflow

**Architectural Commentary**
Translates the import boundaries and deduplication rules from Part A into operational command handlers that sit behind the Phase 06 generic import queue.

1. **Staging & Validation:**
   - Raw records arriving from the Phase 06 generic parser are received by the Phase 10 `MajorImportCommandHandler`.
   - The handler strictly validates the `IMajorImportRequiredFields` using a Zod schema. If mandatory fields are missing, the record is rejected back to the Phase 06 failed-row queue.

2. **Canonical Normalization & Identity:**
   - The handler normalizes `canonicalMajorName` by stripping generic platform suffixes, extra spaces, punctuation clutter, and emojis, preserving meaningful academic words.
   - It constructs the root-Major concept key from normalized `canonicalMajorName + academicFieldOrDiscipline + cross-listing context`. Degree level, classification code and source system are profile/provenance identity, not root-Major identity. Do not rewrite persisted keys without the Google Studio read-only reconciliation gate.
   - It maps degree levels and academic classifications by referencing read-models from Phase 08.

3. **Deduplication & Enrichment Merge:**
   - The handler queries the `majors` table using the composite key.
   - **If NOT found:** A new major aggregate is created with state `Imported` or `Incomplete` depending on data density.
   - **If found:** The handler fetches the existing aggregate.
     - **Protection Rule:** If the existing aggregate state is `NeedsReview`, `ReadyToPublish`, or `Published`, silent overwrites are strictly aborted to protect admin work.
     - **Merge Rule:** If the aggregate is unprotected, the handler iterates through `IMajorImportOptionalFields` and populates only null/empty fields.

4. **Editorial Content & AI Routing (Phase 16 / Phase 17):**
   - Phase 17 AI may generate advisory classification suggestions or draft descriptions from structured inputs.
   - Explanatory, long-form content (e.g., "what is this major", "who it is suitable for", "skills gained") is NEVER written directly to the public major aggregate.
   - All editorial drafts are routed to the Phase 16 CMS Draft Queue per `IMajorEditorialDraftPolicy`, requiring explicit human review and approval.

5. **Lifecycle Publishing:**
   - Once a major record has sufficient structural data, an admin reviews it in the backoffice.
   - The admin transitions it to `ReadyToPublish` or `Published`.
   - The `MajorVersionPublishedEvent` is fired, invalidating Phase 10 read-model caches and signaling Phase 24 public pages that a new canonical major is available for display.

---

### 10.C.12 Major Classification & Equivalency Engine

**Architectural Commentary**
The Major Equivalency Engine provides cross-standard resolution between national or international major classification codes (e.g., CIP 11.0701 to ISCED 0612).

```typescript
export class MajorEquivalencyEngine {
  public resolveEquivalency(params: {
    sourceCode: string;
    sourceStandard: string;
    targetStandard: string;
    mappings: Array<{ sourceCode: string; targetCode: string; level: string }>;
  }): string | null {
    const match = params.mappings.find((m) => m.sourceCode === params.sourceCode);
    return match ? match.targetCode : null;
  }
}
```

---

### 10.C.13 Resilience, Security & Performance Strategy

**Architectural Commentary**

- **Security & Isolation**: Access control and tenant boundaries adhere strictly to ADR-027. Operations require authenticated RBAC credentials.
- **Performance Optimization**: Read paths use Prisma compiled selections, unique composite indexing on `public_id`, and keyset pagination (`take`, `cursor`).

---

### 10.C.14 Testing Strategy

**Architectural Commentary**

- **Unit Tests**: Vitest validates aggregates, domain rules, and Zod validators.
- **Integration Tests**: Validates Prisma schema operations and repository mapping against ephemeral PostgreSQL instances.
- **CQRS & Pipeline Tests**: Validates Command and Query handlers end-to-end.

---

### 10.C.15 Final Implementation Review Checklist

- [x] Alignment with Phase 10 Part A — All layers and components match the architectural specification.
- [x] Alignment with Phase 10 Part B — Implementation strictly uses defined TypeScript contracts without modification.
- [x] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [x] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [x] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [x] Foundation Reuse Verification — Consumes Phase 05, 06, 07, 08, and 09 properly.
- [x] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 10 — Domain Contracts](phase-10-02-domain-contracts.md)
- **Next**: [Phase 11 — Universities & Institutions](../phase-11-universities-institutions/)
