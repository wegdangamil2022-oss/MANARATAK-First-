> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK 2.0: Phase 11 (Universities & Institutions) Enterprise Domain

## Part C – Implementation Guide

### 11.C.1 Executive Summary & Architecture Overview

**Architectural Commentary**
This document provides the definitive implementation guide for **Phase 11 (Universities & Institutions)**. It translates the enterprise architecture of Part A and the domain contracts of Part B into concrete enterprise integration patterns, architectural workflows, and deployment topologies adhering strictly to ADR-025 (TypeScript / Node.js / Express / Prisma ORM / PostgreSQL canonical stack).

Phase 11 serves as the authoritative domain for higher education institutional profiles, campuses, organizational units (faculties/colleges), departments, academic program offerings, accreditations, and global rankings. Built on Clean Architecture and CQRS principles, the Write Model manages institutional hierarchies and program offerings using Domain-Driven Design (DDD) aggregates and Prisma ORM under the `universities` database schema. The Read Model provides ultra-fast university catalog search, filtering, and program discovery via Redis caching.

---

> **ADR-028 persistence note (2026-09-06):** Historical `@@schema(...)` examples in earlier revisions are superseded. The canonical runtime uses Prisma `public` with ownership enforced by `persistence-ownership.manifest.json`; this guide does not authorize a separate physical/logical PostgreSQL schema.

### 11.C.2 Technology Stack

**Architectural Commentary**

- **Runtime Environment**: Node.js 22.16.0 (`>=22.16.0 <23`) / TypeScript 5.x / Express.js
- **Primary Persistence**: Relational SQL Database (PostgreSQL via Prisma ORM) under the `universities` database schema
- **In-Memory Cache**: Distributed Redis Cache (Read-through caching for institutional cards and program offerings)
- **Message Broker & Events**: Enterprise Transactional Outbox / Inbox Event Bus
- **Validation Pipeline**: Zod Schema Validation
- **Testing Framework**: Vitest (Unit & Integration Testing)

---

### 11.C.3 Project & Directory Structure

**Architectural Commentary**
The platform is organized strictly following Clean Architecture principles to isolate core domain business logic from infrastructure dependencies and delivery mechanisms.

```text
src/
├── domain/               # Pure DDD Aggregates, Entities, Value Objects, Domain Events
│   ├── entities/         # UniversityAggregate, CampusEntity, FacultyEntity, AcademicProgramEntity
│   ├── value-objects/    # Tuition, AdmissionRequirement
│   └── events/           # UniversityCreatedEvent, ProgramPublishedEvent, AccreditationUpdatedEvent
├── application/          # CQRS Use Cases, Handlers, Commands, Queries, DTOs, Zod Validators
│   ├── commands/         # CreateUniversityCommand, AddCampusCommand, CreateAcademicProgramCommand
│   ├── queries/          # GetUniversitySummaryQuery, SearchProgramsQuery, GetCampusesQuery
│   ├── validators/       # Zod Schemas for commands and queries
│   └── projections/      # Read models & projections for downstream consumers
├── infrastructure/       # Persistence, Repositories, Caching, Outbox
│   ├── persistence/      # Prisma Client (`universities` schema), Repositories
│   ├── caching/          # Redis Cache Service
│   └── messaging/        # Outbox Relays & Inbox Consumers
└── presentation/         # Express API Controllers, Middleware, Routes
    ├── controllers/      # UniversityController, ProgramController, CampusController
    └── middleware/       # Authentication, Validation, Error Handling
```

---

### 11.C.4 Persistence Strategy & Prisma Schema Mapping

**Architectural Commentary**
All persistence entities operate under the PostgreSQL `universities` schema managed by Prisma ORM. Auditing fields (`createdAt`, `lastModifiedAt`) and soft-deletion flags (`isDeleted`) are enforced on every table.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model University {
  id                  String             @id @default(uuid())
  publicId            String             @unique @map("public_id")
  canonicalName       String             @map("canonical_name")
  countryReferenceId String             @map("country_reference_id")
  foundedYear         Int                @map("founded_year")
  lifecycleState      String             @map("lifecycle_state")
  createdAt           DateTime           @default(now()) @map("created_at")
  lastModifiedAt      DateTime           @updatedAt @map("last_modified_at")
  isDeleted           Boolean            @default(false) @map("is_deleted")

  campuses            Campus[]
  faculties           Faculty[]
  programs            AcademicProgram[]
  accreditations      Accreditation[]
  rankings            Ranking[]

  @@map("universities")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model Campus {
  id                    String     @id @default(uuid())
  publicId              String     @unique @map("public_id")
  universityReferenceId String     @map("university_reference_id")
  cityReferenceId       String     @map("city_reference_id")
  campusName            String     @map("campus_name")
  isMainCampus          Boolean    @default(false) @map("is_main_campus")
  createdAt             DateTime   @default(now()) @map("created_at")
  lastModifiedAt        DateTime   @updatedAt @map("last_modified_at")
  isDeleted             Boolean    @default(false) @map("is_deleted")

  university            University @relation(fields: [universityReferenceId], references: [publicId])

  @@map("campuses")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model Faculty {
  id                         String       @id @default(uuid())
  publicId                   String       @unique @map("public_id")
  universityReferenceId     String       @map("university_reference_id")
  campusReferenceId         String?      @map("campus_reference_id")
  facultyName                String       @map("faculty_name")
  organizationalUnitTypeCode String       @map("organizational_unit_type_code")
  createdAt                  DateTime     @default(now()) @map("created_at")
  lastModifiedAt             DateTime     @updatedAt @map("last_modified_at")
  isDeleted                  Boolean      @default(false) @map("is_deleted")

  university                 University   @relation(fields: [universityReferenceId], references: [publicId])
  departments                Department[]
  programs                   AcademicProgram[]

  @@map("faculties")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model Department {
  id                             String          @id @default(uuid())
  publicId                       String          @unique @map("public_id")
  organizationalUnitReferenceId String          @map("organizational_unit_reference_id")
  departmentName                 String          @map("department_name")
  createdAt                      DateTime        @default(now()) @map("created_at")
  lastModifiedAt                 DateTime        @updatedAt @map("last_modified_at")
  isDeleted                      Boolean         @default(false) @map("is_deleted")

  faculty                        Faculty         @relation(fields: [organizationalUnitReferenceId], references: [publicId])
  programs                       AcademicProgram[]

  @@map("departments")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model AcademicProgram {
  id                            String      @id @default(uuid())
  publicId                      String      @unique @map("public_id")
  universityReferenceId        String      @map("university_reference_id")
  organizationalUnitReferenceId String      @map("organizational_unit_reference_id")
  departmentReferenceId        String?     @map("department_reference_id")
  majorReferenceId             String      @map("major_reference_id")
  degreeLevelReferenceId       String      @map("degree_level_reference_id")
  deliveryModeReferenceId      String      @map("delivery_mode_reference_id")
  programName                   String      @map("program_name")
  tuitionAmount                 Float?      @map("tuition_amount")
  currencyReferenceId          String?     @map("currency_reference_id")
  pricingModelCode              String?     @map("pricing_model_code")
  lifecycleState                String      @map("lifecycle_state")
  createdAt                     DateTime    @default(now()) @map("created_at")
  lastModifiedAt                DateTime    @updatedAt @map("last_modified_at")
  isDeleted                     Boolean     @default(false) @map("is_deleted")

  university                    University  @relation(fields: [universityReferenceId], references: [publicId])
  faculty                       Faculty     @relation(fields: [organizationalUnitReferenceId], references: [publicId])
  department                    Department? @relation(fields: [departmentReferenceId], references: [publicId])

  @@map("academic_programs")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model Accreditation {
  id                         String      @id @default(uuid())
  publicId                   String      @unique @map("public_id")
  accreditingBodyReferenceId String      @map("accrediting_body_reference_id")
  universityReferenceId     String?     @map("university_reference_id")
  academicProgramReferenceId String?     @map("academic_program_reference_id")
  validFrom                  DateTime    @map("valid_from")
  validUntil                 DateTime?   @map("valid_until")
  createdAt                  DateTime    @default(now()) @map("created_at")
  lastModifiedAt             DateTime    @updatedAt @map("last_modified_at")
  isDeleted                  Boolean     @default(false) @map("is_deleted")

  university                 University? @relation(fields: [universityReferenceId], references: [publicId])

  @@map("accreditations")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model Ranking {
  id                    String     @id @default(uuid())
  publicId              String     @unique @map("public_id")
  universityReferenceId String     @map("university_reference_id")
  rankingSystemCode     String     @map("ranking_system_code")
  year                  Int
  position              Int
  score                 Float?
  createdAt             DateTime   @default(now()) @map("created_at")
  lastModifiedAt        DateTime   @updatedAt @map("last_modified_at")
  isDeleted             Boolean    @default(false) @map("is_deleted")

  university            University @relation(fields: [universityReferenceId], references: [publicId])

  @@map("rankings")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}
```

---

### 11.C.5 Aggregate & Entity Implementation Strategy

**Architectural Commentary**
Core domain aggregates encapsulate business rules and invariants in pure TypeScript classes.

```typescript
import { IUniversityEntity, ReferenceLifecycleState } from '../domain-contracts';

export class UniversityAggregate implements IUniversityEntity {
  public readonly id: string;
  public readonly publicId: string;
  public canonicalName: string;
  public countryReferenceId: string;
  public foundedYear: number;
  public lifecycleState: ReferenceLifecycleState;

  constructor(params: {
    id: string;
    publicId: string;
    canonicalName: string;
    countryReferenceId: string;
    foundedYear: number;
    lifecycleState?: ReferenceLifecycleState;
  }) {
    this.id = params.id;
    this.publicId = params.publicId;
    this.canonicalName = params.canonicalName;
    this.countryReferenceId = params.countryReferenceId;
    this.foundedYear = params.foundedYear;
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
      throw new Error('University profile is already active');
    }
    this.lifecycleState = 'Active';
  }
}
```

---

### 11.C.6 Repository Implementation Strategy

**Architectural Commentary**
Repositories encapsulate Prisma Client database interactions, implementing `IUniversityRepository<T>` contracts.

```typescript
import { PrismaClient } from '@prisma/client';
import { IUniversityRepository, IUniversityEntity } from '../domain-contracts';
import { UniversityAggregate } from '../domain/UniversityAggregate';

export class UniversityRepository implements IUniversityRepository<IUniversityEntity> {
  constructor(private readonly prisma: PrismaClient) {}

  public async getByIdAsync(id: string): Promise<IUniversityEntity | null> {
    const record = await this.prisma.university.findFirst({
      where: { id, isDeleted: false },
    });
    return record ? this.mapToAggregate(record) : null;
  }

  public async getByPublicIdAsync(publicId: string): Promise<IUniversityEntity | null> {
    const record = await this.prisma.university.findFirst({
      where: { publicId, isDeleted: false },
    });
    return record ? this.mapToAggregate(record) : null;
  }

  public async createAsync(entity: IUniversityEntity): Promise<void> {
    await this.prisma.university.create({
      data: {
        id: entity.id,
        publicId: entity.publicId,
        canonicalName: entity.canonicalName,
        countryReferenceId: entity.countryReferenceId,
        foundedYear: entity.foundedYear,
        lifecycleState: entity.lifecycleState,
      },
    });
  }

  public async updateAsync(entity: IUniversityEntity): Promise<void> {
    await this.prisma.university.update({
      where: { id: entity.id },
      data: {
        canonicalName: entity.canonicalName,
        lifecycleState: entity.lifecycleState,
      },
    });
  }

  private mapToAggregate(record: any): UniversityAggregate {
    return new UniversityAggregate({
      id: record.id,
      publicId: record.publicId,
      canonicalName: record.canonicalName,
      countryReferenceId: record.countryReferenceId,
      foundedYear: record.foundedYear,
      lifecycleState: record.lifecycleState,
    });
  }
}
```

---

### 11.C.7 Service & CQRS Implementation

**Architectural Commentary**
CQRS handlers physically separate state-mutating commands from high-throughput queries.

```typescript
// Command Handler Example
export class CreateUniversityCommandHandler {
  constructor(
    private readonly repository: UniversityRepository,
    private readonly outbox: OutboxService,
  ) {}

  public async execute(command: {
    publicId: string;
    canonicalName: string;
    countryReferenceId: string;
    foundedYear: number;
  }): Promise<void> {
    const aggregate = new UniversityAggregate({
      id: crypto.randomUUID(),
      publicId: command.publicId,
      canonicalName: command.canonicalName,
      countryReferenceId: command.countryReferenceId,
      foundedYear: command.foundedYear,
      lifecycleState: 'Draft',
    });

    await this.repository.createAsync(aggregate);

    await this.outbox.enqueueEvent({
      eventType: 'UniversityCreated',
      payload: {
        universityPublicId: aggregate.publicId,
        canonicalName: aggregate.canonicalName,
      },
    });
  }
}

// Query Handler Example
export class GetUniversitySummaryQueryHandler {
  constructor(private readonly prisma: PrismaClient) {}

  public async execute(universityPublicId: string) {
    const record = await this.prisma.university.findFirst({
      where: { publicId: universityPublicId, isDeleted: false },
      select: {
        publicId: true,
        canonicalName: true,
        countryReferenceId: true,
        foundedYear: true,
        lifecycleState: true,
      },
    });

    if (!record) {
      throw new Error(`University with public ID ${universityPublicId} not found`);
    }

    return record;
  }
}
```

---

### 11.C.8 Validation Pipeline (Zod)

**Architectural Commentary**
Validation occurs strictly prior to command execution using Zod schemas.

```typescript
import { z } from 'zod';

export const createUniversitySchema = z.object({
  publicId: z.string().min(3).max(100),
  canonicalName: z.string().min(2).max(255),
  countryReferenceId: z.string().min(2),
  foundedYear: z.number().int().min(800).max(new Date().getFullYear()),
});

export const createAcademicProgramSchema = z.object({
  universityReferenceId: z.string().min(3),
  organizationalUnitReferenceId: z.string().min(3),
  majorReferenceId: z.string().min(3),
  degreeLevelReferenceId: z.string().min(2),
  deliveryModeReferenceId: z.string().min(2),
  programName: z.string().min(2).max(255),
  tuitionAmount: z.number().nonnegative().optional(),
  currencyReferenceId: z.string().optional(),
});
```

---

### 11.C.9 Event Integration & Transactional Outbox

**Architectural Commentary**
Aggregate state mutations emit domain events persisted atomically into the transactional outbox table within the same transaction.

```typescript
export interface IUniversityCreatedEvent {
  readonly eventId: string;
  readonly eventType: 'UniversityCreated';
  readonly occurredAt: Date;
  readonly universityPublicId: string;
  readonly canonicalName: string;
}

export interface IAcademicProgramPublishedEvent {
  readonly eventId: string;
  readonly eventType: 'AcademicProgramPublished';
  readonly occurredAt: Date;
  readonly programPublicId: string;
  readonly universityPublicId: string;
}
```

---

### 11.C.10 Cache Integration Strategy

**Architectural Commentary**
High-frequency university reference queries leverage a Read-Through caching strategy with Redis (`universities:summary:{publicId}`). Write operations invalidate the cache explicitly.

```typescript
export class UniversityCacheService {
  constructor(private readonly redis: any) {}

  public async getCachedUniversitySummary(publicId: string): Promise<any | null> {
    const raw = await this.redis.get(`universities:summary:${publicId}`);
    return raw ? JSON.parse(raw) : null;
  }

  public async setCachedUniversitySummary(
    publicId: string,
    data: any,
    ttlSeconds = 3600,
  ): Promise<void> {
    await this.redis.set(
      `universities:summary:${publicId}`,
      JSON.stringify(data),
      'EX',
      ttlSeconds,
    );
  }

  public async invalidateUniversityCache(publicId: string): Promise<void> {
    await this.redis.del(`universities:summary:${publicId}`);
  }
}
```

---

### 11.C.11 Import Integration & Seed Strategy

**Architectural Commentary**

- **Import Boundary**:
  - **Phase 06 (Universal Import Platform):** Provides generic execution infrastructure (file readers, batching, worker queues, error tracking).
  - **Phase 07 (Enterprise Reference Data):** Provides shared reference identity (Countries, Cities, Currencies).
  - **Phase 08 (Academic Taxonomy):** Provides degree levels and taxonomy classifications.
  - **Phase 09 (International Tests Platform):** Provides standard test references (IELTS, TOEFL) for admission prerequisites.
  - **Phase 10 (Major Platform):** Provides major reference IDs for program offerings.
  - **Phase 11 (Universities & Institutions):** Owns university entity profiles, campuses, faculties, departments, and academic program catalogs.
- **Seed Strategy**: Seed verified international university records (e.g., Oxford, MIT, Harvard, KAUST) with official campus structures and program listings. Fictitious production records are strictly prohibited.

### 11.C.11.1 University Import Execution & Admin Workflow

**Architectural Commentary**
Translates the import boundaries and deduplication rules from Part A into operational command handlers that sit behind the Phase 06 generic import queue.

1. **Staging & Validation:**
   - Raw records arriving from the Phase 06 generic parser are received by the Phase 11 `UniversityImportCommandHandler`.
   - The handler strictly validates the `IUniversityImportRequiredFields` using a Zod schema. If mandatory fields are missing, the record is rejected back to the Phase 06 failed-row queue.

2. **Canonical Normalization:**
   - The handler normalizes `officialUniversityName` by stripping generic platform suffixes, extra spaces, and emojis, preserving meaningful legal entity words.
   - It constructs the deduplication composite key (`canonicalUniversityName + country + officialWebsiteDomain`).

3. **Deduplication & Enrichment Merge:**
   - The handler queries the `universities` table using the composite key.
   - **If NOT found:** A new university aggregate is created with state `Imported` or `Incomplete` depending on data density.
   - **If found:** The handler fetches the existing aggregate.
     - **Protection Rule:** If the existing aggregate state is `NeedsReview`, `ReadyToPublish`, or `Published`, silent overwrites are strictly aborted to protect admin work.
     - **Merge Rule:** If the aggregate is unprotected, the handler iterates through `IUniversityImportOptionalFields` and populates only null/empty fields.

4. **Lifecycle Publishing:**
   - Once a record has sufficient data, an admin reviews it in the backoffice.
   - The admin transitions it to `ReadyToPublish` or `Published`.
   - The `UniversityPublishedEvent` is fired, invalidating Phase 11 read-model caches, and signaling Phase 24 public pages that a new institution is available for display.

---

### 11.C.12 Institutional Hierarchy & Program Offering Engine

**Architectural Commentary**
The Program Offering Engine manages the intersection of University, Organizational Unit, Major (Phase 10), Degree Level (Phase 8), and Admission Prerequisites (Phase 9).

```typescript
export class AcademicProgramOfferingEngine {
  public validateProgramIntersection(params: {
    universityPublicId: string;
    majorPublicId: string;
    degreeLevelCode: string;
  }): boolean {
    if (!params.universityPublicId || !params.majorPublicId || !params.degreeLevelCode) {
      throw new Error('Invalid academic program intersection parameters');
    }
    return true;
  }
}
```

---

### 11.C.13 Resilience, Security & Performance Strategy

**Architectural Commentary**

- **Security & Isolation**: Access control and tenant boundaries adhere strictly to ADR-027. Operations require authenticated RBAC credentials.
- **Performance Optimization**: Read paths use Prisma compiled selections, unique composite indexing on `public_id`, and keyset pagination (`take`, `cursor`).

---

### 11.C.14 Testing Strategy

**Architectural Commentary**

- **Unit Tests**: Vitest validates aggregates, domain rules, and Zod validators.
- **Integration Tests**: Validates Prisma schema operations and repository mapping against ephemeral PostgreSQL instances.
- **CQRS & Pipeline Tests**: Validates Command and Query handlers end-to-end.

---

### 11.C.15 Final Implementation Review Checklist

- [x] Alignment with Phase 11 Part A — All layers and components match the architectural specification.
- [x] Alignment with Phase 11 Part B — Implementation strictly uses defined TypeScript contracts without modification.
- [x] No Ownership Violations — Does not attempt to model business entities outside of its bounds.
- [x] No Duplicated Functionality — Does not rebuild existing infrastructures.
- [x] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [x] Foundation Reuse Verification — Consumes Phase 05, 06, 07, 08, 09, and 10 properly.
- [x] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**Status:** Baselined Architecture Specification

---

### Navigation

- **Previous**: [Phase 11 — Domain Contracts](phase-11-02-domain-contracts.md)
- **Next**: [Phase 12 — Scholarships](../phase-12-scholarships/)
> **Current remediation status (2026-08-12): `DESIGNED / NOT_IMPORTED / PENDING_GOOGLE_STUDIO`.**
> Examples and checklists in this historical guide are design material. They do not prove a finalized schema, executable build/tests, runtime readiness, or imported University records.
