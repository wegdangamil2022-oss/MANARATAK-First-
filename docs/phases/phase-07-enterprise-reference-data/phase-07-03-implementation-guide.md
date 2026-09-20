> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

# MANARATAK Enterprise Phase 07 Reference Data Platform

## Part C – Implementation Guide

### 7.C.1 Database / Persistence Strategy

**Architectural Commentary**
The persistence strategy establishes the physical foundation for the Reference Data Platform, prioritizing read-heavy access and strict schema integrity.

**WHY:**
Reference data acts as the absolute truth for all downstream platforms. The persistence layer must be hyper-optimized for lookups while maintaining rigid constraints against invalid insertions.

**WHAT:**
A relational SQL database schema mapped via Prisma ORM using Code-First migrations, employing strict constraints on standard codes and version tracking.

**HOW:**

```typescript
import { PrismaClient, Prisma } from '@prisma/client';

export class ReferencePrismaClient extends PrismaClient {
  readonly country!: Prisma.CountryDelegate;
  readonly currency!: Prisma.CurrencyDelegate;
  readonly language!: Prisma.LanguageDelegate;
  readonly region!: Prisma.RegionDelegate;
  readonly city!: Prisma.CityDelegate;
}
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Foundational database and persistence standards are inherited from the approved architecture foundation and Phase 05 core implementation baselines.:** Consumes standard connection resiliency, retry policies, and migration pipelines.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for persisting core reference tables. It strictly prohibits storing tenant-specific business data or transaction logs alongside reference records.

### 7.C.2 Entity Mapping

**Architectural Commentary**
Entity mapping dictates how external standard formats (ISO, UN) are transformed into the internal canonical representation.

**WHY:**
Data imported from external authorities arrives in varying shapes. A rigid mapping layer protects the core domain from external schema pollution.

**WHAT:**
A set of robust data mappers implementing an Idempotency & Upsert Strategy based on Official Codes.

**HOW:**

```typescript
import { IDataMapper } from '@manaratak/domain';

export interface ExternalCountryDto {
  isoCode: string;
  defaultName: string;
  numericCode: string;
}

export interface CountryEntity {
  isoCode: string;
  name: string;
  numericCode: string;
}

export class CountryMapper implements IDataMapper<ExternalCountryDto, CountryEntity> {
  public map(source: ExternalCountryDto): CountryEntity {
    return {
      isoCode: source.isoCode,
      name: source.defaultName,
      numericCode: source.numericCode,
    };
  }
}
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Core Implementation):** Utilizes standard DTO translation interfaces.

**IMPLEMENTATION BOUNDARIES:**
Maps attributes 1-to-1 with external definitions. It does not enrich data with domain-specific knowledge outside the standard definition.

### 7.C.3 Repository Implementation

**Architectural Commentary**
Repositories abstract the physical database, providing domain-centric access patterns tailored for reference data.

**WHY:**
To decouple business logic from Prisma ORM and provide standard hooks for caching and event publishing.

**WHAT:**
`IReferenceQueryRepository` for reads and `IReferenceCommandRepository` for state mutations, incorporating the Generic Hierarchy Closure Tables.

**HOW:**

```typescript
import { IReferenceEntity, IReferenceQueryRepository } from './phase-07-02-domain-contracts';
import { ReferencePrismaClient } from './database-context';

export class ReferenceQueryRepository<
  T extends IReferenceEntity,
> implements IReferenceQueryRepository<T> {
  constructor(
    private readonly context: ReferencePrismaClient,
    private readonly modelName: string,
  ) {}

  public async getByIdAsync(id: string): Promise<T> {
    return await (this.context as any)[this.modelName].findUnique({ where: { id } });
  }

  public async getByPublicIdAsync(publicId: string): Promise<T> {
    return await (this.context as any)[this.modelName].findUnique({ where: { publicId } });
  }

  public async getBySlugAsync(slug: string): Promise<T> {
    return await (this.context as any)[this.modelName].findUnique({ where: { slug } });
  }

  public async findByCodeAsync(code: string): Promise<readonly T[]> {
    return await (this.context as any)[this.modelName].findMany({
      where: { standardCodes: { has: code } },
    });
  }

  public async findByAliasAsync(alias: string): Promise<readonly T[]> {
    return await (this.context as any)[this.modelName].findMany({
      where: { aliases: { has: alias } },
    });
  }

  public async autocompleteAsync(searchTerm: string): Promise<readonly T[]> {
    return await (this.context as any)[this.modelName].findMany({
      where: { name: { contains: searchTerm, mode: 'insensitive' } },
      take: 20,
    });
  }
}
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Data Access):** Uses base repository patterns and specification filters.

**IMPLEMENTATION BOUNDARIES:**
Only orchestrates data retrieval and persistence. Does not perform business validation or permission checks.

### 7.C.4 Validation Pipeline

**Architectural Commentary**
The validation pipeline enforces international standards before any entity is permitted to be persisted.

**WHY:**
Corrupted reference data instantly poisons all consuming systems. Validation must be aggressive and unconditional.

**WHAT:**
A composite pipeline executing Format, Schema, and Integrity validators synchronously before database commits.

**HOW:**

```typescript
import { IReferenceEntity } from './phase-07-02-domain-contracts';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ReferenceValidationPipeline<T extends IReferenceEntity> {
  public async validateAsync(entity: T): Promise<ValidationResult> {
    // 1. Format Validation (IStandardCodeValidator)
    // 2. Schema Validation (IReferenceValidator)
    // 3. Integrity Validation (IReferenceIntegrityValidator)
    // 4. DAG Cycle Detection (ICycleDetectionValidator)
    return { isValid: true, errors: [] };
  }
}
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Validation Framework):** Inherits standard `Zod` abstractions and error formatting.

**IMPLEMENTATION BOUNDARIES:**
Validates data shape and relational integrity. Does not validate domain business rules (e.g., whether a country is eligible for a specific scholarship).

### 7.C.5 Service & CQRS Implementation

**Architectural Commentary**
Segregates read workloads from administrative write workloads to guarantee extreme read throughput.

**WHY:**
Reference data is read 1000x more often than it is written. Coupling read and write paths creates unnecessary bottlenecks.

**WHAT:**
Command handlers for entity lifecycle (Create, Supersede, Deprecate) and Query handlers optimized for headless delivery.

**HOW:**

```typescript
export interface GetCountryQuery {
  isoCode: string;
}

export interface CountryDto {
  id: string;
  isoCode: string;
  name: string;
}

export class GetCountryQueryHandler {
  constructor(private readonly queryRepository: any) {}

  public async handle(query: GetCountryQuery): Promise<CountryDto> {
    return await this.queryRepository.getByIsoCodeAsync(query.isoCode);
  }
}
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (CQRS/Express/Awilix):** Consumes standard enterprise command/query dispatching pipelines.

**IMPLEMENTATION BOUNDARIES:**
Strictly orchestrates workflow. Does not contain complex domain rules, deferring them to the aggregate roots.

### 7.C.6 Cache Integration

**Architectural Commentary**
Embeds distributed caching directly into the read path of the Reference Data Platform.

**WHY:**
To achieve the sub-millisecond read latency required by high-traffic enterprise portals.

**WHAT:**
A Read-Through cache implementation using standardized TTLs and deterministic, tenant-agnostic keys.

**HOW:**

```typescript
export class ReferenceCacheService {
  constructor(
    private readonly cacheService: any,
    private readonly repository: any,
  ) {}

  public async getCachedReferenceAsync<T>(key: string): Promise<T | null> {
    const cached = await this.cacheService.getAsync<T>(key);
    if (cached) return cached;

    const data = await this.repository.getByPublicIdAsync(key);
    if (data) {
      await this.cacheService.setAsync(key, data, 86400 * 7); // 7 days TTL
    }
    return data;
  }
}
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Caching Foundation):** Uses `ICacheService` and `ICacheKeyGenerator`.

**IMPLEMENTATION BOUNDARIES:**
Handles key resolution and eviction entirely within the infrastructure layer. The domain model remains completely oblivious to caching mechanisms.

### 7.C.7 Event Integration

**Architectural Commentary**
Governs how changes to Reference Data are propagated to the rest of the enterprise without tight coupling.

**WHY:**
When a country changes its name or currency, downstream systems (like Billing or CMS) must react asynchronously.

**WHAT:**
Transactional Outbox integration dispatching `IReferenceEvent` (e.g., `ReferenceEntitySupersededEvent`) to the Event Bus.

**HOW:**

```typescript
import { IReferenceEvent } from './phase-07-02-domain-contracts';

export class ReferenceEventDispatcher {
  constructor(private readonly prisma: ReferencePrismaClient) {}

  public async dispatchAsync(domainEvent: IReferenceEvent): Promise<void> {
    const outboxMessage = {
      id: domainEvent.eventId,
      type: domainEvent.eventType,
      payload: JSON.stringify(domainEvent),
      createdAt: new Date().toISOString(),
    };
    await (this.prisma as any).outboxMessage.create({ data: outboxMessage });
  }
}
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Event Bus / Outbox):** Consumes the Enterprise Inbox/Outbox contracts.

**IMPLEMENTATION BOUNDARIES:**
Fires-and-forgets events. Does not wait for downstream consumers or manage cross-domain sagas.

### 7.C.8 Import Integration

**Architectural Commentary**
Defines the pipeline and domain specifications for ingesting external standard datasets (e.g., bulk importing ISO country lists, UN region codes, IANA time zones).

**WHY:**
Manual data entry for global standards is error-prone and unscalable. The enterprise requires automated, idempotent bulk ingestion capabilities for reference datasets.

**WHAT:**
Phase 07 defines the domain-specific field definitions, mapping rules, validation criteria, and acceptance criteria for 10 reference datasets, consuming Phase 06 (Import Foundation) for universal execution infrastructure:

1. **Countries** (ISO 3166-1)
2. **Currencies** (ISO 4217)
3. **Languages** (ISO 639)
4. **Regions** (UN M49)
5. **Administrative Divisions** (ISO 3166-2)
6. **Time Zones** (IANA tz database)
7. **Standard Codes** (ISO/UN/IANA/CLDR)
8. **Country-Currency Mappings**
9. **Country-Language Mappings**
10. **Country-Timezone Mappings**

**HOW:**

```typescript
// Architectural Boundary: Phase 06 provides universal import mechanics (Source, Provider, Pipeline, Batching, Error Queue).
// Phase 07 owns the field definitions, mapping logic, validation rules, and acceptance criteria.
// Reference import items are processed in strict dependency order:
// Countries -> Administrative Divisions -> Cities -> Mappings
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 06 (Import Foundation):** Consumes `Source`, `Provider`, `Configuration`, `Pipeline` abstractions for reference ingestion.

**IMPLEMENTATION BOUNDARIES:**
Responsible only for normalizing external reference data into enterprise DTOs. Actual persistence delegates to the Command Handlers.

### 7.C.9 Seed Strategy

**Architectural Commentary**
The deterministic approach to populating the baseline Reference Data environment upon initial deployment.

**WHY:**
The enterprise cannot function without core references (Currencies, Locales). Seeding must be guaranteed and idempotent.

**WHAT:**
Startup tasks that inject 'Official Sources Only' datasets (ISO, UN) based on a strict relational hierarchy.

**HOW:**

```typescript
// Prisma ORM Seed script or Startup Service
// Checks if tables are empty; if so, loads JSON reference files and executes the Import Pipeline.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Startup Configurations):** Uses standard startup scripts for pre-flight data checks.

**IMPLEMENTATION BOUNDARIES:**
Only executes during environment initialization. Does not act as a continuous synchronization service.

### 7.C.10 Generic Hierarchy & DAG Foundation Integration

**Architectural Commentary**
Implements the Polyhierarchy structure defined in ADR-7.13.

**WHY:**
Reference entities (like academic subjects or regional groupings) often belong to multiple parents. A standard relational parent-child link is insufficient.

**WHAT:**
Implementation of `IHierarchyNode` and `IClosureTableRepository` for optimal graph traversal and cycle detection.

**HOW:**

```typescript
export class ClosureTableRepository {
  constructor(private readonly prisma: ReferencePrismaClient) {}

  public async maintainClosureAsync(ancestorId: string, descendantId: string): Promise<void> {
    // Executes SQL queries to generate all path depths automatically
    // Enforces cycle detection before commit
  }
}
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 07.13 (DAG Contracts):** Implements the specific closure table contracts.

**IMPLEMENTATION BOUNDARIES:**
Purely infrastructural graph mapping. It does not understand what a "Skill" or "Region" is, only that Node A connects to Node B.

### 7.C.11 Localization Implementation

**Architectural Commentary**
Defines how Reference Data is translated and delivered to global users.

**WHY:**
Reference Data must be displayable in the user's preferred language seamlessly.

**WHAT:**
A dictionary-based localization strategy attached to Reference Entities, returning fallback languages if the requested locale is missing.

**HOW:**

```typescript
// Reference entity contains a collection of localized strings.
// Delivery queries filter by requested locale, falling back to canonical default name.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Localization Framework):** Uses standard locale resolution middleware.

**IMPLEMENTATION BOUNDARIES:**
Provides localized strings. It does not perform dynamic AI translation; all translations are statically seeded.

### 7.C.12 Search Integration

**Architectural Commentary**
Provides fast indexing and lookup for reference data entities (e.g., auto-complete dropdowns).

**WHY:**
Directly querying the relational database for fuzzy text matches (e.g., typing "Ameri" to find "USA") is inefficient.

**WHAT:**
Event-driven synchronization projecting Reference Data updates into the Enterprise Search Index.

**HOW:**

```typescript
// Consumes ReferenceEntitySupersededEvent and updates the external Search index
// focusing only on PublicId, CanonicalName, and LocalizedNames.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Search Foundation):** Uses standard index update contracts.

**IMPLEMENTATION BOUNDARIES:**
Pushes projections to the search engine. Does not execute the search algorithms itself.

### 7.C.13 AI Integration

**Architectural Commentary**
Governs the relationship between Reference Data and the Enterprise AI Platform.

**WHY:**
The AI Platform is the sole executor of intelligence. Reference Data provides static taxonomy mapping, not inference.

**WHAT:**
Reference Data acts purely as a consumer, occasionally requesting the AI platform to normalize messy external strings into standard codes.

**HOW:**

```typescript
// Dispatches data normalization request to the AI Platform when an unmapped
// import string is encountered, receiving back a canonical PublicId.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 17 (Enterprise AI Platform):** "Enterprise AI Platform is the sole owner, this phase is purely a consumer". Uses AI abstraction contracts.

**IMPLEMENTATION BOUNDARIES:**
Never implements LLMs or vector databases locally. Strictly uses RPC/Events to query Phase 17.

### 7.C.14 Security Review

**Architectural Commentary**
Validates the access control and identity boundaries for reference data.

**WHY:**
While read data is public to the enterprise, mutations must be strictly governed to prevent unauthorized taxonomy changes.

**WHAT:**
Enforcement of `IUserContext` propagation and `IAuthorizationService` checks exclusively on Command routes.

**HOW:**

```typescript
// Command handlers invoke authorization check for "RefData.Admin" role
// Queries bypass authorization for internal service-to-service calls.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (IAM Platform):** Strictly consumes authorization contracts; implements no local security rules.

**IMPLEMENTATION BOUNDARIES:**
Enforces IAM decisions. Does not manage users, roles, or tokens.

### 7.C.15 Performance Strategy

**Architectural Commentary**
Ensures the system meets SLA requirements under peak enterprise load.

**WHY:**
Every system in MANARATAK depends on this data. A bottleneck here brings down the entire ecosystem.

**WHAT:**
Heavy reliance on Read-Replicas, distributed memory caching, and O(1) graph lookups via closure tables.

**HOW:**

```typescript
// Configuration of Prisma ORM to route read-only CQRS queries specifically to connection strings tagged as 'ReadReplica'.
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Database Routing):** Utilizes standard connection string segregation.

**IMPLEMENTATION BOUNDARIES:**
Optimizes data delivery. Does not control network-level load balancing.

### 7.C.16 Testing Strategy

**Architectural Commentary**
Defines the quality assurance thresholds required for Reference Data code.

**WHY:**
To guarantee that cycle detection, caching, and validation pipelines never fail in production.

**WHAT:**
Automated unit tests for validation rules, integration tests for the Closure Table logic, and architecture tests for dependency enforcement.

**HOW:**

```typescript
// Example Vitest / Architecture Test
// expect(domainImports).not.toContain('infrastructure');
```

**CONSUMPTION OF PREVIOUS FOUNDATIONS:**

- **Phase 05 (Testing Framework):** Uses Vitest enterprise standards.

**IMPLEMENTATION BOUNDARIES:**
Focuses solely on the Reference Data bounded context logic.

### 7.C.Final Implementation Review Checklist

**Architectural Commentary**
This serves as the official Tollgate for architecture validation before code is authorized for production deployment.

- [ ] Alignment with Phase 7 Part A — All layers and components match the architectural specification.
- [ ] Alignment with Phase 7 Part B — Implementation strictly uses the defined Contracts without modification.
- [ ] No Ownership Violations — Does not attempt to model business entities (Users, Courses) outside of Reference bounds.
- [ ] No Duplicated Functionality — Does not rebuild caching, outbox, or search infrastructures.
- [ ] Zero Upward Dependency — Domain models possess absolute ignorance of upstream consumers.
- [ ] Foundation Reuse Verification — Every consumed phase is verified as a loose integration.
- [ ] Dependency Inversion — Infrastructure and Delivery depend on Application and Domain, never the reverse.
- [ ] Complete Implementation Readiness — The blueprint is actionable, unambiguous, and ready for engineering.

**Status:** Baselined Specification

---

### Navigation

- **Previous**: [Phase 07 — Domain Contracts](phase-07-02-domain-contracts.md)
- **Next**: [Phase 07 — Generic Hierarchy & DAG Foundation](phase-07-13-generic-hierarchy-dag-foundation.md)
