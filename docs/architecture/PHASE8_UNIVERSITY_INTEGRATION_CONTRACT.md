# Phase 8 — University Integration Contract
## Document Reference: MANARATAK-P8-U001-CONTRACT

This document establishes the canonical integration contract and architectural specifications between the Phase 8 Academic Taxonomy / Degree Levels platform, the Phase 10 Majors platform, and the future University & Academic Program platform. 

This contract is designed to make the MANARATAK platform fully **university-ready** in a robust, idempotent, and relational manner, completely avoiding historical pitfalls of data duplication, unstable identifiers, and unstructured metadata.

---

## 1. Executive Summary

The purpose of this contract is to establish stable boundary references, strict ownership boundaries, and immutable data flow pipelines between the core classification frameworks (Taxonomy, Degree Levels, Majors) and the upcoming University data import phase.

By formalizing this contract prior to bulk import, we ensure:
* **Zero duplication** of University and Academic Program entities upon repeated imports.
* **100% preservation** of stable, official MANARATAK Institutional Reference IDs.
* **Typographic and conceptual integrity** where university offerings are mapped directly to canonical `Major` and `DegreeLevel` entities rather than loose, unvalidated free-text.
* **Complete flexibility** in representing modern university hierarchies, organizational structures, and campus offerings.

---

## 2. Module Ownership & Boundaries

Strict division of responsibilities guarantees modularity and prevents architectural spillover:

```
┌─────────────────────────────────┐
│     Phase 8 (Academic Core)     │
│  - AcademicTaxonomyNode         │
│  - AcademicTaxonomyEdge         │
│  - AcademicTaxonomyAlias        │
│  - DegreeLevel (Canonical)      │
└────────────────┬────────────────┘
                 │ (Inherited Taxonomy Classification)
                 ▼
┌─────────────────────────────────┐
│     Phase 10 (Concept Core)     │
│  - Major                        │
│  - MajorLevelProfile            │
│  - MajorVersion                 │
└────────────────┬────────────────┘
                 │ (Canonical Concept Linkage)
                 ▼
┌─────────────────────────────────┐
│  Future University Subsystem    │
│  - University Identity          │
│  - Campus                       │
│  - Faculty / School / College   │
│  - Department                   │
│  - AcademicProgram (Offering)   │
└─────────────────────────────────┘
```

### Ownership Rules
1. **Phase 8 owns classification metadata**: `AcademicTaxonomyNode`, `AcademicTaxonomyEdge`, `AcademicTaxonomyAlias`, `AcademicStandardMapping`, and `DegreeLevel`.
2. **Phase 10 / Major Subsystem owns academic concepts**: `Major`, `MajorLevelProfile`, `MajorVersion`, `MajorAlias`, `MajorRelationship`, and `MajorClassificationMapping`.
3. **University Platform owns institutional offerings**: University identity, Campus context, Faculty/School/College groupings, Departments, and `AcademicProgram` entities.
4. **NO Ownership Spillover**: The University platform is strictly prohibited from modifying, creating, or overriding `Major` definitions or `AcademicTaxonomyNode` hierarchies. All program-specific naming variations are stored at the program level, keeping the underlying taxonomy and concepts pristine.

---

## 3. Canonical University Hierarchy

Real-world institutional hierarchies are highly flexible. The canonical hierarchy model must reflect this optionality without fabricating artificial structural layers:

```
University
  └── Campus (Optional)
        └── Faculty / School / College (Optional)
              └── Department (Optional)
                    └── AcademicProgram (Central Integration Entity)
```

### Hierarchy Constraints
* **Optional Layers**: A program may skip the Campus, Faculty, or Department level where real institutions do not expose them.
* **Multi-Campus Support**: An `AcademicProgram` may be offered at multiple campuses simultaneously. Structuring this as a simple single `campusId` is structurally blocked. Instead, a junction entity (`ProgramCampusAssignment`) or a list relationship must be used to map programs to campuses.

---

## 4. The Academic Program as the Central Integration Entity

An `AcademicProgram` represents a specific, localized educational offering by an institution. It functions as the critical relational link between institutional reality and the canonical conceptual core:

```
[University Offering]                        [Conceptual Core]
AcademicProgram ───────────────────────────► Major (Canonical ID)
  - Raw Title: "BSc Computer Science"          - Slug: "computer-science"
  - Degree Level: BACHELOR ─────────────────► DegreeLevel (BACHELOR)
```

### Key Integration Rules
1. **Concept Uniqueness**: Do NOT create a new `Major` for every university's unique program title.
2. **Title Independence**: The program title (e.g. *"BSc in Advanced Applied Software Systems"*) remains program-level text. It is matched relationally to the canonical `Major` (e.g. *"Software Engineering"*).
3. **Degree Level Constraints**: Every program must link to a canonical `DegreeLevel` code (`BACHELOR`, `MASTER`, `DOCTORATE`, `FELLOWSHIP`, etc.). Arbitrary degree strings (e.g. *"B.S. Eng"*) are retained as raw source text for provenance only.

---

## 5. Major & Taxonomy Relationship Contracts

### Major Matching Pipeline
Every imported university program MUST undergo a standardized matching pipeline before persisting:

```
[Raw University Program Title]
             │
             ▼
      [Normalization]
             │
             ▼
  [DegreeLevel Resolution] ──► (Verify canonical code e.g. BACHELOR)
             │
             ▼
    [Major Resolution] ────► (Retrieve canonical Major ID)
             │
             ▼
  [Taxonomy Verification] ──► (Auto-derive from Major)
             │
             ▼
 [AcademicProgram Persistent Linkage]
```

### Taxonomy Inheritance Rule
An `AcademicProgram`'s taxonomic classification (e.g. *ISCED-F broad, narrow, detailed fields*) is derived **dynamically** via its linked `Major` (which contains `MajorClassificationMapping` and links directly to `AcademicTaxonomyNode`).
* **Direct Mappings**: Direct overrides or custom mappings on the `AcademicProgram` level are only permitted for specialized, highly interdisciplinary, or non-standard programs.
* **No Redundancy**: Denormalized taxonomy IDs must never be duplicated across every program record without strict, documented justification.

---

## 6. University Reference ID Preservation & Idempotency

This is the most critical operational safety mandate. Generating random UUIDs on raw imports during re-import cycles destroys database relational integrity and leads to orphan records.

### ID Preservation Rules
1. **Immutable Reference ID**: Enriched university datasets contain stable institutional identifiers (e.g. `uni-manaratak-001`). This ID **MUST** be mapped directly to the `publicId` or `id` in the database.
2. **No Volatile UUIDs**: Generating volatile random IDs (`uuidv4()`, `nanoid()`, etc.) at runtime for raw source records is **STRICTLY PROHIBITED**.
3. **Idempotent Matching Strategy**: Repeated imports of the same institution must resolve directly by its stable canonical reference ID, performing an **upsert** (update existing fields, preserve identifiers and relationships) rather than deleting and recreating.
4. **Name-Based Matching Fallback**: Matching primarily by name or website URL is prohibited for canonical identification. These fields can only be used to validate, flag, or assist in deduplication.

---

## 7. Program Identity Stability

Like universities, `AcademicProgram` entities must remain stable across repeated data refreshes to prevent breaking external bookmarks, analytics logs, and active student portfolios.

### Program Key Derivation Strategy
A program's stable unique key is derived deterministically from the following natural components:
$$\text{Program Unique Key} = \text{MD5}(\text{UniversityRefId} \parallel \text{DegreeLevelCanonicalCode} \parallel \text{MajorId} \parallel \text{CampusIds} \parallel \text{SourceProgramName})$$

Using this deterministic key ensures that:
* The same program across re-imports merges into the same record.
* Relationships to future scholarships, admission requirements, and student bookmarks remain intact.

---

## 8. Unresolved Program & Organization Handling

The import engine must anticipate and gracefully handle data that does not neatly align with our canonical core:

### State Matrix for Unresolved Programs
* **MATCHED**: Successfully resolved to a canonical `Major` and `DegreeLevel`.
* **AMBIGUOUS**: Candidate matches found, but requires manual administrative selection.
* **MAJOR_REVIEW_REQUIRED**: The program is valid, but no appropriate canonical `Major` exists in Phase 10.
* **UNMAPPED**: Totally unmapped, preserved in its raw state for review.

### Prohibitions
* **No Fake Majors**: Under no circumstances should the importer automatically create "placeholder" or "temporary" Majors to bypass validation.
* **No Fake Taxonomy Nodes**: Under no circumstances should university faculty, colleges, or school names (e.g., *"Faculty of Medicine"*, *"School of Business"*) be automatically converted into new `AcademicTaxonomyNodes`.

---

## 9. Future Integration Contracts

No architectural design choice in Phase 8 should block or restrict the following future platform expansion modules:

### A. Phase 9 Test Requirements Integration
The `AcademicProgram` model must structurally accommodate 1-to-many relationships to standardized admission test requirements:
* `AcademicProgram` ──► `InternationalTestRequirement` (e.g., TOEFL, IELTS, SAT minimum score thresholds).

### B. Scholarship Linking
Future scholarships must be able to target any level of our structural hierarchy smoothly:
* `Scholarship` ──► `University` (Institutional eligibility)
* `Scholarship` ──► `AcademicProgram` (Specific program offering eligibility)
* `Scholarship` ──► `Major` (Concept-level eligibility)
* `Scholarship` ──► `DegreeLevel` (Level-specific eligibility)

### C. Location / Geospatial Standardization
Universities and Campuses must resolve location data directly to canonical reference-data tables rather than loose strings:
* `Campus` ──► `ReferenceCity` ──► `AdministrativeRegion` ──► `ReferenceCountry`.

---

## 10. Existing Importer Safety Audit Findings

A thorough audit of the active codebase has identified multiple critical safety vulnerabilities that must be addressed before the bulk University data import begins:

| Vulnerability Location | Found Unsafe Pattern | Risk Level | Mitigation Mandate |
| :--- | :--- | :--- | :--- |
| `UniversityImportPromotionUseCase.ts` (Line 55) | `const publicId = 'uni-' + uuidv4().substring(0, 8)` | **CRITICAL** | Change to use stable source Reference ID when available in the dataset; prohibit random UUID generation on repeat cycles. |
| `UniversityImportPromotionUseCase.ts` (Line 56-59) | Volatile suffix on slug generation: `slug = ... + '-' + publicId.substring(0, 4)` | **HIGH** | Slugs must be deterministically derived from canonical name and country, not a random UUID substring. |
| `schema.prisma` (Line 111-133) | `campuses` and `academicPrograms` completely absent as relational tables; structured as unstructured JSON arrays in `optionalFields`. | **CRITICAL** | Transition from loose JSON properties to fully normalized, relational PostgreSQL tables with foreign key constraints. |
| `universities.ts` (Line 58-70) | `UniversityDeduplicationService` generates deduplication key using name + country + domain string concatenation. | **HIGH** | Upgrade the deduplication pipeline to prioritize stable official institutional reference ID first, treating name-based keys as secondary. |

---

## 11. Handoff Specifications for Future Importer Phase

The next-generation importer must strictly satisfy this checklist:

```yaml
Import Source: "manaratak-enriched-universities.json"
Handoff Rules:
  - Verify University File Reference ID exists -> Set as canonical publicId/id.
  - Verify Country ID matches ReferenceCountry -> Establish relation, do not insert raw text names.
  - Verify City ID matches ReferenceCity -> Establish relation, do not insert raw text names.
  - Parse program title -> Execute Major Resolver.
  - Parse program degree level -> Resolve to stable DegreeLevel canonicalCode.
  - Parse Campus/Faculty/Department context -> Populate organizational relational fields.
  - Keep original source fields -> Save under sourceProvenance JSON column.
```

---

*This contract is versioned, validated, and officially sealed by the Phase 8 Academic Taxonomy Core Platform.*
