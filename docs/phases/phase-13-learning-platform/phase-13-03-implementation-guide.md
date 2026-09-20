> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 13 Learning Platform

## Part C - Implementation Guide

### 13.C.1 Executive Summary & Architecture Overview

**Architectural Commentary**
This document provides the definitive implementation guide for **Phase 13 (Learning Platform)**. It translates the enterprise architecture of Part A and the domain contracts of Part B into concrete enterprise integration patterns, architectural workflows, and deployment topologies adhering strictly to ADR-025 (TypeScript / Node.js / Express / Prisma ORM / PostgreSQL canonical stack).

Phase 13 is the authoritative domain for the Learning Management System (LMS) capabilities of MANARATAK 2.0, encompassing course catalogs, modules, lessons, learner progress, assessments, and learning paths. Built on Clean Architecture and CQRS principles, the Write Model manages course structures and enrollments using Domain-Driven Design (DDD) aggregates and Prisma ORM under the ADR-028 `learning` persistence owner in the shared Prisma `public` schema. The Read Model provides high-performance course discovery and progress tracking via Redis caching.

---

> **ADR-028 persistence note (2026-09-06):** Historical `@@schema(...)` examples in earlier revisions are superseded. The canonical runtime uses Prisma `public` with ownership enforced by `persistence-ownership.manifest.json`; this guide does not authorize a separate physical/logical PostgreSQL schema.

### 13.C.2 Technology Stack

**Architectural Commentary**

- **Runtime Environment**: Node.js 22.16.0 (`>=22.16.0 <23`) / TypeScript 5.x / Express.js
- **Primary Persistence**: Relational SQL Database (PostgreSQL via Prisma ORM), owner=`learning`, physical Prisma schema=`public` per ADR-028
- **In-Memory Cache**: Distributed Redis Cache (Read-through caching for active course catalogs and progress projections)
- **Message Broker & Events**: Enterprise Transactional Outbox / Inbox Event Bus
- **Validation Pipeline**: Zod Schema Validation
- **Testing Framework**: Vitest (Unit & Integration Testing)

---

### 13.C.3 Project & Directory Structure

**Architectural Commentary**
Phase 13 follows the enterprise-standard modular monolith (or microservice-ready) directory structure, separating Domain, Application, Infrastructure, and Presentation layers.

```text
packages/learning-platform/
├── src/
│   ├── domain/                  # Enterprise business rules (Entities, Value Objects, Domain Events)
│   │   ├── aggregates/          # Course, Enrollment, Progress, Assessment, LearningPath
│   │   ├── events/              # e.g., CoursePublishedEvent, EnrollmentCreatedEvent
│   │   └── repositories/        # Repository interfaces (ICourseRepository)
│   ├── application/             # Application use cases (CQRS Commands/Queries)
│   │   ├── commands/            # PublishCourseCommand, EnrollStudentCommand
│   │   ├── queries/             # GetCourseCatalogQuery, GetLearnerProgressQuery
│   │   └── validators/          # Zod schemas for application inputs
│   ├── infrastructure/          # External concerns (Prisma, Redis, EventBus)
│   │   ├── persistence/         # Prisma repositories (CourseRepositoryImpl)
│   │   ├── cache/               # Redis cache integration
│   │   └── messaging/           # Outbox publishers and event handlers
│   └── presentation/            # Delivery mechanisms
│       ├── controllers/         # Express.js route controllers
│       └── middlewares/         # Validation and Auth middlewares
├── prisma/
│   └── schema.prisma            # Database schema definitions for Phase 13
└── package.json
```

---

### 13.C.4 Persistence Strategy & Prisma Schema Mapping

**Architectural Commentary**
The relational data model is managed by Prisma ORM. Logical isolation is enforced by ADR-028 ownership controls and the persistence manifest; the physical Prisma schema is `public`.

```prisma
// packages/learning-platform/prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Course {
  id               String   @id @default(uuid())
  publicId         String   @unique @map("public_id")
  canonicalTitle   String   @map("canonical_title")
  lifecycleState   String   @map("lifecycle_state")
  versionNumber    Int      @map("version_number")
  isActiveVersion  Boolean  @default(true) @map("is_active_version")

  originType       String   @default("NativeManaratakCourse") @map("origin_type")
  deliveryMode     String   @default("InternalLmsEngine") @map("delivery_mode")
  isImported       Boolean  @default(false) @map("is_imported")
  originProviderId String?  @map("origin_provider_id")
  externalCourseUrl String? @map("external_course_url")

  createdAt        DateTime @default(now()) @map("created_at")
  lastModifiedAt   DateTime @updatedAt @map("last_modified_at")
  isDeleted        Boolean  @default(false) @map("is_deleted")

  modules          Module[]
  enrollments      Enrollment[]

  @@map("courses")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model Module {
  id               String   @id @default(uuid())
  publicId         String   @unique @map("public_id")
  courseId         String   @map("course_id")
  title            String   @map("title")
  sequenceOrder    Int      @map("sequence_order")

  course           Course   @relation(fields: [courseId], references: [publicId])
  lessons          Lesson[]

  @@map("modules")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model Lesson {
  id               String   @id @default(uuid())
  publicId         String   @unique @map("public_id")
  moduleId         String   @map("module_id")
  title            String   @map("title")
  sequenceOrder    Int      @map("sequence_order")

  module           Module   @relation(fields: [moduleId], references: [publicId])

  @@map("lessons")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}

model Enrollment {
  id               String   @id @default(uuid())
  publicId         String   @unique @map("public_id")
  courseId         String   @map("course_id")
  studentId        String   @map("student_id")
  enrollmentStatus String   @map("enrollment_status")
  enrolledAt       DateTime @default(now()) @map("enrolled_at")

  course           Course   @relation(fields: [courseId], references: [publicId])

  @@map("enrollments")
  // Persistence owner is governed by ADR-028; physical Prisma schema = public.
}
```

---

### 13.C.5 Aggregate & Entity Implementation Strategy

**Architectural Commentary**
Aggregates are implemented as TypeScript classes containing business logic. They encapsulate state and ensure domain invariants are never breached.

```typescript
import { ICourseIdentity, ICourseLifecycle } from '../../domain-contracts/phase-13';
import { DomainEvent } from '@manaratak/core';

export class Course implements ICourseIdentity, ICourseLifecycle {
  private _domainEvents: DomainEvent[] = [];

  constructor(
    public readonly publicId: string,
    public canonicalTitle: string,
    public lifecycleState: string,
    public readonly versionNumber: number,
    public isActiveVersion: boolean,
  ) {}

  public publish(): void {
    if (this.lifecycleState === 'Published') {
      throw new Error('Course is already published.');
    }

    this.lifecycleState = 'Published';
    this.addDomainEvent({
      type: 'CoursePublishedEvent',
      payload: { courseId: this.publicId, publishedAt: new Date() },
    });
  }

  private addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
```

---

### 13.C.6 Repository Implementation Strategy

**Architectural Commentary**
The repository layer bridges the Domain Aggregates with Prisma ORM, translating rich domain objects into flat database structures and back.

```typescript
export class CourseRepositoryImpl implements ICourseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async getByPublicId(publicId: string): Promise<Course | null> {
    const data = await this.prisma.course.findUnique({
      where: { publicId },
    });

    if (!data) return null;

    return new Course(
      data.publicId,
      data.canonicalTitle,
      data.lifecycleState,
      data.versionNumber,
      data.isActiveVersion,
    );
  }

  public async save(course: Course): Promise<void> {
    await this.prisma.course.upsert({
      where: { publicId: course.publicId },
      update: {
        canonicalTitle: course.canonicalTitle,
        lifecycleState: course.lifecycleState,
      },
      create: {
        publicId: course.publicId,
        canonicalTitle: course.canonicalTitle,
        lifecycleState: course.lifecycleState,
        versionNumber: course.versionNumber,
        isActiveVersion: course.isActiveVersion,
      },
    });
  }
}
```

---

### 13.C.7 Service & CQRS Implementation

**Architectural Commentary**
Use Cases are encapsulated in Command and Query handlers.

```typescript
export class PublishCourseCommandHandler {
  constructor(
    private readonly courseRepository: ICourseRepository,
    private readonly eventBus: IEventBus,
  ) {}

  public async execute(command: PublishCourseCommand): Promise<void> {
    const course = await this.courseRepository.getByPublicId(command.courseId);
    if (!course) throw new NotFoundError('Course not found');

    course.publish();

    await this.courseRepository.save(course);

    // Dispatch events to the Outbox
    for (const event of course.domainEvents) {
      await this.eventBus.publish(event);
    }
    course.clearDomainEvents();
  }
}
```

---

### 13.C.8 Validation Pipeline (Zod)

**Architectural Commentary**
All inputs are strictly validated at the application boundary using Zod schemas.

```typescript
import { z } from 'zod';

export const PublishCourseSchema = z.object({
  courseId: z.string().uuid(),
  requestedByUserId: z.string().uuid(),
});
```

---

### 13.C.9 Event Integration & Transactional Outbox

**Architectural Commentary**
Phase 13 utilizes the Enterprise Transactional Outbox. Domain events generated by Course Aggregates (e.g., `CoursePublishedEvent`) are saved to the Outbox table within the same PostgreSQL transaction as the entity updates, ensuring eventual consistency without distributed transaction locks.

---

### 13.C.10 Cache Integration Strategy

**Architectural Commentary**
Redis is used for caching read-heavy query operations like course discovery catalogs and learner dashboard projections.

```typescript
export class GetCourseCatalogQueryHandler {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: RedisClient,
  ) {}

  public async execute(query: GetCourseCatalogQuery): Promise<CourseCatalogDto[]> {
    const cacheKey = `courses:catalog:${query.categoryId || 'all'}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const courses = await this.prisma.course.findMany({
      where: { lifecycleState: 'Published' },
      select: { publicId: true, canonicalTitle: true },
    });

    await this.cache.set(cacheKey, JSON.stringify(courses), 'EX', 3600);
    return courses;
  }
}
```

---

### 13.C.11 Media & Storage Integration

**Architectural Commentary**
In compliance with Phase 05 (Enterprise Asset Platform), Phase 13 does not store physical media files (videos, PDFs) in the database. Entities such as `LearningMaterial` and `SubtitleTrack` store only CDN-ready URIs or immutable `AssetIds`.

---

### 13.C.12 Import Integration & Seed Strategy

**Architectural Commentary**
Integration with Phase 06 (Import Foundation) maps canonical imported course data to Phase 13 concrete entities, ensuring zero external provider logic leaks into the core learning platform. The boundary defines that Phase 06 remains a domain-agnostic ETL and ingestion pipeline, whereas Phase 13 executes all learning-domain business invariants.

---

### 13.C.12.1 Course Origin & Import Operational Workflows

**Architectural Commentary**
The runtime behaviors of `NativeManaratakCourse`, `ExternalLinkedCourse`, `PaidCourse`, and `RelatedPaidService` diverge fundamentally across ingestion, delivery, progress tracking, and certificate signaling.

#### 1. Free External / Global Course Import Pipeline & Normalization Engine

```
  +-----------------------+
  |  Phase 06 Pipeline    |  <-- Ingests raw data, handles file-parsing,
  |  (Universal ETL)      |      chunking, retry, and transport mechanics
  +-----------+-----------+
              |
              | Raw Ingested Row DTO
              v
  +-----------------------+
  |  Phase 13 Ingestion   |  <-- Executes domain validations: required
  |  Domain Validator     |      fields & eligibility check (Free or Free Cert)
  +-----------+-----------+
              |
              | Validated DTO
              v
  +-----------------------+
  |  Deduplication &      |  <-- normalizes canonical name, matches provider,
  |  Enrichment Engine    |      merges missing fields without overwriting reviewed info
  +-----------+-----------+
              |
              | Canonical Course Record
              v
  +-----------------------+
  |   Persistence Owner   |  <-- Populates learning-owned Course models in Prisma public
  |    (PostgreSQL)       |      in Draft / PendingReview state
  +-----------------------+
```

##### Step 1: Ingestion & Boundary Division of Labor
- **Phase 06 Responsibility**: Spawns the source connectors, handles scheduled jobs, reads source formats (CSV, JSON, XML feeds), coordinates network retry behaviors, isolates failed raw rows, and writes ingestion execution logs.
- **Phase 13 Responsibility**: Receives the raw record from Phase 06's ingestion hook and initiates deep learning-domain semantic checks.

##### Step 2: Domain Validation & Filtering (Phase 13)
Upon receipt of an import payload `IGlobalCourseImportPayload`, Phase 13 executes the following strict schema validation using Zod:

```typescript
import { z } from 'zod';

export const GlobalCourseImportSchema = z.object({
  courseName: z.string().trim().min(1, "Course name is required"),
  directCourseUrl: z.string().url("Must be a valid URL"),
  isFreeCourse: z.boolean(),
  isFreeCertificate: z.boolean(),
  // Optional enrichment fields
  courseContent: z.string().optional(),
  shortDescription: z.string().optional(),
  learningLanguage: z.string().optional(),
  studyDuration: z.string().optional(),
  courseLevel: z.enum(['Beginner', 'Intermediate', 'Advanced', 'All Levels']).optional(),
  providerName: z.string().optional(),
  providerSummary: z.string().optional(),
  providerType: z.enum(['University', 'Platform', 'Institution', 'Other']).optional(),
  certificateType: z.enum(['Free Certificate', 'Paid Certificate', 'Verified Certificate', 'None']).optional(),
  category: z.string().optional(),
  skills: z.array(z.string()).optional(),
  officialSourceUrl: z.string().url().optional(),
  lastVerifiedAt: z.string().datetime().optional(),
  sourceTrustLevel: z.enum(['High', 'Medium', 'Low', 'Unverified']).optional(),
  localizedNames: z.record(z.string(), z.object({
    courseName: z.string().optional(),
    courseContent: z.string().optional(),
    shortDescription: z.string().optional(),
  })).optional(),
}).refine(data => data.isFreeCourse === true || data.isFreeCertificate === true, {
  message: "External course must be completely free OR offer a free certificate to be eligible for the Global Courses Catalog.",
  path: ["isFreeCourse", "isFreeCertificate"]
});
```

- **Rejection & Triage State**: If validation fails (e.g., the course is paid or lacks a mandatory field), the record is rejected from the active import loop and mapped to an administrative triage schema in Phase 23, designated as `Rejected` or `NeedsReview`.
- **Deep-URL Validation**: The engine inspects `directCourseUrl` to verify it points to a specific course detail page (e.g., contains paths like `/learn/` or `/course/`) rather than the provider's generic homepage domain (e.g., rejects `https://coursera.org` or `https://edx.org`).

##### Step 3: Normalization & Deduplication Algorithm (Phase 13)
Duplicate external courses must not create multiple canonical database records. To prevent catalog inflation, Phase 13 runs the following deduplication strategy before database write:

1. **Canonical Name Normalization**: Trims leading/trailing whitespace, converts multiple spaces to single spaces, normalizes punctuation to standard forms, and strips non-functional suffix text (e.g., "- Online Course", "- Free Certificate Program").
2. **Provider Matching**: Maps incoming `providerName` strings to canonical provider reference records.
3. **Compound Key Generation**: Creates a hash key of `normalizedCourseName + canonicalProviderId`.
4. **Duplicate Triage & Field Merger Policy**:
   - If a course with the same compound key does NOT exist: Creates a new `Course` record in `Draft` or `PendingReview` state.
   - If a duplicate course IS found:
     - The engine checks the status of the existing record.
     - **Non-Overwrite Guarantee**: If the existing record is in `Published` or has been manually audited/reviewed by an administrator, the import engine **MUST NOT** overwrite any reviewed fields.
     - **Empty Field Enrichment**: The engine parses the new payload's optional fields (e.g., `skills`, `studyDuration`) and fills in any missing/empty values in the existing record, preserving provenance by logging the secondary source ID in a `provenanceHistory` field.
     - **Freshness Timestamp Update**: Always updates `lastVerifiedAt` and syncs the trust level based on the newer, higher-trust source.

##### Step 4: Phase 23 Review and Phase 24 Composition
- **Tollgate State**: Imported records remain in `PendingReview` and are hidden from the active public read catalog.
- **Admin Publication**: Administrators in Phase 23 examine metadata completeness, verify claims, and transition the course to `Published`.
- **Public Composition**: Phase 24 pulls the published structured pay-load `ICourseDetailPayload` to compose course detail landing pages.

#### 2. Native MANARATAK Course Operational Pipeline

- **Authoring & Persistence**: Authored natively in Phase 13 with `originType = 'NativeManaratakCourse'` and `deliveryMode = 'InternalLmsEngine'`.
- **EAP Asset Integration**: All media assets (videos, documents, subtitles) store immutable `AssetId` handles referencing Phase 05 (Enterprise Asset Platform) per ADR-024.
- **Engine Progression**: Internal LMS tracks granular lesson completions, module advancements, quiz attempts, and time-spent telemetry.
- **Completion Outbox Event**: Upon meeting `ICourseCompletionPolicy` (100% progress, passing grades), Phase 13 writes a `CourseCompleted` domain event to the Transactional Outbox.
- **Phase 14 Certificate Trigger**: Outbox relay publishes `CourseCompleted` to Enterprise Event Bus. Phase 14 ingests the event, handles certificate generation, templates, unique serial numbering, QR codes, and ledger logging. Phase 13 stores zero certificate records.

#### 3. Paid Courses Operational Pipeline

- **Classification**: Categorized as `PaidCourse` (a real learning course hosted or supported by MANARATAK requiring payment).
- **Payment Execution**: Transactional checkout and payment processing are strictly delegated to Phase 19 (Enterprise Finance & Payments Platform).
- **Course Delivery**: Handled natively within Phase 13 (or external redirect if explicitly supported as a paid external item).
- **Service Boundary Guarantee**: Must not be reclassified as a non-course service.

#### 4. Related Paid Services Boundary

- **Classification**: Categorized as `RelatedPaidService` (e.g. IELTS test prep coaching, CV writing, translation, document prep).
- **Payment Execution**: Transactional checkout is handled by Phase 19.
- **Service Fulfillment**: Delegated entirely to Phase 20 (Enterprise Services Platform). Phase 13 only stores a reference/link to these services and does not initialize LMS modules, student enrollments, or completion events for them.

---

### 13.C.13 AI Integration & Analytics Projections

**Architectural Commentary**
The Learning Platform operates as a consumer of the Enterprise AI Platform (Phase 17) and Analytics architectures. AI recommendations (e.g., `ILearningRecommendation`) are exposed via read-only endpoints populated asynchronously by AI workers. Learning analytics are processed asynchronously by consuming `CourseCompletedEvent` via the Outbox.

---

### 13.C.14 Resilience, Security & Performance Strategy

**Architectural Commentary**

- **Resilience**: Redis fallback strategies are implemented if the cache layer becomes unavailable (falling back to database reads).
- **Security**: Express/Awilix middleware enforces Role-Based Access Control (RBAC). E.g., only `Instructor` or `Admin` can execute `PublishCourseCommand`.
- **Performance**: High-velocity GET operations leverage `findMany` with targeted `select` statements and appropriate compound database indexes.

---

### 13.C.15 Testing Strategy

**Architectural Commentary**

- **Unit Tests (Vitest)**: Cover all Domain Aggregates to ensure state transition rules (e.g., cannot publish twice) function correctly in isolation.
- **Integration Tests (Testcontainers)**: Validate Prisma repository queries against ephemeral PostgreSQL containers and Redis logic against ephemeral Redis instances.

---

### 13.C.16 Final Implementation Review Checklist

**Architectural Commentary**
This serves as the official Tollgate for architecture validation before code is authorized for production deployment.

- [x] Alignment with Phase 13 Part A - All layers and components match the architectural specification.
- [x] Alignment with Phase 13 Part B - Implementation strictly uses the defined Contracts without modification.
- [x] No C# / EF Core Leaks - The implementation is purely Node.js, TypeScript, and Prisma ORM.
- [x] No Ownership Violations - Does not attempt to model business entities outside of its bounds.
- [x] Zero Upward Dependency - Domain models possess absolute ignorance of upstream consumers.
- [x] Foundation Reuse Verification - Every consumed phase is verified as a loose integration.
- [x] Dependency Inversion - Infrastructure and Delivery depend on Application and Domain, never the reverse.
- [x] Complete Implementation Readiness - The blueprint is actionable, unambiguous, and ready for engineering.

**Status:** Baselined Specification

---

### Navigation

- **Previous**: [Phase 13.B - Domain Contracts](phase-13-02-domain-contracts.md)
- **Next**: [Phase 14 - Enterprise Certificates Platform](../phase-14-enterprise-certificates-platform/phase-14-01-architecture-specification.md)
