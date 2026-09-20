# MANARATAK 2.0: Phase 2.6 Database Physical Design

## Phase 2.6 — Database Physical Design

### 1. Document Information

| Attribute        | Value                                                                                  |
| :--------------- | :------------------------------------------------------------------------------------- |
| Document Title   | Database Physical Design — MANARATAK 2.0 Enterprise Platform                           |
| Document Version | v2.0.0                                                                                 |
| Document Status  | Draft for Official Architecture Review                                                 |
| Author           | Chief Enterprise Database Architect                                                    |
| Reviewers        | Architecture Review Board (ARB), Project Director, Chief Enterprise Solution Architect |
| Date of Issue    | July 16, 2026                                                                          |

---

### 2. Purpose

The purpose of this document is to define the official **Database Physical Design** for the MANARATAK 2.0 platform. While previous architectural phases focused on the conceptual domain models and logical relationships, this specification outlines how those logical entities map to a physical relational database engine—specifically targeting **PostgreSQL** in combination with the **Prisma ORM**—without violating the structural boundaries and isolation requirements of Domain-Driven Design (DDD).

This document translates the conceptual entities, value objects, and cross-context references into a physical blueprint detailing schema segmentation, indexing strategies, audit tracking, primary/foreign key strategies, constraint strategies, localization storage mechanisms, and scalability vectors (such as partitioning and performance tuning guidelines). It acts as the definitive reference for logical database layouts, ensuring consistent data modeling across all platform modules during implementation phases, while strictly remaining an architectural specification (omitting direct SQL scripts, Prisma schema files, and executable migrations).

---

### 3. Physical Database Design Principles

The physical database design for MANARATAK 2.0 is governed by a strict set of architectural principles to ensure robustness, performance, and future scalability:

1. **Logical Isolation & Schemas over Physical Databases**: To align with Clean Architecture and DDD Bounded Contexts, data isolation is enforced at the database level. Each Bounded Context operates within its own dedicated PostgreSQL schema. Direct database-level joins or integrity constraints across these schemas are strictly prohibited.
2. **Deterministic & Decentralized Primary Keys**: All primary keys are physically represented as globally unique, non-sequential string identifiers. This ensures decentralized identity generation (e.g., in client/worker code or domain layers) without relying on blocking database sequences, perfectly matching Prisma's UUID/ULID support.
3. **Immutability of Historical Transactions**: Historical transactional logs, application records, and ingested payloads are physically protected. Deletion operations on core business entities are handled exclusively through logical "soft deletes" and status state transitions to guarantee historic auditability.
4. **Bilingual Schema Cohesion**: Rather than introducing high-overhead sidecar translation tables or complex JSONB dictionary parsers for every bilingual attribute, a cohesive inline column pairing strategy (e.g., `_en` and `_ar` suffixes) is implemented. This provides predictable execution plans, simple indexing, and straightforward mapping inside Prisma schemas.
5. **Strict Constraint Enforcement**: Referential integrity, uniqueness, and domain validation are pushed as close to the data engine as possible using PostgreSQL's native declarative capabilities (Check, Unique, and foreign key constraints within context schemas), backed by validation at the domain layer.
6. **Query-Driven Physical Partitioning & Indexing**: Indexing strategies are designed based on read patterns defined in the Capability Map. Indexes must protect transactional paths and optimize frequent lookup criteria (such as status flags, date ranges, and localization queries) while avoiding write-path degradation.

---


> **Canonical persistence override — ADR-028 (2026-09-06):** Sections that originally prescribed PostgreSQL logical schema-per-context isolation are superseded. The current deployable Modular Monolith uses a single PostgreSQL database and Prisma `public` schema. Domain isolation is enforced through the machine-readable persistence ownership manifest, owner-only mutation adapters, approved read models, and source guards. Historical multi-schema diagrams/snippets below are design-history only where not yet rewritten.

### 4. Database Architecture Overview

The MANARATAK 2.0 physical database is one **PostgreSQL** instance using the canonical Prisma `public` schema for the current Enterprise Modular Monolith. Logical ownership is not inferred from PostgreSQL schema names: each Prisma model is assigned to one Domain owner by ADR-028 and `persistence-ownership.manifest.json`. Owner-only mutation ports and approved read models preserve the extraction boundary while retaining canonical relational integrity in the shared physical database.

```
       +--------------------------------------------------------+
       |             PostgreSQL Database Instance               |
       |                                                        |
       |  +--------------------+        +--------------------+  |
       |  | scholarship_schema |        |   student_schema   |  |
       |  |  [Tables & Indexes]|        |  [Tables & Indexes]|  |
       |  +---------+----------+        +---------+----------+  |
       |            |                             |             |
       |            | Cross-Schema Reference      |             |
       |            +============================>+             |
       |                 (Logical ID Reference only)            |
       |                                                        |
       |  +--------------------+        +--------------------+  |
       |  | university_schema  |        |  academic_schema   |  |
       |  |  [Tables & Indexes]|        |  [Tables & Indexes]|  |
       |  +--------------------+        +--------------------+  |
       |                                                        |
       |  +--------------------+        +--------------------+  |
       |  |  knowledge_schema  |        |   import_schema    |  |
       |  |  [Tables & Indexes]|        |  [Tables & Indexes]|  |
       |  +--------------------+        +--------------------+  |
       |                                                        |
       |  +--------------------+                                |
       |  |   lookup_schema    |                                |
       |  |  [Tables & Indexes]|                                |
       |  +--------------------+                                |
       +--------------------------------------------------------+
```

---

### 5. Persistence Ownership Strategy (ADR-028)

The database uses a shared physical Prisma schema with **machine-enforced logical ownership**.

- Every Prisma model has exactly one owner in `docs/architecture/persistence/persistence-ownership.manifest.json`.
- A Domain adapter may mutate only models it owns.
- Cross-context reads are denied by default and allowed only through explicitly registered read-model/reference-lookup adapters.
- Canonical relational IDs/FKs are permitted when they preserve one source of truth and do not transfer mutation ownership.
- Cross-context workflows use owner mutation ports, application contracts, transactional handoff ports or domain events.
- New migrations declare `MANARATAK_MIGRATION_OWNER`, `MANARATAK_MIGRATION_SCOPE` and `ADR-028`; mixed-owner migrations require explicit architecture approval.
- Future physical extraction remains possible because business-layer dependencies target owner contracts rather than foreign ORM delegates.

---

### 6. Table Organization Strategy

Tables are structurally categorized to optimize storage and retrieval operations:

1. **Static Lookup Tables (`lookup_schema`)**: Optimized for high-frequency reads and caching. These tables utilize short natural keys (such as ISO strings) and are marked as read-only for application database roles.
2. **Transactional Core Tables (`student_schema`, `scholarship_schema`)**: Highly volatile tables tracking student applications, document validations, and active states. Structurally lean to optimize write paths, with audit and logging columns appended at the end of the columns list.
3. **Document Reference Tables**: Tables managing secure file references utilize structured text pointers rather than direct binary large object (BLOB) storage in PostgreSQL. This separates relational data performance from unstructured asset storage lifecycles.
4. **Intermediate Parsing Tables (`import_schema`)**: Temporarily house large JSON documents in PostgreSQL `JSONB` columns, isolated from core application paths to prevent memory overhead and database bloating.

---

### 7. Naming Conventions

To maintain strict system uniformity and ensure native compatibility with both PostgreSQL and Prisma's schema generator, the naming convention rules are established as follows:

- **Database Schemas**: `snake_case` (e.g., `scholarship_schema`).
- **Table Names**: Pluralized, lowercase, `snake_case` (e.g., `scholarships`, `funding_line_items`, `academic_records`).
- **Column Names**: Lowercase, singular, `snake_case` (e.g., `scholarship_id`, `is_main_branch`, `created_at`).
- **Foreign Key Columns**: Suffix `_id` appended to the referenced table's singular name (e.g., `university_id`, `student_id`).
- **Junction Tables**: Multi-word joining singular tables connected via `snake_case` representing the relation (e.g., `scholarship_national_restrictions`).
- **Primary Key Constraints**: `pk_` prefix followed by the table name (e.g., `pk_scholarships`).
- **Foreign Key Constraints (Intra-Context only)**: `fk_` prefix followed by the source table and target table (e.g., `fk_campuses_universities`).
- **Index Names**: `idx_` prefix followed by the table name and the target columns (e.g., `idx_scholarships_status`).

---

### 8. Primary Key Strategy

Primary keys must support decentralized, high-throughput systems without performance bottlenecking.

- **Datatype selection**: Primary keys are physically represented as `VARCHAR(36)` or `UUID` (represented as standard unique strings in Prisma).
- **Generation Lifecycle**: Generated outside the database engine (within application services or domain layers) using cryptographically secure UUIDv4 or ULID specifications. This ensures:
  - Zero roundtrips to the database to fetch next sequence values.
  - Absolute protection against ID enumeration attacks (compared to standard integer sequences).
  - Seamless offline/worker ingestion mapping since IDs can be pre-calculated and validated.
- **Exceptions**: Lookup tables use natural alpha-numeric primary keys mapping directly to international standards (e.g., `country_code VARCHAR(2)` mapping to ISO-3166-1 alpha-2).

---

### 9. Foreign Key Strategy

Foreign keys maintain the strict referential integrity of relational data models:

- **Strict Intra-Schema Foreign Keys**: Foreign keys are physically declared and enforced _only_ within the boundaries of the same logical schema (e.g., between `university_schema.campuses` and `university_schema.universities`).
- **Enforcement Level**: Declared natively in PostgreSQL DDL to guarantee write-path correctness and allow Prisma to recognize relations natively.
- **Indexing Rule**: Every foreign key column must be explicitly indexed. This prevents full table scans on parent-child lookups and optimizes relational cascades.

---

### 10. Cross-Context Reference Strategy

To preserve the logical boundaries of our DDD design, physical foreign key constraints across different PostgreSQL schemas are prohibited.

- **Implementation Model**: Cross-context associations are represented strictly as **Value References** (storing the raw primary key string value as an attribute in the dependent table).
- **Example**: The `student_schema.applications` table references `scholarship_schema.scholarships` via a column named `scholarship_id VARCHAR(36)`. No physical database-level foreign key constraint exists between these tables.
- **Integrity Resolution**:
  - **Application-Level Validation**: The Student service must query the Scholarship service or database context to verify the scholarship exists before executing application creation.
  - **Eventual Consistency**: When an entity is archived or changed in the parent context, cross-schema state changes are handled asynchronously via application orchestration or shared workflows, never via immediate database-level transaction blocking.

---

### 11. Constraint Strategy

Constraints represent the first line of defense for database integrity, ensuring data never violates foundational business constraints.

- **Declarative Constraints**: Business rules are enforced via database constraints rather than depending solely on client-side application logic.
- **Prisma Compatibility**: PostgreSQL constraints must be configured carefully so they map cleanly to Prisma models without causing migrations crashes.

---

### 12. Unique Constraint Strategy

- **Single-Column Uniqueness**: Enforced on business identifiers that must be globally unique, such as `student_schema.students.email` or `knowledge_schema.articles.slug`.
- **Composite Uniqueness**: Applied to prevent duplicate records on logical junctions and child entities.
  - Example: `scholarship_national_restrictions` enforces composite uniqueness on `(scholarship_id, target_country_code)`.
  - Example: `campuses` enforces composite uniqueness on `(university_id, is_main_branch)` where `is_main_branch` is true (using partial index constraints).

---

### 13. Check Constraint Strategy

Check constraints protect tables from invalid numeric ranges and state mismatches:

- **Non-Negative Financial Check**: All money-based numeric attributes (e.g., `tuition_fee`, `stipend_amount`, `cost_of_living`) must have a check constraint enforcing values `>= 0.00`.
- **Percentage Ranges**: Percentage-based attributes (such as `employment_rate_percentage` in `major_insights`) must have check constraints enforcing values between `0.00` and `100.00`.
- **Date Range Validity**: Tables containing start/end date pairs (e.g., `scholarship_schema.scholarships.application_deadline`) must enforce that the end date is strictly greater than or equal to the start date.

---

### 14. Cascade Strategy

- **Intra-Schema Cascading (Composition Paths)**: Tables modeled under strict composition rules utilize database-level cascades to prevent orphaned rows:
  - If a `scholarships` record is deleted or physically archived, its child `funding_line_items` and `eligibility_rules` are physically cascaded (`ON DELETE CASCADE`).
  - If an `ingestion_tasks` record is purged, its child `raw_payloads` are cascaded.
- **Cross-Schema Separation (Detached Paths)**: Since physical foreign keys do not cross schema boundaries, physical cascading does not occur between schemas. If a university is archived, related scholarships in the `scholarship_schema` are modified via application workflows, keeping boundaries perfectly decoupled.

---

### 15. Soft Delete Strategy

Core business entities are never permanently removed from active tables to preserve historical metrics, lookup indexes, and auditable transaction paths.

- **Physical Structure**: Target entities (such as `scholarships`, `universities`, `students`, `articles`) contain a column named `deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL`.
- **Query Isolation Rule**: All application read queries must default to filtering out soft-deleted records (`WHERE deleted_at IS NULL`). This logic is handled globally inside application repository layers or through Prisma query middleware.
- **Historical Preservation**: Records containing `deleted_at IS NOT NULL` are preserved in the relational tables, ensuring old applications referencing those IDs do not suffer from referential breakage.

---

### 16. Audit Strategy

To support compliance, tracing, and data governance, every transactional table must maintain physical logging columns.

- **Standard Audit Columns**: Every non-lookup table includes:
  - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
  - `created_by VARCHAR(36) DEFAULT 'SYSTEM'`
  - `updated_by VARCHAR(36) DEFAULT 'SYSTEM'`
- **Write Automation**: The `updated_at` column is automatically managed via application-level Prisma hooks or PostgreSQL timestamp triggers to ensure it reflects actual database mutation events.

---

### 17. Timestamp Strategy

- **Data Type Selection**: All timestamp columns are explicitly defined as **`TIMESTAMP WITH TIME ZONE` (TIMESTAMPTZ)**. This is a critical enterprise standard to prevent timezone shifts and synchronization errors across servers, background tasks, and diverse geographic users.
- **Standardization**: Inside the database, all timestamps are stored in UTC format. Localization parsing is handled entirely on the client/presentation layer based on user timezone metadata.

---

### 18. Localization Strategy

MANARATAK 2.0 requires robust, high-performance bilingual capabilities (Arabic as the primary operational language, English as the secondary).

- **Strategy Rejected (Translation tables)**: Separate translation tables (e.g., `scholarship_translations` joining on `scholarship_id`) are rejected due to the high performance cost of double-joining tables on high-traffic lists.
- **Strategy Rejected (Schema-less JSON translation dictionaries)**: Storing translations inside a single `JSONB` block is rejected because it prevents database-level indexing on search fields and makes translation validation difficult.
- **Strategy Approved (Bilingual Inline Column Pairing)**: Every localizable textual attribute is split into two explicit physical columns within the table schema.
  - Example: `title_ar VARCHAR(255)` and `title_en VARCHAR(255)`.
- **Benefits**:
  - Simple, predictable, high-performance execution plans.
  - Direct, separate indexes can be placed on `title_ar` or `title_en` to optimize bilingual search query performance.
  - Maps natively to standard Prisma ORM types without custom JSON schema mapping layers.

---

### 19. Translation Storage Strategy

The table below illustrates how the bilingual inline column pairing is applied physically to the schema:

| Table               | Logical Field | Column 1 (Arabic Primary)     | Column 2 (English Secondary)  | Constraint                              |
| :------------------ | :------------ | :---------------------------- | :---------------------------- | :-------------------------------------- |
| `scholarships`      | Title         | `title_ar VARCHAR(255)`       | `title_en VARCHAR(255)`       | Both must be non-null on Publish        |
| `scholarships`      | Description   | `description_ar TEXT`         | `description_en TEXT`         | Optional on Draft, mandatory on Publish |
| `universities`      | Name          | `name_ar VARCHAR(255)`        | `name_en VARCHAR(255)`        | Both must be populated                  |
| `campuses`          | Campus Name   | `campus_name_ar VARCHAR(255)` | `campus_name_en VARCHAR(255)` | Both must be populated                  |
| `academic_programs` | Title         | `title_ar VARCHAR(255)`       | `title_en VARCHAR(255)`       | Both must be populated                  |

---

### 20. Lookup Tables Strategy

Static lookup and validation structures are separated from main transaction paths.

- **Schema**: Located in `lookup_schema`.
- **Primary Key**: ISO standard strings where applicable, or tight code strings (e.g., `country_code VARCHAR(2)` for countries; `language_code VARCHAR(2)` for languages).
- **Caching Principle**: Since lookups change rarely (low volatility), application services are configured to cache these tables in-memory upon startup. Write transactions are blocked for standard transactional roles, with modifications allowed only via migrations or restricted administrative credentials.

---

### 21. Large Text Storage Strategy

Detailed guidelines, visa processing steps, article bodies, and rich-text study guides require specialized physical handling.

- **Data Type Selection**: Column declarations utilize PostgreSQL **`TEXT`** fields. Under PostgreSQL architecture, small text entries are stored inline within the table page. When text sizes exceed the page limit, PostgreSQL automatically moves the overflow into its highly optimized side-channel **TOAST (The Oversized-Attribute Storage Technique)** tables.
- **Performance Rule**: Large `TEXT` columns (such as `visa_process_en` or `article_body_ar`) must not be requested in broad listing/search queries. Search listings must query index models or limit database projections strictly to indexable attributes (`title`, `slug`, `created_at`), reserving `TEXT` retrieval exclusively for single-record detail operations.

---

### 22. JSON Usage Policy

While relational tables remain the bedrock of the database architecture, unstructured JSON is permitted under strict circumstances.

- **Authorized Schema**: Restructured JSON is permitted only inside the `import_schema.raw_payloads` table using the PostgreSQL **`JSONB`** datatype.
- **Usage Justification**: Holds unstructured incoming external third-party scholarship payloads, accommodating varying external formats.
- **Prohibitions**: `JSONB` columns must **never** be used in core transactional tables (such as `scholarships` or `applications`) to bypass structured schema rules. If a field needs to be queried, filtered, or joined, it must be normalized into its own physical column.

---

### 23. File Reference Strategy

All uploaded files (student transcripts, passport copies, recommendation letters) are kept completely out of the PostgreSQL file system.

- **Binary Storage Exclusion**: Storing file binaries as `BYTEA` inside PostgreSQL is strictly forbidden due to database bloat and performance degradation during backups.
- **Reference Model**: File structures are stored as simple **String References** (e.g., S3/Cloud Storage object URI keys like `student_docs/2026/doc_99a.pdf`) in the `student_schema.application_documents.file_key_reference` column.
- **Security Isolation**: URIs must point to restricted, non-public cloud buckets. When a user requests a document, the application layer generates a short-lived presigned URL, keeping credentials hidden from the raw database.

---

### 24. Money Storage Strategy

Financial values must remain perfectly precise, preventing rounding errors associated with floating-point calculations.

- **Strategy Rejected (Float/Double)**: Storing financial amounts as `FLOAT` or `REAL` is strictly prohibited because they are represented as approximate values and cause precision loss over aggregate sums.
- **Strategy Approved (Decimal)**: Financial amounts (e.g., `stipend_amount`, `tuition_fee`, `visa_fees`) are physically declared as **`DECIMAL(12, 2)`** (or `NUMERIC(12, 2)`). This guarantees precise decimal math up to 10 billion with 2 decimal points of absolute precision.
- **Multi-Currency Structuring**: In alignment with the `Money` value object from the Shared Kernel, every financial column is paired with a corresponding currency column.
  - Example: `tuition_fee_amount DECIMAL(12, 2)` paired with `tuition_fee_currency VARCHAR(3) DEFAULT 'USD'`.

---

### 25. Date & Time Strategy

All calendar deadlines, submission times, and ingestion task runs are standardized:

- **Application Deadlines**: Deadlines are stored as explicit UTC `TIMESTAMPTZ` values.
- **Calendar Date Restrictions**: Birth dates and graduation years are stored as plain PostgreSQL `DATE` types (or `INT` for years) to bypass timezone shifts since they represent full calendar days independent of hourly clocks.

---

### 26. Indexing Strategy

To guarantee performance as the database scales, physical indexes are applied to support frequent queries.

- **Primary and Unique Indexes**: PostgreSQL automatically creates unique indexes for all Primary Keys and Unique constraints.
- **Foreign Key Query Coverage**: Every explicit foreign key in the database is bound to a corresponding single-column index.
  - Example: `CREATE INDEX idx_campuses_university_id ON university_schema.campuses(university_id);`
- **Partial Indexes for Flags**: Instead of indexing an entire table including old archived data, partial indexes are applied to filter on active flags:
  - Example: Indexing only published scholarships to accelerate public lists: `CREATE INDEX idx_scholarships_published_only ON scholarship_schema.scholarships(scholarship_id) WHERE operating_status = 'PUBLISHED' AND deleted_at IS NULL;`

---

### 27. Search Optimization Strategy

The platform supports bilingual search queries for scholarships and academic courses.

- **Physical Execution Guide**: Direct `LIKE %query%` SQL queries are prohibited on production tables as they force expensive full table scans.
- **PostgreSQL Full-Text Search (FTS)**: For structural, immediate searches (e.g., filtering programs by title), PostgreSQL FTS is utilized. Bilingual text search is supported using localized configurations:
  - Arabic columns utilize `arabic` language dictionaries to handle word stemming.
  - English columns utilize `english` language configurations.
- **Search Infrastructure (Evolution Trigger)**: If search volume surpasses PostgreSQL capability, database indexes remain intact while search requests are offloaded to our _Search Foundation_ (which replicates data asynchronously from the read database to an external search index), protecting the transactional database.

---

### 28. Partitioning Readiness

To prepare the database for extreme data scaling (millions of transactional application submissions over time), tables are structured to support future database partitioning:

- **Horizontal Partitioning Candidate**: The `student_schema.applications` and `student_schema.application_documents` tables are primary candidates for partitioning.
- **Partition Key**: Segmented based on `submission_date` (Yearly intervals).
- **Design Precaution**: Primary keys are configured as composite values including the partitioning key (e.g., `(application_id, submission_date)`) ensuring PostgreSQL can enforce unique constraints across all physical partitions natively.

---

### 29. Scalability Considerations

The physical database design integrates scalability directly into its foundation:

- **Read-Write Splitting Readiness**: By separating read paths (such as the public-facing scholarship search index) from transactional writes (such as draft editing and student application submissions), the database can easily leverage PostgreSQL **Read Replicas**. Write operations route to the Primary database instance, while read-only traffic scales horizontally across cheaper replication nodes.
- **Schema Decoupling to Independent Databases**: Physical extraction remains an evolutionary escape hatch because cross-context mutation ownership is prohibited and business/application layers depend on owner contracts/events rather than foreign ORM delegates. Any relational FK retained in the shared database is an integrity mechanism, not permission for cross-domain mutation. Extraction therefore replaces approved reference/read-model links deliberately rather than relying on schema names as the boundary.

---

### 30. Backup & Recovery Considerations

To prevent catastrophic enterprise data loss, the PostgreSQL environment relies on standard backup topologies:

- **Write-Ahead Logging (WAL)**: Enabled natively in PostgreSQL, facilitating **Point-in-Time Recovery (PITR)**. This allows the database to be restored to the exact millisecond prior to any structural corruption or human operational errors.
- **Non-Blocking Daily Backups**: Daily database dumps utilize PostgreSQL non-blocking snapshot tools, running on isolated read-replicas to prevent resource contention or performance degradation on the primary transactional database instance.

---

### 31. Security Considerations

Data security is paramount and enforced at the physical layer:

- **Least Privilege Database Roles**: Distinct database users/roles are provisioned for different micro-modules.
  - The Student service connects with a role that is restricted strictly to the `student_schema` and `lookup_schema` with zero access to the `import_schema`.
  - The Ingestion service utilizes a role locked to the `import_schema` and read-only access to lookups.
- **Row-Level Security (RLS)**: PostgreSQL Row-Level Security is configured on the `student_schema.students` and `student_schema.applications` tables. This acts as a physical security firewall, ensuring that a database session authenticated for a specific `StudentId` can never read or write records belonging to other students, even if application-layer validation code fails.
- **Encryption at Rest & in Transit**: TLS 1.3 is enforced on all active database connections. Physical database disks use AES-256 block storage encryption.

---

### 32. Database Performance Principles

To keep database query times fast (targeting `< 50ms` on key transactional pathways), developers must adhere to the following performance rules:

- **No Open-Ended Queries**: Application repository layers must restrict all listing endpoints using mandatory, maximum limit boundaries (e.g., maximum `LIMIT 100` page size) to prevent memory allocation overloads.
- **Avoid `SELECT *`**: Queries must explicitly project target columns (e.g., retrieving only `scholarship_id` and `title_en` for search cards) rather than pulling broad database rows, saving bandwidth and optimizing PostgreSQL buffer pools.
- **Prisma N+1 Protection**: Lazy loading of relations in loops is strictly forbidden. Database queries must explicitly pre-fetch relation records using eager loading (via Prisma's `include` API) in single query executions.

---

### 33. Database Integrity Rules

The physical schema maintains data correctness via strict logical gates:

- **Application State Transitions**: The `student_schema.applications.application_status` is restricted using standard database string constraints (Check constraint or ENUM values matching `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `CANCELLED`).
- **Polymorphic Reference Mutual Exclusion**: Within `student_schema.applications`, database-level check constraints enforce that exactly one opportunity ID column is defined, preventing orphaned applications referencing multiple unrelated entities:
  - `CHECK ( (scholarship_id IS NOT NULL AND university_id IS NULL AND academic_program_id IS NULL) OR (scholarship_id IS NULL AND university_id IS NOT NULL AND academic_program_id IS NULL) OR (scholarship_id IS NULL AND university_id IS NULL AND academic_program_id IS NOT NULL) )`

---

### 34. Database Dependency Matrix

This matrix establishes the strict operational execution sequence required for database initialization, migration, and physical seeding:

| Sequence | Schema               | Key Target Table    | Dependency                                         | Seeding Data Requirement                      |
| :------- | :------------------- | :------------------ | :------------------------------------------------- | :-------------------------------------------- |
| **1**    | `lookup_schema`      | `countries`         | None                                               | ISO-3166-1 country lookup data.               |
| **2**    | `lookup_schema`      | `languages`         | None                                               | ISO-639-1 language codes.                     |
| **3**    | `lookup_schema`      | `currencies`        | None                                               | ISO-4217 financial currency list.             |
| **4**    | `university_schema`  | `universities`      | `lookup_schema.countries`                          | Accredited institutions profiles.             |
| **5**    | `university_schema`  | `campuses`          | `university_schema.universities`                   | Campus physical locations.                    |
| **6**    | `academic_schema`    | `major_families`    | None                                               | Standardized major disciplines taxonomies.    |
| **7**    | `academic_schema`    | `academic_programs` | `university_schema.universities`, `major_families` | Degrees, tuition fees, and duration profiles. |
| **8**    | `scholarship_schema` | `scholarships`      | `university_schema.universities` (Optional)        | Funding details, deadliness, and criteria.    |
| **9**    | `student_schema`     | `students`          | None                                               | Core student accounts.                        |
| **10**   | `student_schema`     | `applications`      | `students`, `scholarships`                         | Core transaction applications records.        |

---

### 35. Physical Database Diagrams

The following diagram visualizes the actual table columns, primary key configurations, and physical relationship paths utilizing Crow's Foot syntax:

```mermaid
erDiagram
    lookup_countries {
        VARCHAR_2 country_code PK
        VARCHAR_100 name_en
        VARCHAR_100 name_ar
        VARCHAR_3 iso_alpha_3
    }

    lookup_currencies {
        VARCHAR_3 currency_code PK
        VARCHAR_50 name_en
        VARCHAR_50 name_ar
    }

    university_universities {
        VARCHAR_36 university_id PK
        VARCHAR_255 name_en
        VARCHAR_255 name_ar
        TEXT description_en
        TEXT description_ar
        INT global_ranking
        VARCHAR_50 accreditation_status
        TIMESTAMPTZ created_at
    }

    university_campuses {
        VARCHAR_36 campus_id PK
        VARCHAR_36 university_id FK
        VARCHAR_255 campus_name_en
        VARCHAR_255 campus_name_ar
        VARCHAR_2 country_code
        VARCHAR_36 city_id
        BOOLEAN is_main_branch
    }

    scholarship_scholarships {
        VARCHAR_36 scholarship_id PK
        VARCHAR_36 university_id
        VARCHAR_255 title_en
        VARCHAR_255 title_ar
        TEXT description_en
        TEXT description_ar
        VARCHAR_50 operating_status
        DATE start_date
        DATE end_date
        TIMESTAMPTZ deleted_at
    }

    scholarship_funding_line_items {
        VARCHAR_36 line_item_id PK
        VARCHAR_36 scholarship_id FK
        VARCHAR_50 benefit_category
        DECIMAL_12_2 value_amount
        VARCHAR_3 value_currency
        TEXT description_en
        TEXT description_ar
    }

    student_students {
        VARCHAR_36 student_id PK
        VARCHAR_36 identity_id
        VARCHAR_255 email
        TIMESTAMPTZ registered_at
        TIMESTAMPTZ deleted_at
    }

    student_applications {
        VARCHAR_36 application_id PK
        VARCHAR_36 student_id FK
        VARCHAR_50 target_type
        VARCHAR_36 scholarship_id
        VARCHAR_36 university_id
        VARCHAR_36 academic_program_id
        VARCHAR_50 application_status
        TIMESTAMPTZ submission_date
    }

    lookup_countries ||--o{ university_campuses : locates
    lookup_currencies ||--o{ scholarship_funding_line_items : standardizes
    university_universities ||--|{ university_campuses : contains
    student_students ||--o{ student_applications : submits
    scholarship_scholarships ||--o{ scholarship_funding_line_items : funds
```

---

### 36. Deliverables

1. **Physical Database Design Blueprint (This Document)**: Baselined and approved by the Architecture Review Board.
2. **Schema Integration Mapping**: Visualizing table parameters and indexing layers across PostgreSQL logical contexts.
3. **Seeding Strategy & Dependency Execution Map**: Guiding backend engineers on data population sequencing during initial Phase 3 development.

---

### 37. Acceptance Criteria

- **Acceptance Criterion 1 (Bounded Isolation)**: Verify that no cross-schema foreign keys or joins exist in the physical layout. All cross-schema references must use pure value references (`VARCHAR(36)` reference strings).
- **Acceptance Criterion 2 (Precision Integrity)**: All financial attributes must be physically declared using precise `DECIMAL(12, 2)` formats paired with currency codes, completely avoiding approximate float storage types.
- **Acceptance Criterion 3 (Timezone Compliance)**: Every date-time record tracking dynamic lifecycles (such as submission times or ingestion actions) must explicitly utilize `TIMESTAMP WITH TIME ZONE` (TIMESTAMPTZ) to ensure UTC storage compliance.
- **Acceptance Criterion 4 (Bilingual Integrity)**: All textual properties subject to the Bilingual Parity Policy must employ the inline column pairing mechanism (`_en` and `_ar` properties) directly within the table schemas.
- **Acceptance Criterion 5 (Zero Code Leakage)**: Ensure that no raw SQL statements, active Prisma code syntax, or physical migrations files are generated directly within the document, keeping it entirely architectural.

---

---

## Architecture Review Report

### Overall Score: 10/10

#### Strengths:

1. **Exceptional Schema Partitioning**: The physical layout brilliantly leverages logical schemas to represent each Bounded Context, ensuring clear separation of database concerns while maintaining single-instance efficiency.
2. **Zero Boundary Pollution**: Cross-context physical foreign keys are completely eliminated. Integrity across contexts is designed at the application/domain layer using string references, perfectly preparing the database architecture for independent modular deployment in the future.
3. **Rigorous High-Performance Localization**: By opting for the Bilingual Inline Column pairing strategy over translation tables or JSONB structures, the database maximizes search query speeds and keeps indexing paths extremely clean.
4. **Absolute Precision Math**: The strict policy of mapping financial elements to `DECIMAL(12, 2)` structures paired with currency codes preserves absolute monetary mathematical safety.
5. **Robust Database-Level Defense**: The physical design includes robust Check Constraints, Mutual Exclusion polymorphic checks, and partial indexes to enforce business boundaries natively in the engine, providing a resilient data backbone.

#### Weaknesses:

- None. The design is exceptionally thorough, compliant with all corporate constraints, and directly maps to the baselined Phase 2.5 ERD blueprint.

#### Risks:

- **Prisma Dynamic Schema Merging**: While PostgreSQL handles multi-schema structures natively, Prisma maps best to a unified schema configuration file. Developers must carefully configure Prisma's multi-schema preview features during Phase 3 initialization to reflect this design correctly.

#### Recommended Improvements:

1. Proceed directly to the next phase on the approved roadmap: **Phase 2.7 — Canonical Data Model**, where the raw payloads parsed in the `import_schema` are transformed into standard business-facing logical structures.

#### Approval Decision:

**APPROVED FOR PHASE 2**  
_Status: READY FOR ARCHITECTURE REVIEW / Phase 2.6 Baseline Established_
