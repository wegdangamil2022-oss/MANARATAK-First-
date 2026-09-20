> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 12 Scholarships

## Part C – Implementation Guide

### 12.C.1 Executive Summary & Architecture Overview

**Architectural Commentary**
This document provides the definitive implementation guide for **Phase 12 (Scholarships)**. It translates the enterprise architecture of Part A and the domain contracts of Part B into concrete enterprise integration patterns, architectural workflows, and deployment topologies adhering strictly to ADR-025 (TypeScript / Node.js / Express / Prisma ORM / PostgreSQL canonical stack).

Phase 12 is the authoritative domain for global scholarship offerings, sponsors, eligibility criteria, application cycles, award packages, and cross-entity mapping (countries, universities, majors, tests). Built on Clean Architecture and CQRS principles, the Write Model manages scholarship offerings and versioned eligibility rules using Domain-Driven Design (DDD) aggregates and Prisma ORM under the `scholarships` database schema. The Read Model provides high-performance scholarship discovery, filtering, and eligibility matching via Redis caching.

---

> **ADR-028 persistence note (2026-09-06):** Historical `@@schema(...)` examples in earlier revisions are superseded. The canonical runtime uses Prisma `public` with ownership enforced by `persistence-ownership.manifest.json`; this guide does not authorize a separate physical/logical PostgreSQL schema.

### 12.C.2 Technology Stack

**Architectural Commentary**

- **Runtime Environment**: Node.js 22.16.0 (`>=22.16.0 <23`) / TypeScript 5.x / Express.js
- **Primary Persistence**: Relational SQL Database (PostgreSQL via Prisma ORM) under the `scholarships` database schema
- **In-Memory Cache**: Distributed Redis Cache (Read-through caching for active scholarship catalogs and eligibility projections)
- **Message Broker & Events**: Enterprise Transactional Outbox / Inbox Event Bus
- **Validation Pipeline**: Zod Schema Validation
- **Testing Framework**: Vitest (Unit & Integration Testing)

---

### 12.C.3 Project & Directory Structure

**Architectural Commentary**
The platform is organized strictly following Clean Architecture principles to isolate core domain business logic from infrastructure dependencies and delivery mechanisms.

```text
src/
├── domain/               # Pure DDD Aggregates, Entities, Value Objects, Domain Events
│   ├── entities/         # ScholarshipAggregate, ScholarshipVersionEntity, SponsorEntity, ApplicationCycleEntity
│   ├── value-objects/    # AwardPackage, EligibilityRule, FundingDetails
│   └── events/           # ScholarshipCreatedEvent, ScholarshipPublishedEvent, ScholarshipClosedEvent
├── application/          # CQRS Use Cases, Handlers, Commands, Queries, DTOs, Zod Validators
│   ├── commands/         # CreateScholarshipCommand, PublishScholarshipCommand, EvaluateEligibilityCommand
│   ├── queries/          # GetScholarshipSummaryQuery, SearchScholarshipsQuery, MatchScholarshipsQuery
│   ├── validators/       # Zod Schemas for commands and queries
│   └── projections/      # Read models & projections for downstream consumers
├── infrastructure/       # Persistence, Repositories, Caching, Outbox
│   ├── persistence/      # Prisma Client (`scholarships` schema), Repositories
│   ├── caching/          # Redis Cache Service
│   └── messaging/        # Outbox Relays & Inbox Consumers
└── presentation/         # Express API Controllers, Middleware, Routes
    ├── controllers/      # ScholarshipController, SponsorController, ApplicationCycleController
    └── middleware/       # Authentication, Validation, Error Handling
```

---

### 12.C.4 Persistence Strategy & Prisma Schema Mapping

**Architectural Commentary**
All persistence entities operate under the PostgreSQL `scholarships` schema managed by Prisma ORM. Auditing fields (`createdAt`, `lastModifiedAt`) and soft-deletion flags (`isDeleted`) are enforced on every table.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Scholarship {
  id                  String               @id @default(uuid())
  publicId            String               @unique @map("public_id")
  canonicalName       String               @map("canonical_name")
  sponsorReferenceId String               @map("sponsor_reference_id")
  countryReferenceId String?              @map("country_reference_id")
  sourceTypeCode      String               @map("source_type_code")
  meritTypeCode       String               @map("merit_type_code")
  lifecycleState      String               @map("lifecycle_state")
  isFeatured          Boolean              @default(false) @map("is_featured")
  academicYear        String               @map("academic_year")
  applicationMethod   String               @map("application_method")
  createdAt           DateTime             @default(now()) @map("created_at")
  lastModifiedAt      DateTime             @updatedAt @map("last_modified_at")
  isDeleted           Boolean              @default(false) @map("is_deleted")

  sponsor             ScholarshipSponsor   @relation(fields: [sponsorReferenceId], references: [publicId])
  versions            ScholarshipVersion[]
  cycles              ApplicationCycle[]
  countryMappings     ScholarshipCountryMapping[]
  universityMappings  ScholarshipUniversityMapping[]
  majorMappings       ScholarshipMajorMapping[]
  testMappings        ScholarshipTestRequirementMapping[]

  @@map("scholarships")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ScholarshipSponsor {
  id             String        @id @default(uuid())
  publicId       String        @unique @map("public_id")
  canonicalName  String        @map("canonical_name")
  sponsorType    String        @map("sponsor_type")
  createdAt      DateTime      @default(now()) @map("created_at")
  lastModifiedAt DateTime      @updatedAt @map("last_modified_at")
  isDeleted      Boolean       @default(false) @map("is_deleted")

  scholarships   Scholarship[]

  @@map("scholarship_sponsors")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ScholarshipVersion {
  id                    String            @id @default(uuid())
  publicId              String            @unique @map("public_id")
  scholarshipReferenceId String           @map("scholarship_reference_id")
  versionNumber         Int               @map("version_number")
  effectiveFrom         DateTime          @map("effective_from")
  effectiveUntil        DateTime?         @map("effective_until")
  fundingLevelCode      String            @map("funding_level_code")
  totalEstimatedValue   Float?            @map("total_estimated_value")
  currencyReferenceId   String?           @map("currency_reference_id")
  fundingDuration       String?           @map("funding_duration")
  createdAt             DateTime          @default(now()) @map("created_at")
  lastModifiedAt        DateTime          @updatedAt @map("last_modified_at")
  isDeleted             Boolean           @default(false) @map("is_deleted")

  scholarship           Scholarship       @relation(fields: [scholarshipReferenceId], references: [publicId])
  eligibilityRules      EligibilityRule[]

  @@map("scholarship_versions")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model EligibilityRule {
  id                         String             @id @default(uuid())
  publicId                   String             @unique @map("public_id")
  scholarshipVersionReferenceId String          @map("scholarship_version_reference_id")
  ruleType                   String             @map("rule_type")
  minimumGPA                 Float?             @map("minimum_gpa")
  maxAge                     Int?               @map("max_age")
  requiresInterview          Boolean            @default(false) @map("requires_interview")
  createdAt                  DateTime           @default(now()) @map("created_at")
  lastModifiedAt             DateTime           @updatedAt @map("last_modified_at")
  isDeleted                  Boolean            @default(false) @map("is_deleted")

  scholarshipVersion         ScholarshipVersion @relation(fields: [scholarshipVersionReferenceId], references: [publicId])

  @@map("eligibility_rules")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ApplicationCycle {
  id                    String      @id @default(uuid())
  publicId              String      @unique @map("public_id")
  scholarshipReferenceId String     @map("scholarship_reference_id")
  cycleName             String      @map("cycle_name")
  startDate             DateTime    @map("start_date")
  deadlineDate          DateTime    @map("deadline_date")
  isOpen                Boolean     @default(true) @map("is_open")
  createdAt             DateTime    @default(now()) @map("created_at")
  lastModifiedAt        DateTime    @updatedAt @map("last_modified_at")
  isDeleted             Boolean     @default(false) @map("is_deleted")

  scholarship           Scholarship @relation(fields: [scholarshipReferenceId], references: [publicId])

  @@map("application_cycles")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ScholarshipCountryMapping {
  id                     String      @id @default(uuid())
  scholarshipReferenceId String      @map("scholarship_reference_id")
  countryReferenceId    String      @map("country_reference_id")
  createdAt              DateTime    @default(now()) @map("created_at")

  scholarship            Scholarship @relation(fields: [scholarshipReferenceId], references: [publicId])

  @@map("scholarship_country_mappings")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ScholarshipUniversityMapping {
  id                     String      @id @default(uuid())
  scholarshipReferenceId String      @map("scholarship_reference_id")
  universityReferenceId String      @map("university_reference_id")
  createdAt              DateTime    @default(now()) @map("created_at")

  scholarship            Scholarship @relation(fields: [scholarshipReferenceId], references: [publicId])

  @@map("scholarship_university_mappings")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ScholarshipMajorMapping {
  id                     String      @id @default(uuid())
  scholarshipReferenceId String      @map("scholarship_reference_id")
  majorReferenceId       String      @map("major_reference_id")
  createdAt              DateTime    @default(now()) @map("created_at")

  scholarship            Scholarship @relation(fields: [scholarshipReferenceId], references: [publicId])

  @@map("scholarship_major_mappings")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model ScholarshipTestRequirementMapping {
  id                     String      @id @default(uuid())
  scholarshipReferenceId String      @map("scholarship_reference_id")
  testReferenceId        String      @map("test_reference_id")
  minimumScore           Float       @map("minimum_score")
  createdAt              DateTime    @default(now()) @map("created_at")

  scholarship            Scholarship @relation(fields: [scholarshipReferenceId], references: [publicId])

  @@map("scholarship_test_mappings")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}
```

---

### 12.C.5 Aggregate & Entity Implementation Strategy

**Architectural Commentary**
Core domain aggregates encapsulate business rules and invariants in pure TypeScript classes.

```typescript
import { IScholarshipEntity, ReferenceLifecycleState } from '../domain-contracts';

export class ScholarshipAggregate implements IScholarshipEntity {
  public readonly id: string;
  public readonly publicId: string;
  public canonicalName: string;
  public sponsorReferenceId: string;
  public countryReferenceId: string | null;
  public sourceTypeCode: string;
  public meritTypeCode: string;
  public lifecycleState: ReferenceLifecycleState;

  constructor(params: {
    id: string;
    publicId: string;
    canonicalName: string;
    sponsorReferenceId: string;
    countryReferenceId?: string | null;
    sourceTypeCode: string;
    meritTypeCode: string;
    lifecycleState?: ReferenceLifecycleState;
  }) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.canonicalName = params.canonicalName;
    this.sponsorReferenceId = params.sponsorReferenceId;
    this.countryReferenceId = params.countryReferenceId ?? null;
    this.sourceTypeCode = params.sourceTypeCode;
    this.meritTypeCode = params.meritTypeCode;
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
      throw new Error('Scholarship is already active');
    }
    this.lifecycleState = 'Active';
  }
}
```

---

### 12.C.6 Repository Implementation Strategy

**Architectural Commentary**
Repositories encapsulate Prisma Client database interactions, implementing `IScholarshipRepository<T>` contracts.

```typescript
import { PrismaClient } from '@prisma/client';
import { IScholarshipRepository, IScholarshipEntity } from '../domain-contracts';
import { ScholarshipAggregate } from '../domain/ScholarshipAggregate';

export class ScholarshipRepository implements IScholarshipRepository<IScholarshipEntity> {
  constructor(private readonly prisma: PrismaClient) {}

  public async getByIdAsync(id: string): Promise<IScholarshipEntity | null> {
    const record = await this.prisma.scholarship.findFirst({
      where: { id, isDeleted: false },
    });
    return record ? this.mapToAggregate(record) : null;
  }

  public async getByPublicIdAsync(publicId: string): Promise<IScholarshipEntity | null> {
    const record = await this.prisma.scholarship.findFirst({
      where: { publicId, isDeleted: false },
    });
    return record ? this.mapToAggregate(record) : null;
  }

  public async createAsync(entity: IScholarshipEntity): Promise<void> {
    await this.prisma.scholarship.create({
      data: {
        id: entity.id,
        publicId: entity.publicId,
        canonicalName: entity.canonicalName,
        sponsorReferenceId: entity.sponsorReferenceId,
        countryReferenceId: entity.countryReferenceId,
        sourceTypeCode: entity.sourceTypeCode,
        meritTypeCode: entity.meritTypeCode,
        lifecycleState: entity.lifecycleState,
        academicYear: '2026/2027',
        applicationMethod: 'Internal',
      },
    });
  }

  public async updateAsync(entity: IScholarshipEntity): Promise<void> {
    await this.prisma.scholarship.update({
      where: { id: entity.id },
      data: {
        canonicalName: entity.canonicalName,
        lifecycleState: entity.lifecycleState,
      },
    });
  }

  private mapToAggregate(record: any): ScholarshipAggregate {
    return new ScholarshipAggregate({
      id: record.id,
      publicId: record.publicId,
      canonicalName: record.canonicalName,
      sponsorReferenceId: record.sponsorReferenceId,
      countryReferenceId: record.countryReferenceId,
      sourceTypeCode: record.sourceTypeCode,
      meritTypeCode: record.meritTypeCode,
      lifecycleState: record.lifecycleState,
    });
  }
}
```

---

### 12.C.7 Service & CQRS Implementation

**Architectural Commentary**
CQRS handlers physically separate state-mutating commands from high-throughput queries.

```typescript
// Command Handler Example
export class CreateScholarshipCommandHandler {
  constructor(
    private readonly repository: ScholarshipRepository,
    private readonly outbox: OutboxService,
  ) {}

  public async execute(command: {
    publicId: string;
    canonicalName: string;
    sponsorReferenceId: string;
    sourceTypeCode: string;
    meritTypeCode: string;
  }): Promise<void> {
    const aggregate = new ScholarshipAggregate({
      id: crypto.randomUUID(),
      publicId: command.publicId,
      canonicalName: command.canonicalName,
      sponsorReferenceId: command.sponsorReferenceId,
      sourceTypeCode: command.sourceTypeCode,
      meritTypeCode: command.meritTypeCode,
      lifecycleState: 'Draft',
    });

    await this.repository.createAsync(aggregate);

    await this.outbox.enqueueEvent({
      eventType: 'ScholarshipCreated',
      payload: {
        scholarshipPublicId: aggregate.publicId,
        canonicalName: aggregate.canonicalName,
      },
    });
  }
}

// Query Handler Example
export class GetScholarshipSummaryQueryHandler {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(scholarshipPublicId: string) {
    const record = await this.prisma.scholarship.findFirst({
      where: { publicId: scholarshipPublicId, isDeleted: false },
      select: {
        publicId: true,
        canonicalName: true,
        sponsorReferenceId: true,
        sourceTypeCode: true,
        meritTypeCode: true,
        lifecycleState: true,
      },
    });

    if (!record) {
      throw new Error(`Scholarship with public ID ${scholarshipPublicId} not found`);
    }

    return record;
  }
}
```

---

### 12.C.8 Validation Pipeline (Zod)

**Architectural Commentary**
Validation occurs strictly prior to command execution using Zod schemas.

```typescript
import { z } from 'zod';

export const createScholarshipSchema = z.object({
  publicId: z.string().min(3).max(100),
  canonicalName: z.string().min(2).max(255),
  sponsorReferenceId: z.string().min(3),
  sourceTypeCode: z.string().min(2),
  meritTypeCode: z.string().min(2),
});

export const evaluateEligibilitySchema = z.object({
  scholarshipPublicId: z.string().min(3),
  studentGPA: z.number().min(0).max(4.0),
  studentAge: z.number().int().positive(),
  testScores: z.array(
    z.object({
      testReferenceId: z.string(),
      score: z.number(),
    }),
  ),
});
```

---

### 12.C.9 Event Integration & Transactional Outbox

**Architectural Commentary**
Aggregate state mutations emit domain events persisted atomically into the transactional outbox table within the same transaction.

```typescript
export interface IScholarshipCreatedEvent {
  readonly eventId: string;
  readonly eventType: 'ScholarshipCreated';
  readonly occurredAt: Date;
  readonly scholarshipPublicId: string;
  readonly canonicalName: string;
}

export interface IScholarshipPublishedEvent {
  readonly eventId: string;
  readonly eventType: 'ScholarshipPublished';
  readonly occurredAt: Date;
  readonly scholarshipPublicId: string;
}
```

---

### 12.C.10 Cache Integration Strategy

**Architectural Commentary**
High-frequency scholarship catalog queries leverage a Read-Through caching strategy with Redis (`scholarships:summary:{publicId}`). Write operations invalidate the cache explicitly.

```typescript
export class ScholarshipCacheService {
  constructor(private readonly redis: any) {}

  public async getCachedScholarshipSummary(publicId: string): Promise<any | null> {
    const raw = await this.redis.get(`scholarships:summary:${publicId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async setCachedScholarshipSummary(
    publicId: string,
    data: any,
    ttlSeconds = 3600,
  ): Promise<void> {
    await this.redis.set(
      `scholarships:summary:${publicId}`,
      JSON.stringify(data),
      'EX',
      ttlSeconds,
    );
  }

  public async invalidateScholarshipCache(publicId: string): Promise<void> {
    await this.redis.del(`scholarships:summary:${publicId}`);
  }
}
```

---

### 12.C.11 Scholarship Detail Page Read Model Workflow

**Architectural Commentary**
Describes how Phase 12 structures and exposes data for downstream public page rendering. Phase 12 strictly provides data; it does not render UI or own visitor-facing templates.

**Operational Flow:**

1. **Query Invocation:** A query handler (e.g., `GetScholarshipDetailPageQueryHandler`) receives a public request for a scholarship detail page using its `publicId`.
2. **Read Model Construction:**
   - The handler loads the canonical scholarship, its latest active version, sponsor details, mapping records (target countries, universities, majors), and eligibility criteria.
   - It maps this internal state into the flat `IScholarshipDetailPageData` DTO.
   - It fetches similar scholarship references based on shared metadata (e.g., same country or major).
3. **Caching Layer:** The resulting `IScholarshipDetailPageData` is cached in Redis (e.g., `scholarships:detail:{publicId}`) to withstand high public traffic. Write operations to the scholarship automatically invalidate this cache key.
4. **Downstream Consumption:** The serialized DTO is exposed via Phase 12's API boundary.
5. **UI Rendering (Phase 24 boundary):** Phase 24 fetches the DTO and handles all UI presentation, styling, localized layout, and visitor experience. Phase 16 may inject supplemental CMS content asynchronously.

---

### 12.C.12 Import Integration & Seed Strategy

**Architectural Commentary**

- **Import Boundary**:
  - **Phase 06 (Universal Import Platform):** Provides generic execution infrastructure (file readers, batching, worker queues, error tracking).
  - **Phase 07 (Enterprise Reference Data):** Provides shared reference identity (Countries, Currencies).
  - **Phase 08 (Academic Taxonomy):** Provides degree level codes.
  - **Phase 09 (International Tests Platform):** Provides test requirements (IELTS, SAT, etc.).
  - **Phase 10 (Major Platform):** Provides major alignment references.
  - **Phase 11 (Universities & Institutions):** Provides university target references.
  - **Phase 12 (Scholarships):** Owns scholarship definitions, sponsors, award packages, and eligibility evaluation rules.
- **Seed Strategy**: Seed baseline international scholarship offerings (e.g., Chevening, Fulbright, DAAD, MEXT, Erasmus Mundus) with realistic funding details and eligibility rules. Fictitious production records are strictly prohibited.

---

### 12.C.13 Scholarship Import Workflow

**Architectural Commentary**
This workflow details the operational processing for scholarships imported from third-party aggregators and platforms, mapping directly to the contracts in `12.B.8`.

**Operational Flow:**

1. **Ingestion (Phase 06):** Phase 06 pulls raw data from third-party platforms and routes it to Phase 12.
2. **Mandatory Validation:** The system validates the presence of required fields (`scholarshipName`, `fundingCoverage`, `coverageDetails`, `eligibleMajorsOrFields`, `degreeLevel`). If absent, the record is rejected or marked `Invalid`.
3. **Canonical Normalization:** The `IScholarshipCanonicalNameRule` sanitizes the name to a canonical format (e.g., stripping "2024", emojis, and marketing text).
4. **Deduplication Strategy:** The system executes `IScholarshipDeduplicationRule` against existing projections. If a match is found:
   - It performs a deep merge of `optionalFields`.
   - Conflicting values are flagged for admin review (`NeedsReview` state).
5. **Enrichment Trigger:** For records marked `Incomplete`, administrators can trigger `Fetch Missing Data`. This dispatches an `IScholarshipMissingDataFetchRequest` to scrape or call trusted APIs for the official source to populate `eligibilityCriteria`, `requiredDocuments`, etc.
6. **Publication Governance:** Only records that achieve the `ReadyToPublish` state through explicit admin review can be transitioned to the `Published` state, making them visible to the Phase 24 Public Platform.

---

### 12.C.14 Scholarship Eligibility & Award Evaluation Engine

**Architectural Commentary**
The Eligibility Engine evaluates student candidate parameters against scholarship rules (GPA, age limit, test thresholds, country constraints).

```typescript
export class ScholarshipEligibilityEngine {
  public evaluateCandidate(params: {
    studentGPA: number;
    minimumGPA: number | null;
    studentAge: number;
    maxAge: number | null;
  }): { isEligible: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (params.minimumGPA !== null && params.studentGPA < params.minimumGPA) {
      reasons.push(`GPA ${params.studentGPA} below minimum required ${params.minimumGPA}`);
    }

    if (params.maxAge !== null && params.studentAge > params.maxAge) {
      reasons.push(`Age ${params.studentAge} exceeds maximum age ${params.maxAge}`);
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
    };
  }
}
```

---

### 12.C.15 Resilience, Security & Performance Strategy

**Architectural Commentary**

- **Security & Isolation**: Access control and tenant boundaries adhere strictly to ADR-027. Operations require authenticated RBAC credentials.
- **Performance Optimization**: Read paths use Prisma compiled selections, unique composite indexing on `public_id`, and keyset pagination (`take`, `cursor`).

---

### 12.C.16 Testing Strategy

**Architectural Commentary**

- **Unit Tests**: Vitest validates aggregates, domain rules, and Zod validators.
- **Integration Tests**: Validates Prisma schema operations and repository mapping against ephemeral PostgreSQL instances.
- **CQRS & Pipeline Tests**: Validates Command and Query handlers end-to-end.

---

### 12.C.17 Final Implementation Review Checklist

- [x] Alignment with Phase 12 Part A — All layers and components match the architectural specification.
- [x] Alignment with Phase 12 Part B — Implementation strictly uses defined TypeScript contracts without modification.
- [x] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [x] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [x] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [x] Foundation Reuse Verification — Consumes Phase 05, 06, 07, 08, 09, 10, and 11 properly.
- [x] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 12 — Domain Contracts](phase-12-02-domain-contracts.md)
- **Next**: [Phase 13 — Learning Platform](../phase-13-learning-platform/)
